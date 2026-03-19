/**
 * Payment Service
 * Handles all payment-related database operations for the Sales Module
 */

import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';
import { logInvoiceChange } from './invoiceChangeLogService';
import { addOverpaymentCredit } from './studentCreditService';

export interface Payment {
  id: string;
  invoice_id: string;
  payment_number: string;
  amount: number;
  payment_date: string;
  payment_method: 'cash' | 'bank_transfer' | 'credit_card' | 'cheque' | 'digital_wallet' | 'paynow';
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

    // Track if this is an overpayment
    const isOverpayment = paymentData.amount > invoice.balance_due;
    const overpaymentAmount = isOverpayment ? paymentData.amount - invoice.balance_due : 0;

    // Generate payment number with retry on duplicate
    let payment = null;
    let retries = 3;
    
    while (retries > 0) {
      const paymentNumber = await generatePaymentNumber();
      
      const { data: paymentData2, error: paymentError } = await supabase
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
        if (paymentError.message.includes('payments_payment_number_key') && retries > 1) {
          retries--;
          // Small delay before retry
          await new Promise(resolve => setTimeout(resolve, 100));
          continue;
        }
        throw new Error(`Failed to create payment: ${paymentError.message}`);
      }
      
      payment = paymentData2;
      break;
    }

    if (!payment) {
      throw new Error('Failed to create payment after multiple retries');
    }

    // Update invoice with new payment amounts
    // For overpayments, cap amount_paid at total and set balance to 0
    const effectivePayment = isOverpayment ? invoice.balance_due : paymentData.amount;
    const newAmountPaid = invoice.amount_paid + effectivePayment;
    const newBalanceDue = Math.max(0, invoice.total_amount - newAmountPaid);
    const newStatus = newBalanceDue <= 0 ? 'paid' : 'partially_paid';

    const { error: updateError } = await supabase
      .from('invoices')
      .update({
        amount_paid: invoice.amount_paid + paymentData.amount,
        balance_due: newBalanceDue,
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', paymentData.invoice_id);

    if (updateError) {
      logger.error('Error updating invoice', updateError);
      // Don't throw here as payment was created successfully
    }

    // If overpayment, record excess as student credit
    if (isOverpayment && overpaymentAmount > 0) {
      try {
        // Get student_id from invoice
        const { data: invoiceData } = await supabase
          .from('invoices')
          .select('student_id, invoice_number')
          .eq('id', paymentData.invoice_id)
          .single();

        if (invoiceData) {
          await addOverpaymentCredit(
            invoiceData.student_id,
            overpaymentAmount,
            payment.id,
            invoiceData.invoice_number
          );
          logger.info(`Overpayment of ${overpaymentAmount} recorded as credit for student ${invoiceData.student_id}`);
        }
      } catch (creditError) {
        logger.error('Error recording overpayment credit', creditError);
        // Don't fail the payment - credit recording is secondary
      }
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

    // Update invoice balance - recalculate from actual remaining payments for accuracy
    const { data: remainingPayments } = await supabase
      .from('payments')
      .select('amount')
      .eq('invoice_id', payment.invoice_id);

    const actualAmountPaid = (remainingPayments || []).reduce(
      (sum, p) => sum + Number(p.amount), 0
    );

    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('total_amount')
      .eq('id', payment.invoice_id)
      .single();

    if (invoice && !invoiceError) {
      const newBalanceDue = invoice.total_amount - actualAmountPaid;
      const newStatus = newBalanceDue <= 0 ? 'paid' : actualAmountPaid > 0 ? 'partially_paid' : 'unpaid';

      const { error: updateError } = await supabase
        .from('invoices')
        .update({
          amount_paid: actualAmountPaid,
          balance_due: newBalanceDue,
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', payment.invoice_id);

      if (updateError) {
        logger.error('Failed to update invoice after payment deletion', updateError);
        throw new Error(`Failed to update invoice: ${updateError.message}`);
      }
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
    // Fallback to timestamp-based number to guarantee uniqueness
    return `${prefix}${Date.now().toString().slice(-8)}`;
  }

  let nextNumber = 1;
  if (data && data.length > 0) {
    const lastNumber = data[0].payment_number.replace(prefix, '');
    const parsed = parseInt(lastNumber);
    if (!isNaN(parsed)) {
      nextNumber = parsed + 1;
    } else {
      // If parsing fails, use timestamp fallback
      return `${prefix}${Date.now().toString().slice(-8)}`;
    }
  }

  return `${prefix}${nextNumber.toString().padStart(4, '0')}`;
};