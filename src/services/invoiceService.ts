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
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
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

    // Calculate due date
    const issueDate = new Date();
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
        issue_date: issueDate.toISOString().split('T')[0],
        due_date: dueDate.toISOString().split('T')[0],
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
        .select('id, is_lesson, session_count, validity_type, validity_months, term_id, allowed_class_types, name')
        .in('id', productIds);

      if (productDetails) {
        const lessonProducts = new Map(
          productDetails.filter(p => p.is_lesson)
            .map(p => [p.id, p])
        );

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
      .select('id')
      .eq('invoice_id', invoiceId);

    if (invoiceItemsFetchError) {
      throw new Error(`Failed to fetch invoice items: ${invoiceItemsFetchError.message}`);
    }

    const itemIds = (invoiceItems || []).map(item => item.id);

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