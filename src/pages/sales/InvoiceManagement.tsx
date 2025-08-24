/**
 * Invoice Management Page
 * Main page for Milestone 6 - Invoice management system
 */

import React, { useState, useEffect } from 'react';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';
import InvoiceManagementList from '@/components/sales/InvoiceManagementList';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  DollarSign, 
  TrendingUp, 
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { getInvoiceStats } from '@/services/invoiceService';

const InvoiceManagement: React.FC = () => {
  const [stats, setStats] = useState({
    totalInvoices: 0,
    totalRevenue: 0,
    paidInvoices: 0,
    overdueInvoices: 0
  });
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const invoiceStats = await getInvoiceStats();
      setStats(invoiceStats);
    } catch (error) {
      console.error('Error loading invoice stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const formatCurrency = (amount: number) => {
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
            <h1 className="text-3xl font-bold text-foreground">Invoice Management</h1>
            <p className="text-muted-foreground">
              Create and manage student invoices - Milestone 6
            </p>
          </div>
          <Badge variant="default" className="bg-green-100 text-green-800">
            Milestone 6 - Complete
          </Badge>
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
                {loadingStats ? '-' : stats.totalInvoices}
              </div>
              <p className="text-xs text-muted-foreground">
                All time invoices created
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loadingStats ? '-' : formatCurrency(stats.totalRevenue)}
              </div>
              <p className="text-xs text-muted-foreground">
                Total invoiced amount
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
                {loadingStats ? '-' : stats.paidInvoices}
              </div>
              <p className="text-xs text-muted-foreground">
                Successfully collected
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overdue Invoices</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {loadingStats ? '-' : stats.overdueInvoices}
              </div>
              <p className="text-xs text-muted-foreground">
                Require attention
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Features Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Milestone 6 Features
            </CardTitle>
            <CardDescription>
              Complete invoice management system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium text-green-600">✅ Completed</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Create multi-item invoices</li>
                  <li>• Link products to invoice items</li>
                  <li>• Automatic tax calculations</li>
                  <li>• Invoice status management</li>
                  <li>• Student billing integration</li>
                  <li>• Search and filtering</li>
                </ul>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium">🚧 Future Enhancements</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• PDF invoice generation</li>
                  <li>• Email sending</li>
                  <li>• Payment tracking</li>
                  <li>• Recurring invoices</li>
                  <li>• Invoice templates</li>
                  <li>• Advanced reporting</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Invoice Management Interface */}
        <InvoiceManagementList />
      </div>
    </ResponsiveLayout>
  );
};

export default InvoiceManagement;