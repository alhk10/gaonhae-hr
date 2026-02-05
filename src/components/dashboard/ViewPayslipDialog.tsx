import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronLeft, 
  ChevronRight, 
  FileText, 
  DollarSign,
  Loader2,
  Download
} from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import { EmployeeProfile } from '@/types/employee';
import { getEmployeePayrollRecords, type PayrollData } from '@/services/payrollService';
import { generatePayslipPDF } from '@/utils/payslipPDFGenerator';
import { generateCasualPayslipPDF, type SlotEntry } from '@/utils/casualPayslipPDFGenerator';

interface ViewPayslipDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string;
  employee: EmployeeProfile;
}

interface PayslipDisplayData extends PayrollData {
  month: string;
  employeeType?: string;
  slotBreakdown?: Array<{
    date: string;
    branchName: string;
    pay: number;
    hasAttendance?: boolean;
    checkIn?: string | null;
    checkOut?: string | null;
    hoursWorked?: number;
    fullSlotRate?: number;
    expectedHours?: number;
  }>;
  slotBookingPay?: number;
}

const ViewPayslipDialog: React.FC<ViewPayslipDialogProps> = ({
  open,
  onOpenChange,
  employeeId,
  employee,
}) => {
  const [payslips, setPayslips] = useState<PayslipDisplayData[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [downloadingMonth, setDownloadingMonth] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      loadPayslipData();
    }
  }, [open, employeeId]);

  const loadPayslipData = async () => {
    try {
      setLoading(true);
      const existingRecords = await getEmployeePayrollRecords(employeeId);
      
      if (!existingRecords || existingRecords.length === 0) {
        setPayslips([]);
        return;
      }
      
      const transformedPayslips: PayslipDisplayData[] = existingRecords.map(record => ({
        month: record.month,
        ...record.payrollData,
        employeeType: (record.payrollData as any).employeeType,
        slotBreakdown: (record.payrollData as any).slotBreakdown,
        slotBookingPay: (record.payrollData as any).slotBookingPay,
      }));
      
      transformedPayslips.sort((a, b) => b.month.localeCompare(a.month));
      setPayslips(transformedPayslips);
    } catch (error) {
      console.error('Error loading payslip data:', error);
      toast.error('Error loading payroll data');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPayslipPDF = async (month: string) => {
    try {
      setDownloadingMonth(month);

      const payslipData = payslips.find(p => p.month === month);
      if (!payslipData) {
        toast.error('Payslip data not found for this month');
        return;
      }

      const isCasualEmployee = employee.type === 'Casual' || payslipData.employeeType === 'Casual';
      
      if (isCasualEmployee && payslipData.slotBreakdown && payslipData.slotBreakdown.length > 0) {
        const slots: SlotEntry[] = payslipData.slotBreakdown.map(slot => ({
          date: slot.date,
          branchName: slot.branchName,
          dayRate: slot.fullSlotRate,
          clockIn: slot.checkIn || null,
          clockOut: slot.checkOut || null,
          hoursWorked: slot.hoursWorked || 0,
          expectedHours: slot.expectedHours,
          pay: slot.pay
        }));

        const casualPdfData = {
          employee: {
            id: employee.id,
            name: employee.name,
            nric: employee.nric,
            branch: employee.branch,
            position: employee.position,
            bankName: employee.bankName,
            bankAccount: employee.bankAccount
          },
          month,
          slots,
          totalSlotPay: payslipData.slotBookingPay || slots.reduce((sum, s) => sum + s.pay, 0),
          totalAllowances: payslipData.totalAllowances,
          totalDeductions: payslipData.totalDeductions,
          approvedClaims: payslipData.approvedClaims,
          grossSalary: payslipData.grossSalary,
          employeeCPF: payslipData.employeeCPF,
          employerCPF: payslipData.employerCPF,
          totalCPF: payslipData.totalCPF,
          netSalary: payslipData.netSalary,
          allowances: payslipData.allowances,
          deductions: payslipData.deductions
        };

        await generateCasualPayslipPDF(casualPdfData);
        toast.success(`Payslip downloaded for ${month}`);
      } else {
        const pdfData = {
          employee: {
            id: employee.id,
            name: employee.name,
            nric: employee.nric,
            branch: employee.branch,
            position: employee.position,
            bankName: employee.bankName,
            bankAccount: employee.bankAccount
          },
          month,
          baseSalary: payslipData.baseSalary,
          totalAllowances: payslipData.totalAllowances,
          totalDeductions: payslipData.totalDeductions,
          grossSalary: payslipData.grossSalary,
          employeeCPF: payslipData.employeeCPF,
          employerCPF: payslipData.employerCPF,
          totalCPF: payslipData.totalCPF,
          approvedClaims: payslipData.approvedClaims,
          netSalary: payslipData.netSalary,
          allowances: payslipData.allowances,
          deductions: payslipData.deductions
        };

        await generatePayslipPDF(pdfData);
        toast.success(`Payslip downloaded for ${month}`);
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error(`Error generating PDF for ${month}`);
    } finally {
      setDownloadingMonth(null);
    }
  };

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  // Filter payslips for current month view
  const currentMonthStr = format(currentMonth, 'yyyy-MM');
  const filteredPayslips = payslips.filter(p => p.month === currentMonthStr);

  const totalEarningsYear = payslips.reduce((sum, p) => sum + (p.grossSalary || 0) + (p.approvedClaims || 0), 0);
  const totalCPFYear = payslips.reduce((sum, p) => sum + (p.totalCPF || 0), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="p-4 pb-2 border-b flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            My Payslips
          </DialogTitle>
          <DialogDescription className="sr-only">
            View and download your payslips
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : payslips.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No payslips found</p>
            </div>
          ) : (
            <>
              {/* Summary Stats */}
              <div className="grid grid-cols-2 gap-3">
                <Card className="bg-green-50 border-green-200">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="text-xs text-green-600">Total Earnings (Year)</p>
                        <p className="text-lg font-bold text-green-700">
                          S${totalEarningsYear.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="text-xs text-blue-600">CPF (Year)</p>
                        <p className="text-lg font-bold text-blue-700">
                          S${totalCPFYear.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Month Navigator */}
              <div className="flex items-center justify-between py-2 border-b">
                <Button variant="ghost" size="icon" onClick={handlePrevMonth}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="font-semibold">
                  {format(currentMonth, 'MMMM yyyy')}
                </span>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handleNextMonth}
                  disabled={currentMonth >= new Date()}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>

              {/* Payslips List */}
              <div className="space-y-3">
                {filteredPayslips.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">
                    No payslip for this month
                  </p>
                ) : filteredPayslips.map((payslip, index) => {
                  const isCasual = payslip.employeeType === 'Casual' || employee.type === 'Casual';
                  const hasTimesheet = payslip.slotBreakdown && payslip.slotBreakdown.length > 0;
                  const isDownloading = downloadingMonth === payslip.month;
                  
                  return (
                    <Card key={index} className="border">
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-semibold">{payslip.month}</p>
                              {isCasual && (
                                <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                  Casual
                                </Badge>
                              )}
                              {hasTimesheet && (
                                <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                  {payslip.slotBreakdown?.length} slots
                                </Badge>
                              )}
                            </div>
                          </div>
                          <Button 
                            variant="default" 
                            size="sm"
                            onClick={() => handleDownloadPayslipPDF(payslip.month)}
                            disabled={isDownloading}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            {isDownloading ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <Download className="w-4 h-4 mr-1" />
                                PDF
                              </>
                            )}
                          </Button>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <div>
                            <p className="text-xs text-muted-foreground">Net</p>
                            <p className="font-medium text-green-600">
                              S${(payslip.netSalary || 0).toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Gross</p>
                            <p className="font-medium">
                              S${((payslip.grossSalary || 0) + (payslip.approvedClaims || 0)).toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">CPF</p>
                            <p className="font-medium text-blue-600">
                              S${(payslip.totalCPF || 0).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        
                        {(payslip.approvedClaims || 0) > 0 && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Claims: S${(payslip.approvedClaims || 0).toLocaleString()}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ViewPayslipDialog;
