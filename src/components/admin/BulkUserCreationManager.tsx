
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, XCircle, AlertCircle, Users, Mail } from 'lucide-react';
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
      
      toast("Starting bulk user creation process...");
      
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      const creationResult = await createBulkSupabaseAuthUsers();
      
      clearInterval(progressInterval);
      setProgress(100);
      setResult(creationResult);

      if (creationResult.success > 0) {
        toast(`Successfully created ${creationResult.success} Supabase Auth users!`);
      }

      if (creationResult.failed > 0) {
        toast(`Failed to create ${creationResult.failed} users. Check the details below.`);
      }

    } catch (error) {
      console.error('BulkUserCreationManager: Error during bulk creation:', error);
      toast("An error occurred during bulk user creation");
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreateKimHasung = async () => {
    try {
      setIsCreating(true);
      toast("Creating Supabase Auth user for Kim Hasung...");
      
      const success = await createSingleSupabaseAuthUser('hasung534@gmail.com', 'Kim Hasung');
      
      if (success) {
        toast("Successfully created Supabase Auth user for Kim Hasung! Password reset email sent.");
      } else {
        toast("Failed to create Supabase Auth user for Kim Hasung");
      }
    } catch (error) {
      console.error('BulkUserCreationManager: Error creating Kim Hasung user:', error);
      toast("An error occurred while creating the user");
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
            Bulk Supabase Auth User Creation
          </CardTitle>
          <CardDescription>
            Create Supabase Authentication users for all employees in the system who don't already have auth accounts.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This process will:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Create Supabase Auth users for all employees with email addresses</li>
                <li>Generate secure temporary passwords</li>
                <li>Send password reset emails to users</li>
                <li>Skip employees who already have Supabase Auth accounts</li>
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
              Create Kim Hasung Auth User
            </Button>

            <Button 
              onClick={handleBulkCreation}
              disabled={isCreating}
              className="flex items-center gap-2"
            >
              <Users className="h-4 w-4" />
              {isCreating ? 'Creating Users...' : 'Create All Auth Users'}
            </Button>
          </div>

          {isCreating && (
            <div className="space-y-2">
              <div className="text-sm text-gray-600">Creating Supabase Auth users...</div>
              <Progress value={progress} className="w-full" />
            </div>
          )}
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Bulk Creation Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Badge variant="default" className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                {result.success} Created
              </Badge>
              {result.failed > 0 && (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <XCircle className="h-3 w-3" />
                  {result.failed} Failed
                </Badge>
              )}
            </div>

            {result.created.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm mb-2">Successfully Created Users:</h4>
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
                <h4 className="font-semibold text-sm mb-2">Failed to Create:</h4>
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
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BulkUserCreationManager;
