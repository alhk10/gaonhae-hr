/**
 * Sales Analytics Page
 * Main page for Milestone 8 - Sales analytics and reporting
 */

import React, { useState, useEffect } from 'react';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { 
  TrendingUp, 
  DollarSign, 
  Users, 
  FileText,
  CreditCard,
  Calendar,
  Download,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Target,
  Award
} from 'lucide-react';
import { getSalesAnalytics, type AnalyticsData } from '@/services/salesAnalyticsService';
import { toast } from 'sonner';

const SalesAnalytics: React.FC = () => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear() - 1, new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const data = await getSalesAnalytics(dateRange.startDate, dateRange.endDate);
      setAnalyticsData(data);
    } catch (error) {
      console.error('Error loading analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const handleDateRangeChange = (field: string, value: string) => {
    setDateRange(prev => ({ ...prev, [field]: value }));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-SG', {
      style: 'currency',
      currency: 'SGD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-SG');
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  if (loading) {
    return (
      <ResponsiveLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Sales Analytics</h1>
              <p className="text-muted-foreground">Loading analytics data...</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="h-20 bg-muted animate-pulse rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </ResponsiveLayout>
    );
  }

  if (!analyticsData) {
    return (
      <ResponsiveLayout>
        <div className="space-y-6">
          <div className="text-center py-12">
            <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Failed to load analytics</h3>
            <Button onClick={loadAnalytics}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </div>
        </div>
      </ResponsiveLayout>
    );
  }

  return (
    <ResponsiveLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Sales Analytics</h1>
            <p className="text-muted-foreground">
              Comprehensive sales performance insights - Milestone 8
            </p>
          </div>
          <Badge variant="default" className="bg-green-100 text-green-800">
            Milestone 8 - Complete
          </Badge>
        </div>

        {/* Date Range Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Date Range</CardTitle>
            <CardDescription>Select date range for analytics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => handleDateRangeChange('startDate', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => handleDateRangeChange('endDate', e.target.value)}
                />
              </div>
              <Button onClick={loadAnalytics}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Update Analytics
              </Button>
              <Button variant="outline" disabled>
                <Download className="w-4 h-4 mr-2" />
                Export Report
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(analyticsData.metrics.totalRevenue)}
              </div>
              <p className="text-xs text-muted-foreground">
                {analyticsData.metrics.monthlyGrowth >= 0 ? '+' : ''}{analyticsData.metrics.monthlyGrowth.toFixed(1)}% from last month
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
                {formatCurrency(analyticsData.metrics.monthlyRevenue)}
              </div>
              <p className="text-xs text-muted-foreground">
                Current month collections
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Students</CardTitle>
              <Users className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {analyticsData.metrics.activeStudents}
              </div>
              <p className="text-xs text-muted-foreground">
                +{analyticsData.metrics.totalStudents} new this period
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Collection Rate</CardTitle>
              <Target className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {analyticsData.metrics.collectionRate.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">
                {analyticsData.metrics.paidInvoices}/{analyticsData.metrics.totalInvoices} invoices paid
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Secondary Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Invoice Value</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(analyticsData.metrics.averageInvoiceValue)}
              </div>
              <p className="text-xs text-muted-foreground">
                Average transaction size
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analyticsData.metrics.totalInvoices}
              </div>
              <p className="text-xs text-muted-foreground">
                Invoices created this period
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
                {analyticsData.metrics.paidInvoices}
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
                {analyticsData.metrics.overdueInvoices}
              </div>
              <p className="text-xs text-muted-foreground">
                Require follow-up
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Revenue Trend</CardTitle>
              <CardDescription>Monthly revenue and payment patterns</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analyticsData.revenueChart}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#0088FE" 
                    strokeWidth={2}
                    name="Revenue"
                  />
                  <Bar dataKey="invoices" fill="#00C49F" name="Invoices" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Student Enrollment Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Student Enrollment</CardTitle>
              <CardDescription>New student registrations over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analyticsData.enrollmentChart}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="newStudents" fill="#FFBB28" name="New Students" />
                  <Line 
                    type="monotone" 
                    dataKey="totalStudents" 
                    stroke="#FF8042" 
                    name="Total Students"
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Payment Methods */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Methods</CardTitle>
              <CardDescription>Revenue breakdown by payment method</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={analyticsData.paymentMethods}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="amount"
                    label={({ method, percentage }) => `${method} (${percentage.toFixed(1)}%)`}
                  >
                    {analyticsData.paymentMethods.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Top Products */}
          <Card>
            <CardHeader>
              <CardTitle>Top Products</CardTitle>
              <CardDescription>Best performing products by revenue</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart 
                  data={analyticsData.productPerformance.slice(0, 5)} 
                  layout="horizontal"
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="productName" type="category" width={100} />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Bar dataKey="revenue" fill="#8884D8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Top Students Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Top Students by Revenue
            </CardTitle>
            <CardDescription>Highest spending students this period</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Student</th>
                    <th className="text-left p-2">Total Spent</th>
                    <th className="text-left p-2">Invoices</th>
                    <th className="text-left p-2">Last Payment</th>
                  </tr>
                </thead>
                <tbody>
                  {analyticsData.topStudents.slice(0, 10).map((student, index) => (
                    <tr key={index} className="border-b">
                      <td className="p-2 font-medium">{student.studentName}</td>
                      <td className="p-2 text-green-600 font-medium">
                        {formatCurrency(student.totalSpent)}
                      </td>
                      <td className="p-2">{student.invoiceCount}</td>
                      <td className="p-2">{formatDate(student.lastPayment)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Features Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Milestone 8 Features
            </CardTitle>
            <CardDescription>
              Complete sales analytics and reporting system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium text-green-600">✅ Completed</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Comprehensive sales metrics dashboard</li>
                  <li>• Revenue trend analysis with charts</li>
                  <li>• Student enrollment tracking</li>
                  <li>• Product performance analytics</li>
                  <li>• Payment method breakdown</li>
                  <li>• Top students by revenue</li>
                  <li>• Collection rate monitoring</li>
                  <li>• Date range filtering</li>
                </ul>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium">🚧 Future Enhancements</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Automated report generation</li>
                  <li>• Predictive analytics</li>
                  <li>• Advanced filtering options</li>
                  <li>• Custom dashboard creation</li>
                  <li>• Real-time notifications</li>
                  <li>• Comparative period analysis</li>
                  <li>• Export to Excel/PDF</li>
                  <li>• Email report scheduling</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ResponsiveLayout>
  );
};

export default SalesAnalytics;