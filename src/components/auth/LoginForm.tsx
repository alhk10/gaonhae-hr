
import React, { useState } from 'react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import EmailVerificationDialog from './EmailVerificationDialog';

const loginSchema = z.object({
  email: z.string()
    .trim()
    .email({ message: "Invalid email address" })
    .max(255, { message: "Email must be less than 255 characters" }),
  password: z.string()
    .min(1, { message: "Password is required" })
    .max(128, { message: "Password must be less than 128 characters" }),
});

const LoginForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [resetMessage, setResetMessage] = useState('');
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const { login, isLoading } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResetMessage('');
    
    // Validate input using Zod schema
    const validationResult = loginSchema.safeParse({ email, password });
    
    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      setError(firstError.message);
      return;
    }
    
    try {
      const result = await login(validationResult.data.email, validationResult.data.password);
      if (!result.success) {
        // Always prompt to verify/resend for new employees on failed login
        setVerificationEmail(validationResult.data.email);
        setShowEmailDialog(true);
        if (!result.needsVerification) {
          setError('Invalid credentials. Please check your email and password.');
        }
      }
    } catch (err) {
      setError('Invalid credentials. Please check your email and password.');
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email address first.');
      return;
    }

    // Validate email before sending reset
    const emailValidation = z.string().trim().email().safeParse(email);
    if (!emailValidation.success) {
      setError('Please enter a valid email address.');
      return;
    }

    setIsResettingPassword(true);
    setError('');
    setResetMessage('');

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(emailValidation.data, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) {
        setError(error.message);
      } else {
        setResetMessage(`Password reset email sent to ${emailValidation.data}. Please check your inbox and follow the instructions.`);
      }
    } catch (err) {
      setError('Failed to send password reset email. Please try again.');
    } finally {
      setIsResettingPassword(false);
    }
  };

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-lg flex items-center justify-center overflow-hidden bg-white shadow-sm">
              <img 
                src="/lovable-uploads/fbbeccdc-3802-4172-9a2a-8e1b0f83829d.png" 
                alt="Gaonhae Taekwondo Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-gray-900">Gaonhae HR</CardTitle>
              <CardDescription className="text-gray-600">
                Employee & Student Portal
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                />
              </div>
              {error && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                  {error}
                </div>
              )}
              {resetMessage && (
                <div className="text-sm text-green-600 bg-green-50 p-3 rounded-md">
                  {resetMessage}
                </div>
              )}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>
              
              <div className="text-center">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleForgotPassword}
                  disabled={isResettingPassword}
                  className="text-blue-600 hover:text-blue-800"
                >
                  {isResettingPassword ? 'Sending reset email...' : 'Forgot Password?'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      <EmailVerificationDialog
        open={showEmailDialog}
        onClose={() => setShowEmailDialog(false)}
        email={verificationEmail}
      />
    </>
  );
};

export default LoginForm;
