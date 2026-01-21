/**
 * Payment Management Page
 * Main page for Milestone 7 - Payment tracking and management
 */

import React, { useState, useEffect } from 'react';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';
import PaymentManagementList from '@/components/sales/PaymentManagementList';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  CreditCard, 
  DollarSign, 
  TrendingUp, 
  Calendar,
  CheckCircle,
  AlertCircle,
  Banknote
} from 'lucide-react';
import { getPaymentStats, type PaymentStats } from '@/services/paymentService';

const PaymentManagement: React.FC = () => {
  const [stats, setStats] = useState<PaymentStats>({
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
      const paymentStats = await getPaymentStats();
      setStats(paymentStats);
    } catch (error) {
      console.error('Error loading payment stats:', error);
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
    <ResponsiveLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Payment Management</h1>
            <p className="text-muted-foreground">
              Track and manage invoice payments - Milestone 7
            </p>
          </div>
          <Badge variant="default" className="bg-green-100 text-green-800">
            Milestone 7 - Complete
          </Badge>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loadingStats ? '-' : stats.totalPayments}
              </div>
              <p className="text-xs text-muted-foreground">
                All time payments received
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
                {loadingStats ? '-' : formatCurrencyValue(stats.totalAmount)}
              </div>
              <p className="text-xs text-muted-foreground">
                Total amount received
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Month</CardTitle>
              <Calendar className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {loadingStats ? '-' : formatCurrencyValue(stats.thisMonthAmount)}
              </div>
              <p className="text-xs text-muted-foreground">
                Current month collections
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {loadingStats ? '-' : formatCurrencyValue(stats.pendingAmount)}
              </div>
              <p className="text-xs text-muted-foreground">
                Pending collections
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Payment Methods Breakdown */}
        {!loadingStats && stats.paymentsByMethod.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Banknote className="h-5 w-5" />
                Payment Methods Overview
              </CardTitle>
              <CardDescription>
                Breakdown of payments by method
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {stats.paymentsByMethod.map((method) => (
                  <div key={method.method} className="text-center p-4 border rounded-lg">
                    <div className="text-sm font-medium text-muted-foreground mb-1">
                      {method.method.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </div>
                    <div className="text-xl font-bold">{method.count}</div>
                    <div className="text-sm text-muted-foreground">
                      {formatCurrencyValue(method.amount)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Features Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Milestone 7 Features
            </CardTitle>
            <CardDescription>
              Complete payment tracking and management
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium text-green-600">✅ Completed</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Record payments against invoices</li>
                  <li>• Multiple payment methods support</li>
                  <li>• Automatic invoice balance updates</li>
                  <li>• Payment tracking and history</li>
                  <li>• Reference number and proof tracking</li>
                  <li>• Payment statistics dashboard</li>
                  <li>• Search and filtering capabilities</li>
                </ul>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium">🚧 Future Enhancements</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Payment gateway integration</li>
                  <li>• Automated payment reminders</li>
                  <li>• Payment receipt generation</li>
                  <li>• Partial payment handling</li>
                  <li>• Payment analytics and reports</li>
                  <li>• Bank reconciliation</li>
                  <li>• Payment dispute management</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Payment Management Interface */}
        <PaymentManagementList />
      </div>
    </ResponsiveLayout>
  );
};

export default PaymentManagement;