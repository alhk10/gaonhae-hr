import React, { useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { FileText, Download, Mail, Search, Users, Filter } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { getEmployees } from '@/services/employeeService';
import { generatePayslipPDF } from '@/utils/payslipPDFGenerator';
import { generateCasualPayslipPDF, type SlotEntry } from '@/utils/casualPayslipPDFGenerator';
import { EmployeeProfile } from '@/types/employee';
import { PayrollData } from '@/services/payrollService';

interface PayslipRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeEmail: string | null;
  employeeType: string;
  month: string;
  year: number;
  payrollData: PayrollData & {
    slotBreakdown?: Array<{
      date: string;
      branchName: string;
      pay: number;
      checkIn?: string | null;
      checkOut?: string | null;
      hoursWorked?: number;
    }>;
    slotBookingPay?: number;
    employeeType?: string;
  };
}

const PayslipManagement = () => {
  const { userrole } = useAuth();
  const [payslips, setPayslips] = useState<PayslipRecord[]>([]);
  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedPayslips, setSelectedPayslips] = useState<Set<string>>(new Set());
  const [sendingEmails, setSendingEmails] = useState(false);

  // Check superadmin access
  if (userrole !== 'superadmin') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex h-[calc(100vh-73px)]">
          <Sidebar />
          <main className="flex-1 p-6 overflow-auto">
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <h3 className="text-lg font-medium text-destructive">Access Denied</h3>
                  <p className="text-muted-foreground mt-2">This page is only accessible to superadmins.</p>
                </div>
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    );
  }

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load employees
      const employeesData = await getEmployees();
      setEmployees(employeesData);

      // Load all payroll records
      const { data: records, error } = await supabase
        .from('payroll_records')
        .select('*')
        .not('employee_id', 'is', null)
        .order('year', { ascending: false })
        .order('month', { ascending: false });

      if (error) throw error;

      // Map records with employee data
      const mappedPayslips: PayslipRecord[] = (records || []).map((record: any) => {
        const employee = employeesData.find(e => e.id === record.employee_id);
        return {
          id: record.id,
          employeeId: record.employee_id,
          employeeName: employee?.display_name || employee?.name || 'Unknown',
          employeeEmail: employee?.email || null,
          employeeType: employee?.type || 'Unknown',
          month: record.month,
          year: record.year,
          payrollData: record.payroll_data
        };
      });

      setPayslips(mappedPayslips);
    } catch (error) {
      console.error('Error loading payslip data:', error);
      toast.error('Failed to load payslip data');
    } finally {
      setLoading(false);
    }
  };

  // Get unique months for filter
  const uniqueMonths = [...new Set(payslips.map(p => p.month))];

  // Month name to number mapping for sorting
  const monthOrder: Record<string, number> = {
    'January': 1, 'February': 2, 'March': 3, 'April': 4,
    'May': 5, 'June': 6, 'July': 7, 'August': 8,
    'September': 9, 'October': 10, 'November': 11, 'December': 12
  };

  // Filter and sort payslips in reverse chronological order
  const filteredPayslips = payslips
    .filter(payslip => {
      const matchesSearch = payslip.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           payslip.employeeId.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesMonth = selectedMonth === 'all' || payslip.month === selectedMonth;
      const matchesType = selectedType === 'all' || payslip.employeeType === selectedType;
      return matchesSearch && matchesMonth && matchesType;
    })
    .sort((a, b) => {
      // Sort by year descending, then by month descending
      if (b.year !== a.year) return b.year - a.year;
      return (monthOrder[b.month] || 0) - (monthOrder[a.month] || 0);
    });

  const handleSelectAll = () => {
    if (selectedPayslips.size === filteredPayslips.length) {
      setSelectedPayslips(new Set());
    } else {
      setSelectedPayslips(new Set(filteredPayslips.map(p => p.id)));
    }
  };

  const handleSelectPayslip = (id: string) => {
    const newSelected = new Set(selectedPayslips);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedPayslips(newSelected);
  };

  const handleDownloadPayslip = async (payslip: PayslipRecord) => {
    try {
      const employee = employees.find(e => e.id === payslip.employeeId);
      if (!employee) {
        toast.error('Employee data not found');
        return;
      }

      const isCasual = payslip.employeeType === 'Casual' || payslip.payrollData.employeeType === 'Casual';
      const hasTimesheet = payslip.payrollData.slotBreakdown && payslip.payrollData.slotBreakdown.length > 0;

      if (isCasual && hasTimesheet) {
        const slots: SlotEntry[] = payslip.payrollData.slotBreakdown!.map(slot => ({
          date: slot.date,
          branchName: slot.branchName,
          clockIn: slot.checkIn || null,
          clockOut: slot.checkOut || null,
          hoursWorked: slot.hoursWorked || 0,
          pay: slot.pay || 0
        }));

        // Ensure all numeric fields have defaults to prevent toFixed errors
        const totalSlotPay = payslip.payrollData.slotBookingPay || slots.reduce((sum, s) => sum + (s.pay || 0), 0);
        const totalAllowances = payslip.payrollData.totalAllowances || 0;
        const totalDeductions = payslip.payrollData.totalDeductions || 0;
        const approvedClaims = payslip.payrollData.approvedClaims || 0;
        const grossSalary = payslip.payrollData.grossSalary || (totalSlotPay + totalAllowances + approvedClaims);
        const employeeCPF = payslip.payrollData.employeeCPF || 0;
        const employerCPF = payslip.payrollData.employerCPF || 0;
        const totalCPF = payslip.payrollData.totalCPF || (employeeCPF + employerCPF);
        const netSalary = payslip.payrollData.netSalary || (grossSalary - employeeCPF - totalDeductions);

        await generateCasualPayslipPDF({
          employee: {
            id: employee.id,
            name: employee.name,
            nric: employee.nric,
            branch: employee.branch,
            position: employee.position,
            bankName: employee.bankName,
            bankAccount: employee.bankAccount
          },
          month: payslip.month,
          slots,
          totalSlotPay,
          totalAllowances,
          totalDeductions,
          approvedClaims,
          grossSalary,
          employeeCPF,
          employerCPF,
          totalCPF,
          netSalary,
          allowances: payslip.payrollData.allowances || [],
          deductions: payslip.payrollData.deductions || []
        });
      } else {
        await generatePayslipPDF({
          employee: {
            id: employee.id,
            name: employee.name,
            nric: employee.nric,
            branch: employee.branch,
            position: employee.position,
            bankName: employee.bankName,
            bankAccount: employee.bankAccount
          },
          month: payslip.month,
          baseSalary: payslip.payrollData.baseSalary,
          totalAllowances: payslip.payrollData.totalAllowances,
          totalDeductions: payslip.payrollData.totalDeductions,
          grossSalary: payslip.payrollData.grossSalary,
          employeeCPF: payslip.payrollData.employeeCPF,
          employerCPF: payslip.payrollData.employerCPF,
          totalCPF: payslip.payrollData.totalCPF,
          approvedClaims: payslip.payrollData.approvedClaims,
          netSalary: payslip.payrollData.netSalary,
          allowances: payslip.payrollData.allowances,
          deductions: payslip.payrollData.deductions
        });
      }

      toast.success(`Downloaded payslip for ${payslip.employeeName}`);
    } catch (error) {
      console.error('Error downloading payslip:', error);
      toast.error('Failed to download payslip');
    }
  };

  const handleBulkDownload = async () => {
    const selectedRecords = filteredPayslips.filter(p => selectedPayslips.has(p.id));
    
    for (const payslip of selectedRecords) {
      await handleDownloadPayslip(payslip);
      // Small delay between downloads
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    toast.success(`Downloaded ${selectedRecords.length} payslips`);
  };

  const handleSendEmail = async (payslip: PayslipRecord) => {
    if (!payslip.employeeEmail) {
      toast.error('No email address for this employee');
      return;
    }

    try {
      const { error } = await supabase.functions.invoke('send-payslip-email', {
        body: {
          employeeEmail: payslip.employeeEmail,
          employeeName: payslip.employeeName,
          month: payslip.month,
          payrollData: payslip.payrollData
        }
      });

      if (error) throw error;
      toast.success(`Payslip sent to ${payslip.employeeEmail}`);
    } catch (error) {
      console.error('Error sending payslip email:', error);
      toast.error('Failed to send payslip email. Please check if RESEND_API_KEY is configured.');
    }
  };

  const handleBulkSendEmails = async () => {
    const selectedRecords = filteredPayslips.filter(p => selectedPayslips.has(p.id) && p.employeeEmail);
    
    if (selectedRecords.length === 0) {
      toast.error('No selected payslips have email addresses');
      return;
    }

    setSendingEmails(true);
    let successCount = 0;
    let failCount = 0;

    for (const payslip of selectedRecords) {
      try {
        const { error } = await supabase.functions.invoke('send-payslip-email', {
          body: {
            employeeEmail: payslip.employeeEmail,
            employeeName: payslip.employeeName,
            month: payslip.month,
            payrollData: payslip.payrollData
          }
        });

        if (error) throw error;
        successCount++;
      } catch (error) {
        console.error(`Failed to send email to ${payslip.employeeEmail}:`, error);
        failCount++;
      }
      // Small delay between emails
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    setSendingEmails(false);
    
    if (failCount === 0) {
      toast.success(`Successfully sent ${successCount} payslip emails`);
    } else {
      toast.warning(`Sent ${successCount} emails, ${failCount} failed`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex h-[calc(100vh-73px)]">
          <Sidebar />
          <main className="flex-1 p-6 overflow-auto">
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
                <p className="text-muted-foreground">Loading payslips...</p>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex h-[calc(100vh-73px)]">
        <Sidebar />
        <main className="flex-1 p-6 overflow-auto">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Payslip Management</h1>
                <p className="text-muted-foreground">View, download, and send payslips to employees</p>
              </div>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                <Users className="w-4 h-4 mr-1" />
                {payslips.length} Total Payslips
              </Badge>
            </div>

            {/* Filters */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-wrap gap-4 items-center">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Search by name or ID..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger className="w-[180px]">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Filter by month" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Months</SelectItem>
                      {uniqueMonths.map(month => (
                        <SelectItem key={month} value={month}>{month}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={selectedType} onValueChange={setSelectedType}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Employee type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="Full-Time">Full-Time</SelectItem>
                      <SelectItem value="Casual">Casual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Bulk Actions */}
            {selectedPayslips.size > 0 && (
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {selectedPayslips.size} payslip(s) selected
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleBulkDownload}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download Selected
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={handleBulkSendEmails}
                        disabled={sendingEmails}
                      >
                        <Mail className="h-4 w-4 mr-2" />
                        {sendingEmails ? 'Sending...' : 'Send via Email'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Payslips List */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Payslips</CardTitle>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedPayslips.size === filteredPayslips.length && filteredPayslips.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                    <span className="text-sm text-muted-foreground">Select All</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {filteredPayslips.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No payslips found</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredPayslips.map((payslip) => (
                      <div
                        key={payslip.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <Checkbox
                            checked={selectedPayslips.has(payslip.id)}
                            onCheckedChange={() => handleSelectPayslip(payslip.id)}
                          />
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-gray-900">{payslip.employeeName}</span>
                              <Badge variant="outline" className={
                                payslip.employeeType === 'Casual' 
                                  ? 'bg-green-50 text-green-700 border-green-200' 
                                  : 'bg-blue-50 text-blue-700 border-blue-200'
                              }>
                                {payslip.employeeType}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {payslip.month} • Net: S${(payslip.payrollData.netSalary || 0).toLocaleString()}
                              {payslip.employeeEmail && (
                                <span className="ml-2">• {payslip.employeeEmail}</span>
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadPayslip(payslip)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSendEmail(payslip)}
                            disabled={!payslip.employeeEmail}
                            title={payslip.employeeEmail ? 'Send via email' : 'No email address'}
                          >
                            <Mail className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
};

export default PayslipManagement;
