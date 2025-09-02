import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { RefreshCw, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { generateSalt, hashPassword, logSecurityEvent } from '@/services/securityService';

const KimHasungPasswordReset: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  
  const employeeName = 'Kim Hasung';
  const employeeEmail = 'hasung534@gmail.com';
  const defaultPassword = 'password';

  const handleResetPassword = async () => {
    console.log('KimHasungPasswordReset: Starting password reset for:', employeeEmail);
    
    setIsLoading(true);

    try {
      // Step 1: Get Kim Hasung's Supabase Auth user ID
      const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
      
      if (listError) {
        throw new Error(`Failed to list users: ${listError.message}`);
      }

      const kimUser = users?.find((user: any) => user.email === employeeEmail);
      
      if (!kimUser) {
        throw new Error(`No Supabase Auth user found for ${employeeEmail}. User may need to be created in Supabase Auth first.`);
      }

      // Step 2: Reset password in Supabase Auth (this is what the login system uses)
      const { error: authError } = await supabase.auth.admin.updateUserById(
        kimUser.id,
        { password: defaultPassword }
      );

      if (authError) {
        throw new Error(`Supabase Auth password reset failed: ${authError.message}`);
      }

      console.log('KimHasungPasswordReset: Supabase Auth password updated successfully');

      // Step 3: Also update custom password table for consistency
      const salt = generateSalt();
      const hashedPassword = await hashPassword(defaultPassword, salt);

      const { error: customResetError } = await supabase.rpc('admin_reset_password', {
        target_email: employeeEmail,
        new_password_hash: hashedPassword,
        new_salt: salt
      });

      if (customResetError) {
        console.warn('Custom password table update failed, but Supabase Auth was successful:', customResetError);
      }

      // Log security event
      await logSecurityEvent({
        user_email: employeeEmail,
        action: 'PASSWORD_RESET_BY_ADMIN',
        details: { 
          reset_by: 'admin',
          employee_name: employeeName,
          default_password_used: true,
          timestamp: new Date().toISOString()
        }
      });

      console.log('KimHasungPasswordReset: Password reset completed successfully');
      
      setIsComplete(true);
      
      toast({
        title: "Password Reset Complete",
        description: `Password reset to "password" for ${employeeName}. He must change it on next login.`,
      });

    } catch (error) {
      console.error('KimHasungPasswordReset: Error during password reset:', error);
      toast({
        title: "Reset Failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred during password reset.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="w-5 h-5 text-blue-500" />
          Reset Kim Hasung's Password
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isComplete ? (
          <>
            <div className="text-sm text-gray-600">
              <p><strong>Employee:</strong> {employeeName}</p>
              <p><strong>Email:</strong> {employeeEmail}</p>
              <p className="mt-2 text-amber-600">
                Password will be reset to "password" and Kim must change it on next login.
              </p>
            </div>
            
            <Button
              onClick={handleResetPassword}
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Resetting Password...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reset Password
                </>
              )}
            </Button>
          </>
        ) : (
          <div className="text-center space-y-3">
            <div className="text-green-600 font-medium">
              ✅ Password Reset Successfully!
            </div>
            <div className="text-sm text-gray-600">
              <p>Kim Hasung's password has been reset to: <code className="font-mono bg-gray-100 px-2 py-1 rounded">password</code></p>
              <p className="mt-2">He must change it on his next login.</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default KimHasungPasswordReset;