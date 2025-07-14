
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, XCircle, AlertCircle, Users, Mail, Play } from 'lucide-react';
import { createBulkSupabaseAuthUsers, createSingleSupabaseAuthUser } from '@/services/bulkUserCreationService';
import { toast } from '@/components/ui/sonner';

interface BulkUserCreationResult {
  success: number;
  failed: number;
  errors: Array<{ email: string; error: string }>;
  created: Array<{ email: string; name: string }>;
}

const BulkUserCreationManager = () => {
  const [isCreating, setIsCreating] = useState(false);
  const [result, setResult] = useState<BulkUserCreationResult | null>(null);
  const [progress, setProgress] = useState(0);

  const handleBulkCreation = async () => {
    try {
      setIsCreating(true);
      setResult(null);
      setProgress(0);
      
      toast("Starting authentication setup process...");
      
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      const creationResult = await createBulkSupabaseAuthUsers();
      
      clearInterval(progressInterval);
      setProgress(100);
      setResult(creationResult);

      if (creationResult.success > 0) {
        toast(`Successfully set up ${creationResult.success} authentication accounts!`);
      }

      if (creationResult.failed > 0) {
        toast(`Failed to set up ${creationResult.failed} accounts. Check the details below.`);
      }

      if (creationResult.success === 0 && creationResult.failed === 0) {
        toast("All employees already have authentication accounts!");
      }

    } catch (error) {
      console.error('BulkUserCreationManager: Error during bulk creation:', error);
      toast("An error occurred during authentication setup");
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreateKimHasung = async () => {
    try {
      setIsCreating(true);
      toast("Setting up authentication account for Kim Hasung...");
      
      const success = await createSingleSupabaseAuthUser('hasung534@gmail.com', 'Kim Hasung');
      
      if (success) {
        toast("Successfully set up authentication account for Kim Hasung! Password reset email sent.");
      } else {
        toast("Failed to set up authentication account for Kim Hasung");
      }
    } catch (error) {
      console.error('BulkUserCreationManager: Error creating Kim Hasung user:', error);
      toast("An error occurred while setting up the account");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Employee Authentication Setup
          </CardTitle>
          <CardDescription>
            Set up authentication accounts for all employees in the system using Supabase's standard authentication flow.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This process will:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Create authentication accounts for employees with email addresses</li>
                <li>Generate secure temporary passwords</li>
                <li>Send password reset emails to users so they can set their own passwords</li>
                <li>Skip employees who already have authentication accounts</li>
                <li>Use Supabase's standard signup flow for better reliability</li>
              </ul>
            </AlertDescription>
          </Alert>

          <div className="flex gap-3">
            <Button 
              onClick={handleCreateKimHasung}
              disabled={isCreating}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Mail className="h-4 w-4" />
              Setup Kim Hasung Account
            </Button>

            <Button 
              onClick={handleBulkCreation}
              disabled={isCreating}
              className="flex items-center gap-2"
            >
              <Users className="h-4 w-4" />
              {isCreating ? 'Setting Up Accounts...' : 'Setup All Employee Accounts'}
            </Button>
          </div>

          {isCreating && (
            <div className="space-y-2">
              <div className="text-sm text-gray-600">
                Setting up authentication accounts...
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Authentication Setup Results</CardTitle>
            <CardDescription>
              Setup process completed
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Badge variant="default" className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                {result.success} Set Up
              </Badge>
              {result.failed > 0 && (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <XCircle className="h-3 w-3" />
                  {result.failed} Failed
                </Badge>
              )}
            </div>

            {result.success === 0 && result.failed === 0 && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  All employees already have authentication accounts! The system is ready for use.
                </AlertDescription>
              </Alert>
            )}

            {result.created.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm mb-2">Successfully Set Up:</h4>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {result.created.map((user, index) => (
                    <div key={index} className="text-sm bg-green-50 p-2 rounded flex items-center gap-2">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      <span className="font-medium">{user.name}</span>
                      <span className="text-gray-600">({user.email})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.errors.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm mb-2">Failed to Set Up:</h4>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {result.errors.map((error, index) => (
                    <div key={index} className="text-sm bg-red-50 p-2 rounded">
                      <div className="flex items-center gap-2 mb-1">
                        <XCircle className="h-3 w-3 text-red-600" />
                        <span className="font-medium">{error.email}</span>
                      </div>
                      <div className="text-gray-600 text-xs ml-5">{error.error}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.success > 0 && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Authentication setup completed! Employees can now log in with their email addresses. 
                  Password reset emails have been sent to all newly created accounts.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BulkUserCreationManager;
