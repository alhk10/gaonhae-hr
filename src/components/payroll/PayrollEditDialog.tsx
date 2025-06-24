
import React, { useState } from 'react';
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
  const [employeeDetails, setEmployeeDetails] = useState<Employee[]>([
    { id: 'EMP001', name: 'John Tan', type: 'Full-Time', baseSalary: 4500, allowances: 300, deductions: 50, cpf: 765, total: 5515 },
    { id: 'EMP002', name: 'Mary Ng', type: 'Full-Time', baseSalary: 4200, allowances: 250, deductions: 40, cpf: 714, total: 5124 },
    { id: 'EMP003', name: 'David Lim', type: 'Full-Time', baseSalary: 3800, allowances: 200, deductions: 30, cpf: 646, total: 4616 },
    { id: 'CAS001', name: 'Alice Wong', type: 'Casual', baseSalary: 2400, allowances: 100, deductions: 0, cpf: 0, total: 2500 },
    { id: 'CAS002', name: 'Bob Chen', type: 'Casual', baseSalary: 2200, allowances: 80, deductions: 0, cpf: 0, total: 2280 },
    { id: 'CAS003', name: 'Sarah Lee', type: 'Casual', baseSalary: 1800, allowances: 60, deductions: 0, cpf: 0, total: 1860 },
  ]);

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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl">
        <DialogHeader>
          <DialogTitle>Edit Payroll - {payroll.period}</DialogTitle>
          <DialogDescription>
            Modify payroll details for {payroll.period}
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
                    <TableCell className="font-medium">{employee.name}</TableCell>
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
                      <Input
                        type="number"
                        value={employee.allowances}
                        onChange={(e) => handleAllowancesChange(employee.id, Number(e.target.value))}
                        className="w-24"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={employee.deductions}
                        onChange={(e) => handleDeductionsChange(employee.id, Number(e.target.value))}
                        className="w-24"
                      />
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
