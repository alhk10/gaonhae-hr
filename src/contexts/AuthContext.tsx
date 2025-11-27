import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { processUserSession } from '@/services/authSessionService';
import { AuthContextType } from '@/types/auth';
import { logger } from '@/utils/logger';

// Create context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  userrole: null,
  userDetails: null,
  adminAccess: null,
  pageAccess: null,
  isLoading: true,
  requiresPasswordChange: false,
  login: async () => ({ success: false }),
  logout: async () => {},
  updatePassword: async () => false,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [userrole, setUserrole] = useState<'employee' | 'admin' | 'superadmin' | null>(null);
  const [userDetails, setUserDetails] = useState<any>(null);
  const [adminAccess, setAdminAccess] = useState<any>(null);
  const [pageAccess, setPageAccess] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [requiresPasswordChange, setRequiresPasswordChange] = useState(false);
  const { toast } = useToast();

  const handleUserSession = async (session: Session | null) => {
    logger.debug('Processing user session', { email: session?.user?.email });
    
    const result = await processUserSession(session);
    
    if (!result) {
      setUser(null);
      setUserrole(null);
      setUserDetails(null);
      setAdminAccess(null);
      setPageAccess(null);
      setIsLoading(false);
      return;
    }

    setUser(result.user);
    setUserrole(result.userrole);
    setUserDetails(result.userDetails);
    setAdminAccess(result.isSuperadmin ? null : (result.userDetails?.adminAccess || {}));
    setPageAccess(result.isSuperadmin ? null : (result.userDetails?.pageAccess || {}));
    setIsLoading(false);
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; needsVerification?: boolean }> => {
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        logger.error('Login error', error);
        
        if (error.message.toLowerCase().includes('email not confirmed')) {
          toast({
            title: "Email Not Verified",
            description: "Please check your email and click the verification link.",
            variant: "destructive",
          });
          setIsLoading(false);
          return { success: false, needsVerification: true };
        }
        
        toast({
          title: "Login Failed",
          description: error.message,
          variant: "destructive",
        });
        setIsLoading(false);
        return { success: false };
      }

      if (data.session) {
        await handleUserSession(data.session);
        toast({
          title: "Login Successful",
          description: "Welcome back!",
        });
        return { success: true };
      }
      
      setIsLoading(false);
      return { success: false };
    } catch (error) {
      logger.error('Unexpected login error', error);
      toast({
        title: "Login Error",
        description: "An unexpected error occurred during login.",
        variant: "destructive",
      });
      setIsLoading(false);
      return { success: false };
    }
  };

  const logout = async (): Promise<void> => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        logger.error('Logout error', error);
        toast({
          title: "Logout Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Logged Out",
          description: "You have been successfully logged out.",
        });
      }
    } catch (error) {
      logger.error('Unexpected logout error', error);
    }
  };

  const updatePassword = async (newPassword: string): Promise<boolean> => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        logger.error('Password update error', error);
        return false;
      }

      setRequiresPasswordChange(false);
      return true;
    } catch (error) {
      logger.error('Unexpected password update error', error);
      return false;
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        const getSessionPromise = supabase.auth.getSession();
        const timeout = new Promise<{ data: { session: Session | null } }>((resolve) =>
          setTimeout(() => resolve({ data: { session: null } }), 8000)
        );
        const { data: { session } } = await Promise.race([getSessionPromise as any, timeout]);
        await handleUserSession(session);
      } catch (error) {
        logger.error('Error getting initial session', error);
        setIsLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      logger.info('Auth state changed', { event });
      await handleUserSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const value: AuthContextType = {
    user,
    userrole,
    userDetails,
    adminAccess,
    pageAccess,
    isLoading,
    requiresPasswordChange,
    login,
    logout,
    updatePassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context || context.isLoading === undefined) {
    logger.error('useAuth: Context appears to be invalid', context);
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};