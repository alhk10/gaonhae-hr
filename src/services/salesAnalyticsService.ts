/**
 * Sales Analytics Service
 * Handles all analytics and reporting queries for the Sales Module
 */

import { supabase } from '@/integrations/supabase/client';

export interface SalesMetrics {
  totalRevenue: number;
  monthlyRevenue: number;
  totalStudents: number;
  activeStudents: number;
  totalInvoices: number;
  paidInvoices: number;
  overdueInvoices: number;
  averageInvoiceValue: number;
  collectionRate: number;
  monthlyGrowth: number;
}

export interface RevenueData {
  month: string;
  revenue: number;
  invoices: number;
  payments: number;
}

export interface StudentEnrollmentData {
  month: string;
  newStudents: number;
  totalStudents: number;
}

export interface ProductPerformanceData {
  productName: string;
  revenue: number;
  quantity: number;
  averagePrice: number;
}

export interface PaymentMethodData {
  method: string;
  amount: number;
  count: number;
  percentage: number;
}

export interface TopStudentsData {
  studentName: string;
  totalSpent: number;
  invoiceCount: number;
  lastPayment: string;
}

export interface AnalyticsData {
  metrics: SalesMetrics;
  revenueChart: RevenueData[];
  enrollmentChart: StudentEnrollmentData[];
  productPerformance: ProductPerformanceData[];
  paymentMethods: PaymentMethodData[];
  topStudents: TopStudentsData[];
}

/**
 * Get comprehensive sales analytics data
 */
export const getSalesAnalytics = async (
  startDate?: string,
  endDate?: string
): Promise<AnalyticsData> => {
  try {
    // Set default date range to last 12 months if not provided
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(end.getFullYear() - 1, end.getMonth(), 1);

    const [
      metrics,
      revenueChart,
      enrollmentChart,
      productPerformance,
      paymentMethods,
      topStudents
    ] = await Promise.all([
      getSalesMetrics(start, end),
      getRevenueChartData(start, end),
      getStudentEnrollmentData(start, end),
      getProductPerformanceData(start, end),
      getPaymentMethodsData(start, end),
      getTopStudentsData(start, end)
    ]);

    return {
      metrics,
      revenueChart,
      enrollmentChart,
      productPerformance,
      paymentMethods,
      topStudents
    };
  } catch (error) {
    console.error('Error in getSalesAnalytics:', error);
    throw error;
  }
};

/**
 * Get key sales metrics
 */
const getSalesMetrics = async (startDate: Date, endDate: Date): Promise<SalesMetrics> => {
  try {
    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];
    const currentMonth = new Date().toISOString().slice(0, 7);

    // Get invoice data
    const { data: invoices, error: invoiceError } = await supabase
      .from('invoices')
      .select('total_amount, amount_paid, balance_due, status, created_at')
      .gte('created_at', startStr)
      .lte('created_at', endStr);

    if (invoiceError) throw invoiceError;

    // Get payment data
    const { data: payments, error: paymentError } = await supabase
      .from('payments')
      .select('amount, payment_date')
      .gte('payment_date', startStr)
      .lte('payment_date', endStr);

    if (paymentError) throw paymentError;

    // Get student data
    const { data: students, error: studentError } = await supabase
      .from('students')
      .select('created_at, status')
      .gte('created_at', startStr)
      .lte('created_at', endStr);

    if (studentError) throw studentError;

    // Get all students for active count
    const { data: allStudents, error: allStudentsError } = await supabase
      .from('students')
      .select('status');

    if (allStudentsError) throw allStudentsError;

    // Calculate metrics
    const totalRevenue = invoices?.reduce((sum, inv) => sum + (inv.amount_paid || 0), 0) || 0;
    const monthlyRevenue = payments?.filter(p => p.payment_date.startsWith(currentMonth))
      .reduce((sum, p) => sum + p.amount, 0) || 0;
    
    const totalStudents = students?.length || 0;
    const activeStudents = allStudents?.filter(s => s.status === 'active').length || 0;
    
    const totalInvoices = invoices?.length || 0;
    const paidInvoices = invoices?.filter(inv => inv.status === 'paid').length || 0;
    const overdueInvoices = invoices?.filter(inv => 
      inv.status !== 'paid' && inv.status !== 'cancelled' && 
      new Date(inv.created_at) < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    ).length || 0;

    const averageInvoiceValue = totalInvoices > 0 
      ? invoices.reduce((sum, inv) => sum + inv.total_amount, 0) / totalInvoices 
      : 0;

    const collectionRate = totalInvoices > 0 ? (paidInvoices / totalInvoices) * 100 : 0;

    // Calculate monthly growth (simplified)
    const lastMonthRevenue = payments?.filter(p => {
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      return p.payment_date.startsWith(lastMonth.toISOString().slice(0, 7));
    }).reduce((sum, p) => sum + p.amount, 0) || 0;

    const monthlyGrowth = lastMonthRevenue > 0 
      ? ((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 
      : 0;

    return {
      totalRevenue,
      monthlyRevenue,
      totalStudents,
      activeStudents,
      totalInvoices,
      paidInvoices,
      overdueInvoices,
      averageInvoiceValue,
      collectionRate,
      monthlyGrowth
    };
  } catch (error) {
    console.error('Error in getSalesMetrics:', error);
    throw error;
  }
};

/**
 * Get revenue chart data by month
 */
const getRevenueChartData = async (startDate: Date, endDate: Date): Promise<RevenueData[]> => {
  try {
    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    // Get payments by month
    const { data: payments, error: paymentError } = await supabase
      .from('payments')
      .select('amount, payment_date')
      .gte('payment_date', startStr)
      .lte('payment_date', endStr);

    if (paymentError) throw paymentError;

    // Get invoices by month
    const { data: invoices, error: invoiceError } = await supabase
      .from('invoices')
      .select('created_at')
      .gte('created_at', startStr)
      .lte('created_at', endStr);

    if (invoiceError) throw invoiceError;

    // Group data by month
    const monthlyData: Record<string, RevenueData> = {};

    // Process payments
    payments?.forEach(payment => {
      const month = payment.payment_date.slice(0, 7); // YYYY-MM
      if (!monthlyData[month]) {
        monthlyData[month] = { month, revenue: 0, invoices: 0, payments: 0 };
      }
      monthlyData[month].revenue += payment.amount;
      monthlyData[month].payments += 1;
    });

    // Process invoices
    invoices?.forEach(invoice => {
      const month = invoice.created_at.slice(0, 7); // YYYY-MM
      if (!monthlyData[month]) {
        monthlyData[month] = { month, revenue: 0, invoices: 0, payments: 0 };
      }
      monthlyData[month].invoices += 1;
    });

    // Convert to array and sort by month
    return Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));
  } catch (error) {
    console.error('Error in getRevenueChartData:', error);
    throw error;
  }
};

/**
 * Get student enrollment data by month
 */
const getStudentEnrollmentData = async (startDate: Date, endDate: Date): Promise<StudentEnrollmentData[]> => {
  try {
    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    const { data: students, error } = await supabase
      .from('students')
      .select('created_at')
      .gte('created_at', startStr)
      .lte('created_at', endStr);

    if (error) throw error;

    // Group by month
    const monthlyEnrollments: Record<string, number> = {};
    students?.forEach(student => {
      const month = student.created_at.slice(0, 7);
      monthlyEnrollments[month] = (monthlyEnrollments[month] || 0) + 1;
    });

    // Calculate cumulative totals
    let totalStudents = 0;
    const result: StudentEnrollmentData[] = [];

    Object.keys(monthlyEnrollments).sort().forEach(month => {
      const newStudents = monthlyEnrollments[month];
      totalStudents += newStudents;
      result.push({
        month,
        newStudents,
        totalStudents
      });
    });

    return result;
  } catch (error) {
    console.error('Error in getStudentEnrollmentData:', error);
    throw error;
  }
};

/**
 * Get product performance data
 */
const getProductPerformanceData = async (startDate: Date, endDate: Date): Promise<ProductPerformanceData[]> => {
  try {
    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    const { data: invoiceItems, error } = await supabase
      .from('invoice_items')
      .select(`
        quantity,
        unit_price,
        total_amount,
        products(name),
        invoices!inner(created_at)
      `)
      .gte('invoices.created_at', startStr)
      .lte('invoices.created_at', endStr);

    if (error) throw error;

    // Group by product
    const productData: Record<string, { revenue: number; quantity: number; prices: number[] }> = {};

    invoiceItems?.forEach(item => {
      const productName = item.products?.name || 'Unknown Product';
      if (!productData[productName]) {
        productData[productName] = { revenue: 0, quantity: 0, prices: [] };
      }
      productData[productName].revenue += item.total_amount;
      productData[productName].quantity += item.quantity;
      productData[productName].prices.push(item.unit_price);
    });

    // Convert to array and calculate averages
    return Object.entries(productData)
      .map(([productName, data]) => ({
        productName,
        revenue: data.revenue,
        quantity: data.quantity,
        averagePrice: data.prices.reduce((sum, price) => sum + price, 0) / data.prices.length
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10); // Top 10 products
  } catch (error) {
    console.error('Error in getProductPerformanceData:', error);
    throw error;
  }
};

/**
 * Get payment methods breakdown
 */
const getPaymentMethodsData = async (startDate: Date, endDate: Date): Promise<PaymentMethodData[]> => {
  try {
    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    const { data: payments, error } = await supabase
      .from('payments')
      .select('payment_method, amount')
      .gte('payment_date', startStr)
      .lte('payment_date', endStr);

    if (error) throw error;

    // Group by payment method
    const methodData: Record<string, { amount: number; count: number }> = {};
    let totalAmount = 0;

    payments?.forEach(payment => {
      const method = payment.payment_method || 'unknown';
      if (!methodData[method]) {
        methodData[method] = { amount: 0, count: 0 };
      }
      methodData[method].amount += payment.amount;
      methodData[method].count += 1;
      totalAmount += payment.amount;
    });

    // Convert to array with percentages
    return Object.entries(methodData).map(([method, data]) => ({
      method: method.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      amount: data.amount,
      count: data.count,
      percentage: totalAmount > 0 ? (data.amount / totalAmount) * 100 : 0
    })).sort((a, b) => b.amount - a.amount);
  } catch (error) {
    console.error('Error in getPaymentMethodsData:', error);
    throw error;
  }
};

/**
 * Get top students by spending
 */
const getTopStudentsData = async (startDate: Date, endDate: Date): Promise<TopStudentsData[]> => {
  try {
    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    const { data: payments, error } = await supabase
      .from('payments')
      .select(`
        amount,
        payment_date,
        invoices!inner(
          student_id,
          students(first_name, last_name)
        )
      `)
      .gte('payment_date', startStr)
      .lte('payment_date', endStr);

    if (error) throw error;

    // Group by student
    const studentData: Record<string, {
      totalSpent: number;
      invoiceCount: number;
      lastPayment: string;
      studentName: string;
    }> = {};

    payments?.forEach(payment => {
      const student = payment.invoices?.students;
      if (!student) return;

      const studentName = `${student.first_name} ${student.last_name}`;
      const studentId = payment.invoices.student_id;

      if (!studentData[studentId]) {
        studentData[studentId] = {
          totalSpent: 0,
          invoiceCount: 0,
          lastPayment: payment.payment_date,
          studentName
        };
      }

      studentData[studentId].totalSpent += payment.amount;
      studentData[studentId].invoiceCount += 1;
      
      if (payment.payment_date > studentData[studentId].lastPayment) {
        studentData[studentId].lastPayment = payment.payment_date;
      }
    });

    // Convert to array and sort by total spent
    return Object.values(studentData)
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10); // Top 10 students
  } catch (error) {
    console.error('Error in getTopStudentsData:', error);
    throw error;
  }
};