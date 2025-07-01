
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { getEmployeeById } from '@/services/employeeService';
import { PayrollRecord } from '@/services/payrollService';

interface PayrollViewDialogProps {
  payroll: PayrollRecord | null;
  isOpen: boolean;
  onClose: () => void;
}

const PayrollViewDialog = ({ payroll, isOpen, onClose }: PayrollViewDialogProps) => {
  const [employeeDetails, setEmployeeDetails] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadEmployeeDetails = async () => {
      if (payroll?.employeeId) {
        setLoading(true);
        try {
          const employee = await getEmployeeById(payroll.employeeId);
          setEmployeeDetails(employee);
        } catch (error) {
          console.error('Error loading employee details:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    loadEmployeeDetails();
  }, [payroll?.employeeId]);

  if (!payroll) return null;

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl">
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading employee data...</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Payroll Details - {payroll.month} {payroll.year}</DialogTitle>
          <DialogDescription>
            View detailed breakdown for {employeeDetails?.name || payroll.employeeId}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-600">Employee</p>
              <p className="font-bold">{employeeDetails?.name || payroll.employeeId}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-600">Net Salary</p>
              <p className="font-bold">S${payroll.payrollData?.netSalary?.toLocaleString() || '0'}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-600">Gross Salary</p>
              <p className="font-bold">S${payroll.payrollData?.grossSalary?.toLocaleString() || '0'}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-600">Total CPF</p>
              <p className="font-bold">S${payroll.payrollData?.totalCPF?.toLocaleString() || '0'}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold mb-3">Salary Breakdown</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Base Salary:</span>
                  <span>S${payroll.payrollData?.baseSalary?.toLocaleString() || '0'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Allowances:</span>
                  <span>S${payroll.payrollData?.totalAllowances?.toLocaleString() || '0'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Deductions:</span>
                  <span>S${payroll.payrollData?.totalDeductions?.toLocaleString() || '0'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Approved Claims:</span>
                  <span>S${payroll.payrollData?.approvedClaims?.toLocaleString() || '0'}</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3">CPF Contributions</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Employee CPF:</span>
                  <span>S${payroll.payrollData?.employeeCPF?.toLocaleString() || '0'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Employer CPF:</span>
                  <span>S${payroll.payrollData?.employerCPF?.toLocaleString() || '0'}</span>
                </div>
                <hr className="my-2" />
                <div className="flex justify-between font-bold">
                  <span>Total CPF:</span>
                  <span>S${payroll.payrollData?.totalCPF?.toLocaleString() || '0'}</span>
                </div>
              </div>
            </div>
          </div>

          {(payroll.payrollData?.allowances?.length > 0 || payroll.payrollData?.deductions?.length > 0) && (
            <div>
              <h3 className="text-lg font-semibold mb-3">Allowances & Deductions</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {payroll.payrollData?.allowances?.length > 0 && (
                  <div>
                    <h4 className="font-medium text-green-700 mb-2">Allowances</h4>
                    <div className="space-y-1">
                      {payroll.payrollData.allowances.map((allowance, index) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span>{allowance.name}</span>
                          <Badge variant="secondary">S${allowance.amount.toLocaleString()}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {payroll.payrollData?.deductions?.length > 0 && (
                  <div>
                    <h4 className="font-medium text-red-700 mb-2">Deductions</h4>
                    <div className="space-y-1">
                      {payroll.payrollData.deductions.map((deduction, index) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span>{deduction.name}</span>
                          <Badge variant="destructive">S${deduction.amount.toLocaleString()}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-blue-900">Final Net Salary</h3>
                <p className="text-sm text-blue-700">After all deductions and additions</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-blue-900">
                  S${payroll.payrollData?.netSalary?.toLocaleString() || '0'}
                </p>
              </div>
            </div>
          </div>

          <div className="text-xs text-gray-500 space-y-1">
            <p>Record ID: {payroll.id}</p>
            <p>Created: {new Date(payroll.createdAt).toLocaleString()}</p>
            <p>Last Updated: {new Date(payroll.updatedAt).toLocaleString()}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PayrollViewDialog;
