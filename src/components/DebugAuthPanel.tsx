import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Bug, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { checkSuperadminStatus } from '@/services/authOptimizationService';

const DebugAuthPanel: React.FC = () => {
  const { user, userrole, adminAccess, pageAccess, isLoading } = useAuth();

  const handleForceRefresh = () => {
    console.log('🔄 DEBUG: Forcing authentication refresh...');
    window.location.reload();
  };

  const handleTestSuperadminCheck = async () => {
    if (!user?.email) return;
    
    console.log('🧪 DEBUG: Testing superadmin check directly...');
    try {
      const result = await checkSuperadminStatus(user.email);
      console.log('🧪 DEBUG: Direct superadmin check result:', result);
      
      // Also test the RPC function
      const { data: rpcResult } = await supabase.rpc('get_current_user_role');
      console.log('🧪 DEBUG: RPC function result:', rpcResult);
      
    } catch (error) {
      console.error('🧪 DEBUG: Error in superadmin check:', error);
    }
  };

  const handleTestDatabaseQuery = async () => {
    if (!user?.email) return;
    
    console.log('🔍 DEBUG: Testing direct database query...');
    try {
      const { data, error } = await supabase
        .from('superadmin_users')
        .select('*')
        .eq('employee_email', user.email)
        .eq('is_active', true);
        
      console.log('🔍 DEBUG: Direct database query result:', { data, error });
    } catch (error) {
      console.error('🔍 DEBUG: Error in database query:', error);
    }
  };

  if (!user) return null;

  return (
    <Card className="mb-6 border-red-200 bg-red-50">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-red-900 flex items-center gap-2">
          <Bug className="w-5 h-5" />
          🚨 DEBUG: Authentication Issue Detected
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Status */}
        <div className="bg-white p-3 rounded border">
          <h4 className="font-medium mb-2">Current Authentication Status</h4>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-600">Email:</span>
              <span className="ml-2 font-medium">{user.email}</span>
            </div>
            <div>
              <span className="text-gray-600">Detected Role:</span>
              <Badge variant={userrole === 'superadmin' ? 'default' : 'destructive'} className="ml-2">
                {userrole}
              </Badge>
            </div>
            <div>
              <span className="text-gray-600">Employee ID:</span>
              <span className="ml-2">{user.employeeId || 'N/A'}</span>
            </div>
            <div>
              <span className="text-gray-600">Is Loading:</span>
              <span className="ml-2">{isLoading ? 'Yes' : 'No'}</span>
            </div>
          </div>
        </div>

        {/* Expected vs Actual */}
        <div className="bg-white p-3 rounded border">
          <h4 className="font-medium mb-2">Issue Analysis</h4>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-orange-600" />
              <span>Expected: alhk10@gmail.com should be detected as <strong>superadmin</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <span>Actual: Currently detected as <strong>{userrole}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span>Database record exists for alhk10@gmail.com</span>
            </div>
          </div>
        </div>

        {/* Debug Actions */}
        <div className="bg-white p-3 rounded border">
          <h4 className="font-medium mb-3">Debug Actions</h4>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleForceRefresh}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Force Auth Refresh
            </Button>
            
            <Button
              onClick={handleTestSuperadminCheck}
              variant="outline"
              size="sm"
            >
              Test Superadmin Check
            </Button>
            
            <Button
              onClick={handleTestDatabaseQuery}
              variant="outline" 
              size="sm"
            >
              Test DB Query
            </Button>
          </div>
        </div>

        <div className="text-xs text-red-700 bg-red-100 p-2 rounded">
          ℹ️ This debug panel will help us identify why alhk10@gmail.com is not being detected as superadmin. 
          Click "Force Auth Refresh" to trigger new authentication flow with enhanced debugging.
        </div>
      </CardContent>
    </Card>
  );
};

export default DebugAuthPanel;