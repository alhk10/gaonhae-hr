import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Eye, EyeOff, Lock, CheckCircle, AlertCircle } from 'lucide-react';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const initializeRecoverySession = async () => {
      console.log('ResetPassword: Initializing recovery session...');
      console.log('URL:', window.location.href);
      console.log('Hash:', window.location.hash);
      console.log('Search:', window.location.search);
      
      try {
        // Method 1: Check for PKCE code in URL query params (new Supabase flow)
        const code = searchParams.get('code');
        if (code) {
          console.log('Found PKCE code in URL, exchanging for session...');
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          
          if (exchangeError) {
            console.error('PKCE exchange error:', exchangeError);
            // If PKCE fails, it might be because the code was already used or expired
            // Try to check if we have an existing session
            const { data: sessionData } = await supabase.auth.getSession();
            if (sessionData.session) {
              console.log('Found existing session after PKCE failure');
              setIsRecoveryMode(true);
              setChecking(false);
              return;
            }
            setError('This password reset link has expired or already been used. Please request a new one.');
            setChecking(false);
            return;
          }
          
          if (data.session) {
            console.log('PKCE exchange successful, session established');
            setIsRecoveryMode(true);
            setChecking(false);
            return;
          }
        }

        // Method 2: Check for access_token in hash (older Supabase flow / implicit)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const type = hashParams.get('type');
        
        if (accessToken && type === 'recovery') {
          console.log('Found recovery token in URL hash, setting session...');
          const { data, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || ''
          });
          
          if (sessionError) {
            console.error('Session set error:', sessionError);
            setError('Invalid or expired password reset link. Please request a new one.');
            setChecking(false);
            return;
          }
          
          if (data.session) {
            console.log('Session established from hash tokens');
            setIsRecoveryMode(true);
            setChecking(false);
            return;
          }
        }

        // Method 3: Check if we already have an active session (user might be in recovery state)
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          console.log('Found existing session, allowing password reset');
          setIsRecoveryMode(true);
          setChecking(false);
          return;
        }

        // No valid recovery method found
        console.log('No valid recovery method found');
        setError('Invalid or expired password reset link. Please request a new one.');
        setChecking(false);

      } catch (err) {
        console.error('Error initializing recovery:', err);
        setError('An error occurred. Please try requesting a new password reset link.');
        setChecking(false);
      }
    };

    // Also listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session?.user?.email);
        
        if (event === 'PASSWORD_RECOVERY') {
          console.log('PASSWORD_RECOVERY event received');
          setIsRecoveryMode(true);
          setError(null);
          setChecking(false);
        } else if (event === 'SIGNED_IN' && session) {
          // Check if this is from a recovery flow
          console.log('SIGNED_IN event received');
          setIsRecoveryMode(true);
          setError(null);
          setChecking(false);
        }
      }
    );

    initializeRecoverySession();

    return () => {
      subscription.unsubscribe();
    };
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) {
        console.error('Password update error:', updateError);
        throw updateError;
      }

      setSuccess(true);
      toast.success('Password updated successfully!');
      
      // Sign out and redirect to login after a short delay
      setTimeout(async () => {
        await supabase.auth.signOut();
        navigate('/');
      }, 2000);

    } catch (err: any) {
      console.error('Error updating password:', err);
      setError(err.message || 'Failed to update password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Success state
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl text-green-600">Password Updated!</CardTitle>
            <CardDescription>
              Your password has been successfully changed. Redirecting to login...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Loading state while checking auth
  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Verifying reset link...</p>
        </div>
      </div>
    );
  }

  // Error state - invalid/expired link
  if (!isRecoveryMode && error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <CardTitle className="text-2xl text-red-600">Invalid Link</CardTitle>
            <CardDescription className="text-destructive">
              {error}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => navigate('/')} 
              className="w-full"
            >
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Password reset form
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Set New Password</CardTitle>
          <CardDescription>
            Enter your new password below
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                  minLength={8}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Must be at least 8 characters
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Updating...' : 'Update Password'}
            </Button>

            <Button 
              type="button" 
              variant="ghost" 
              className="w-full"
              onClick={() => navigate('/')}
            >
              Back to Login
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;
