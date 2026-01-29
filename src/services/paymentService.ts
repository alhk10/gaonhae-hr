/**
 * Payment Service
 * Handles all payment-related database operations for the Sales Module
 */

import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';
import { logInvoiceChange } from './invoiceChangeLogService';

export interface Payment {
  id: string;
  invoice_id: string;
  payment_number: string;
  amount: number;
  payment_date: string;
  payment_method: 'cash' | 'bank_transfer' | 'credit_card' | 'cheque' | 'digital_wallet';
  reference_number?: string;
  proof_of_payment_url?: string;
  notes?: string;
  processed_by?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
  // Joined fields
  invoice_number?: string;
  student_name?: string;
  invoice_total?: number;
}

export interface PaymentsResponse {
  payments: Payment[];
  total: number;
}

export interface CreatePaymentData {
  invoice_id: string;
  amount: number;
  payment_date: string;
  payment_method: Payment['payment_method'];
  reference_number?: string;
  proof_of_payment_url?: string;
  notes?: string;
}

export interface PaymentStats {
  totalPayments: number;
  totalAmount: number;
  thisMonthAmount: number;
  pendingAmount: number;
  paymentsByMethod: Array<{
    method: string;
    count: number;
    amount: number;
  }>;
}

/**
 * Get payments with pagination and filtering
 */
export const getPayments = async (
  page: number = 1,
  limit: number = 20,
  searchQuery?: string,
  methodFilter?: string,
  dateFromFilter?: string,
  dateToFilter?: string
): Promise<PaymentsResponse> => {
  try {
    let query = supabase
      .from('payments')
      .select(`
        *,
        invoices(
          invoice_number,
          total_amount,
          students(first_name, last_name)
        )
      `, { count: 'exact' });

    // Apply search filter
    if (searchQuery) {
      query = query.or(`payment_number.ilike.%${searchQuery}%,reference_number.ilike.%${searchQuery}%,notes.ilike.%${searchQuery}%`);
    }

    // Apply payment method filter
    if (methodFilter) {
      query = query.eq('payment_method', methodFilter);
    }

    // Apply date range filters
    if (dateFromFilter) {
      query = query.gte('payment_date', dateFromFilter);
    }
    if (dateToFilter) {
      query = query.lte('payment_date', dateToFilter);
    }

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    // Order by payment date (newest first)
    query = query.order('payment_date', { ascending: false });

    const { data, error, count } = await query;

    if (error) {
      logger.error('Error fetching payments', error);
      throw new Error(`Failed to fetch payments: ${error.message}`);
    }

    // Transform the data to include related info
    const transformedPayments = (data || []).map(payment => ({
      ...payment,
      invoice_number: payment.invoices?.invoice_number,
      student_name: payment.invoices?.students 
        ? `${payment.invoices.students.first_name} ${payment.invoices.students.last_name}`
        : 'Unknown Student',
      invoice_total: payment.invoices?.total_amount
    })) as Payment[];

    return {
      payments: transformedPayments,
      total: count || 0
    };
  } catch (error) {
    logger.error('Error in getPayments', error);
    throw error;
  }
};

/**
 * Get a single payment by ID
 */
export const getPaymentById = async (paymentId: string): Promise<Payment | null> => {
  try {
    const { data, error } = await supabase
      .from('payments')
      .select(`
        *,
        invoices(
          invoice_number,
          total_amount,
          students(first_name, last_name)
        )
      `)
      .eq('id', paymentId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Payment not found
      }
      throw new Error(`Failed to fetch payment: ${error.message}`);
    }

    return {
      ...data,
      invoice_number: data.invoices?.invoice_number,
      student_name: data.invoices?.students 
        ? `${data.invoices.students.first_name} ${data.invoices.students.last_name}`
        : 'Unknown Student',
      invoice_total: data.invoices?.total_amount
    } as Payment;
  } catch (error) {
    logger.error('Error in getPaymentById', error);
    throw error;
  }
};

/**
 * Create a new payment and update invoice balance
 */
export const createPayment = async (paymentData: CreatePaymentData): Promise<Payment> => {
  try {
    // First, get the invoice to validate and calculate new balance
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('id, total_amount, amount_paid, balance_due, status')
      .eq('id', paymentData.invoice_id)
      .single();

    if (invoiceError) {
      throw new Error(`Failed to fetch invoice: ${invoiceError.message}`);
    }

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    // Validate payment amount
    if (paymentData.amount <= 0) {
      throw new Error('Payment amount must be greater than zero');
    }

    if (paymentData.amount > invoice.balance_due) {
      throw new Error(`Payment amount (${paymentData.amount}) cannot exceed balance due (${invoice.balance_due})`);
    }

    // Generate payment number
    const paymentNumber = await generatePaymentNumber();

    // Create the payment
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert([{
        payment_number: paymentNumber,
        invoice_id: paymentData.invoice_id,
        amount: paymentData.amount,
        payment_date: paymentData.payment_date,
        payment_method: paymentData.payment_method,
        reference_number: paymentData.reference_number,
        proof_of_payment_url: paymentData.proof_of_payment_url,
        notes: paymentData.notes
      }])
      .select(`
        *,
        invoices(
          invoice_number,
          total_amount,
          students(first_name, last_name)
        )
      `)
      .single();

    if (paymentError) {
      throw new Error(`Failed to create payment: ${paymentError.message}`);
    }

    // Update invoice with new payment amounts
    const newAmountPaid = invoice.amount_paid + paymentData.amount;
    const newBalanceDue = invoice.total_amount - newAmountPaid;
    const newStatus = newBalanceDue <= 0 ? 'paid' : invoice.status;

    const { error: updateError } = await supabase
      .from('invoices')
      .update({
        amount_paid: newAmountPaid,
        balance_due: newBalanceDue,
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', paymentData.invoice_id);

    if (updateError) {
      logger.error('Error updating invoice', updateError);
      // Don't throw here as payment was created successfully
    }

    // Log the payment addition
    await logInvoiceChange({
      invoice_id: paymentData.invoice_id,
      action: 'payment_added',
      changes: {
        payment_number: paymentNumber,
        amount: paymentData.amount,
        payment_method: paymentData.payment_method,
        new_balance: newBalanceDue
      }
    });

    return {
      ...payment,
      invoice_number: payment.invoices?.invoice_number,
      student_name: payment.invoices?.students 
        ? `${payment.invoices.students.first_name} ${payment.invoices.students.last_name}`
        : 'Unknown Student',
      invoice_total: payment.invoices?.total_amount
    } as Payment;
  } catch (error) {
    logger.error('Error in createPayment', error);
    throw error;
  }
};

/**
 * Update an existing payment
 */
export const updatePayment = async (
  paymentId: string, 
  updates: Partial<Omit<Payment, 'id' | 'created_at' | 'invoice_id' | 'payment_number'>>
): Promise<Payment> => {
  try {
    const { data, error } = await supabase
      .from('payments')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', paymentId)
      .select(`
        *,
        invoices(
          invoice_number,
          total_amount,
          students(first_name, last_name)
        )
      `)
      .single();

    if (error) {
      throw new Error(`Failed to update payment: ${error.message}`);
    }

    return {
      ...data,
      invoice_number: data.invoices?.invoice_number,
      student_name: data.invoices?.students 
        ? `${data.invoices.students.first_name} ${data.invoices.students.last_name}`
        : 'Unknown Student',
      invoice_total: data.invoices?.total_amount
    } as Payment;
  } catch (error) {
    logger.error('Error in updatePayment', error);
    throw error;
  }
};

/**
 * Delete a payment and update invoice balance
 */
export const deletePayment = async (paymentId: string): Promise<void> => {
  try {
    // Get payment details first
    const { data: payment, error: getError } = await supabase
      .from('payments')
      .select('invoice_id, amount, payment_number, payment_method')
      .eq('id', paymentId)
      .single();

    if (getError) {
      throw new Error(`Failed to fetch payment: ${getError.message}`);
    }

    if (!payment) {
      throw new Error('Payment not found');
    }

    // Delete the payment
    const { error: deleteError } = await supabase
      .from('payments')
      .delete()
      .eq('id', paymentId);

    if (deleteError) {
      throw new Error(`Failed to delete payment: ${deleteError.message}`);
    }

    // Update invoice balance
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('total_amount, amount_paid, balance_due')
      .eq('id', payment.invoice_id)
      .single();

    if (invoice && !invoiceError) {
      const newAmountPaid = Math.max(0, invoice.amount_paid - payment.amount);
      const newBalanceDue = invoice.total_amount - newAmountPaid;
      const newStatus = newBalanceDue > 0 ? 'sent' : 'paid';

      await supabase
        .from('invoices')
        .update({
          amount_paid: newAmountPaid,
          balance_due: newBalanceDue,
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', payment.invoice_id);
    }

    // Log the payment removal
    await logInvoiceChange({
      invoice_id: payment.invoice_id,
      action: 'payment_removed',
      changes: {
        payment_number: payment.payment_number,
        amount: payment.amount,
        payment_method: payment.payment_method
      }
    });
  } catch (error) {
    logger.error('Error in deletePayment', error);
    throw error;
  }
};

/**
 * Get payments for a specific invoice
 */
export const getPaymentsByInvoice = async (invoiceId: string): Promise<Payment[]> => {
  try {
    const { data, error } = await supabase
      .from('payments')
      .select(`
        *,
        invoices(
          invoice_number,
          total_amount,
          students(first_name, last_name)
        )
      `)
      .eq('invoice_id', invoiceId)
      .order('payment_date', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch payments: ${error.message}`);
    }

    return (data || []).map(payment => ({
      ...payment,
      invoice_number: payment.invoices?.invoice_number,
      student_name: payment.invoices?.students 
        ? `${payment.invoices.students.first_name} ${payment.invoices.students.last_name}`
        : 'Unknown Student',
      invoice_total: payment.invoices?.total_amount
    })) as Payment[];
  } catch (error) {
    logger.error('Error in getPaymentsByInvoice', error);
    throw error;
  }
};

/**
 * Get payment statistics
 */
export const getPaymentStats = async (): Promise<PaymentStats> => {
  try {
    const { data, error } = await supabase
      .from('payments')
      .select('amount, payment_method, payment_date');

    if (error) {
      throw new Error(`Failed to fetch payment stats: ${error.message}`);
    }

    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
    
    const stats: PaymentStats = {
      totalPayments: data?.length || 0,
      totalAmount: 0,
      thisMonthAmount: 0,
      pendingAmount: 0,
      paymentsByMethod: []
    };

    const methodCounts: Record<string, { count: number; amount: number }> = {};

    data?.forEach(payment => {
      stats.totalAmount += payment.amount || 0;
      
      if (payment.payment_date?.startsWith(currentMonth)) {
        stats.thisMonthAmount += payment.amount || 0;
      }

      const method = payment.payment_method || 'unknown';
      if (!methodCounts[method]) {
        methodCounts[method] = { count: 0, amount: 0 };
      }
      methodCounts[method].count++;
      methodCounts[method].amount += payment.amount || 0;
    });

    stats.paymentsByMethod = Object.entries(methodCounts).map(([method, data]) => ({
      method,
      count: data.count,
      amount: data.amount
    }));

    // Get pending amount from unpaid invoices
    const { data: unpaidInvoices, error: unpaidError } = await supabase
      .from('invoices')
      .select('balance_due')
      .neq('status', 'paid')
      .neq('status', 'cancelled');

    if (!unpaidError && unpaidInvoices) {
      stats.pendingAmount = unpaidInvoices.reduce((sum, invoice) => sum + (invoice.balance_due || 0), 0);
    }

    return stats;
  } catch (error) {
    logger.error('Error in getPaymentStats', error);
    throw error;
  }
};

/**
 * Generate a unique payment number
 */
const generatePaymentNumber = async (): Promise<string> => {
  const currentYear = new Date().getFullYear();
  const currentMonth = (new Date().getMonth() + 1).toString().padStart(2, '0');
  const prefix = `PAY-${currentYear}${currentMonth}-`;
  
  // Get the highest payment number for this month
  const { data, error } = await supabase
    .from('payments')
    .select('payment_number')
    .like('payment_number', `${prefix}%`)
    .order('payment_number', { ascending: false })
    .limit(1);

  if (error) {
    logger.error('Error generating payment number', error);
    // Fallback to timestamp-based number
    return `${prefix}${Date.now().toString().slice(-6)}`;
  }

  let nextNumber = 1;
  if (data && data.length > 0) {
    const lastNumber = data[0].payment_number.replace(prefix, '');
    nextNumber = parseInt(lastNumber) + 1;
  }

  return `${prefix}${nextNumber.toString().padStart(4, '0')}`;
};