
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Calculator, Eye, AlertTriangle, Info } from 'lucide-react';
import { PayrollEmployee, CasualEmployeePayroll } from '@/types/employee';
import { formatCurrency } from '@/utils/payrollCalculations';

interface PayrollCalculationDetailsProps {
  employee: PayrollEmployee | CasualEmployeePayroll;
  calculationErrors?: string[];
  calculationWarnings?: string[];
}

const PayrollCalculationDetails: React.FC<PayrollCalculationDetailsProps> = ({
  employee,
  calculationErrors = [],
  calculationWarnings = []
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const isCasual = 'paymentType' in employee;
  
  const renderFullTimeDetails = (emp: PayrollEmployee) => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="font-medium text-sm text-gray-600 mb-2">Income</h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Base Salary:</span>
              <span>{formatCurrency(emp.baseSalary || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span>Allowances:</span>
              <span>{formatCurrency(emp.allowances?.reduce((sum, a) => sum + a.amount, 0) || 0)}</span>
            </div>
            <div className="flex justify-between font-medium border-t pt-1">
              <span>Gross Pay:</span>
              <span>{formatCurrency(emp.grossPay || 0)}</span>
            </div>
          </div>
        </div>
        
        <div>
          <h4 className="font-medium text-sm text-gray-600 mb-2">Deductions</h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Employee CPF:</span>
              <span>{formatCurrency(emp.cpfEmployee || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span>Other Deductions:</span>
              <span>{formatCurrency(emp.deductions?.reduce((sum, d) => sum + d.amount, 0) || 0)}</span>
            </div>
            <div className="flex justify-between font-medium border-t pt-1">
              <span>Total Deductions:</span>
              <span>{formatCurrency((emp.cpfEmployee || 0) + (emp.deductions?.reduce((sum, d) => sum + d.amount, 0) || 0))}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="border-t pt-4">
        <div className="flex justify-between items-center">
          <span className="font-medium">Net Pay:</span>
          <span className="font-bold text-lg text-green-600">{formatCurrency(emp.netPay || 0)}</span>
        </div>
        <div className="flex justify-between text-sm text-gray-600 mt-1">
          <span>Employer CPF:</span>
          <span>{formatCurrency(emp.cpfEmployer || 0)}</span>
        </div>
      </div>
    </div>
  );

  const renderCasualDetails = (emp: CasualEmployeePayroll) => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="font-medium text-sm text-gray-600 mb-2">Work Details</h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Payment Type:</span>
              <span>{emp.paymentType}</span>
            </div>
            {emp.paymentType === 'Hourly' && (
              <>
                <div className="flex justify-between">
                  <span>Hours Worked:</span>
                  <span>{emp.hoursWorked || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Hourly Rate:</span>
                  <span>{formatCurrency(emp.hourlyRate || 0)}</span>
                </div>
              </>
            )}
            {emp.paymentType === 'Daily' && (
              <>
                <div className="flex justify-between">
                  <span>Days Worked:</span>
                  <span>{emp.daysWorked || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Daily Rate:</span>
                  <span>{formatCurrency(emp.dailyRate || 0)}</span>
                </div>
              </>
            )}
          </div>
        </div>
        
        <div>
          <h4 className="font-medium text-sm text-gray-600 mb-2">Calculation</h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Base Pay:</span>
              <span>{formatCurrency(emp.baseSalary || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span>Allowances:</span>
              <span>{formatCurrency(emp.allowances?.reduce((sum, a) => sum + a.amount, 0) || 0)}</span>
            </div>
            <div className="flex justify-between font-medium border-t pt-1">
              <span>Gross Pay:</span>
              <span>{formatCurrency(emp.grossPay || 0)}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="border-t pt-4">
        <div className="flex justify-between items-center">
          <span className="font-medium">Total Pay:</span>
          <span className="font-bold text-lg text-green-600">{formatCurrency(emp.totalPay || 0)}</span>
        </div>
        <div className="flex justify-between text-sm text-gray-600 mt-1">
          <span>Employee CPF:</span>
          <span>{formatCurrency(emp.employeeCPF || 0)}</span>
        </div>
        <div className="flex justify-between text-sm text-gray-600">
          <span>Employer CPF:</span>
          <span>{formatCurrency(emp.employerCPF || 0)}</span>
        </div>
      </div>
    </div>
  );

  const hasIssues = calculationErrors.length > 0 || calculationWarnings.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-auto p-1">
          <Eye className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Calculator className="w-5 h-5 mr-2" />
            Payroll Calculation Details - {employee.name}
          </DialogTitle>
          <DialogDescription>
            Detailed breakdown of payroll calculations for this employee
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Employee Type Badge */}
          <div className="flex items-center space-x-2">
            <Badge variant="outline">
              {isCasual ? `Casual - ${(employee as CasualEmployeePayroll).paymentType}` : 'Full-Time'}
            </Badge>
            {hasIssues && (
              <Badge variant="outline" className="text-amber-600 border-amber-200">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Has Issues
              </Badge>
            )}
          </div>

          {/* Calculation Details */}
          {isCasual ? renderCasualDetails(employee as CasualEmployeePayroll) : renderFullTimeDetails(employee as PayrollEmployee)}

          {/* Allowances Breakdown */}
          {employee.allowances && employee.allowances.length > 0 && (
            <Card className="bg-gray-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Allowances Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-1">
                  {employee.allowances.map((allowance, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span>{allowance.name}:</span>
                      <span>{formatCurrency(allowance.amount)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Deductions Breakdown */}
          {employee.deductions && employee.deductions.length > 0 && (
            <Card className="bg-gray-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Deductions Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-1">
                  {employee.deductions.map((deduction, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span>{deduction.name}:</span>
                      <span>{formatCurrency(deduction.amount)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Validation Issues */}
          {calculationErrors.length > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-red-800 flex items-center">
                  <AlertTriangle className="w-4 h-4 mr-1" />
                  Calculation Errors
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="text-sm text-red-700 space-y-1">
                  {calculationErrors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {calculationWarnings.length > 0 && (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-yellow-800 flex items-center">
                  <Info className="w-4 h-4 mr-1" />
                  Calculation Warnings
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="text-sm text-yellow-700 space-y-1">
                  {calculationWarnings.map((warning, index) => (
                    <li key={index}>• {warning}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PayrollCalculationDetails;
