import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { systemValidator, SystemTestResult } from '@/utils/systemTestValidator';
import { validateSuperadminAccess, logAuthState } from '@/utils/authValidation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, CheckCircle, AlertCircle, XCircle } from 'lucide-react';

const SystemStatus: React.FC = () => {
  const authData = useAuth();
  const { user, userrole, isLoading } = authData;
  const [testResults, setTestResults] = useState<SystemTestResult[]>([]);
  const [isRunningTests, setIsRunningTests] = useState(false);

  const runSystemTests = async () => {
    if (!user?.email) return;
    
    setIsRunningTests(true);
    try {
      console.log('🧪 SystemStatus: Running comprehensive system validation...');
      const results = await systemValidator.runAllTests(user.email);
      setTestResults(results);
      console.log('🧪 SystemStatus: Tests completed');
    } catch (error) {
      console.error('SystemStatus: Error running tests:', error);
    } finally {
      setIsRunningTests(false);
    }
  };

  useEffect(() => {
    if (userrole === 'superadmin' && user?.email && !isLoading) {
      runSystemTests();
    }
  }, [userrole, user?.email, isLoading]);

  // Only show for superadmin users
  if (userrole !== 'superadmin' || !user) {
    return null;
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PASS':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'WARNING':
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      case 'FAIL':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PASS':
        return <Badge variant="default" className="bg-green-100 text-green-800">PASS</Badge>;
      case 'WARNING':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">WARNING</Badge>;
      case 'FAIL':
        return <Badge variant="destructive">FAIL</Badge>;
      default:
        return null;
    }
  };

  const passCount = testResults.filter(r => r.status === 'PASS').length;
  const failCount = testResults.filter(r => r.status === 'FAIL').length;
  const warningCount = testResults.filter(r => r.status === 'WARNING').length;

  return (
    <Card className="mb-6 border-blue-200 bg-blue-50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-blue-900">
            System Status - Superladmin Validation
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={runSystemTests}
            disabled={isRunningTests}
            className="border-blue-200 text-blue-700 hover:bg-blue-100"
          >
            {isRunningTests ? (
              <RefreshCw className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            {isRunningTests ? 'Testing...' : 'Refresh Tests'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Authentication Status */}
        <div className="mb-4 p-3 bg-white rounded-lg border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-gray-900">Authentication Status</h4>
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">User Email:</span>
              <span className="ml-2 font-medium">{user.email}</span>
            </div>
            <div>
              <span className="text-gray-600">Role:</span>
              <span className="ml-2 font-medium text-blue-700">{userrole}</span>
            </div>
            <div>
              <span className="text-gray-600">Superladmin Access:</span>
              <span className="ml-2">
                {validateSuperadminAccess(userrole, user.email) ? (
                  <Badge className="bg-green-100 text-green-800">✅ GRANTED</Badge>
                ) : (
                  <Badge variant="destructive">❌ DENIED</Badge>
                )}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Employee ID:</span>
              <span className="ml-2 font-medium">{user.employeeId || 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Test Results Summary */}
        {testResults.length > 0 && (
          <div className="mb-4 p-3 bg-white rounded-lg border border-blue-200">
            <h4 className="font-medium text-gray-900 mb-3">System Test Results</h4>
            <div className="flex gap-4 mb-3">
              <div className="flex items-center gap-1">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-700">{passCount} Passed</span>
              </div>
              <div className="flex items-center gap-1">
                <AlertCircle className="w-4 h-4 text-yellow-600" />
                <span className="text-sm text-yellow-700">{warningCount} Warnings</span>
              </div>
              <div className="flex items-center gap-1">
                <XCircle className="w-4 h-4 text-red-600" />
                <span className="text-sm text-red-700">{failCount} Failed</span>
              </div>
            </div>
            
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {testResults.map((result, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(result.status)}
                    <span className="font-medium">{result.component}</span>
                    <span className="text-gray-600">-</span>
                    <span>{result.test}</span>
                  </div>
                  {getStatusBadge(result.status)}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="text-xs text-blue-700 bg-blue-100 p-2 rounded">
          ℹ️ This panel is only visible to superladmin users and provides real-time system validation.
        </div>
      </CardContent>
    </Card>
  );
};

export default SystemStatus;