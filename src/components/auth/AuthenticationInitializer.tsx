
import React, { useEffect, useState } from 'react';
import { createBulkSupabaseAuthUsers } from '@/services/bulkUserCreationService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, AlertCircle, Users } from 'lucide-react';

interface AuthInitializerProps {
  onComplete: () => void;
}

const AuthenticationInitializer: React.FC<AuthInitializerProps> = ({ onComplete }) => {
  const [isInitializing, setIsInitializing] = useState(true);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('Initializing authentication system...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initializeAuthentication();
  }, []);

  const initializeAuthentication = async () => {
    try {
      setStatus('Checking authentication system...');
      setProgress(20);

      // Small delay to show progress
      await new Promise(resolve => setTimeout(resolve, 500));

      setStatus('Creating missing Supabase Auth users...');
      setProgress(40);

      // Execute bulk user creation
      const result = await createBulkSupabaseAuthUsers();
      
      setProgress(80);
      
      if (result.success > 0) {
        setStatus(`Successfully created ${result.success} Supabase Auth users!`);
      } else {
        setStatus('Authentication system is ready!');
      }
      
      setProgress(100);
      
      // Complete initialization after a brief delay
      setTimeout(() => {
        onComplete();
      }, 1000);
      
    } catch (error) {
      console.error('AuthenticationInitializer: Error during initialization:', error);
      setError('Failed to initialize authentication system. Please refresh the page.');
      setStatus('Initialization failed');
    } finally {
      setIsInitializing(false);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <CardTitle className="text-red-600">Initialization Failed</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <button 
              onClick={() => window.location.reload()} 
              className="w-full bg-red-500 text-white py-2 px-4 rounded hover:bg-red-600"
            >
              Retry
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Users className="mx-auto h-12 w-12 text-blue-500 mb-4" />
          <CardTitle>Setting Up Authentication</CardTitle>
          <CardDescription>
            Preparing the authentication system for all employees...
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="text-sm text-gray-600">{status}</div>
            <Progress value={progress} className="w-full" />
          </div>
          {progress === 100 && (
            <div className="flex items-center justify-center text-green-600">
              <CheckCircle className="h-5 w-5 mr-2" />
              <span className="text-sm">Ready!</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthenticationInitializer;
