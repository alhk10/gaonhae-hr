import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/sonner';
import { PayrollEmployee } from '@/types/employee';
import { getEmployees, getEmployeeById } from '@/services/employeeService';
import { calculateCPF, calculateAge } from '@/utils/cpfCalculations';
import { supabase } from '@/integrations/supabase/client';

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
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadEmployeeDetails = async () => {
      if (payroll) {
        setLoading(true);
        try {
          // Get all employees instead of hardcoded IDs
          const allEmployees = await getEmployees();
          console.log('All employees loaded:', allEmployees);
          
          const employees = await Promise.all(
            allEmployees.map(async (empData) => {
              // Load allowances from database
              const { data: allowancesData } = await supabase
                .from('allowances')
                .select('*')
                .eq('employee_id', empData.id);
              
              // Load deductions from database
              const { data: deductionsData } = await supabase
                .from('deductions')
                .select('*')
                .eq('employee_id', empData.id);

              const allowances = allowancesData || [];
              const deductions = deductionsData || [];
              
              console.log(`Employee ${empData.name} allowances:`, allowances);
              console.log(`Employee ${empData.name} deductions:`, deductions);

              const totalAllowances = allowances.reduce((sum, allowance) => sum + Number(allowance.amount), 0);
              const totalDeductions = deductions.reduce((sum, deduction) => sum + Number(deduction.amount), 0);
              
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
                
                if (empData.paymentType === 'Hourly' && empData.hourlyRate) {
                  const hoursWorked = 120;
                  grossPay = empData.hourlyRate * hoursWorked + totalAllowances;
                } else if (empData.paymentType === 'Daily' && (empData.dailyRate || empData.dailyWeekdayRate)) {
                  const weekdays = 18;
                  const weekends = 4;
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
                allowances: allowances.map(a => ({ 
                  id: a.id.toString(), // Convert number to string
                  name: a.name, 
                  amount: Number(a.amount), 
                  type: (a.type || 'Fixed') as 'Fixed' | 'Percentage' | 'Manual' // Ensure type compatibility
                })),
                deductions: deductions.map(d => ({ 
                  id: d.id.toString(), // Convert number to string
                  name: d.name, 
                  amount: Number(d.amount), 
                  type: (d.type || 'Fixed') as 'Fixed' | 'Percentage' | 'Manual' // Ensure type compatibility
                })),
                grossPay,
                cpfEmployee,
                cpfEmployer,
                netPay,
                // Legacy properties for backward compatibility
                cpf: cpfEmployee,
                total: netPay
              };
            })
          );

          console.log('Processed employee details:', employees);
          setEmployeeDetails(employees);
        } catch (error) {
          console.error('Error loading employee details:', error);
          toast('Error loading employee details');
        } finally {
          setLoading(false);
        }
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

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl">
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
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Edit Payroll - {payroll.period}</DialogTitle>
          <DialogDescription>
            Modify payroll details for {payroll.period}. Allowances and deductions are automatically loaded from employee profiles.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 overflow-auto max-h-[70vh]">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-blue-900">Payroll Summary</h3>
                <p className="text-blue-700">Total Employees: {employeeDetails.length}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-blue-600">Total Payroll Amount</p>
                <p className="text-2xl font-bold text-blue-900">
                  S${employeeDetails.reduce((sum, emp) => sum + emp.netPay, 0).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm mr-3">
                {employeeDetails.filter(emp => emp.type === 'Full-Time').length}
              </span>
              Full-Time Employees
            </h3>
            
            {employeeDetails.filter(emp => emp.type === 'Full-Time').length > 0 ? (
              <div className="bg-white border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-semibold">Employee</TableHead>
                      <TableHead className="font-semibold">Basic Salary</TableHead>
                      <TableHead className="font-semibold">Allowances</TableHead>
                      <TableHead className="font-semibold">Deductions</TableHead>
                      <TableHead className="font-semibold">CPF (Employee)</TableHead>
                      <TableHead className="font-semibold">CPF (Employer)</TableHead>
                      <TableHead className="font-semibold">Net Pay</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employeeDetails.filter(emp => emp.type === 'Full-Time').map((employee) => (
                      <TableRow key={employee.id} className="hover:bg-gray-50">
                        <TableCell>
                          <div>
                            <p className="font-medium">{employee.name}</p>
                            <p className="text-xs text-gray-500">{employee.id}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Input
                              type="number"
                              value={employee.baseSalary || 0}
                              className="w-28"
                              readOnly
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {employee.allowances.length > 0 ? (
                              employee.allowances.map((allowance, idx) => (
                                <div key={idx} className="flex items-center justify-between">
                                  <span className="text-sm">{allowance.name}</span>
                                  <Badge variant="secondary" className="ml-2">
                                    S${allowance.amount}
                                  </Badge>
                                </div>
                              ))
                            ) : (
                              <span className="text-sm text-gray-500">No allowances</span>
                            )}
                            <div className="border-t pt-1">
                              <span className="text-sm font-medium">
                                Total: S${employee.allowances.reduce((sum, a) => sum + a.amount, 0)}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {employee.deductions.length > 0 ? (
                              employee.deductions.map((deduction, idx) => (
                                <div key={idx} className="flex items-center justify-between">
                                  <span className="text-sm">{deduction.name}</span>
                                  <Badge variant="destructive" className="ml-2">
                                    S${deduction.amount}
                                  </Badge>
                                </div>
                              ))
                            ) : (
                              <span className="text-sm text-gray-500">No deductions</span>
                            )}
                            <div className="border-t pt-1">
                              <span className="text-sm font-medium">
                                Total: S${employee.deductions.reduce((sum, d) => sum + d.amount, 0)}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">S${employee.cpfEmployee.toLocaleString()}</TableCell>
                        <TableCell className="font-medium">S${employee.cpfEmployer.toLocaleString()}</TableCell>
                        <TableCell className="font-bold text-green-600">S${employee.netPay.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No full-time employees found
              </div>
            )}
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm mr-3">
                {employeeDetails.filter(emp => emp.type === 'Casual').length}
              </span>
              Casual Employees
            </h3>
            
            {employeeDetails.filter(emp => emp.type === 'Casual').length > 0 ? (
              <div className="bg-white border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-semibold">Employee</TableHead>
                      <TableHead className="font-semibold">Payment Type</TableHead>
                      <TableHead className="font-semibold">Rate</TableHead>
                      <TableHead className="font-semibold">Allowances</TableHead>
                      <TableHead className="font-semibold">Deductions</TableHead>
                      <TableHead className="font-semibold">CPF (Employee)</TableHead>
                      <TableHead className="font-semibold">CPF (Employer)</TableHead>
                      <TableHead className="font-semibold">Net Pay</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employeeDetails.filter(emp => emp.type === 'Casual').map((employee) => (
                      <TableRow key={employee.id} className="hover:bg-gray-50">
                        <TableCell>
                          <div>
                            <p className="font-medium">{employee.name}</p>
                            <p className="text-xs text-gray-500">{employee.id}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{employee.paymentType}</Badge>
                        </TableCell>
                        <TableCell>
                          {employee.paymentType === 'Hourly' && (
                            <span>S${employee.hourlyRate}/hr</span>
                          )}
                          {employee.paymentType === 'Daily' && (
                            <div className="space-y-1">
                              <div>S${employee.dailyWeekdayRate || employee.dailyRate}/day (WD)</div>
                              <div>S${employee.dailyWeekendRate || employee.dailyRate}/day (WE)</div>
                            </div>
                          )}
                          {employee.paymentType === 'Monthly' && (
                            <span>S${employee.baseSalary}/month</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {employee.allowances.length > 0 ? (
                              employee.allowances.map((allowance, idx) => (
                                <div key={idx} className="flex items-center justify-between">
                                  <span className="text-sm">{allowance.name}</span>
                                  <Badge variant="secondary" className="ml-2">
                                    S${allowance.amount}
                                  </Badge>
                                </div>
                              ))
                            ) : (
                              <span className="text-sm text-gray-500">No allowances</span>
                            )}
                            <div className="border-t pt-1">
                              <span className="text-sm font-medium">
                                Total: S${employee.allowances.reduce((sum, a) => sum + a.amount, 0)}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {employee.deductions.length > 0 ? (
                              employee.deductions.map((deduction, idx) => (
                                <div key={idx} className="flex items-center justify-between">
                                  <span className="text-sm">{deduction.name}</span>
                                  <Badge variant="destructive" className="ml-2">
                                    S${deduction.amount}
                                  </Badge>
                                </div>
                              ))
                            ) : (
                              <span className="text-sm text-gray-500">No deductions</span>
                            )}
                            <div className="border-t pt-1">
                              <span className="text-sm font-medium">
                                Total: S${employee.deductions.reduce((sum, d) => sum + d.amount, 0)}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">S${employee.cpfEmployee.toLocaleString()}</TableCell>
                        <TableCell className="font-medium">S${employee.cpfEmployer.toLocaleString()}</TableCell>
                        <TableCell className="font-bold text-green-600">S${employee.netPay.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No casual employees found
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end space-x-3 border-t pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => {
            const newTotal = employeeDetails.reduce((sum, emp) => sum + emp.netPay, 0);
            const updatedPayroll = {
              ...payroll,
              totalAmount: newTotal,
              employeeCount: employeeDetails.length
            };
            onSave(updatedPayroll);
            toast(`Payroll for ${payroll.period} updated successfully`);
            onClose();
          }}>
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PayrollEditDialog;
