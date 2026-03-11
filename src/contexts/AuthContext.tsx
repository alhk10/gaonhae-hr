import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { processUserSession } from '@/services/authSessionService';
import { AuthContextType, UserType, LinkedStudent } from '@/types/auth';
import { logger } from '@/utils/logger';
import { clearAuthCache } from '@/services/authCacheService';

const SESSION_STORAGE_KEY = 'selectedStudentId';

// Create context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  userrole: null,
  userType: null,
  userDetails: null,
  adminAccess: null,
  pageAccess: null,
  isLoading: true,
  requiresPasswordChange: false,
  login: async () => ({ success: false }),
  logout: async () => {},
  updatePassword: async () => false,
  linkedStudents: [],
  selectedStudentId: null,
  setSelectedStudent: () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [userrole, setUserrole] = useState<'employee' | 'admin' | 'superadmin' | null>(null);
  const [userType, setUserType] = useState<UserType | null>(null);
  const [userDetails, setUserDetails] = useState<any>(null);
  const [adminAccess, setAdminAccess] = useState<any>(null);
  const [pageAccess, setPageAccess] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [requiresPasswordChange, setRequiresPasswordChange] = useState(false);
  const [linkedStudents, setLinkedStudents] = useState<LinkedStudent[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const { toast } = useToast();

  // Sequence counter to prevent stale session processing from overwriting newer results
  const sessionSeqRef = React.useRef(0);
  // Ref to track current user for stale closure in onAuthStateChange
  const userRef = React.useRef<any>(null);

  const handleUserSession = async (session: Session | null) => {
    const seq = ++sessionSeqRef.current;
    logger.debug('Processing user session', { email: session?.user?.email });
    
    const result = await processUserSession(session);
    
    if (!result) {
      // Only apply if this is still the latest session processing
      if (seq !== sessionSeqRef.current) {
        logger.debug('Stale session result (null), skipping', { seq, current: sessionSeqRef.current });
        return;
      }
      setUser(null);
      userRef.current = null;
      setUserrole(null);
      setUserType(null);
      setUserDetails(null);
      setAdminAccess(null);
      setPageAccess(null);
      setLinkedStudents([]);
      setSelectedStudentId(null);
      setIsLoading(false);
      return;
    }

    // Only apply if this is still the latest session processing
    if (seq !== sessionSeqRef.current) {
      logger.debug('Stale session result, skipping', { seq, current: sessionSeqRef.current, role: result.userrole });
      return;
    }

    setUser(result.user);
    userRef.current = result.user;
    setUserrole(result.userrole);
    setUserType(result.userType);
    setUserDetails(result.userDetails);
    setAdminAccess(result.adminAccess);
    setPageAccess(result.pageAccess);
    
    // Handle multi-student support
    const students = result.linkedStudents || [];
    setLinkedStudents(students);
    
    // Restore or set selected student
    if (students.length > 0) {
      const savedStudentId = sessionStorage.getItem(SESSION_STORAGE_KEY);
      const isValidSaved = savedStudentId && students.some(s => s.id === savedStudentId);
      setSelectedStudentId(isValidSaved ? savedStudentId : students[0].id);
    } else {
      setSelectedStudentId(null);
    }
    
    setIsLoading(false);
  };
  
  const handleSetSelectedStudent = (studentId: string) => {
    setSelectedStudentId(studentId);
    sessionStorage.setItem(SESSION_STORAGE_KEY, studentId);
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
        // handleUserSession may also be triggered by onAuthStateChange(SIGNED_IN),
        // but the sequence counter prevents stale results from overwriting newer ones
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
      // Clear auth cache on logout
      clearAuthCache();
      
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
        
        // If session exists but is close to expiring, proactively refresh
        if (session?.expires_at) {
          const expiresAtMs = session.expires_at * 1000;
          const now = Date.now();
          const timeUntilExpiry = expiresAtMs - now;
          
          // If token expires in less than 5 minutes, refresh it
          if (timeUntilExpiry < 5 * 60 * 1000) {
            logger.debug('Token expiring soon, proactively refreshing...');
            const { data: refreshData } = await supabase.auth.refreshSession();
            if (refreshData.session) {
              await handleUserSession(refreshData.session);
              return;
            }
          }
        }
        
        await handleUserSession(session);
      } catch (error) {
        logger.error('Error getting initial session', error);
        setIsLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      logger.info('Auth state changed', { event });
      
      // Skip re-processing on TOKEN_REFRESHED if user is already loaded
      // Use ref to avoid stale closure issue
      if (event === 'TOKEN_REFRESHED' && userRef.current) {
        logger.debug('Token refreshed, user already loaded — skipping re-process');
        return;
      }
      
      await handleUserSession(session);
    });

    // Set up periodic session refresh every 2 minutes to prevent expiration
    const refreshInterval = setInterval(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.expires_at) {
          const expiresAtMs = session.expires_at * 1000;
          const now = Date.now();
          const timeUntilExpiry = expiresAtMs - now;
          
          // If token expires in less than 10 minutes, refresh it
          if (timeUntilExpiry < 10 * 60 * 1000) {
            logger.debug(`Periodic check: Token expires in ${Math.round(timeUntilExpiry / 60000)} minutes, refreshing...`);
            const { data: refreshedData, error: refreshError } = await supabase.auth.refreshSession();
            if (refreshError) {
              logger.error('Periodic refresh failed:', refreshError);
            } else if (refreshedData.session) {
              logger.info('Periodic session refresh successful');
            }
          }
        }
      } catch (error) {
        logger.error('Error during periodic session refresh', error);
      }
    }, 2 * 60 * 1000); // Check every 2 minutes

    return () => {
      subscription.unsubscribe();
      clearInterval(refreshInterval);
    };
  }, []);

  const value: AuthContextType = {
    user,
    userrole,
    userType,
    userDetails,
    adminAccess,
    pageAccess,
    isLoading,
    requiresPasswordChange,
    login,
    logout,
    updatePassword,
    linkedStudents,
    selectedStudentId,
    setSelectedStudent: handleSetSelectedStudent,
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