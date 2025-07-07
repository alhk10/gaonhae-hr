
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, Info } from 'lucide-react';

interface ValidationIssue {
  employeeId: string;
  employeeName: string;
  errors: string[];
  warnings: string[];
}

interface PayrollValidationSummaryProps {
  validationIssues: ValidationIssue[];
  totalEmployees: number;
}

const PayrollValidationSummary: React.FC<PayrollValidationSummaryProps> = ({
  validationIssues,
  totalEmployees
}) => {
  const employeesWithErrors = validationIssues.filter(issue => issue.errors.length > 0);
  const employeesWithWarnings = validationIssues.filter(issue => issue.warnings.length > 0 && issue.errors.length === 0);
  const validEmployees = totalEmployees - validationIssues.length;

  if (validationIssues.length === 0) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-4">
          <div className="flex items-center">
            <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
            <div>
              <p className="font-medium text-green-800">All Employees Validated</p>
              <p className="text-sm text-green-700">No validation issues found for {totalEmployees} employees</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center">
          <AlertTriangle className="w-5 h-5 mr-2" />
          Payroll Validation Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="text-green-600 border-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            {validEmployees} Valid
          </Badge>
          {employeesWithWarnings.length > 0 && (
            <Badge variant="outline" className="text-yellow-600 border-yellow-200">
              <Info className="w-3 h-3 mr-1" />
              {employeesWithWarnings.length} Warnings
            </Badge>
          )}
          {employeesWithErrors.length > 0 && (
            <Badge variant="outline" className="text-red-600 border-red-200">
              <AlertTriangle className="w-3 h-3 mr-1" />
              {employeesWithErrors.length} Errors
            </Badge>
          )}
        </div>

        {/* Error Details */}
        {employeesWithErrors.length > 0 && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <div className="font-medium mb-2">Employees with Errors (Must be fixed before processing):</div>
              <div className="space-y-2">
                {employeesWithErrors.map((issue) => (
                  <div key={issue.employeeId} className="text-sm">
                    <div className="font-medium">{issue.employeeName}:</div>
                    <ul className="list-disc list-inside ml-2">
                      {issue.errors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Warning Details */}
        {employeesWithWarnings.length > 0 && (
          <Alert className="border-yellow-200 bg-yellow-50">
            <Info className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              <div className="font-medium mb-2">Employees with Warnings (Review recommended):</div>
              <div className="space-y-2">
                {employeesWithWarnings.map((issue) => (
                  <div key={issue.employeeId} className="text-sm">
                    <div className="font-medium">{issue.employeeName}:</div>
                    <ul className="list-disc list-inside ml-2">
                      {issue.warnings.map((warning, index) => (
                        <li key={index}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default PayrollValidationSummary;
