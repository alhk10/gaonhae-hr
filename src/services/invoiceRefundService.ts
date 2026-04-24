/**
 * Invoice Refund Service
 * Handles individual line-item refunds and refund approval requests
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import { logInvoiceChange } from './invoiceChangeLogService';
import { submitActionRequest } from './invoiceActionRequestService';

/**
 * Refund a single line item:
 * 1. Create student credit for item amount
 * 2. Deactivate entitlement
 * 3. Cancel enrollment
 * 4. Mark item metadata as refunded
 * 5. Recalculate invoice totals
 * 6. Log the change
 */
export const refundLineItem = async (
  invoiceItemId: string,
  reason: string
): Promise<void> => {
  // 1. Get the item and parent invoice
  const { data: item, error: itemError } = await supabase
    .from('invoice_items')
    .select('id, invoice_id, product_id, total_amount, tax_amount, description, metadata, products(name)')
    .eq('id', invoiceItemId)
    .single();

  if (itemError || !item) {
    throw new Error('Invoice item not found');
  }

  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .select('id, student_id, invoice_number, total_amount, tax_amount, subtotal, balance_due, amount_paid')
    .eq('id', item.invoice_id)
    .single();

  if (invoiceError || !invoice) {
    throw new Error('Parent invoice not found');
  }

  const productName = (item.products as any)?.name || item.description;
  const refundAmount = item.total_amount + item.tax_amount;

  // 2. Create student credit (positive = credit to student)
  const { error: creditError } = await supabase
    .from('student_credits')
    .insert({
      student_id: invoice.student_id,
      amount: refundAmount,
      type: 'refund',
      reference_id: invoiceItemId,
      description: `Refund for ${productName} from Invoice #${invoice.invoice_number}`,
    });

  if (creditError) {
    logger.error('Error creating refund credit', creditError);
    throw new Error(`Failed to create refund credit: ${creditError.message}`);
  }

  // 3. Deactivate entitlement linked to this item
  await supabase
    .from('entitlements')
    .update({ is_active: false, notes: `Deactivated - item refunded: ${reason}` })
    .eq('source_id', invoiceItemId)
    .eq('source_type', 'invoice_item');

  // 4. Cancel enrollment linked to this item
  const { data: enrollments } = await supabase
    .from('student_class_enrollments')
    .select('id')
    .eq('invoice_item_id', invoiceItemId);

  if (enrollments && enrollments.length > 0) {
    const enrollmentIds = enrollments.map(e => e.id);
    await supabase
      .from('student_class_enrollments')
      .update({ status: 'cancelled' })
      .in('id', enrollmentIds);
  }

  // 4b. Grading registration cleanup for grading-fee or lesson refunds
  // ----------------------------------------------------------------
  // Two scenarios are handled term-agnostically:
  //   A) The refunded item IS the grading fee (grading_registrations.invoice_item_id === item.id)
  //      → If a sibling lesson item on the same invoice is still active, keep
  //        the registration row but clear slot/invoice link and untick Ready
  //        (so the student remains visible as Source B in the grading list).
  //      → If no sibling lesson item is active, delete the registration when
  //        no result has been recorded yet.
  //   B) The refunded item is a LESSON item paired with a grading registration
  //      whose grading fee item lives on the same invoice
  //      → If the grading item has also been refunded (or doesn't exist),
  //        delete the registration when no result has been recorded.
  //      → Otherwise leave the registration intact (grading still paid).
  try {
    // Pull all sibling items on the same invoice, including refund metadata,
    // so we can decide whether the grading fee or lesson side is still active.
    const { data: siblingItems } = await supabase
      .from('invoice_items')
      .select('id, product_id, metadata, products(category_id, is_lesson, product_categories(name))')
      .eq('invoice_id', invoice.id);

    const itemsList = (siblingItems || []) as any[];
    const isItemRefunded = (it: any): boolean => {
      const md = (it?.metadata as Record<string, any>) || {};
      return md?.refunded === true;
    };
    const itemCategoryName = (it: any): string => (it?.products?.product_categories?.name || '').toLowerCase();
    const itemIsLesson = (it: any): boolean => !!it?.products?.is_lesson;

    const refundedItemRow = itemsList.find(i => i.id === invoiceItemId);
    const isGradingItem = refundedItemRow ? itemCategoryName(refundedItemRow) === 'grading' : false;
    const isLessonItem = refundedItemRow ? itemIsLesson(refundedItemRow) : false;

    // Scenario A: grading fee refunded
    if (isGradingItem) {
      const { data: regsByItem } = await supabase
        .from('grading_registrations')
        .select('id, term_id, result, grading_slot_id, invoice_item_id')
        .eq('invoice_item_id', invoiceItemId);

      for (const reg of regsByItem || []) {
        // Treat the just-refunded item as already refunded for the active-lesson check
        const lessonStillActive = itemsList.some(
          i => i.id !== invoiceItemId && itemIsLesson(i) && !isItemRefunded(i)
        );
        if (lessonStillActive) {
          await supabase
            .from('grading_registrations')
            .update({
              ready_for_grading: false,
              grading_slot_id: null,
              invoice_item_id: null,
            })
            .eq('id', reg.id);
        } else if (!reg.result) {
          await supabase
            .from('grading_registrations')
            .delete()
            .eq('id', reg.id);
        }
        // If result is set, leave the row alone (grading already happened).
      }
    }

    // Scenario B: lesson item refunded — find any registration linked to a
    // grading item on the same invoice, for the same student.
    if (isLessonItem) {
      const gradingItemIds = itemsList
        .filter(i => itemCategoryName(i) === 'grading')
        .map(i => i.id);

      if (gradingItemIds.length > 0) {
        const { data: linkedRegs } = await supabase
          .from('grading_registrations')
          .select('id, result, invoice_item_id')
          .eq('student_id', invoice.student_id)
          .in('invoice_item_id', gradingItemIds);

        for (const reg of linkedRegs || []) {
          const gradingItem = itemsList.find(i => i.id === reg.invoice_item_id);
          const gradingRefunded = gradingItem ? isItemRefunded(gradingItem) : true;
          // The just-refunded lesson is the only one on the invoice if no other
          // active lesson items remain.
          const anotherLessonActive = itemsList.some(
            i => i.id !== invoiceItemId && itemIsLesson(i) && !isItemRefunded(i)
          );
          if (!anotherLessonActive && gradingRefunded && !reg.result) {
            await supabase
              .from('grading_registrations')
              .delete()
              .eq('id', reg.id);
          }
          // Otherwise leave the registration alone — grading is still paid.
        }
      }
    }
  } catch (gradingCleanupError) {
    logger.error('Grading registration cleanup after refund failed (non-fatal)', gradingCleanupError);
  }

  // 5. Mark item metadata as refunded
  const existingMetadata = (item.metadata as Record<string, any>) || {};
  await supabase
    .from('invoice_items')
    .update({
      metadata: {
        ...existingMetadata,
        refunded: true,
        refund_reason: reason,
        refunded_at: new Date().toISOString(),
      },
    })
    .eq('id', invoiceItemId);

  // 6. Recalculate invoice totals
  const newTotal = invoice.total_amount - item.total_amount;
  const newTax = invoice.tax_amount - item.tax_amount;
  const newSubtotal = invoice.subtotal - item.total_amount;
  const newBalance = newTotal - invoice.amount_paid;

  await supabase
    .from('invoices')
    .update({
      total_amount: Math.max(0, newTotal),
      tax_amount: Math.max(0, newTax),
      subtotal: Math.max(0, newSubtotal),
      balance_due: newBalance,
      updated_at: new Date().toISOString(),
    })
    .eq('id', invoice.id);

  // 7. Log the change
  await logInvoiceChange({
    invoice_id: invoice.id,
    action: 'item_removed',
    changes: {
      action: 'item_refund',
      item_description: productName,
      refund_amount: refundAmount,
      reason,
    },
  });
};

/**
 * Submit a line-item refund request for superadmin approval
 */
export const submitRefundRequest = async (
  invoiceId: string,
  invoiceItemId: string,
  reason: string,
  invoiceNumber: string,
  studentName: string,
  requestedByEmail: string
): Promise<void> => {
  await submitActionRequest(
    invoiceId,
    'item_refund' as any,
    { item_id: invoiceItemId, reason },
    invoiceNumber,
    studentName,
    requestedByEmail
  );
};
