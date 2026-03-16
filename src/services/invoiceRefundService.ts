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
