
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { getUserData, getUserAdminAccess, getUserPageAccess, checkSuperadminStatus } from '@/services/authOptimizationService';

interface AuthContextType {
  user: User | null;
  userRole: 'employee' | 'admin' | 'superadmin' | null;
  userDetails: any;
  adminAccess: any;
  pageAccess: any;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<'employee' | 'admin' | 'superadmin' | null>(null);
  const [userDetails, setUserDetails] = useState<any>(null);
  const [adminAccess, setAdminAccess] = useState<any>(null);
  const [pageAccess, setPageAccess] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const handleUserSession = async (session: Session | null) => {
    console.log('AuthContext: Processing user session...');
    
    if (session?.user) {
      setUser(session.user);
      
      try {
        // Get user details with proper timeout
        const userData = await getUserData(session.user.email!);
        setUserDetails(userData);

        // Check if user is superadmin with shorter timeout
        const isSuperadmin = await checkSuperadminStatus(session.user.email!);
        
        if (isSuperadmin) {
          setUserRole('superadmin');
          console.log('AuthContext: User identified as superadmin');
        } else {
          // Get admin access and page access for non-superadmin users
          const [adminData, pageData] = await Promise.all([
            getUserAdminAccess(userData?.id),
            getUserPageAccess(userData?.id)
          ]);
          
          setAdminAccess(adminData);
          setPageAccess(pageData);
          
          // Determine role based on admin access
          const hasAdminRights = adminData && Object.values(adminData).some(Boolean);
          setUserRole(hasAdminRights ? 'admin' : 'employee');
          
          console.log('AuthContext: User role determined:', hasAdminRights ? 'admin' : 'employee');
        }
      } catch (error) {
        console.error('AuthContext: Error setting up user session:', error);
        toast({
          title: "Session Setup Error",
          description: "There was an error setting up your session. Please try logging in again.",
          variant: "destructive",
        });
      }
    } else {
      setUser(null);
      setUserRole(null);
      setUserDetails(null);
      setAdminAccess(null);
      setPageAccess(null);
    }
    
    setIsLoading(false);
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('AuthContext: Login error:', error);
        toast({
          title: "Login Failed",
          description: error.message,
          variant: "destructive",
        });
        setIsLoading(false);
        return false;
      }

      if (data.session) {
        await handleUserSession(data.session);
        toast({
          title: "Login Successful",
          description: "Welcome back!",
        });
        return true;
      }
      
      setIsLoading(false);
      return false;
    } catch (error) {
      console.error('AuthContext: Unexpected login error:', error);
      toast({
        title: "Login Error",
        description: "An unexpected error occurred during login.",
        variant: "destructive",
      });
      setIsLoading(false);
      return false;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('AuthContext: Logout error:', error);
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
      console.error('AuthContext: Unexpected logout error:', error);
    }
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleUserSession(session);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('AuthContext: Auth state changed:', event);
      await handleUserSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const value = {
    user,
    userRole,
    userDetails,
    adminAccess,
    pageAccess,
    isLoading,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
