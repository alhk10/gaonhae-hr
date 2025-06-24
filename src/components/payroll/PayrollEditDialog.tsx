
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/components/ui/sonner';
import { PayrollEmployee } from '@/types/employee';
import { getEmployeeById } from '@/data/employeeData';
import { calculateCPF, calculateAge } from '@/utils/cpfCalculations';

interface PayrollData {
  id: string;
  period: string;
  status: string;
  totalAmount: number;
  employeeCount: number;
  processedDate: string | null;
}

interface PayrollEditDialogProps {
  payroll: PayrollData | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedPayroll: PayrollData) => void;
}

const PayrollEditDialog = ({ payroll, isOpen, onClose, onSave }: PayrollEditDialogProps) => {
  const [employeeDetails, setEmployeeDetails] = useState<PayrollEmployee[]>([]);

  useEffect(() => {
    if (payroll) {
      // Get all employee IDs that should be in this payroll
      const employeeIds = ['EMP001', 'EMP002', 'EMP003', 'CAS001', 'CAS002', 'CAS003'];
      
      const employees = employeeIds.map(id => {
        const empData = getEmployeeById(id);
        if (!empData) return null;

        const totalAllowances = empData.allowances.reduce((sum, allowance) => sum + allowance.amount, 0);
        const totalDeductions = empData.deductions.reduce((sum, deduction) => sum + deduction.amount, 0);
        
        let cpf = 0;
        let total = 0;

        if (empData.type === 'Full-Time' && empData.baseSalary) {
          const age = calculateAge(empData.dateOfBirth);
          const grossSalary = empData.baseSalary + totalAllowances;
          const cpfCalc = calculateCPF(grossSalary, empData.residencyStatus, age);
          cpf = cpfCalc.employerCPF;
          total = empData.baseSalary + totalAllowances - totalDeductions + cpf;
        } else if (empData.type === 'Casual' && empData.hourlyRate) {
          // For casual employees, assume 120 hours worked (this should come from slot bookings)
          const hoursWorked = 120;
          const grossPay = empData.hourlyRate * hoursWorked;
          const age = calculateAge(empData.dateOfBirth);
          const cpfCalc = calculateCPF(grossPay, empData.residencyStatus, age);
          cpf = cpfCalc.employerCPF;
          total = grossPay + totalAllowances - totalDeductions - cpfCalc.employeeCPF;
        }

        return {
          id: empData.id,
          name: empData.name,
          type: empData.type,
          baseSalary: empData.baseSalary || empData.hourlyRate || 0,
          allowances: totalAllowances,
          deductions: totalDeductions,
          cpf,
          total
        };
      }).filter(Boolean) as PayrollEmployee[];

      setEmployeeDetails(employees);
    }
  }, [payroll]);

  if (!payroll) return null;

  const handleSalaryChange = (employeeId: string, newSalary: number) => {
    setEmployeeDetails(prev => 
      prev.map(emp => {
        if (emp.id === employeeId) {
          const empData = getEmployeeById(employeeId);
          if (!empData) return emp;

          const age = calculateAge(empData.dateOfBirth);
          let cpf = 0;
          let total = 0;

          if (empData.type === 'Full-Time') {
            const grossSalary = newSalary + emp.allowances;
            const cpfCalc = calculateCPF(grossSalary, empData.residencyStatus, age);
            cpf = cpfCalc.employerCPF;
            total = newSalary + emp.allowances - emp.deductions + cpf;
          }

          return {
            ...emp,
            baseSalary: newSalary,
            cpf,
            total
          };
        }
        return emp;
      })
    );
  };

  const handleAllowancesChange = (employeeId: string, newAllowances: number) => {
    setEmployeeDetails(prev => 
      prev.map(emp => {
        if (emp.id === employeeId) {
          const total = emp.baseSalary + newAllowances - emp.deductions + emp.cpf;
          return {
            ...emp,
            allowances: newAllowances,
            total
          };
        }
        return emp;
      })
    );
  };

  const handleDeductionsChange = (employeeId: string, newDeductions: number) => {
    setEmployeeDetails(prev => 
      prev.map(emp => {
        if (emp.id === employeeId) {
          const total = emp.baseSalary + emp.allowances - newDeductions + emp.cpf;
          return {
            ...emp,
            deductions: newDeductions,
            total
          };
        }
        return emp;
      })
    );
  };

  const handleSave = () => {
    const newTotal = employeeDetails.reduce((sum, emp) => sum + emp.total, 0);
    const updatedPayroll = {
      ...payroll,
      totalAmount: newTotal
    };
    onSave(updatedPayroll);
    toast(`Payroll for ${payroll.period} updated successfully`);
    onClose();
  };

  const getEmployeeAllowanceBreakdown = (employeeId: string) => {
    const empData = getEmployeeById(employeeId);
    return empData?.allowances || [];
  };

  const getEmployeeDeductionBreakdown = (employeeId: string) => {
    const empData = getEmployeeById(employeeId);
    return empData?.deductions || [];
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl">
        <DialogHeader>
          <DialogTitle>Edit Payroll - {payroll.period}</DialogTitle>
          <DialogDescription>
            Modify payroll details for {payroll.period}. Allowances and deductions are pulled from employee profiles.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-3">Employee Payroll Details</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Base Salary</TableHead>
                  <TableHead>Allowances</TableHead>
                  <TableHead>Deductions</TableHead>
                  <TableHead>CPF</TableHead>
                  <TableHead>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employeeDetails.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell className="font-medium">
                      <div>
                        <p>{employee.name}</p>
                        <p className="text-xs text-gray-500">{employee.id}</p>
                      </div>
                    </TableCell>
                    <TableCell>{employee.type}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={employee.baseSalary}
                        onChange={(e) => handleSalaryChange(employee.id, Number(e.target.value))}
                        className="w-24"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Input
                          type="number"
                          value={employee.allowances}
                          onChange={(e) => handleAllowancesChange(employee.id, Number(e.target.value))}
                          className="w-24"
                        />
                        <div className="text-xs text-gray-500">
                          {getEmployeeAllowanceBreakdown(employee.id).map((allowance, idx) => (
                            <div key={idx}>{allowance.name}: S${allowance.amount}</div>
                          ))}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Input
                          type="number"
                          value={employee.deductions}
                          onChange={(e) => handleDeductionsChange(employee.id, Number(e.target.value))}
                          className="w-24"
                        />
                        <div className="text-xs text-gray-500">
                          {getEmployeeDeductionBreakdown(employee.id).map((deduction, idx) => (
                            <div key={idx}>{deduction.name}: S${deduction.amount}</div>
                          ))}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>S${employee.cpf.toLocaleString()}</TableCell>
                    <TableCell className="font-bold">S${employee.total.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PayrollEditDialog;
