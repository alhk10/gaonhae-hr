
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DollarSign, Calendar as CalendarIcon, Download, TrendingUp, Eye, Clock, AlertCircle, Save } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { usePayroll } from '@/contexts/PayrollContext';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import PayrollEmployeeManager from '@/components/payroll/PayrollEmployeeManager';

const Payroll = () => {
  const navigate = useNavigate();
  const { payrollState, calculatePayrollTotal, setPayrollStatus, setCurrentPeriod, savePayrollToSupabase, isLoading } = usePayroll();
  const [payrollDate, setPayrollDate] = useState<Date>(new Date());
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleProcessPayroll = () => {
    if (payrollState.fullTimeEmployees.length === 0 && payrollState.casualEmployees.length === 0) {
      toast.error('No employees found in payroll. Please add employees before processing.');
      return;
    }
    navigate('/payroll-processing');
  };

  const handleIncrementPlanning = () => {
    navigate('/increment-planning');
  };

  const handlePaymentSummary = () => {
    navigate('/payment-summary');
  };

  const handleSavePayroll = async () => {
    if (payrollState.fullTimeEmployees.length === 0 && payrollState.casualEmployees.length === 0) {
      toast.error('No employees to save in payroll');
      return;
    }

    setIsSaving(true);
    try {
      await savePayrollToSupabase();
      toast.success('Payroll saved successfully');
    } catch (error) {
      console.error('Error saving payroll:', error);
      toast.error('Error saving payroll');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePeriodChange = (date: Date | undefined) => {
    if (date) {
      setPayrollDate(date);
      const newPeriod = format(date, 'MMMM yyyy');
      setCurrentPeriod(newPeriod);
      setIsDatePickerOpen(false);
      toast.success(`Payroll period updated to ${newPeriod}`);
    }
  };

  const generatePDF = (month: string) => {
    if (payrollState.fullTimeEmployees.length === 0 && payrollState.casualEmployees.length === 0) {
      toast.error('No employees found. Cannot generate payroll report.');
      return;
    }

    const pdfContent = `
<!DOCTYPE html>
<html>
<head>
    <title>Payroll Summary - ${month}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; }
        .section { margin: 20px 0; }
        .row { display: flex; justify-content: space-between; margin: 5px 0; }
        .total { font-weight: bold; border-top: 1px solid #000; padding-top: 10px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #000; padding: 8px; text-align: left; }
        th { background-color: #f0f0f0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>PAYROLL SUMMARY</h1>
        <h2>${month.toUpperCase()}</h2>
        <p>ABC Learning Centre Pte Ltd</p>
    </div>
    
    <div class="section">
        <h3>PAYROLL OVERVIEW</h3>
        <div class="row"><span>Total Employees:</span><span>${payrollState.fullTimeEmployees.length + payrollState.casualEmployees.length}</span></div>
        <div class="row"><span>Full-Time Employees:</span><span>${payrollState.fullTimeEmployees.length}</span></div>
        <div class="row"><span>Casual Employees:</span><span>${payrollState.casualEmployees.length}</span></div>
        <div class="row total"><span>Total Payroll Amount:</span><span>S$ ${calculatePayrollTotal().toLocaleString()}</span></div>
    </div>
    
    <div class="section">
        <h3>FULL-TIME EMPLOYEES</h3>
        <table>
            <tr><th>Name</th><th>Base Salary</th><th>Allowances</th><th>CPF</th><th>Net Pay</th></tr>
            ${payrollState.fullTimeEmployees.map(emp => 
              `<tr><td>${emp.name}</td><td>S$ ${(emp.baseSalary || 0).toLocaleString()}</td><td>S$ ${emp.allowances.reduce((sum, a) => sum + a.amount, 0).toLocaleString()}</td><td>S$ ${(emp.cpfEmployee || 0).toLocaleString()}</td><td>S$ ${(emp.netPay || 0).toLocaleString()}</td></tr>`
            ).join('')}
        </table>
    </div>
    
    <div class="section">
        <h3>CASUAL EMPLOYEES</h3>
        <table>
            <tr><th>Name</th><th>Payment Type</th><th>Rate</th><th>Hours/Days</th><th>Total</th></tr>
            ${payrollState.casualEmployees.map(emp => {
              const rate = emp.hourlyRate || emp.dailyRate || emp.baseSalary || 0;
              const workAmount = emp.hoursWorked || emp.daysWorked || 0;
              const rateDisplay = emp.hourlyRate ? `S$ ${rate.toFixed(2)}/hr` : 
                                emp.dailyRate ? `S$ ${rate.toFixed(2)}/day` : 
                                `S$ ${rate.toFixed(2)}/month`;
              return `<tr><td>${emp.name}</td><td>${emp.paymentType || 'Monthly'}</td><td>${rateDisplay}</td><td>${workAmount}</td><td>S$ ${(emp.totalPay || 0).toLocaleString()}</td></tr>`;
            }).join('')}
        </table>
    </div>
</body>
</html>
    `;

    const blob = new Blob([pdfContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `payroll-summary-${month.replace(' ', '-').toLowerCase()}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success(`Downloaded payroll summary for ${month}`);
  };

  const getNextProcessingDate = () => {
    const today = new Date();
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 2);
    const daysUntil = Math.ceil((nextMonth.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntil;
  };

  if (isLoading) {
    return (
      <ResponsiveLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading payroll data...</p>
          </div>
        </div>
      </ResponsiveLayout>
    );
  }

  const currentTotal = calculatePayrollTotal();
  const yearlyTotal = currentTotal * 12;
  const totalEmployees = payrollState.fullTimeEmployees.length + payrollState.casualEmployees.length;
  const hasEmployees = totalEmployees > 0;
  const nextProcessingDays = getNextProcessingDate();

  return (
    <ResponsiveLayout>
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Payroll Management</h2>
            <div className="flex items-center space-x-4 mt-2">
              <Badge variant={payrollState.status === 'completed' ? 'default' : 'secondary'}>
                {payrollState.status.charAt(0).toUpperCase() + payrollState.status.slice(1)}
              </Badge>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Period:</span>
                <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "text-sm",
                        !payrollDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {payrollDate ? format(payrollDate, 'MMMM yyyy') : <span>Select period</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={payrollDate}
                      onSelect={handlePeriodChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <p className="text-sm text-gray-500">
                Last Updated: {payrollState.lastUpdated.toLocaleString()}
              </p>
            </div>
          </div>
          <div className="flex space-x-2">
            <Button 
              variant="outline"
              onClick={handleSavePayroll}
              disabled={!hasEmployees || isSaving}
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Payroll'}
            </Button>
            <Button 
              variant="outline"
              onClick={handleIncrementPlanning}
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Increment Planning
            </Button>
            <Button 
              onClick={handleProcessPayroll}
              disabled={!hasEmployees}
            >
              <CalendarIcon className="w-4 h-4 mr-2" />
              Process Payroll
            </Button>
          </div>
        </div>

        {/* Encashment Integration Alert */}
        {payrollState.encashmentData.length > 0 && (
          <Alert className="border-green-200 bg-green-50">
            <DollarSign className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Leave encashment data has been integrated into this payroll period. 
              {payrollState.encashmentData.length} employee(s) have encashment amounts included.
            </AlertDescription>
          </Alert>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600">Current Total</p>
                  <p className="text-2xl font-bold text-green-900">S${currentTotal.toLocaleString()}</p>
                  <p className="text-xs text-green-500 mt-1">
                    {format(payrollDate, 'MMMM yyyy')}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600">Total Employees</p>
                  <p className="text-2xl font-bold text-blue-900">{totalEmployees}</p>
                  <p className="text-xs text-blue-500 mt-1">
                    {payrollState.fullTimeEmployees.length} FT • {payrollState.casualEmployees.length} Casual
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600">Estimated Yearly</p>
                  <p className="text-2xl font-bold text-purple-900">S${yearlyTotal.toLocaleString()}</p>
                  <p className="text-xs text-purple-500 mt-1">Projection</p>
                </div>
                <DollarSign className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-600">Next Processing</p>
                  <p className="text-2xl font-bold text-orange-900">{nextProcessingDays} days</p>
                  <p className="text-xs text-orange-500 mt-1">2nd of month</p>
                </div>
                <Clock className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Employee Management Section */}
        <PayrollEmployeeManager payrollPeriod={payrollState.currentPeriod} />

        {/* Payroll Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Payroll Actions</CardTitle>
            <CardDescription>
              Manage payroll operations and generate reports
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Button 
                variant="outline" 
                onClick={handlePaymentSummary}
                className="flex items-center justify-center"
              >
                <Eye className="w-4 h-4 mr-2" />
                Payment Summary
              </Button>
              <Button 
                variant="outline"
                onClick={() => generatePDF(payrollState.currentPeriod)}
                disabled={!hasEmployees}
                className="flex items-center justify-center"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Report
              </Button>
              <Button 
                variant="outline"
                onClick={() => {
                  setPayrollStatus('processing');
                  toast.success('Payroll status updated to processing');
                }}
                disabled={!hasEmployees}
                className="flex items-center justify-center"
              >
                <CalendarIcon className="w-4 h-4 mr-2" />
                Mark Processing
              </Button>
              <Button 
                onClick={handleSavePayroll}
                disabled={!hasEmployees || isSaving}
                className="flex items-center justify-center"
              >
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </ResponsiveLayout>
  );
};

export default Payroll;
