/**
 * Invoice Service
 * Handles all invoice-related database operations for the Sales Module
 */

import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';
import { COUNTRY_TAX_RATES, DEFAULT_TAX_RATE, COUNTRY_TAX_INCLUDED, DEFAULT_TAX_INCLUDED } from '@/config/constants';
import { logInvoiceChange } from './invoiceChangeLogService';
import { createEnrollment, createScheduledClass } from './classEnrollmentService';

// Get tax rate as decimal (e.g., 0.09 for 9%)
const getTaxRateForCountry = (country: string | null): number => {
  const percentage = country ? (COUNTRY_TAX_RATES[country] ?? DEFAULT_TAX_RATE) : DEFAULT_TAX_RATE;
  return percentage / 100;
};

// Check if tax is included in price for a country (e.g., Australia = true, Singapore = false)
const getIsTaxIncludedForCountry = (country: string | null): boolean => {
  return country ? (COUNTRY_TAX_INCLUDED[country] ?? DEFAULT_TAX_INCLUDED) : DEFAULT_TAX_INCLUDED;
};

export interface Invoice {
  id: string;
  invoice_number: string;
  student_id: string;
  student_name?: string; // Joined from students
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled' | 'partial' | 'verified';
  issue_date?: string;
  due_date?: string;
  payment_terms_days?: number;
  branch_id?: string;
  branch_currency?: string; // Currency from branch
  notes?: string;
  internal_notes?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  product_id: string;
  product_name?: string; // Joined from products
  product_sku?: string; // Joined from products
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  size_variant?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface InvoicesResponse {
  invoices: Invoice[];
  total: number;
}

export interface CreateInvoiceData {
  student_id: string;
  branch_id?: string;
  payment_terms_days?: number;
  notes?: string;
  internal_notes?: string;
  tax_included?: boolean;
  issue_date?: string; // YYYY-MM-DD; superadmin override (defaults to today)
  items: Array<{
    product_id: string;
    description: string;
    quantity: number;
    unit_price: number;
    size_variant?: string;
    total_override?: number;
    metadata?: Record<string, any>;
  }>;
}

/**
 * Get invoices with pagination and filtering
 */
export const getInvoices = async (
  page: number = 1,
  limit: number = 20,
  searchQuery?: string,
  statusFilter?: string,
  studentFilter?: string
): Promise<InvoicesResponse> => {
  try {
    let query = supabase
      .from('invoices')
      .select(`
        *,
        students(first_name, last_name, email)
      `, { count: 'exact' });

    // Apply search filter (invoice number only - student name filtering done client-side)
    if (searchQuery) {
      query = query.or(`invoice_number.ilike.%${searchQuery}%`);
    }

    // Apply status filter
    if (statusFilter) {
      query = query.eq('status', statusFilter);
    }

    // Apply student filter
    if (studentFilter) {
      query = query.eq('student_id', studentFilter);
    }

    // Order by status (unpaid/draft first) then by created date (newest first)
    // Note: Supabase doesn't support custom ordering, so we sort client-side for status priority
    query = query.order('created_at', { ascending: false });

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      logger.error('Error fetching invoices', error);
      throw new Error(`Failed to fetch invoices: ${error.message}`);
    }

    // Get branch currencies for invoices with branch_id
    const branchIds = [...new Set((data || []).filter(inv => inv.branch_id).map(inv => inv.branch_id))];
    let branchCurrencies: Record<string, string> = {};
    
    if (branchIds.length > 0) {
      const { data: branches } = await supabase
        .from('branches')
        .select('id, currency')
        .in('id', branchIds);
      
      if (branches) {
        branchCurrencies = branches.reduce((acc, branch) => {
          acc[branch.id] = branch.currency || 'SGD';
          return acc;
        }, {} as Record<string, string>);
      }
    }

    // Transform the data to include student name and branch currency
    const transformedInvoices = (data || []).map(invoice => ({
      ...invoice,
      student_name: invoice.students ? `${invoice.students.first_name} ${invoice.students.last_name}` : 'Unknown Student',
      branch_currency: invoice.branch_id ? branchCurrencies[invoice.branch_id] || 'SGD' : 'SGD'
    })) as Invoice[];

    return {
      invoices: transformedInvoices,
      total: count || 0
    };
  } catch (error) {
    logger.error('Error in getInvoices', error);
    throw error;
  }
};

/**
 * Get a single invoice by ID with items
 */
export const getInvoiceById = async (invoiceId: string): Promise<Invoice & { items: InvoiceItem[] } | null> => {
  try {
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        *,
        students(first_name, last_name, email)
      `)
      .eq('id', invoiceId)
      .single();

    if (invoiceError) {
      if (invoiceError.code === 'PGRST116') {
        return null; // Invoice not found
      }
      throw new Error(`Failed to fetch invoice: ${invoiceError.message}`);
    }

    // Get invoice items
    const { data: items, error: itemsError } = await supabase
      .from('invoice_items')
      .select(`
        *,
        products(name, sku)
      `)
      .eq('invoice_id', invoiceId)
      .order('created_at', { ascending: true });

    if (itemsError) {
      logger.error('Error fetching invoice items', itemsError);
      throw new Error(`Failed to fetch invoice items: ${itemsError.message}`);
    }

    // Transform items to include product info
    const transformedItems = (items || []).map(item => ({
      ...item,
      product_name: item.products?.name || '',
      product_sku: item.products?.sku || '',
      metadata: item.metadata as Record<string, any> || {}
    })) as InvoiceItem[];

    return {
      ...invoice,
      student_name: invoice.students ? `${invoice.students.first_name} ${invoice.students.last_name}` : 'Unknown Student',
      items: transformedItems
    } as Invoice & { items: InvoiceItem[] };
  } catch (error) {
    logger.error('Error in getInvoiceById', error);
    throw error;
  }
};

/**
 * Create a new invoice with items
 */
export const createInvoice = async (invoiceData: CreateInvoiceData): Promise<Invoice> => {
  try {
    // Generate invoice number
    const invoiceNumber = await generateInvoiceNumber();
    
    // Get branch country for tax rate
    let branchCountry: string | null = null;
    if (invoiceData.branch_id) {
      const { data: branch } = await supabase
        .from('branches')
        .select('country')
        .eq('id', invoiceData.branch_id)
        .single();
      branchCountry = branch?.country || null;
    }
    
    const taxRate = getTaxRateForCountry(branchCountry);
    const isTaxIncluded = invoiceData.tax_included !== undefined
      ? invoiceData.tax_included
      : getIsTaxIncludedForCountry(branchCountry);
    
    // Calculate totals based on tax inclusion setting
    let subtotal = 0;
    let taxAmount = 0;
    
    for (const item of invoiceData.items) {
      const itemPrice = item.total_override != null ? item.total_override : item.quantity * item.unit_price;
      
      if (isTaxIncluded) {
        const itemSubtotal = itemPrice / (1 + taxRate);
        const itemTax = itemPrice - itemSubtotal;
        subtotal += itemSubtotal;
        taxAmount += itemTax;
      } else {
        subtotal += itemPrice;
        taxAmount += itemPrice * taxRate;
      }
    }
    
    const totalAmount = subtotal + taxAmount;
    const balanceDue = totalAmount;

    // Calculate dates — honour superadmin-supplied issue_date if provided
    const toISODateLocal = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };
    const issueDateStr = invoiceData.issue_date || toISODateLocal(new Date());
    const issueDate = new Date(issueDateStr + 'T00:00:00');
    const dueDate = new Date(issueDate);
    dueDate.setDate(dueDate.getDate() + (invoiceData.payment_terms_days || 30));

    // Create invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert([{
        invoice_number: invoiceNumber,
        student_id: invoiceData.student_id,
        subtotal,
        tax_amount: taxAmount,
        discount_amount: 0,
        total_amount: totalAmount,
        amount_paid: 0,
        balance_due: balanceDue,
        status: 'draft',
        issue_date: issueDateStr,
        due_date: toISODateLocal(dueDate),
        payment_terms_days: invoiceData.payment_terms_days || 30,
        branch_id: invoiceData.branch_id,
        notes: invoiceData.notes,
        internal_notes: invoiceData.internal_notes
      }])
      .select(`
        *,
        students(first_name, last_name, email)
      `)
      .single();

    if (invoiceError) {
      throw new Error(`Failed to create invoice: ${invoiceError.message}`);
    }

    // Create invoice items with proper tax calculation
    const itemsToInsert = invoiceData.items.map(item => {
      const itemPrice = item.total_override != null ? item.total_override : item.quantity * item.unit_price;
      
      let itemSubtotal: number;
      let itemTaxAmount: number;
      let itemTotal: number;
      
      if (isTaxIncluded) {
        itemTotal = itemPrice;
        itemSubtotal = itemPrice / (1 + taxRate);
        itemTaxAmount = itemPrice - itemSubtotal;
      } else {
        itemSubtotal = itemPrice;
        itemTaxAmount = itemPrice * taxRate;
        itemTotal = itemSubtotal + itemTaxAmount;
      }
      
      return {
        invoice_id: invoice.id,
        product_id: item.product_id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        tax_rate: taxRate,
        tax_amount: itemTaxAmount,
        total_amount: itemTotal,
        size_variant: item.size_variant,
        metadata: item.metadata
      };
    });

    const { data: insertedItems, error: itemsError } = await supabase
      .from('invoice_items')
      .insert(itemsToInsert)
      .select('id, product_id');

    if (itemsError) {
      // Try to clean up the invoice if items creation failed
      await supabase.from('invoices').delete().eq('id', invoice.id);
      throw new Error(`Failed to create invoice items: ${itemsError.message}`);
    }

    // Create entitlements for lesson/class products
    if (insertedItems && insertedItems.length > 0) {
      const productIds = [...new Set(insertedItems.map(i => i.product_id))];
      const { data: productDetails } = await supabase
        .from('products')
        .select('id, is_lesson, session_count, validity_type, validity_months, term_id, allowed_class_types, name, category_id, product_categories(name)')
        .in('id', productIds);

      if (productDetails) {
        const lessonProducts = new Map(
          productDetails.filter(p => p.is_lesson)
            .map(p => [p.id, p])
        );

        // Map of product id -> { name, category_name } for grading-product matching
        const productMetaMap = new Map<string, { name: string; category_name: string | null }>(
          productDetails.map(p => [
            p.id,
            {
              name: p.name || '',
              category_name: (p as any).product_categories?.name ?? null,
            },
          ])
        );

        // Auto-create grading_registrations for EVERY grading-category line item
        // on this invoice. Parse the belt transition from the product name itself
        // (e.g. "Green >> Blue Tip") so this works for double-belt gradings and
        // for invoices where the student's current_belt has already been
        // advanced. Lesson-only invoices (no Grading-category items) still
        // produce no registration.
        try {
          // Lazy-load belt helpers to avoid circular imports
          const { formatBeltLevel } = await import('@/constants/beltLevels');

          const [{ data: studentRow }, { data: authData }] = await Promise.all([
            supabase.from('students').select('current_belt').eq('id', invoiceData.student_id).maybeSingle(),
            supabase.auth.getUser(),
          ]);
          const studentCurrentBelt = studentRow?.current_belt || null;
          const createdByEmail = authData?.user?.email || null;

          // Helper: resolve term_id from a grading slot's date+branch
          const resolveTermFromSlot = async (slotId: string): Promise<string | null> => {
            const { data: slot } = await supabase
              .from('grading_slots')
              .select('grading_date, branch_id')
              .eq('id', slotId)
              .maybeSingle();
            if (!slot?.grading_date) return null;
            const slotBranchId = slot.branch_id || invoiceData.branch_id;
            const slotDate = slot.grading_date;

            const { data: inWindow } = await supabase
              .from('term_calendars')
              .select('id, start_date, end_date')
              .eq('branch_id', slotBranchId)
              .lte('start_date', slotDate)
              .gte('end_date', slotDate)
              .limit(1);
            if (inWindow && inWindow.length > 0) return inWindow[0].id;

            const { data: prevTerm } = await supabase
              .from('term_calendars')
              .select('id, end_date')
              .eq('branch_id', slotBranchId)
              .lte('end_date', slotDate)
              .order('end_date', { ascending: false })
              .limit(1);
            if (prevTerm && prevTerm.length > 0) return prevTerm[0].id;

            const { data: nextTerm } = await supabase
              .from('term_calendars')
              .select('id, start_date')
              .eq('branch_id', slotBranchId)
              .gte('start_date', slotDate)
              .order('start_date', { ascending: true })
              .limit(1);
            if (nextTerm && nextTerm.length > 0) return nextTerm[0].id;

            return null;
          };

          // Parse "From >> To" → { from, to }. Accepts "From>>To" or "From - To" too.
          const parseBeltTransition = (name: string): { from: string | null; to: string | null } => {
            if (!name) return { from: null, to: null };
            const parts = name.split(/\s*>>\s*|\s+-\s+/);
            if (parts.length < 2) return { from: null, to: null };
            return { from: parts[0].trim() || null, to: parts[parts.length - 1].trim() || null };
          };

          // A grading registration is auto-marked Ready only when the term has started.
          // Future-term grading (e.g. invoiced today for next term) defaults to Not Ready
          // until the term's start_date is reached.
          const todayStr = new Date().toISOString().split('T')[0];
          const termStartedCache = new Map<string, boolean>();
          const isTermStarted = async (termId: string): Promise<boolean> => {
            if (termStartedCache.has(termId)) return termStartedCache.get(termId)!;
            const { data: termRow } = await supabase
              .from('term_calendars')
              .select('start_date')
              .eq('id', termId)
              .maybeSingle();
            const started = !!(termRow?.start_date && termRow.start_date <= todayStr);
            termStartedCache.set(termId, started);
            return started;
          };

          // Lesson-derived term ids on this invoice (used as fallback when no slot is set)
          const lessonTermIds = new Set<string>();
          for (const insertedItem of insertedItems) {
            const product = lessonProducts.get(insertedItem.product_id);
            if (!product) continue;
            const originalItem = invoiceData.items.find(i => i.product_id === insertedItem.product_id);
            const itemMetadata = originalItem?.metadata;
            const termId = itemMetadata?.term_id || itemMetadata?.term_ids?.[0] || product.term_id;
            if (termId) lessonTermIds.add(termId);
          }

          // Iterate every Grading-category line item on this invoice
          for (const insertedItem of insertedItems) {
            const meta = productMetaMap.get(insertedItem.product_id);
            if (!meta) continue;
            if ((meta.category_name || '').toLowerCase() !== 'grading') continue;

            const originalItem = invoiceData.items.find(i => i.product_id === insertedItem.product_id);
            const slotId = originalItem?.metadata?.grading_slot_id || null;

            // Term id: 1) slot-derived  2) item metadata  3) any lesson term on this invoice
            let termId: string | null = null;
            if (slotId) termId = await resolveTermFromSlot(slotId);
            if (!termId) termId = originalItem?.metadata?.term_id || originalItem?.metadata?.term_ids?.[0] || null;
            if (!termId && lessonTermIds.size > 0) termId = Array.from(lessonTermIds)[0];
            if (!termId) continue; // can't place this registration without a term

            // Belt transition derived from the product name; fall back to student's belt
            const { from: parsedFrom, to: parsedTo } = parseBeltTransition(meta.name || '');
            // Source of truth for current_belt is the student's live belt — the invoice
            // product name is just a price/SKU label and may not match reality.
            const currentBelt = studentCurrentBelt || parsedFrom || 'White';
            const targetBelt = parsedTo || studentCurrentBelt || 'White';

            // Term-aware Ready: only auto-mark Ready if the term has already started.
            // Future-term grading (e.g. Term 2 invoiced today) defaults to Not Ready
            // and the UI/lazy sync will flip it once the term begins.
            const readyForGrading = await isTermStarted(termId);

            // Idempotent on (invoice_item_id) — a grading line item maps to exactly one registration
            const { data: existingByItem } = await supabase
              .from('grading_registrations')
              .select('id')
              .eq('invoice_item_id', insertedItem.id)
              .maybeSingle();
            if (existingByItem) continue;

            // Otherwise look for an existing (student_id, term_id) row that has no invoice_item_id yet
            const { data: existingByTerm } = await supabase
              .from('grading_registrations')
              .select('id, grading_slot_id, invoice_item_id, ready_for_grading')
              .eq('student_id', invoiceData.student_id)
              .eq('term_id', termId)
              .is('invoice_item_id', null)
              .maybeSingle();

            if (existingByTerm) {
              const updatePayload: any = {
                // Preserve an already-true flag (e.g. set manually); only escalate to true
                // when the term has started.
                ready_for_grading: existingByTerm.ready_for_grading === true ? true : readyForGrading,
                current_belt: currentBelt,
                target_belt: targetBelt,
                invoice_item_id: insertedItem.id,
              };
              if (!existingByTerm.grading_slot_id && slotId) {
                updatePayload.grading_slot_id = slotId;
              }
              await supabase
                .from('grading_registrations')
                .update(updatePayload)
                .eq('id', existingByTerm.id);
            } else {
              await supabase
                .from('grading_registrations')
                .insert([{
                  student_id: invoiceData.student_id,
                  term_id: termId,
                  current_belt: currentBelt,
                  target_belt: targetBelt,
                  ready_for_grading: readyForGrading,
                  invoice_item_id: insertedItem.id,
                  grading_slot_id: slotId,
                  result: null,
                  created_by: createdByEmail,
                }]);
            }
          }
        } catch (gradingRegError) {
          logger.error('Failed to auto-create grading registrations (non-fatal)', gradingRegError);
          // Non-fatal — invoice still valid
        }

        const entitlementsToCreate = [];
        for (const insertedItem of insertedItems) {
          const product = lessonProducts.get(insertedItem.product_id);
          if (!product) continue;

          const originalItem = invoiceData.items.find(i => i.product_id === insertedItem.product_id);
          const quantity = originalItem?.quantity || 1;
          // Use session_count if set, otherwise use quantity as session count
          const totalSessions = (product.session_count && product.session_count > 0) 
            ? product.session_count * quantity 
            : quantity;

          // Calculate validity dates
          let validFrom: string | null = new Date().toISOString().split('T')[0];
          let validTo: string | null = null;

          // Try to get term end date from item metadata
          const itemMetadata = originalItem?.metadata;
          const termId = itemMetadata?.term_id || itemMetadata?.term_ids?.[0] || product.term_id;
          if (termId) {
            const { data: termData } = await supabase
              .from('term_calendars')
              .select('start_date, end_date')
              .eq('id', termId)
              .maybeSingle();
            if (termData) {
              if (termData.start_date) validFrom = termData.start_date;
              if (termData.end_date) validTo = termData.end_date;
            }
          } else if (product.validity_type === 'months' && product.validity_months) {
            const end = new Date();
            end.setMonth(end.getMonth() + product.validity_months);
            validTo = end.toISOString().split('T')[0];
          }

          entitlementsToCreate.push({
            student_id: invoiceData.student_id,
            product_id: product.id,
            source_type: 'invoice_item',
            source_id: insertedItem.id,
            sessions_total: totalSessions,
            sessions_used: 0,
            is_active: true,
            valid_from: validFrom,
            valid_to: validTo,
            branch_scope: invoiceData.branch_id || null,
            class_type_scope: product.allowed_class_types?.join(',') || null,
            notes: `Auto-created from invoice ${invoiceNumber}`,
          });
        }

        if (entitlementsToCreate.length > 0) {
          const { error: entitlementError } = await supabase
            .from('entitlements')
            .insert(entitlementsToCreate);
          if (entitlementError) {
            logger.error('Failed to create entitlements', entitlementError);
            // Non-fatal - invoice is still valid
          }
        }

        // Create class enrollments and scheduled classes for items with class slots
        try {
          for (const insertedItem of insertedItems) {
            const originalItem = invoiceData.items.find(i => i.product_id === insertedItem.product_id);
            const itemMetadata = originalItem?.metadata;
            
            // Only process items that have selected class slots and a term
            const selectedClassSlots = itemMetadata?.selected_class_slots as string[] | undefined;
            const termId = itemMetadata?.term_id || itemMetadata?.term_ids?.[0];
            
            if (!selectedClassSlots || selectedClassSlots.length === 0 || !termId) continue;
            
            const product = productDetails?.find(p => p.id === insertedItem.product_id);
            const className = product?.name || 'Class';
            const branchId = invoiceData.branch_id;
            
            if (!branchId) continue;

            // Create enrollment
            const enrollmentId = await createEnrollment({
              student_id: invoiceData.student_id,
              term_id: termId,
              branch_id: branchId,
              class_type: className,
              tier_name: className,
              total_price: originalItem?.quantity 
                ? originalItem.quantity * originalItem.unit_price 
                : 0,
              invoice_item_id: insertedItem.id,
            });

            // Get timetable data for the selected slots (including class_type for accurate enrollment)
            const timetableIds = [...new Set(selectedClassSlots.map(s => s.split('_')[0]))];
            const { data: timetables } = await supabase
              .from('branch_timetables')
              .select('id, start_time, end_time, class_type')
              .in('id', timetableIds);

            const timetableMap = new Map(timetables?.map(t => [t.id, t]) || []);
            
            // Use the timetable's class_type for the enrollment (more accurate than product name)
            const firstTimetable = timetables?.[0];
            if (firstTimetable?.class_type) {
              // Update the enrollment's class_type to match the timetable
              await supabase
                .from('student_class_enrollments')
                .update({ class_type: firstTimetable.class_type })
                .eq('id', enrollmentId);
            }

            for (const slot of selectedClassSlots) {
              const [timetableId, date] = slot.split('_');
              const timetable = timetableMap.get(timetableId);
              if (timetable && date) {
                await createScheduledClass({
                  enrollment_id: enrollmentId,
                  timetable_id: timetableId,
                  scheduled_date: date,
                  start_time: timetable.start_time,
                  end_time: timetable.end_time,
                });
              }
            }

            logger.info(`Created enrollment and ${selectedClassSlots.length} scheduled classes for invoice ${invoiceNumber}`);
          }
        } catch (enrollmentError) {
          logger.error('Failed to create enrollments/scheduled classes (non-fatal)', enrollmentError);
          // Non-fatal - invoice is still valid
        }
      }
    }

    // Log the creation
    await logInvoiceChange({
      invoice_id: invoice.id,
      action: 'created',
      changes: {
        invoice_number: invoiceNumber,
        student_id: invoiceData.student_id,
        total_amount: totalAmount,
        items_count: invoiceData.items.length
      }
    });

    return {
      ...invoice,
      student_name: invoice.students ? `${invoice.students.first_name} ${invoice.students.last_name}` : 'Unknown Student'
    } as Invoice;
  } catch (error) {
    logger.error('Error in createInvoice', error);
    throw error;
  }
};

/**
 * Update invoice status
 */
export const updateInvoiceStatus = async (
  invoiceId: string, 
  status: Invoice['status']
): Promise<Invoice> => {
  try {
    // Get current status first for logging
    const { data: currentInvoice } = await supabase
      .from('invoices')
      .select('status')
      .eq('id', invoiceId)
      .single();

    const oldStatus = currentInvoice?.status;

    const { data, error } = await supabase
      .from('invoices')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', invoiceId)
      .select(`
        *,
        students(first_name, last_name, email)
      `)
      .single();

    if (error) {
      throw new Error(`Failed to update invoice status: ${error.message}`);
    }

    // Log the status change
    if (oldStatus !== status) {
      await logInvoiceChange({
        invoice_id: invoiceId,
        action: 'status_changed',
        field_name: 'status',
        old_value: oldStatus,
        new_value: status
      });
    }

    return {
      ...data,
      student_name: data.students ? `${data.students.first_name} ${data.students.last_name}` : 'Unknown Student'
    } as Invoice;
  } catch (error) {
    logger.error('Error in updateInvoiceStatus', error);
    throw error;
  }
};

/**
 * Delete an invoice and its items
 */
export const deleteInvoice = async (invoiceId: string): Promise<void> => {
  try {
    // Get invoice details for logging before deletion
    const { data: invoice } = await supabase
      .from('invoices')
      .select('invoice_number, total_amount, status, student_id, branch_id')
      .eq('id', invoiceId)
      .single();

    // Log the deletion before actually deleting (since cascade will delete logs too)
    if (invoice) {
      await logInvoiceChange({
        invoice_id: invoiceId,
        action: 'deleted',
        changes: {
          invoice_number: invoice.invoice_number,
          total_amount: invoice.total_amount,
          status: invoice.status
        }
      });
    }

    // Get invoice items to find linked enrollments
    const { data: invoiceItems, error: invoiceItemsFetchError } = await supabase
      .from('invoice_items')
      .select('id, metadata')
      .eq('invoice_id', invoiceId);

    if (invoiceItemsFetchError) {
      throw new Error(`Failed to fetch invoice items: ${invoiceItemsFetchError.message}`);
    }

    const itemIds = (invoiceItems || []).map(item => item.id);
    // Capture term_ids from item metadata for orphan grading_registration cleanup
    const itemTermIds = new Set<string>();
    (invoiceItems || []).forEach((it: any) => {
      const md = it.metadata as Record<string, any> | null;
      const tid = md?.term_id || md?.term_ids?.[0];
      if (tid) itemTermIds.add(tid);
    });

    // Thorough cleanup of all related data in FK-safe order
    if (itemIds.length > 0) {
      // 1. Delete grading_registrations linked to these invoice items (removes grading test data)
      const { error: gradingRegistrationsDeleteError } = await supabase
        .from('grading_registrations')
        .delete()
        .in('invoice_item_id', itemIds);

      if (gradingRegistrationsDeleteError) {
        throw new Error(`Failed to delete grading registrations: ${gradingRegistrationsDeleteError.message}`);
      }

      // 1b. Delete auto-created grading_registrations (invoice_item_id IS NULL)
      // for this student+term that have no result and no linked grading invoice item.
      if (invoice?.student_id && itemTermIds.size > 0) {
        const { error: autoRegDeleteError } = await supabase
          .from('grading_registrations')
          .delete()
          .eq('student_id', invoice.student_id)
          .in('term_id', Array.from(itemTermIds))
          .is('invoice_item_id', null)
          .is('result', null);

        if (autoRegDeleteError) {
          logger.error('Failed to delete auto-created grading registrations (non-fatal)', autoRegDeleteError);
          // Non-fatal — proceed with rest of cleanup
        }
      }

      // 2. Get entitlement IDs linked to these invoice items
      const { data: entitlements, error: entitlementsFetchError } = await supabase
        .from('entitlements')
        .select('id')
        .in('source_id', itemIds)
        .eq('source_type', 'invoice_item');

      if (entitlementsFetchError) {
        throw new Error(`Failed to fetch entitlements: ${entitlementsFetchError.message}`);
      }

      if (entitlements && entitlements.length > 0) {
        const entitlementIds = entitlements.map(e => e.id);

        // 3. Hard-delete class_attendance records linked to these entitlements
        const { error: entitlementAttendanceDeleteError } = await supabase
          .from('class_attendance')
          .delete()
          .in('entitlement_id', entitlementIds);

        if (entitlementAttendanceDeleteError) {
          throw new Error(`Failed to delete entitlement-linked attendance: ${entitlementAttendanceDeleteError.message}`);
        }

        // 4. Hard delete entitlements
        const { error: entitlementsDeleteError } = await supabase
          .from('entitlements')
          .delete()
          .in('id', entitlementIds);

        if (entitlementsDeleteError) {
          throw new Error(`Failed to delete entitlements: ${entitlementsDeleteError.message}`);
        }
      }

      // 5. Find and delete enrollments + scheduled classes
      const { data: enrollments, error: enrollmentsFetchError } = await supabase
        .from('student_class_enrollments')
        .select('id')
        .in('invoice_item_id', itemIds);

      if (enrollmentsFetchError) {
        throw new Error(`Failed to fetch enrollments: ${enrollmentsFetchError.message}`);
      }

      if (enrollments && enrollments.length > 0) {
        const enrollmentIds = enrollments.map(e => e.id);

        // Delete scheduled classes (hard delete)
        const { error: scheduledClassesDeleteError } = await supabase
          .from('student_scheduled_classes')
          .delete()
          .in('enrollment_id', enrollmentIds);

        if (scheduledClassesDeleteError) {
          throw new Error(`Failed to delete scheduled classes: ${scheduledClassesDeleteError.message}`);
        }

        // Delete enrollments (hard delete)
        const { error: enrollmentsDeleteError } = await supabase
          .from('student_class_enrollments')
          .delete()
          .in('id', enrollmentIds);

        if (enrollmentsDeleteError) {
          throw new Error(`Failed to delete enrollments: ${enrollmentsDeleteError.message}`);
        }
      }
    }

    // 6. Clean up remaining auto-scheduled attendance for this student+branch
    // (important when old records are detached from entitlements)
    if (invoice?.student_id && invoice?.branch_id) {
      const { error: autoScheduledAttendanceDeleteError } = await supabase
        .from('class_attendance')
        .delete()
        .eq('student_id', invoice.student_id)
        .eq('branch_id', invoice.branch_id)
        .eq('attendance_method', 'auto_scheduled');

      if (autoScheduledAttendanceDeleteError) {
        throw new Error(`Failed to delete auto-scheduled attendance: ${autoScheduledAttendanceDeleteError.message}`);
      }
    }

    // 7. Delete payments linked to this invoice
    const { error: paymentsDeleteError } = await supabase
      .from('payments')
      .delete()
      .eq('invoice_id', invoiceId);

    if (paymentsDeleteError) {
      throw new Error(`Failed to delete payments: ${paymentsDeleteError.message}`);
    }

    // Delete invoice items (foreign key constraint)
    const { error: itemsError } = await supabase
      .from('invoice_items')
      .delete()
      .eq('invoice_id', invoiceId);

    if (itemsError) {
      throw new Error(`Failed to delete invoice items: ${itemsError.message}`);
    }

    // Delete the invoice
    const { error: invoiceError } = await supabase
      .from('invoices')
      .delete()
      .eq('id', invoiceId);

    if (invoiceError) {
      throw new Error(`Failed to delete invoice: ${invoiceError.message}`);
    }
  } catch (error) {
    logger.error('Error in deleteInvoice', error);
    throw error;
  }
};

/**
 * Generate a unique invoice number
 */
const generateInvoiceNumber = async (): Promise<string> => {
  const currentYear = new Date().getFullYear();
  const prefix = `INV-${currentYear}-`;
  
  // Get the highest invoice number for this year
  const { data, error } = await supabase
    .from('invoices')
    .select('invoice_number')
    .like('invoice_number', `${prefix}%`)
    .order('invoice_number', { ascending: false })
    .limit(1);

  if (error) {
    logger.error('Error generating invoice number', error);
    // Fallback to timestamp-based number
    return `${prefix}${Date.now()}`;
  }

  let nextNumber = 1;
  if (data && data.length > 0) {
    const lastNumber = data[0].invoice_number.replace(prefix, '');
    nextNumber = parseInt(lastNumber) + 1;
  }

  return `${prefix}${nextNumber.toString().padStart(5, '0')}`;
};

/**
 * Get invoice statistics
 */
export const getInvoiceStats = async (): Promise<{
  totalInvoices: number;
  totalRevenue: number;
  paidInvoices: number;
  overdueInvoices: number;
}> => {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select('status, total_amount, balance_due, due_date');

    if (error) {
      throw new Error(`Failed to fetch invoice stats: ${error.message}`);
    }

    const stats = {
      totalInvoices: data?.length || 0,
      totalRevenue: 0,
      paidInvoices: 0,
      overdueInvoices: 0
    };

    const currentDate = new Date().toISOString().split('T')[0];

    data?.forEach(invoice => {
      stats.totalRevenue += invoice.total_amount || 0;
      
      if (invoice.status === 'paid') {
        stats.paidInvoices++;
      }
      
      if (invoice.status !== 'paid' && invoice.status !== 'cancelled' && invoice.due_date < currentDate) {
        stats.overdueInvoices++;
      }
    });

    return stats;
  } catch (error) {
    logger.error('Error in getInvoiceStats', error);
    throw error;
  }
};

/**
 * Get sibling discount amount for a student.
 * Siblings are identified by sharing the same email address.
 * If 2+ active students share the same email, each gets $20 off term invoices.
 */
export const getSiblingDiscount = async (studentId: string): Promise<number> => {
  try {
    // Get the student's email
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('email')
      .eq('id', studentId)
      .single();

    if (studentError || !student?.email) return 0;

    // Count active students with the same email
    const { count, error: countError } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true })
      .eq('email', student.email)
      .eq('status', 'active');

    if (countError) {
      logger.error('Error checking sibling count', countError);
      return 0;
    }

    // If 2 or more students share the email, apply $20 discount
    return (count && count >= 2) ? 20 : 0;
  } catch (error) {
    logger.error('Error in getSiblingDiscount', error);
    return 0;
  }
};

/**
 * Cancel an invoice and refund all payments as student credits
 */
export const cancelInvoice = async (invoiceId: string): Promise<void> => {
  try {
    // Get invoice details
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*, students(first_name, last_name)')
      .eq('id', invoiceId)
      .single();

    if (invoiceError || !invoice) {
      throw new Error('Invoice not found');
    }

    // Get all payments for this invoice
    const { data: payments } = await supabase
      .from('payments')
      .select('id, amount')
      .eq('invoice_id', invoiceId);

    const totalPaid = (payments || []).reduce((sum, p) => sum + Number(p.amount), 0);

    // Refund payments as student credits
    if (totalPaid > 0) {
      const { error: creditError } = await supabase
        .from('student_credits')
        .insert({
          student_id: invoice.student_id,
          amount: totalPaid,
          type: 'refund',
          reference_id: invoiceId,
          description: `Refund from cancelled Invoice #${invoice.invoice_number}`,
        });

      if (creditError) {
        logger.error('Error creating refund credit', creditError);
        throw new Error(`Failed to create refund credit: ${creditError.message}`);
      }
    }

    // Deactivate entitlements linked to this invoice's items
    const { data: items } = await supabase
      .from('invoice_items')
      .select('id')
      .eq('invoice_id', invoiceId);

    if (items && items.length > 0) {
      const itemIds = items.map(i => i.id);
      await supabase
        .from('entitlements')
        .update({ is_active: false, notes: 'Deactivated - invoice cancelled' })
        .in('source_id', itemIds)
        .eq('source_type', 'invoice_item');

      // Deactivate enrollments
      const { data: enrollments } = await supabase
        .from('student_class_enrollments')
        .select('id')
        .in('invoice_item_id', itemIds);

      if (enrollments && enrollments.length > 0) {
        const enrollmentIds = enrollments.map(e => e.id);
        await supabase
          .from('student_class_enrollments')
          .update({ status: 'cancelled' })
          .in('id', enrollmentIds);
      }
    }

    // Update invoice status to cancelled
    const { error: updateError } = await supabase
      .from('invoices')
      .update({
        status: 'cancelled',
        balance_due: 0,
        updated_at: new Date().toISOString()
      })
      .eq('id', invoiceId);

    if (updateError) {
      throw new Error(`Failed to cancel invoice: ${updateError.message}`);
    }

    // Log the cancellation
    await logInvoiceChange({
      invoice_id: invoiceId,
      action: 'cancelled',
      changes: {
        invoice_number: invoice.invoice_number,
        total_refunded: totalPaid,
      }
    });
  } catch (error) {
    logger.error('Error in cancelInvoice', error);
    throw error;
  }
};
/**
 * Sync grading registrations for an invoice based on its current Grading-category
 * line items. Idempotent — uses (invoice_item_id) and (student_id, term_id) lookups.
 * Call this after creating OR editing an invoice's items so that adjustments which
 * add/remove grading line items immediately reflect in the grading list.
 */
export const syncGradingRegistrationsForInvoice = async (invoiceId: string): Promise<void> => {
  try {
    const { data: invoice } = await supabase
      .from('invoices')
      .select('id, student_id, branch_id')
      .eq('id', invoiceId)
      .maybeSingle();
    if (!invoice?.student_id) return;

    const { data: items } = await supabase
      .from('invoice_items')
      .select('id, product_id, metadata')
      .eq('invoice_id', invoiceId);
    if (!items || items.length === 0) return;

    const productIds = [...new Set(items.map(i => i.product_id).filter(Boolean))] as string[];
    if (productIds.length === 0) return;

    const { data: productDetails } = await supabase
      .from('products')
      .select('id, is_lesson, term_id, name, category_id, product_categories(name)')
      .in('id', productIds);
    if (!productDetails) return;

    const productMetaMap = new Map<string, { name: string; category_name: string | null; is_lesson: boolean; term_id: string | null }>(
      productDetails.map(p => [
        p.id,
        {
          name: p.name || '',
          category_name: (p as any).product_categories?.name ?? null,
          is_lesson: !!p.is_lesson,
          term_id: (p as any).term_id ?? null,
        },
      ])
    );

    const { data: studentRow } = await supabase
      .from('students')
      .select('current_belt')
      .eq('id', invoice.student_id)
      .maybeSingle();
    const studentCurrentBelt = studentRow?.current_belt || null;
    const { data: authData } = await supabase.auth.getUser();
    const createdByEmail = authData?.user?.email || null;

    const resolveTermFromSlot = async (slotId: string): Promise<string | null> => {
      const { data: slot } = await supabase
        .from('grading_slots')
        .select('grading_date, branch_id')
        .eq('id', slotId)
        .maybeSingle();
      if (!slot?.grading_date) return null;
      const slotBranchId = slot.branch_id || invoice.branch_id;
      const slotDate = slot.grading_date;
      const { data: inWindow } = await supabase
        .from('term_calendars')
        .select('id')
        .eq('branch_id', slotBranchId)
        .lte('start_date', slotDate)
        .gte('end_date', slotDate)
        .limit(1);
      if (inWindow && inWindow.length > 0) return inWindow[0].id;
      const { data: prevTerm } = await supabase
        .from('term_calendars')
        .select('id')
        .eq('branch_id', slotBranchId)
        .lte('end_date', slotDate)
        .order('end_date', { ascending: false })
        .limit(1);
      if (prevTerm && prevTerm.length > 0) return prevTerm[0].id;
      const { data: nextTerm } = await supabase
        .from('term_calendars')
        .select('id')
        .eq('branch_id', slotBranchId)
        .gte('start_date', slotDate)
        .order('start_date', { ascending: true })
        .limit(1);
      if (nextTerm && nextTerm.length > 0) return nextTerm[0].id;
      return null;
    };

    const parseBeltTransition = (name: string): { from: string | null; to: string | null } => {
      if (!name) return { from: null, to: null };
      const parts = name.split(/\s*>>\s*|\s+-\s+/);
      if (parts.length < 2) return { from: null, to: null };
      return { from: parts[0].trim() || null, to: parts[parts.length - 1].trim() || null };
    };

    const todayStr = new Date().toISOString().split('T')[0];
    const termStartedCache = new Map<string, boolean>();
    const isTermStarted = async (termId: string): Promise<boolean> => {
      if (termStartedCache.has(termId)) return termStartedCache.get(termId)!;
      const { data: termRow } = await supabase
        .from('term_calendars')
        .select('start_date')
        .eq('id', termId)
        .maybeSingle();
      const started = !!(termRow?.start_date && termRow.start_date <= todayStr);
      termStartedCache.set(termId, started);
      return started;
    };

    // Lesson-derived term ids on this invoice (fallback for grading items missing slot/term)
    const lessonTermIds = new Set<string>();
    for (const item of items) {
      const meta = productMetaMap.get(item.product_id);
      if (!meta?.is_lesson) continue;
      const itemMeta: any = item.metadata || {};
      const termId = itemMeta?.term_id || itemMeta?.term_ids?.[0] || meta.term_id;
      if (termId) lessonTermIds.add(termId);
    }

    for (const item of items) {
      const meta = productMetaMap.get(item.product_id);
      if (!meta) continue;
      if ((meta.category_name || '').toLowerCase() !== 'grading') continue;

      const itemMeta: any = item.metadata || {};
      const slotId = itemMeta?.grading_slot_id || null;

      let termId: string | null = null;
      if (slotId) termId = await resolveTermFromSlot(slotId);
      if (!termId) termId = itemMeta?.term_id || itemMeta?.term_ids?.[0] || null;
      if (!termId && lessonTermIds.size > 0) termId = Array.from(lessonTermIds)[0];
      if (!termId) continue;

      const { from: parsedFrom, to: parsedTo } = parseBeltTransition(meta.name || '');
      // Source of truth for current_belt is the student's live belt — the invoice
      // product name (e.g. "White >> Yellow Tip") is just a price/SKU label and
      // may not match the student's actual belt at grading time.
      const currentBelt = studentCurrentBelt || parsedFrom || 'White';
      const targetBelt = parsedTo || studentCurrentBelt || 'White';
      const readyForGrading = await isTermStarted(termId);

      // If a registration is already linked to this invoice item, update it
      // so changes to the invoice (term, slot, belts) reflect immediately.
      // Skip belt refresh if the registration has already been graded
      // (manual override or a result has been recorded) to preserve history.
      const { data: existingByItem } = await supabase
        .from('grading_registrations')
        .select('id, ready_for_grading, result, result_manual_override')
        .eq('invoice_item_id', item.id)
        .maybeSingle();
      if (existingByItem) {
        const alreadyGraded = existingByItem.result_manual_override === true || !!existingByItem.result;
        const updatePayload: any = {
          term_id: termId,
          grading_slot_id: slotId,
        };
        if (!alreadyGraded) {
          updatePayload.current_belt = currentBelt;
          updatePayload.target_belt = targetBelt;
        }
        // Only escalate ready flag; never demote a manually-set true.
        if (existingByItem.ready_for_grading !== true) {
          updatePayload.ready_for_grading = readyForGrading;
        }
        await supabase.from('grading_registrations').update(updatePayload).eq('id', existingByItem.id);
        continue;
      }

      const { data: existingByTerm } = await supabase
        .from('grading_registrations')
        .select('id, grading_slot_id, ready_for_grading')
        .eq('student_id', invoice.student_id)
        .eq('term_id', termId)
        .is('invoice_item_id', null)
        .maybeSingle();

      if (existingByTerm) {
        const updatePayload: any = {
          ready_for_grading: existingByTerm.ready_for_grading === true ? true : readyForGrading,
          current_belt: currentBelt,
          target_belt: targetBelt,
          invoice_item_id: item.id,
        };
        if (!existingByTerm.grading_slot_id && slotId) updatePayload.grading_slot_id = slotId;
        await supabase.from('grading_registrations').update(updatePayload).eq('id', existingByTerm.id);
      } else {
        await supabase.from('grading_registrations').insert([{
          student_id: invoice.student_id,
          term_id: termId,
          current_belt: currentBelt,
          target_belt: targetBelt,
          ready_for_grading: readyForGrading,
          invoice_item_id: item.id,
          grading_slot_id: slotId,
          result: null,
          created_by: createdByEmail,
        }]);
      }
    }
  } catch (err) {
    logger.error('syncGradingRegistrationsForInvoice failed (non-fatal)', err);
  }
};

/**
 * Backfill grading_registrations for any non-cancelled invoices in the given branch
 * that have a Grading-category line item without a corresponding registration.
 * Returns the number of invoices that were synced.
 */
// Module-level cache for the (constant per session) grading product ids lookup.
let _gradingProductIdsPromise: Promise<string[]> | null = null;
const getGradingProductIds = (): Promise<string[]> => {
  if (!_gradingProductIdsPromise) {
    _gradingProductIdsPromise = (async () => {
      const { data: gradingCat } = await supabase
        .from('product_categories')
        .select('id')
        .ilike('name', 'grading')
        .maybeSingle();
      if (!gradingCat?.id) return [];
      const { data: gradingProducts } = await supabase
        .from('products')
        .select('id')
        .eq('category_id', gradingCat.id);
      return (gradingProducts || []).map(p => p.id);
    })().catch(() => {
      _gradingProductIdsPromise = null;
      return [];
    });
  }
  return _gradingProductIdsPromise;
};

export const backfillOrphanGradingRegistrationsForBranch = async (branchId: string): Promise<number> => {
  try {
    if (!branchId) return 0;

    const gradingProductIds = await getGradingProductIds();
    if (gradingProductIds.length === 0) return 0;

    // Fetch all grading invoice items for active invoices in this branch
    const { data: gradingItems } = await supabase
      .from('invoice_items')
      .select('id, invoice_id, invoices!inner(id, branch_id, status)')
      .in('product_id', gradingProductIds)
      .eq('invoices.branch_id', branchId)
      .in('invoices.status', ['draft', 'sent', 'unpaid', 'partial', 'partially_paid', 'overdue', 'paid', 'verified']);
    const items = gradingItems || [];
    if (items.length === 0) return 0;

    // Fast path: only re-sync invoices whose grading items don't already have a registration.
    const itemIds = items.map((it: any) => it.id) as string[];
    const { data: existingRegs } = await supabase
      .from('grading_registrations')
      .select('invoice_item_id')
      .in('invoice_item_id', itemIds);
    const linkedItemIds = new Set((existingRegs || []).map((r: any) => r.invoice_item_id).filter(Boolean));
    const orphanInvoiceIds = [
      ...new Set(
        items
          .filter((it: any) => !linkedItemIds.has(it.id))
          .map((it: any) => it.invoice_id)
      ),
    ] as string[];
    if (orphanInvoiceIds.length === 0) return 0;

    // Run syncs in parallel chunks to avoid hammering Supabase.
    const CHUNK = 8;
    for (let i = 0; i < orphanInvoiceIds.length; i += CHUNK) {
      const slice = orphanInvoiceIds.slice(i, i + CHUNK);
      await Promise.all(slice.map(id => syncGradingRegistrationsForInvoice(id)));
    }
    return orphanInvoiceIds.length;
  } catch (err) {
    logger.error('backfillOrphanGradingRegistrationsForBranch failed (non-fatal)', err);
    return 0;
  }
};
