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
      console.log('🚀 Starting session setup...');
      
      // Add timeout to prevent infinite loading (increased to 15s for complex admin access queries)
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Session setup timeout')), 15000)
      );
      
      // Get user employee data with timeout
      const userData = await Promise.race([
        getUserData(session.user.email!),
        timeoutPromise
      ]);
      
      console.log('📊 User data fetched:', userData);
      
      if (!userData) {
        console.log('❌ No employee record found');
        setUser({
          id: session.user.id,
          email: session.user.email!,
          name: session.user.email!.split('@')[0],
        });
        setUserrole('employee');
        setUserDetails(null);
        setAdminAccess(null);
        setPageAccess(null);
        setIsLoading(false);
        return;
      }

      // Set user details
      setUserDetails(userData);
      
      // Determine user role
      let role: 'employee' | 'admin' | 'superadmin' = 'employee';
      if (userData.isSuperadmin) {
        role = 'superadmin';
        console.log('👑 User identified as superadmin');
        setAdminAccess(null); // Superadmin has full access
        setPageAccess(null);
      } else {
        // Check admin access with timeout
        try {
          const accessData = await Promise.race([
            Promise.all([
              getUserAdminAccess(userData.id),
              getUserPageAccess(userData.id)
            ]),
            timeoutPromise
          ]) as [any, any];
          
          const [adminAccess, pageAccess] = accessData;
          
          // Enhanced debugging for Kim Hasung
          if (session.user.email === 'hasung534@gmail.com') {
            console.log('🔍 [Kim Hasung Debug] Admin Access Data:', adminAccess);
            console.log('🔍 [Kim Hasung Debug] Page Access Data:', pageAccess);
            console.log('🔍 [Kim Hasung Debug] Has slotBooking permission:', adminAccess?.slotBooking);
          }
          
          // Check if user has any admin permissions - if so, they should be admin role
          const hasAdminPermissions = adminAccess && Object.values(adminAccess).some(access => access === true);
          if (hasAdminPermissions) {
            role = 'admin';
            console.log('🔐 User identified as admin with permissions:', Object.keys(adminAccess).filter(key => adminAccess[key]));
            if (session.user.email === 'hasung534@gmail.com') {
              console.log('🔍 [Kim Hasung Debug] ✅ ADMIN ROLE ASSIGNED - Permissions found:', Object.keys(adminAccess).filter(key => adminAccess[key]));
              console.log('🔍 [Kim Hasung Debug] Specifically has slotBooking:', adminAccess.slotBooking);
            }
          } else {
            console.log('🔍 No admin permissions found, keeping employee role');
          }
          setAdminAccess(adminAccess);
          setPageAccess(pageAccess);
        } catch (accessError) {
          console.warn('⚠️ Access check timeout, trying individual queries...');
          
          // Enhanced retry mechanism for admin access
          let retryCount = 0;
          let adminAccess = null;
          
          while (retryCount < 2 && !adminAccess) {
            try {
              console.log(`🔄 Retry attempt ${retryCount + 1} for admin access...`);
              adminAccess = await getUserAdminAccess(userData.id);
              
              // Enhanced debugging for Kim Hasung
              if (session.user.email === 'hasung534@gmail.com') {
                console.log(`🔍 [Kim Hasung Debug] Retry ${retryCount + 1} Admin Access:`, adminAccess);
              }
              
              const hasAdminPermissionsRetry = adminAccess && Object.values(adminAccess).some(access => access === true);
              if (hasAdminPermissionsRetry) {
                role = 'admin';
                console.log('🔐 User identified as admin (retry success) with permissions:', Object.keys(adminAccess).filter(key => adminAccess[key]));
                if (session.user.email === 'hasung534@gmail.com') {
                  console.log('🔍 [Kim Hasung Debug] ✅ ADMIN ROLE CONFIRMED ON RETRY - Permissions:', Object.keys(adminAccess).filter(key => adminAccess[key]));
                  console.log('🔍 [Kim Hasung Debug] Retry confirms slotBooking:', adminAccess.slotBooking);
                }
                break;
              }
              retryCount++;
            } catch (retryError) {
              console.warn(`⚠️ Retry ${retryCount + 1} failed:`, retryError);
              retryCount++;
              if (retryCount < 2) {
                await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s before retry
              }
            }
          }
          
          if (!adminAccess) {
            console.warn('⚠️ All admin access retries failed, using empty permissions');
            adminAccess = {};
          }
          
          setAdminAccess(adminAccess);
          
          // Set default page access with camelCase field names
          setPageAccess({
            profile: true,
            applyLeave: true,
            submitClaim: true,
            payslips: true,
            myAttendance: true,
            slotBookingEmployee: true
          });
        }
      }

      setUser({
        id: session.user.id,
        email: session.user.email!,
        name: userData.name,
        employeeId: userData.id,
        department: userData.department,
        position: userData.position
      });
      
      setUserrole(role);
      console.log('✅ Session setup complete - Role:', role);
      
      // Enhanced debugging for Kim Hasung - final state
      if (session.user.email === 'hasung534@gmail.com') {
        console.log('🔍 [Kim Hasung Debug] FINAL SESSION STATE:');
        console.log('  - Role:', role);
        console.log('  - AdminAccess:', adminAccess);
        console.log('  - Has slotBooking:', adminAccess?.slotBooking);
        console.log('  - Should see Admin Slot Booking menu:', role === 'admin' && adminAccess?.slotBooking);
      }
      
      setIsLoading(false);
      
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