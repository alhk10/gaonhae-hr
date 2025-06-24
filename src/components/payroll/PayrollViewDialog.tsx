
import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

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
  cpf: number;
  total: number;
}

interface PayrollViewDialogProps {
  payroll: PayrollData | null;
  isOpen: boolean;
  onClose: () => void;
}

const PayrollViewDialog = ({ payroll, isOpen, onClose }: PayrollViewDialogProps) => {
  if (!payroll) return null;

  // Mock employee data for the payroll
  const employeeDetails: Employee[] = [
    { id: 'EMP001', name: 'John Tan', type: 'Full-Time', baseSalary: 4500, cpf: 765, total: 5265 },
    { id: 'EMP002', name: 'Mary Ng', type: 'Full-Time', baseSalary: 4200, cpf: 714, total: 4914 },
    { id: 'EMP003', name: 'David Lim', type: 'Full-Time', baseSalary: 3800, cpf: 646, total: 4446 },
    { id: 'CAS001', name: 'Alice Wong', type: 'Casual', baseSalary: 2400, cpf: 0, total: 2400 },
    { id: 'CAS002', name: 'Bob Chen', type: 'Casual', baseSalary: 2200, cpf: 0, total: 2200 },
    { id: 'CAS003', name: 'Sarah Lee', type: 'Casual', baseSalary: 1800, cpf: 0, total: 1800 },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Payroll Details - {payroll.period}</DialogTitle>
          <DialogDescription>
            View detailed breakdown for {payroll.period}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-600">Status</p>
              <Badge variant={payroll.status === 'Current' ? 'default' : 'secondary'}>
                {payroll.status}
              </Badge>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-600">Total Amount</p>
              <p className="font-bold">S${payroll.totalAmount.toLocaleString()}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-600">Employees</p>
              <p className="font-bold">{payroll.employeeCount}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-600">Processed Date</p>
              <p className="font-bold">{payroll.processedDate || 'Not processed'}</p>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-3">Employee Breakdown</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Base Salary</TableHead>
                  <TableHead>CPF</TableHead>
                  <TableHead>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employeeDetails.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell className="font-medium">{employee.name}</TableCell>
                    <TableCell>{employee.type}</TableCell>
                    <TableCell>S${employee.baseSalary.toLocaleString()}</TableCell>
                    <TableCell>S${employee.cpf.toLocaleString()}</TableCell>
                    <TableCell className="font-bold">S${employee.total.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PayrollViewDialog;
