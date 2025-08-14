import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, DollarSign, Eye, Download } from 'lucide-react';
import { getEmployeePayrollRecords, PayrollRecord } from '@/services/payrollService';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface EmployeePayrollHistoryProps {
  employeeId: string;
  employeeName: string;
}

const EmployeePayrollHistory: React.FC<EmployeePayrollHistoryProps> = ({
  employeeId,
  employeeName
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState<PayrollRecord | null>(null);

  const { data: payrollRecords = [], isLoading, error } = useQuery({
    queryKey: ['employeePayrollHistory', employeeId],
    queryFn: () => getEmployeePayrollRecords(employeeId),
    enabled: isExpanded
  });

  const getStatusColor = (isLocked?: boolean) => {
    return isLocked 
      ? 'bg-red-100 text-red-800 border-red-200'
      : 'bg-green-100 text-green-800 border-green-200';
  };

  const totalNetPay = payrollRecords.reduce((sum, record) => 
    sum + (record.payrollData.netSalary || 0), 0
  );

  if (!isExpanded) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Payroll History
              </CardTitle>
              <CardDescription>
                View {employeeName}'s salary and payroll records
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(true)}
              className="text-muted-foreground"
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Payroll History
            </CardTitle>
            <CardDescription>
              {payrollRecords.length} payroll records • ${totalNetPay.toFixed(2)} total net pay
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(false)}
            className="text-muted-foreground"
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-4 text-muted-foreground">
            Error loading payroll history
          </div>
        ) : payrollRecords.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No payroll records found
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Gross Pay</TableHead>
                  <TableHead>CPF</TableHead>
                  <TableHead>Net Pay</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payrollRecords.slice(0, 10).map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">
                      {record.month} {record.year}
                    </TableCell>
                    <TableCell>
                      ${record.payrollData.grossSalary?.toFixed(2) || '0.00'}
                    </TableCell>
                    <TableCell>
                      ${record.payrollData.totalCPF?.toFixed(2) || '0.00'}
                    </TableCell>
                    <TableCell>
                      ${record.payrollData.netSalary?.toFixed(2) || '0.00'}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(record.isLocked)}>
                        {record.isLocked ? 'Locked' : 'Editable'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedPayroll(record)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Payroll Details - {record.month} {record.year}</DialogTitle>
                            </DialogHeader>
                            {selectedPayroll && (
                              <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="text-sm font-medium">Base Salary</label>
                                    <p className="text-lg font-semibold">
                                      ${selectedPayroll.payrollData.baseSalary?.toFixed(2) || '0.00'}
                                    </p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">Gross Salary</label>
                                    <p className="text-lg font-semibold">
                                      ${selectedPayroll.payrollData.grossSalary?.toFixed(2) || '0.00'}
                                    </p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">Employee CPF</label>
                                    <p className="text-sm text-muted-foreground">
                                      ${selectedPayroll.payrollData.employeeCPF?.toFixed(2) || '0.00'}
                                    </p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">Employer CPF</label>
                                    <p className="text-sm text-muted-foreground">
                                      ${selectedPayroll.payrollData.employerCPF?.toFixed(2) || '0.00'}
                                    </p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">Net Salary</label>
                                    <p className="text-lg font-semibold text-green-600">
                                      ${selectedPayroll.payrollData.netSalary?.toFixed(2) || '0.00'}
                                    </p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">Approved Claims</label>
                                    <p className="text-sm text-muted-foreground">
                                      ${selectedPayroll.payrollData.approvedClaims?.toFixed(2) || '0.00'}
                                    </p>
                                  </div>
                                </div>

                                {selectedPayroll.payrollData.allowances && selectedPayroll.payrollData.allowances.length > 0 && (
                                  <div>
                                    <label className="text-sm font-medium mb-2 block">Allowances</label>
                                    <div className="space-y-1">
                                      {selectedPayroll.payrollData.allowances.map((allowance, index) => (
                                        <div key={index} className="flex justify-between text-sm">
                                          <span>{allowance.name}</span>
                                          <span>${allowance.amount.toFixed(2)}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {selectedPayroll.payrollData.deductions && selectedPayroll.payrollData.deductions.length > 0 && (
                                  <div>
                                    <label className="text-sm font-medium mb-2 block">Deductions</label>
                                    <div className="space-y-1">
                                      {selectedPayroll.payrollData.deductions.map((deduction, index) => (
                                        <div key={index} className="flex justify-between text-sm">
                                          <span>{deduction.name}</span>
                                          <span>-${deduction.amount.toFixed(2)}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            // TODO: Implement payslip download
                            console.log('Download payslip for', record.id);
                          }}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {payrollRecords.length > 10 && (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Showing 10 of {payrollRecords.length} payroll records
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EmployeePayrollHistory;