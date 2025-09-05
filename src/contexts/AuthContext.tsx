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
    console.log('🔍 Processing user session for:', session?.user?.email);
    
    if (!session?.user) {
      setUser(null);
      setUserrole(null);
      setUserDetails(null);
      setAdminAccess(null);
      setPageAccess(null);
      setIsLoading(false);
      return;
    }

    try {
      console.log('🚀 Starting progressive session setup...');
      
      // Step 1: Set basic user info immediately to allow faster loading
      setUser({
        id: session.user.id,
        email: session.user.email!,
        name: session.user.email!.split('@')[0],
      });
      
      // Step 2: Get employee data with extended timeout (30s)
      const userDataTimeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('User data timeout')), 30000)
      );
      
      let userData;
      try {
        userData = await Promise.race([
          getUserData(session.user.email!),
          userDataTimeout
        ]);
        console.log('📊 User data fetched:', userData?.id ? 'Success' : 'No data');
      } catch (error) {
        console.warn('⚠️ User data fetch failed, using fallback:', error);
        // Graceful degradation: proceed with basic user info
        userData = null;
      }
      
      if (!userData) {
        console.log('❌ No employee record found, proceeding with basic access');
        setUserrole('employee');
        setUserDetails(null);
        setAdminAccess({});
        setPageAccess({
          profile: true,
          applyLeave: true,
          submitClaim: true,
          payslips: true,
          myAttendance: true,
          slotBookingEmployee: true
        });
        setIsLoading(false);
        return;
      }

      // Step 3: Set user details and check for superadmin
      setUserDetails(userData);
      let role: 'employee' | 'admin' | 'superadmin' = 'employee';
      
      if (userData.isSuperadmin) {
        role = 'superadmin';
        console.log('👑 User identified as superadmin');
        setUser({
          id: session.user.id,
          email: session.user.email!,
          name: userData.name,
          employeeId: userData.id,
          department: userData.department,
          position: userData.position
        });
        setUserrole(role);
        setAdminAccess(null); // Superadmin has full access
        setPageAccess(null);
        setIsLoading(false);
        return;
      }

      // Step 4: Load admin permissions asynchronously with graceful fallback
      console.log('🔍 Loading admin permissions...');
      
      // Set basic role first to allow app to function
      setUserrole('employee');
      setAdminAccess({});
      setPageAccess({
        profile: true,
        applyLeave: true,
        submitClaim: true,
        payslips: true,
        myAttendance: true,
        slotBookingEmployee: true
      });
      setUser({
        id: session.user.id,
        email: session.user.email!,
        name: userData.name,
        employeeId: userData.id,
        department: userData.department,
        position: userData.position
      });
      setIsLoading(false); // Allow user to proceed while permissions load
      
      // Load permissions in background with shorter timeout
      const permissionTimeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Permission timeout')), 10000)
      );
      
      try {
        const adminAccessData = await Promise.race([
          getUserAdminAccess(userData.id),
          permissionTimeout
        ]);
        
        console.log('🔐 Admin access data loaded:', adminAccessData);
        
        // Check if user has any admin permissions
        const hasAdminPermissions = adminAccessData && 
          Object.values(adminAccessData).some(access => access === true);
          
        if (hasAdminPermissions) {
          role = 'admin';
          console.log('✅ Admin role confirmed with permissions:', 
            Object.keys(adminAccessData).filter(key => adminAccessData[key]));
          
          // Enhanced logging for specific user
          if (session.user.email === 'hasung534@gmail.com') {
            console.log('🔍 [Kim Hasung Debug] Admin permissions:', adminAccessData);
            console.log('🔍 [Kim Hasung Debug] Has slotBooking:', (adminAccessData as any)?.slotBooking);
          }
        }
        
        // Update state with loaded permissions
        setUserrole(role);
        setAdminAccess(adminAccessData || {});
        
        // Try to load page access (non-blocking)
        try {
          const pageAccessData = await Promise.race([
            getUserPageAccess(userData.id),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Page access timeout')), 5000))
          ]);
          setPageAccess(pageAccessData || {
            profile: true,
            applyLeave: true,
            submitClaim: true,
            payslips: true,
            myAttendance: true,
            slotBookingEmployee: true
          });
        } catch (pageError) {
          console.warn('⚠️ Page access load failed (non-critical):', pageError);
          // Keep default page access
        }
        
        // Final debug logging
        if (session.user.email === 'hasung534@gmail.com') {
          console.log('🔍 [Kim Hasung Debug] FINAL SESSION STATE:');
          console.log('  - Role:', role);
          console.log('  - AdminAccess:', adminAccessData);
          console.log('  - Has slotBooking:', (adminAccessData as any)?.slotBooking);
        }
        
      } catch (permissionError) {
        console.warn('⚠️ Admin permission load failed, proceeding with employee role:', permissionError);
        // User can still access the app with employee permissions
        setUserrole('employee');
        setAdminAccess({});
        
        // Show user-friendly message
        toast({
          title: "Loading Notice",
          description: "Some features may take longer to load. You can continue using the application.",
          variant: "default",
        });
      }
      
    } catch (error) {
      console.error('❌ Session setup error:', error);
      
      // Fallback: Set basic user info even if database queries fail
      setUser({
        id: session.user.id,
        email: session.user.email!,
        name: session.user.email!.split('@')[0],
      });
      setUserrole('employee');
      setUserDetails(null);
      setAdminAccess({});
      setPageAccess({
        profile: true,
        applyLeave: true,
        submitClaim: true,
        payslips: true,
        myAttendance: true,
        slotBookingEmployee: true
      });
      setIsLoading(false);
      
      // Show user-friendly message about fallback mode
      toast({
        title: "Limited Access Mode",
        description: "Running in limited access mode. Some features may not be available. Contact support if this persists.",
        variant: "default",
      });
    }
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