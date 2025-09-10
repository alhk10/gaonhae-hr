import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface HealthStatus {
  supabaseConnection: boolean;
  authService: boolean;
  databaseQuery: boolean;
  error?: string;
}

const HealthCheck: React.FC = () => {
  const [status, setStatus] = useState<HealthStatus>({
    supabaseConnection: false,
    authService: false,
    databaseQuery: false
  });
  const [isVisible, setIsVisible] = useState(false);

  const runHealthCheck = async () => {
    console.log('HealthCheck: Starting system health check...');
    const newStatus: HealthStatus = {
      supabaseConnection: false,
      authService: false,
      databaseQuery: false
    };

    try {
      // Test 1: Basic Supabase connection with extended timeout
      console.log('HealthCheck: Testing Supabase connection...');
      const connectionPromise = supabase
        .from('employees')
        .select('id')
        .limit(1);
      
      const connectionTimeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Connection timeout after 15 seconds')), 15000)
      );
      
      await Promise.race([connectionPromise, connectionTimeout]);
      newStatus.supabaseConnection = true;
      console.log('HealthCheck: ✅ Supabase connection OK');

      // Test 2: Auth service with extended timeout
      console.log('HealthCheck: Testing auth service...');
      const authPromise = supabase.auth.getSession();
      const authTimeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Auth timeout after 10 seconds')), 10000)
      );
      
      const authResult: any = await Promise.race([authPromise, authTimeout]);
      newStatus.authService = true;
      console.log('HealthCheck: ✅ Auth service OK, session:', !!authResult?.data?.session);

      // Test 3: Database query with extended timeout
      console.log('HealthCheck: Testing database query...');
      const queryPromise = supabase
        .from('employees')
        .select('*', { count: 'exact', head: true });
      
      const queryTimeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Query timeout after 15 seconds')), 15000)
      );
      
      const queryResult: any = await Promise.race([queryPromise, queryTimeout]);
      
      if (queryResult.error) {
        throw queryResult.error;
      }
      
      newStatus.databaseQuery = true;
      console.log('HealthCheck: ✅ Database query OK, employee count:', queryResult.count);

    } catch (error) {
      console.error('HealthCheck: ❌ Health check failed:', error);
      newStatus.error = error instanceof Error ? error.message : 'Unknown error';
    }

    setStatus(newStatus);
  };

  useEffect(() => {
    runHealthCheck();
  }, []);

  // Show health check only on development or when there are errors
  useEffect(() => {
    const isDev = import.meta.env.DEV;
    const hasErrors = !status.supabaseConnection || !status.authService || !status.databaseQuery;
    setIsVisible(isDev || hasErrors || !!status.error);
  }, [status]);

  if (!isVisible) return null;

  return (
    <div className="fixed top-4 right-4 z-50 bg-white border border-gray-300 rounded-lg shadow-lg p-4 max-w-sm">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold">System Health</h3>
        <button 
          onClick={() => setIsVisible(false)}
          className="text-gray-400 hover:text-gray-600"
        >
          ×
        </button>
      </div>
      
      <div className="space-y-1 text-xs">
        <div className={`flex items-center gap-2 ${status.supabaseConnection ? 'text-green-600' : 'text-red-600'}`}>
          <span>{status.supabaseConnection ? '✅' : '❌'}</span>
          <span>Supabase Connection</span>
        </div>
        
        <div className={`flex items-center gap-2 ${status.authService ? 'text-green-600' : 'text-red-600'}`}>
          <span>{status.authService ? '✅' : '❌'}</span>
          <span>Authentication Service</span>
        </div>
        
        <div className={`flex items-center gap-2 ${status.databaseQuery ? 'text-green-600' : 'text-red-600'}`}>
          <span>{status.databaseQuery ? '✅' : '❌'}</span>
          <span>Database Query</span>
        </div>
      </div>

      {status.error && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs">
          <strong>Error:</strong> {status.error}
        </div>
      )}

      <button
        onClick={runHealthCheck}
        className="mt-2 w-full px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
      >
        Retest
      </button>
    </div>
  );
};

export default HealthCheck;