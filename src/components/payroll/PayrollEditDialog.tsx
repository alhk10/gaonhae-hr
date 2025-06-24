import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/components/ui/sonner';

interface PayrollData {
  id: string;
  period: string;
  status: string;
  totalAmount: number;
  employeeCount: number;
  processedDate: string | null;
}

interface Employee {
  id: string;
  name: string;
  type: string;
  baseSalary: number;
  allowances: number;
  deductions: number;
  cpf: number;
  total: number;
}

interface PayrollEditDialogProps {
  payroll: PayrollData | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedPayroll: PayrollData) => void;
}

const PayrollEditDialog = ({ payroll, isOpen, onClose, onSave }: PayrollEditDialogProps) => {
  const [employeeDetails, setEmployeeDetails] = useState<Employee[]>([]);

  // Employee database with allowances and deductions from profiles
  const employeeDatabase = {
    'EMP001': {
      id: 'EMP001',
      name: 'John Tan',
      type: 'Full-Time',
      baseSalary: 4500,
      allowances: [
        { id: 1, name: 'Transport Allowance', amount: 200 },
        { id: 2, name: 'Meal Allowance', amount: 150 }
      ],
      deductions: [
        { id: 1, name: 'Insurance', amount: 100 }
      ]
    },
    'EMP002': {
      id: 'EMP002', 
      name: 'Mary Ng',
      type: 'Full-Time',
      baseSalary: 4200,
      allowances: [
        { id: 1, name: 'Transport Allowance', amount: 200 },
        { id: 2, name: 'Meal Allowance', amount: 150 }
      ],
      deductions: [
        { id: 1, name: 'Insurance', amount: 100 }
      ]
    },
    'EMP003': {
      id: 'EMP003',
      name: 'David Lim', 
      type: 'Full-Time',
      baseSalary: 3800,
      allowances: [
        { id: 1, name: 'Transport Allowance', amount: 200 },
        { id: 2, name: 'Meal Allowance', amount: 150 }
      ],
      deductions: [
        { id: 1, name: 'Insurance', amount: 100 }
      ]
    },
    'CAS001': {
      id: 'CAS001',
      name: 'Alice Wong',
      type: 'Casual', 
      baseSalary: 2400,
      allowances: [
        { id: 1, name: 'Performance Bonus', amount: 100 }
      ],
      deductions: []
    },
    'CAS002': {
      id: 'CAS002',
      name: 'Bob Chen',
      type: 'Casual',
      baseSalary: 2200,
      allowances: [
        { id: 1, name: 'Performance Bonus', amount: 80 }
      ],
      deductions: []
    },
    'CAS003': {
      id: 'CAS003',
      name: 'Sarah Lee',
      type: 'Casual',
      baseSalary: 1800,
      allowances: [
        { id: 1, name: 'Performance Bonus', amount: 60 }
      ],
      deductions: []
    }
  };

  useEffect(() => {
    if (payroll) {
      const employees = Object.values(employeeDatabase).map(emp => {
        const totalAllowances = emp.allowances.reduce((sum, allowance) => sum + allowance.amount, 0);
        const totalDeductions = emp.deductions.reduce((sum, deduction) => sum + deduction.amount, 0);
        const cpf = emp.type === 'Full-Time' ? Math.round(emp.baseSalary * 0.17) : 0;
        const total = emp.baseSalary + totalAllowances - totalDeductions + cpf;

        return {
          id: emp.id,
          name: emp.name,
          type: emp.type,
          baseSalary: emp.baseSalary,
          allowances: totalAllowances,
          deductions: totalDeductions,
          cpf,
          total
        };
      });
      setEmployeeDetails(employees);
    }
  }, [payroll]);

  if (!payroll) return null;

  const handleSalaryChange = (employeeId: string, newSalary: number) => {
    setEmployeeDetails(prev => 
      prev.map(emp => {
        if (emp.id === employeeId) {
          const cpf = emp.type === 'Full-Time' ? Math.round(newSalary * 0.17) : 0;
          const total = newSalary + emp.allowances - emp.deductions + cpf;
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
    const empData = employeeDatabase[employeeId];
    return empData?.allowances || [];
  };

  const getEmployeeDeductionBreakdown = (employeeId: string) => {
    const empData = employeeDatabase[employeeId];
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
