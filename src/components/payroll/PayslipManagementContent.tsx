import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { FileText, Download, Mail, Search, Users, Filter, Trash2 } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
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

const PayslipManagementContent = () => {
  const [payslips, setPayslips] = useState<PayslipRecord[]>([]);
  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedPayslips, setSelectedPayslips] = useState<Set<string>>(new Set());
  const [sendingEmails, setSendingEmails] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const employeesData = await getEmployees();
      setEmployees(employeesData);

      const { data: records, error } = await supabase
        .from('payroll_records')
        .select('*')
        .not('employee_id', 'is', null)
        .order('year', { ascending: false })
        .order('month', { ascending: false });

      if (error) throw error;

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

  const uniqueMonths = [...new Set(payslips.map(p => p.month))];

  const monthOrder: Record<string, number> = {
    'January': 1, 'February': 2, 'March': 3, 'April': 4,
    'May': 5, 'June': 6, 'July': 7, 'August': 8,
    'September': 9, 'October': 10, 'November': 11, 'December': 12
  };

  const filteredPayslips = payslips
    .filter(payslip => {
      const matchesSearch = payslip.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           payslip.employeeId.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesMonth = selectedMonth === 'all' || payslip.month === selectedMonth;
      const matchesType = selectedType === 'all' || payslip.employeeType === selectedType;
      return matchesSearch && matchesMonth && matchesType;
    })
    .sort((a, b) => {
      if (b.year !== a.year) return b.year - a.year;
      const aMonthName = a.month.split(' ')[0];
      const bMonthName = b.month.split(' ')[0];
      return (monthOrder[bMonthName] || 0) - (monthOrder[aMonthName] || 0);
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
        const hasValidData = payslip.payrollData && 
          (payslip.payrollData.baseSalary !== undefined || 
           payslip.payrollData.grossSalary !== undefined ||
           payslip.payrollData.netSalary !== undefined);
        
        if (!hasValidData) {
          toast.error(`Payroll data not found for ${payslip.employeeName} - ${payslip.month}. Please process payroll first.`);
          return;
        }

        const baseSalary = payslip.payrollData.baseSalary || 0;
        const totalAllowances = payslip.payrollData.totalAllowances || 0;
        const totalDeductions = payslip.payrollData.totalDeductions || 0;
        const approvedClaims = payslip.payrollData.approvedClaims || 0;
        const grossSalary = payslip.payrollData.grossSalary || (baseSalary + totalAllowances);
        const employeeCPF = payslip.payrollData.employeeCPF || 0;
        const employerCPF = payslip.payrollData.employerCPF || 0;
        const totalCPF = payslip.payrollData.totalCPF || (employeeCPF + employerCPF);
        const netSalary = payslip.payrollData.netSalary || (grossSalary + approvedClaims - employeeCPF - totalDeductions);

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
          baseSalary,
          totalAllowances,
          totalDeductions,
          grossSalary,
          employeeCPF,
          employerCPF,
          totalCPF,
          approvedClaims,
          netSalary,
          allowances: payslip.payrollData.allowances || [],
          deductions: payslip.payrollData.deductions || []
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
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    toast.success(`Downloaded ${selectedRecords.length} payslips`);
  };

  const handleDeletePayslip = async (payslip: PayslipRecord) => {
    if (!confirm(`Are you sure you want to delete the payslip for ${payslip.employeeName} (${payslip.month} ${payslip.year})?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('payroll_records')
        .delete()
        .eq('id', payslip.id);

      if (error) throw error;

      setPayslips(prev => prev.filter(p => p.id !== payslip.id));
      setSelectedPayslips(prev => {
        const newSet = new Set(prev);
        newSet.delete(payslip.id);
        return newSet;
      });
      toast.success(`Deleted payslip for ${payslip.employeeName}`);
    } catch (error) {
      console.error('Error deleting payslip:', error);
      toast.error('Failed to delete payslip');
    }
  };

  const handleBulkDelete = async () => {
    const selectedRecords = filteredPayslips.filter(p => selectedPayslips.has(p.id));
    
    if (!confirm(`Are you sure you want to delete ${selectedRecords.length} payslip(s)? This action cannot be undone.`)) {
      return;
    }

    try {
      const idsToDelete = selectedRecords.map(p => p.id);
      
      const { error } = await supabase
        .from('payroll_records')
        .delete()
        .in('id', idsToDelete);

      if (error) throw error;

      setPayslips(prev => prev.filter(p => !idsToDelete.includes(p.id)));
      setSelectedPayslips(new Set());
      toast.success(`Deleted ${selectedRecords.length} payslip(s)`);
    } catch (error) {
      console.error('Error deleting payslips:', error);
      toast.error('Failed to delete payslips');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading payslips...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Payslip Management</h2>
          <p className="text-muted-foreground">View, download, and manage payslips</p>
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
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-blue-700 font-medium">
                {selectedPayslips.size} payslip(s) selected
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={handleBulkDownload}>
                  <Download className="w-4 h-4 mr-2" />
                  Download All
                </Button>
                <Button size="sm" variant="destructive" onClick={handleBulkDelete}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete All
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
            <div className="text-center py-8 text-gray-500">
              No payslips found
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPayslips.map((payslip) => (
                <div key={payslip.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-center gap-4">
                    <Checkbox 
                      checked={selectedPayslips.has(payslip.id)}
                      onCheckedChange={() => handleSelectPayslip(payslip.id)}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{payslip.employeeName}</p>
                        <Badge variant="outline" className="text-xs">
                          {payslip.employeeType}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {payslip.month} • Net: S${(payslip.payrollData.netSalary || 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleDownloadPayslip(payslip)}>
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleDeletePayslip(payslip)}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PayslipManagementContent;
