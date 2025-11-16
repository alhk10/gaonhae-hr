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
      
      // Step 2: Get employee data with timeout (8s)
      const userDataTimeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('User data timeout')), 8000)
      );
      
      let userData;
      try {
        userData = await Promise.race([
          getUserData(session.user.email!),
          userDataTimeout
        ]);
      } catch (error) {
        // Graceful degradation: proceed with basic user info
        userData = null;
      }
      
      if (!userData) {
        
        // For superadmin alhk10@gmail.com, set superadmin permissions directly as fallback
        if (session.user.email === 'alhk10@gmail.com') {
          console.log('🔧 [Superadmin Fallback] Setting superadmin permissions for alhk10@gmail.com');
          
          setUser({
            id: session.user.id,
            email: session.user.email!,
            name: 'Lee Heng Keong Alvin',
            employeeId: 'EMP1751003565851'
          });
          
          setUserrole('superadmin'); // Set as superadmin
          setUserDetails({
            id: 'EMP1751003565851',
            name: 'Lee Heng Keong Alvin',
            email: 'alhk10@gmail.com',
            type: 'Full-Time',
            position: 'System Administrator',
            isSuperadmin: true
          });
          
          setAdminAccess(null); // Superadmin has full access
          setPageAccess(null);
          setIsLoading(false);
          return;
        }
        
        
        // Try to get basic employee ID for PageAccessGuard compatibility
        try {
          // Increased timeout to 10 seconds to ensure employee ID is found
          const lookupPromise = supabase
            .from('employees')
            .select('id, name, type')
            .eq('email', session.user.email!)
            .maybeSingle();
          const lookupTimeout = new Promise<{ data: any }>((resolve) =>
            setTimeout(() => resolve({ data: null }), 10000)
          );
          const { data: employeeData }: any = await Promise.race([lookupPromise as any, lookupTimeout]);
          
          if (employeeData) {
            console.log('✅ Employee ID found for fallback:', employeeData.id);
            setUser({
              id: session.user.id,
              email: session.user.email!,
              name: employeeData.name || session.user.email!.split('@')[0],
              employeeId: employeeData.id
            });
            setUserDetails({
              id: employeeData.id,
              name: employeeData.name,
              type: employeeData.type,
              email: session.user.email
            });
          } else {
            console.warn('⚠️ Employee ID lookup timed out');
            setUser({
              id: session.user.id,
              email: session.user.email!,
              name: session.user.email!.split('@')[0]
            });
          }
        } catch (error) {
          // If even basic lookup fails, proceed without employeeId
          console.error('❌ Employee ID lookup failed:', error);
          setUser({
            id: session.user.id,
            email: session.user.email!,
            name: session.user.email!.split('@')[0]
          });
        }
        
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
      console.log('❌ Session setup error - implementing emergency fallback');
      
      // For superadmin alhk10@gmail.com emergency fallback
      if (session.user.email === 'alhk10@gmail.com') {
        console.log('🆘 [Superadmin Emergency Fallback] Database issues - using superadmin permissions');
        
        setUser({
          id: session.user.id,
          email: session.user.email!,
          name: 'Lee Heng Keong Alvin',
          employeeId: 'EMP1751003565851'
        });
        
        setUserrole('superadmin');
        setUserDetails({
          id: 'EMP1751003565851',
          name: 'Lee Heng Keong Alvin',
          email: 'alhk10@gmail.com',
          type: 'Full-Time',
          position: 'System Administrator',
          isSuperadmin: true
        });
        
        setAdminAccess(null); // Superadmin has full access
        setPageAccess(null);
        setIsLoading(false);
        return;
      }
      
      
      // Try to get basic employee ID for PageAccessGuard compatibility
      // Try to get basic employee ID quickly; if it times out, proceed without it
      try {
        const lookupPromise = supabase
          .from('employees')
          .select('id')
          .eq('email', session.user.email!)
          .maybeSingle();
        const lookupTimeout = new Promise<{ data: any }>((resolve) =>
          setTimeout(() => resolve({ data: null }), 3000)
        );
        const { data: employeeData }: any = await Promise.race([lookupPromise as any, lookupTimeout]);
        setUser({
          id: session.user.id,
          email: session.user.email!,
          name: session.user.email!.split('@')[0],
          employeeId: employeeData?.id || undefined
        });
      } catch {
        setUser({
          id: session.user.id,
          email: session.user.email!,
          name: session.user.email!.split('@')[0]
        });
      }
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

  const login = async (email: string, password: string): Promise<{ success: boolean; needsVerification?: boolean }> => {
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('AuthContext: Login error:', error);
        
        // Check if error is due to email not being confirmed
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
      console.error('AuthContext: Unexpected login error:', error);
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
    // Get initial session immediately with timeout fallback to avoid infinite loading
    const initAuth = async () => {
      try {
        const getSessionPromise = supabase.auth.getSession();
        const timeout = new Promise<{ data: { session: Session | null } }>((resolve) =>
          setTimeout(() => resolve({ data: { session: null } }), 8000)
        );
        const { data: { session } } = await Promise.race([getSessionPromise as any, timeout]);
        await handleUserSession(session);
      } catch (error) {
        console.error('AuthContext: Error getting initial session:', error);
        setIsLoading(false);
      }
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription }, } = supabase.auth.onAuthStateChange(async (event, session) => {
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