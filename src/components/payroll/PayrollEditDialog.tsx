import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/sonner';
import { PayrollEmployee } from '@/types/employee';
import { getEmployeeById } from '@/services/employeeService';
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
    const loadEmployeeDetails = async () => {
      if (payroll) {
        // Get all employee IDs that should be in this payroll
        const employeeIds = ['EMP001', 'EMP002', 'EMP003', 'CAS001', 'CAS002', 'CAS003'];
        
        const employees = await Promise.all(
          employeeIds.map(async (id) => {
            const empData = await getEmployeeById(id);
            if (!empData) return null;

            const totalAllowances = empData.allowances.reduce((sum, allowance) => sum + allowance.amount, 0);
            const totalDeductions = empData.deductions.reduce((sum, deduction) => sum + deduction.amount, 0);
            
            let cpfEmployee = 0;
            let cpfEmployer = 0;
            let grossPay = 0;
            let netPay = 0;

            if (empData.type === 'Full-Time' && empData.baseSalary) {
              const age = calculateAge(empData.dateOfBirth);
              grossPay = empData.baseSalary + totalAllowances;
              const cpfCalc = calculateCPF(grossPay, empData.residencyStatus, age);
              cpfEmployee = cpfCalc.employeeCPF;
              cpfEmployer = cpfCalc.employerCPF;
              netPay = grossPay - cpfEmployee - totalDeductions;
            } else if (empData.type === 'Casual') {
              const age = calculateAge(empData.dateOfBirth);
              
              // Handle different payment types for casual employees
              if (empData.paymentType === 'Hourly' && empData.hourlyRate) {
                // For hourly employees, assume 120 hours worked (should come from attendance)
                const hoursWorked = 120;
                grossPay = empData.hourlyRate * hoursWorked + totalAllowances;
              } else if (empData.paymentType === 'Daily' && (empData.dailyRate || empData.dailyWeekdayRate)) {
                // For daily employees, assume 22 working days (should come from attendance)
                const weekdays = 18; // Estimated weekdays
                const weekends = 4; // Estimated weekends
                const weekdayPay = (empData.dailyWeekdayRate || empData.dailyRate || 0) * weekdays;
                const weekendPay = (empData.dailyWeekendRate || empData.dailyRate || 0) * weekends;
                grossPay = weekdayPay + weekendPay + totalAllowances;
              } else if (empData.paymentType === 'Monthly' && empData.baseSalary) {
                grossPay = empData.baseSalary + totalAllowances;
              }
              
              const cpfCalc = calculateCPF(grossPay, empData.residencyStatus, age);
              cpfEmployee = cpfCalc.employeeCPF;
              cpfEmployer = cpfCalc.employerCPF;
              netPay = grossPay - cpfEmployee - totalDeductions;
            }

            return {
              id: empData.id,
              name: empData.name,
              type: empData.type,
              baseSalary: empData.baseSalary,
              hourlyRate: empData.hourlyRate,
              dailyRate: empData.dailyRate,
              dailyWeekdayRate: empData.dailyWeekdayRate,
              dailyWeekendRate: empData.dailyWeekendRate,
              paymentType: empData.paymentType,
              allowances: empData.allowances,
              deductions: empData.deductions,
              grossPay,
              cpfEmployee,
              cpfEmployer,
              netPay
            };
          })
        );

        setEmployeeDetails(employees.filter(Boolean) as PayrollEmployee[]);
      }
    };

    loadEmployeeDetails();
  }, [payroll]);

  const handleSalaryChange = async (employeeId: string, newSalary: number) => {
    const empData = await getEmployeeById(employeeId);
    if (!empData) return;

    setEmployeeDetails(prev => 
      prev.map(emp => {
        if (emp.id === employeeId) {
          const age = calculateAge(empData.dateOfBirth);
          const totalAllowances = emp.allowances.reduce((sum, a) => sum + a.amount, 0);
          const totalDeductions = emp.deductions.reduce((sum, d) => sum + d.amount, 0);
          
          let cpfEmployee = 0;
          let cpfEmployer = 0;
          let grossPay = 0;
          let netPay = 0;

          if (empData.type === 'Full-Time') {
            grossPay = newSalary + totalAllowances;
            const cpfCalc = calculateCPF(grossPay, empData.residencyStatus, age);
            cpfEmployee = cpfCalc.employeeCPF;
            cpfEmployer = cpfCalc.employerCPF;
            netPay = grossPay - cpfEmployee - totalDeductions;
          } else if (empData.type === 'Casual') {
            // For casual employees, this might be updating their rate
            if (empData.paymentType === 'Hourly') {
              const hoursWorked = 120; // Should come from attendance
              grossPay = newSalary * hoursWorked + totalAllowances;
            } else if (empData.paymentType === 'Daily') {
              const daysWorked = 22; // Should come from attendance
              grossPay = newSalary * daysWorked + totalAllowances;
            } else if (empData.paymentType === 'Monthly') {
              grossPay = newSalary + totalAllowances;
            }
            
            const cpfCalc = calculateCPF(grossPay, empData.residencyStatus, age);
            cpfEmployee = cpfCalc.employeeCPF;
            cpfEmployer = cpfCalc.employerCPF;
            netPay = grossPay - cpfEmployee - totalDeductions;
          }

          return {
            ...emp,
            baseSalary: empData.type === 'Full-Time' ? newSalary : emp.baseSalary,
            hourlyRate: empData.paymentType === 'Hourly' ? newSalary : emp.hourlyRate,
            dailyRate: empData.paymentType === 'Daily' ? newSalary : emp.dailyRate,
            grossPay,
            cpfEmployee,
            cpfEmployer,
            netPay
          };
        }
        return emp;
      })
    );
  };

  const handleSave = () => {
    const newTotal = employeeDetails.reduce((sum, emp) => sum + emp.netPay, 0);
    const updatedPayroll = {
      ...payroll,
      totalAmount: newTotal
    };
    onSave(updatedPayroll);
    toast(`Payroll for ${payroll.period} updated successfully`);
    onClose();
  };

  if (!payroll) return null;

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
                  <TableHead>Payment Type</TableHead>
                  <TableHead>Rate/Salary</TableHead>
                  <TableHead>Allowances</TableHead>
                  <TableHead>Deductions</TableHead>
                  <TableHead>CPF</TableHead>
                  <TableHead>Net Pay</TableHead>
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
                    <TableCell>
                      <Badge variant={employee.type === 'Full-Time' ? 'default' : 'secondary'}>
                        {employee.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{employee.paymentType}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {employee.type === 'Full-Time' && (
                          <Input
                            type="number"
                            value={employee.baseSalary || 0}
                            onChange={(e) => handleSalaryChange(employee.id, Number(e.target.value))}
                            className="w-24"
                          />
                        )}
                        {employee.type === 'Casual' && employee.paymentType === 'Hourly' && (
                          <div>
                            <Input
                              type="number"
                              value={employee.hourlyRate || 0}
                              onChange={(e) => handleSalaryChange(employee.id, Number(e.target.value))}
                              className="w-24"
                            />
                            <span className="text-xs text-gray-500">/hour</span>
                          </div>
                        )}
                        {employee.type === 'Casual' && employee.paymentType === 'Daily' && (
                          <div className="space-y-1">
                            <div>
                              <Input
                                type="number"
                                value={employee.dailyWeekdayRate || employee.dailyRate || 0}
                                onChange={(e) => handleSalaryChange(employee.id, Number(e.target.value))}
                                className="w-24"
                              />
                              <span className="text-xs text-gray-500">Weekday</span>
                            </div>
                            <div>
                              <Input
                                type="number"
                                value={employee.dailyWeekendRate || employee.dailyRate || 0}
                                className="w-24"
                                disabled
                              />
                              <span className="text-xs text-gray-500">Weekend</span>
                            </div>
                          </div>
                        )}
                        {employee.type === 'Casual' && employee.paymentType === 'Monthly' && (
                          <div>
                            <Input
                              type="number"
                              value={employee.baseSalary || 0}
                              onChange={(e) => handleSalaryChange(employee.id, Number(e.target.value))}
                              className="w-24"
                            />
                            <span className="text-xs text-gray-500">/month</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-sm font-medium">
                          S${employee.allowances.reduce((sum, a) => sum + a.amount, 0)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {employee.allowances.map((allowance, idx) => (
                            <div key={idx}>{allowance.name}: S${allowance.amount}</div>
                          ))}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-sm font-medium">
                          S${employee.deductions.reduce((sum, d) => sum + d.amount, 0)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {employee.deductions.map((deduction, idx) => (
                            <div key={idx}>{deduction.name}: S${deduction.amount}</div>
                          ))}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>S${employee.cpfEmployer.toLocaleString()}</TableCell>
                    <TableCell className="font-bold">S${employee.netPay.toLocaleString()}</TableCell>
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
