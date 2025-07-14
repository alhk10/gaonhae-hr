
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, AlertTriangle, RefreshCw, Users, Key } from 'lucide-react';
import { getEmployees } from '@/services/employeeService';
import { checkEmployeeAuthStatus } from '@/services/bulkUserCreationService';
import { EmployeeProfile } from '@/types/employee';
import { toast } from '@/components/ui/sonner';

interface EmployeeAuthStatus {
  employee: EmployeeProfile;
  hasAuth: boolean;
  checked: boolean;
}

const AuthenticationMonitor = () => {
  const [authStatuses, setAuthStatuses] = useState<EmployeeAuthStatus[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const checkAllEmployeeAuth = async () => {
    try {
      setIsLoading(true);
      console.log('AuthenticationMonitor: Checking auth status for all employees...');
      
      const employees = await getEmployees();
      const statuses: EmployeeAuthStatus[] = [];

      for (const employee of employees) {
        if (employee.email) {
          console.log(`AuthenticationMonitor: Checking auth for ${employee.name} (${employee.email})`);
          const hasAuth = await checkEmployeeAuthStatus(employee.email);
          statuses.push({
            employee,
            hasAuth,
            checked: true
          });
        } else {
          console.log(`AuthenticationMonitor: Employee ${employee.name} has no email`);
          statuses.push({
            employee,
            hasAuth: false,
            checked: false
          });
        }
      }

      setAuthStatuses(statuses);
      setLastChecked(new Date());
      
      const totalWithEmail = statuses.filter(s => s.checked).length;
      const totalWithAuth = statuses.filter(s => s.hasAuth).length;
      const missingAuth = totalWithEmail - totalWithAuth;
      
      console.log(`AuthenticationMonitor: Results - ${totalWithAuth}/${totalWithEmail} employees have auth accounts`);
      
      if (missingAuth > 0) {
        toast(`Found ${missingAuth} employees without Supabase Auth accounts`);
      } else {
        toast("All employees with email addresses have Supabase Auth accounts!");
      }
      
    } catch (error) {
      console.error('AuthenticationMonitor: Error checking auth statuses:', error);
      toast("Error checking authentication status");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAllEmployeeAuth();
  }, []);

  const employeesWithEmail = authStatuses.filter(s => s.checked);
  const employeesWithAuth = authStatuses.filter(s => s.hasAuth);
  const employeesMissingAuth = authStatuses.filter(s => s.checked && !s.hasAuth);
  const employeesWithoutEmail = authStatuses.filter(s => !s.checked);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Authentication Status Monitor
          </CardTitle>
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {lastChecked && `Last checked: ${lastChecked.toLocaleString()}`}
            </div>
            <Button 
              onClick={checkAllEmployeeAuth}
              disabled={isLoading}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh Status
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Summary Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">Total Employees</span>
              </div>
              <div className="text-2xl font-bold text-blue-900">{authStatuses.length}</div>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">With Auth</span>
              </div>
              <div className="text-2xl font-bold text-green-900">{employeesWithAuth.length}</div>
            </div>
            
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <XCircle className="h-4 w-4 text-red-600" />
                <span className="text-sm font-medium text-red-800">Missing Auth</span>
              </div>
              <div className="text-2xl font-bold text-red-900">{employeesMissingAuth.length}</div>
            </div>
            
            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-800">No Email</span>
              </div>
              <div className="text-2xl font-bold text-yellow-900">{employeesWithoutEmail.length}</div>
            </div>
          </div>

          {/* Status Alerts */}
          {employeesMissingAuth.length > 0 && (
            <Alert className="border-red-200 bg-red-50">
              <XCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <strong>Action Required:</strong> {employeesMissingAuth.length} employees need Supabase Auth accounts created. 
                Use the "Create All Auth Users" button in the Auth Users tab to fix this.
              </AlertDescription>
            </Alert>
          )}

          {employeesWithoutEmail.length > 0 && (
            <Alert className="border-yellow-200 bg-yellow-50">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                <strong>Note:</strong> {employeesWithoutEmail.length} employees don't have email addresses and cannot log in.
              </AlertDescription>
            </Alert>
          )}

          {employeesMissingAuth.length === 0 && employeesWithEmail.length > 0 && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <strong>All Good!</strong> All employees with email addresses have Supabase Auth accounts.
              </AlertDescription>
            </Alert>
          )}

          {/* Detailed Status List */}
          {authStatuses.length > 0 && (
            <div>
              <h4 className="font-semibold mb-3">Employee Authentication Status</h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {authStatuses
                  .sort((a, b) => {
                    // Sort by auth status (missing auth first), then by name
                    if (a.checked && b.checked) {
                      if (a.hasAuth !== b.hasAuth) {
                        return a.hasAuth ? 1 : -1;
                      }
                    }
                    return a.employee.name.localeCompare(b.employee.name);
                  })
                  .map((status, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <div>
                        <span className="font-medium">{status.employee.name}</span>
                        <div className="text-sm text-gray-600">
                          {status.employee.email || 'No email address'}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!status.checked ? (
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            No Email
                          </Badge>
                        ) : status.hasAuth ? (
                          <Badge variant="default" className="bg-green-100 text-green-800 flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Auth Ready
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="flex items-center gap-1">
                            <XCircle className="h-3 w-3" />
                            Missing Auth
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthenticationMonitor;
