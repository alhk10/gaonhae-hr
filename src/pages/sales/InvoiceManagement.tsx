/**
 * Invoice Management Page
 * Combined page for Invoice, Payment, and Template management
 */

import React, { useState, useEffect } from 'react';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';
import SalesAccessGuard from '@/components/sales/SalesAccessGuard';
import InvoiceManagementList from '@/components/sales/InvoiceManagementList';
import PaymentManagementList from '@/components/sales/PaymentManagementList';
import InvoiceTemplateList from '@/components/sales/InvoiceTemplateList';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText, 
  DollarSign, 
  CheckCircle,
  AlertCircle,
  CreditCard,
  FileStack
} from 'lucide-react';
import { getInvoiceStats } from '@/services/invoiceService';
import { getPaymentStats, type PaymentStats } from '@/services/paymentService';
import { useAuth } from '@/contexts/AuthContext';

const InvoiceManagement: React.FC = () => {
  const { userrole } = useAuth();
  const isSuperadmin = userrole === 'superadmin';
  
  const [invoiceStats, setInvoiceStats] = useState({
    totalInvoices: 0,
    totalRevenue: 0,
    paidInvoices: 0,
    overdueInvoices: 0
  });
  const [paymentStats, setPaymentStats] = useState<PaymentStats>({
    totalPayments: 0,
    totalAmount: 0,
    thisMonthAmount: 0,
    pendingAmount: 0,
    paymentsByMethod: []
  });
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [invStats, payStats] = await Promise.all([
        getInvoiceStats(),
        getPaymentStats()
      ]);
      setInvoiceStats(invStats);
      setPaymentStats(payStats);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const formatCurrencyValue = (amount: number) => {
    return new Intl.NumberFormat('en-SG', {
      style: 'currency',
      currency: 'SGD'
    }).format(amount);
  };

  return (
    <SalesAccessGuard requireInvoiceAccess={true}>
      <ResponsiveLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-foreground">Invoices & Payments</h1>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loadingStats ? '-' : invoiceStats.totalInvoices}
                </div>
                <p className="text-xs text-muted-foreground">
                  All time invoices created
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Collected</CardTitle>
                <DollarSign className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {loadingStats ? '-' : formatCurrencyValue(paymentStats.totalAmount)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Total payments received
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Paid Invoices</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {loadingStats ? '-' : invoiceStats.paidInvoices}
                </div>
                <p className="text-xs text-muted-foreground">
                  Successfully collected
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
                <AlertCircle className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">
                  {loadingStats ? '-' : formatCurrencyValue(paymentStats.pendingAmount)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Pending collections
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Tabbed Interface */}
          <Tabs defaultValue="invoices" className="space-y-4">
            <TabsList>
              <TabsTrigger value="invoices" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Invoices
              </TabsTrigger>
              <TabsTrigger value="payments" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Payments
              </TabsTrigger>
              {isSuperadmin && (
                <TabsTrigger value="templates" className="flex items-center gap-2">
                  <FileStack className="h-4 w-4" />
                  Templates
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="invoices">
              <InvoiceManagementList />
            </TabsContent>

            <TabsContent value="payments">
              <PaymentManagementList />
            </TabsContent>

            {isSuperadmin && (
              <TabsContent value="templates">
                <InvoiceTemplateList />
              </TabsContent>
            )}
          </Tabs>
        </div>
      </ResponsiveLayout>
    </SalesAccessGuard>
  );
};

export default InvoiceManagement;
