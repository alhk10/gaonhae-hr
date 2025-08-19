
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { getUserData, getUserAdminAccess, getUserPageAccess, checkSuperadminStatus } from '@/services/authOptimizationService';
import { AuthContextType } from '@/types/auth';

// Create context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  userrole: null,
  userDetails: null,
  adminAccess: null,
  pageAccess: null,
  isLoading: true,
  requiresPasswordChange: false,
  login: async () => false,
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
    console.log('AuthContext: Processing user session with enhanced debugging...', session?.user?.email);
    
    // Fast path for no session - immediately set loading to false
    if (!session?.user) {
      setUser(null);
      setUserrole(null);
      setUserDetails(null);
      setAdminAccess(null);
      setPageAccess(null);
      setIsLoading(false);
      console.log('AuthContext: No session found, cleared state');
      return;
    }

    if (session?.user) {
      try {
        console.log('AuthContext: Starting user setup for:', session.user.email);
        
        // Check if user is superadmin FIRST with enhanced logging
        console.log('🔐 AuthContext: Checking superadmin status for:', session.user.email);
        console.log('🔐 AuthContext: Session user object:', {
          id: session.user.id,
          email: session.user.email,
          metadata: session.user.user_metadata
        });
        
        const isSuperadmin = await checkSuperadminStatus(session.user.email!);
        console.log('🔐 AuthContext: *** CRITICAL *** Superadmin check result for', session.user.email, ':', isSuperadmin);
        
        if (isSuperadmin) {
          console.log('🔐 AuthContext: *** SUPERADMIN DETECTED *** Setting up superadmin user');
          
          // Get basic user data for name
          const userData = await getUserData(session.user.email!);
          console.log('🔐 AuthContext: Got user data for superadmin:', userData);
          
          const superadminUser = {
            id: session.user.id,
            email: session.user.email!,
            name: userData?.name || session.user.user_metadata?.full_name || 'System Administrator',
            employeeId: userData?.id,
            department: 'Administration'
          };
          
          setUser(superadminUser);
          setUserrole('superadmin');
          setUserDetails(userData);
          // Clear admin/page access for superadmin since they have full access
          setAdminAccess(null);
          setPageAccess(null);
          
          console.log('🔐 AuthContext: *** SUPERADMIN SETUP COMPLETE *** userrole set to:', 'superadmin');
          console.log('🔐 AuthContext: Final superadmin user object:', superadminUser);
          setIsLoading(false);
          return;
        }
        
        console.log('AuthContext: User is NOT superadmin, proceeding with regular user setup');
        
        // Get user details with proper timeout
        const userData = await getUserData(session.user.email!);
        setUserDetails(userData);

        if (userData) {
          // Get admin access and page access for non-superadmin users
          const [adminData, pageData] = await Promise.all([
            getUserAdminAccess(userData.id),
            getUserPageAccess(userData.id)
          ]);
          
          setAdminAccess(adminData);
          setPageAccess(pageData);
          
          // Determine role based on admin access
          const hasAdminRights = adminData && Object.values(adminData).some(Boolean);
          setUserrole(hasAdminRights ? 'admin' : 'employee');
          
          setUser({
            id: session.user.id,
            email: session.user.email!,
            name: userData.name,
            employeeId: userData.id,
            department: userData.department,
            position: userData.position
          });
          
          console.log('AuthContext: User role determined:', hasAdminRights ? 'admin' : 'employee');
        } else {
          setUser({
            id: session.user.id,
            email: session.user.email!,
            name: 'Unknown User'
          });
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
      setUserrole(null);
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

  const updatePassword = async (newPassword: string): Promise<boolean> => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        console.error('AuthContext: Password update error:', error);
        return false;
      }

      setRequiresPasswordChange(false);
      return true;
    } catch (error) {
      console.error('AuthContext: Unexpected password update error:', error);
      return false;
    }
  };

  useEffect(() => {
    // Get initial session immediately
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        await handleUserSession(session);
      } catch (error) {
        console.error('AuthContext: Error getting initial session:', error);
        setIsLoading(false);
      }
    };

    initAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('AuthContext: Auth state changed:', event);
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
  // Context should always have a value now, but let's add a sanity check
  if (!context || context.isLoading === undefined) {
    console.error('useAuth: Context appears to be invalid:', context);
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
