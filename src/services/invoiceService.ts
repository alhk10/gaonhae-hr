/**
 * Invoice Service
 * Handles all invoice-related database operations for the Sales Module
 */

import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';

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
  items: Array<{
    product_id: string;
    description: string;
    quantity: number;
    unit_price: number;
    size_variant?: string;
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

    // Apply search filter
    if (searchQuery) {
      query = query.or(`invoice_number.ilike.%${searchQuery}%,notes.ilike.%${searchQuery}%`);
    }

    // Apply status filter
    if (statusFilter) {
      query = query.eq('status', statusFilter);
    }

    // Apply student filter
    if (studentFilter) {
      query = query.eq('student_id', studentFilter);
    }

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    // Order by created date (newest first)
    query = query.order('created_at', { ascending: false });

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
    
    // Calculate totals
    let subtotal = 0;
    let taxAmount = 0;
    
    for (const item of invoiceData.items) {
      const itemTotal = item.quantity * item.unit_price;
      subtotal += itemTotal;
      // Assume 8% tax rate for now - this could be configurable
      taxAmount += itemTotal * 0.08;
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

    // Create invoice items
    const itemsToInsert = invoiceData.items.map(item => {
      const itemTotal = item.quantity * item.unit_price;
      const itemTaxAmount = itemTotal * 0.08;
      
      return {
        invoice_id: invoice.id,
        product_id: item.product_id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        tax_rate: 0.08,
        tax_amount: itemTaxAmount,
        total_amount: itemTotal + itemTaxAmount,
        size_variant: item.size_variant
      };
    });

    const { error: itemsError } = await supabase
      .from('invoice_items')
      .insert(itemsToInsert);

    if (itemsError) {
      // Try to clean up the invoice if items creation failed
      await supabase.from('invoices').delete().eq('id', invoice.id);
      throw new Error(`Failed to create invoice items: ${itemsError.message}`);
    }

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
    // Delete invoice items first (foreign key constraint)
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