import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { processUserSession } from '@/services/authSessionService';
import { AuthContextType, UserType, LinkedStudent } from '@/types/auth';
import { logger } from '@/utils/logger';
import { clearAuthCache } from '@/services/authCacheService';

const SESSION_STORAGE_KEY = 'selectedStudentId';
const RECOVERY_FLAG_KEY = 'requiresPasswordChange';

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
  const [requiresPasswordChange, setRequiresPasswordChange] = useState(
    () => sessionStorage.getItem(RECOVERY_FLAG_KEY) === 'true'
  );
  const [linkedStudents, setLinkedStudents] = useState<LinkedStudent[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const { toast } = useToast();

  // Sequence counter to prevent stale session processing
  const sessionSeqRef = React.useRef(0);
  // Single-flight guard: true once initial auth resolution is done
  const initDoneRef = React.useRef(false);
  // Prevent double init
  const initStartedRef = React.useRef(false);
  // Ref to track current user for stale closure checks
  const userRef = React.useRef<any>(null);

  const clearUserState = () => {
    setUser(null);
    userRef.current = null;
    setUserrole(null);
    setUserType(null);
    setUserDetails(null);
    setAdminAccess(null);
    setPageAccess(null);
    setLinkedStudents([]);
    setSelectedStudentId(null);
  };

  const handleUserSession = async (session: Session | null, finalize: boolean = false) => {
    const seq = ++sessionSeqRef.current;
    logger.debug('Processing user session', { email: session?.user?.email });

    const result = await processUserSession(session);

    // Stale check
    if (seq !== sessionSeqRef.current) {
      logger.debug('Stale session result, skipping', { seq, current: sessionSeqRef.current });
      return;
    }

    if (!result) {
      clearUserState();
      if (finalize || initDoneRef.current) {
        setIsLoading(false);
      }
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

    if (students.length > 0) {
      const savedStudentId = sessionStorage.getItem(SESSION_STORAGE_KEY);
      const isValidSaved = savedStudentId && students.some(s => s.id === savedStudentId);
      setSelectedStudentId(isValidSaved ? savedStudentId : students[0].id);
    } else {
      setSelectedStudentId(null);
    }

    if (finalize || initDoneRef.current) {
      setIsLoading(false);
    }
  };

  const handleSetSelectedStudent = (studentId: string) => {
    setSelectedStudentId(studentId);
    sessionStorage.setItem(SESSION_STORAGE_KEY, studentId);
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; needsVerification?: boolean }> => {
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
          return { success: false, needsVerification: true };
        }

        toast({
          title: "Login Failed",
          description: error.message,
          variant: "destructive",
        });
        return { success: false };
      }

      if (data.session) {
        setIsLoading(true);
        await handleUserSession(data.session, true);
        toast({
          title: "Login Successful",
          description: "Welcome back!",
        });
        return { success: true };
      }

      return { success: false };
    } catch (error) {
      logger.error('Unexpected login error', error);
      toast({
        title: "Login Error",
        description: "An unexpected error occurred during login.",
        variant: "destructive",
      });
      return { success: false };
    }
  };

  const logout = async (): Promise<void> => {
    try {
      clearAuthCache();
      sessionStorage.removeItem(RECOVERY_FLAG_KEY);
      setRequiresPasswordChange(false);

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
      sessionStorage.removeItem(RECOVERY_FLAG_KEY);
      return true;
    } catch (error) {
      logger.error('Unexpected password update error', error);
      return false;
    }
  };

  useEffect(() => {
    // Subscribe BEFORE getSession per Supabase best practices
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      logger.info('Auth state changed', { event });

      if (event === 'SIGNED_OUT') {
        clearUserState();
        setIsLoading(false);
        return;
      }

      // PASSWORD_RECOVERY: set flag so user must change password
      if (event === 'PASSWORD_RECOVERY') {
        logger.info('PASSWORD_RECOVERY event — requiring password change');
        setRequiresPasswordChange(true);
        sessionStorage.setItem(RECOVERY_FLAG_KEY, 'true');
        // Still process the session so user is "logged in" but gated
        // Use fire-and-forget to avoid blocking the callback
        handleUserSession(session, initDoneRef.current).then(() => {
          if (!initDoneRef.current) {
            initDoneRef.current = true;
            setIsLoading(false);
          }
        });
        return;
      }

      // INITIAL_SESSION: process it as part of init (don't ignore)
      if (event === 'INITIAL_SESSION') {
        // If initAuth already started, let it handle via getSession; skip here
        if (initStartedRef.current) {
          logger.debug('INITIAL_SESSION — initAuth already started, deferring');
          return;
        }
        // Otherwise process directly
        handleUserSession(session, true).then(() => {
          initDoneRef.current = true;
        });
        return;
      }

      // TOKEN_REFRESHED: skip re-processing if user already loaded
      if (event === 'TOKEN_REFRESHED' && userRef.current) {
        logger.debug('Token refreshed, user already loaded — skipping');
        return;
      }

      // SIGNED_IN and others: process normally (fire-and-forget)
      handleUserSession(session, initDoneRef.current);
    });

    const initAuth = async () => {
      if (initStartedRef.current) return;
      initStartedRef.current = true;

      try {
        // Check for recovery hash in URL before getSession
        const hash = window.location.hash;
        if (hash.includes('type=recovery')) {
          logger.info('Recovery hash detected in URL — setting password change flag');
          setRequiresPasswordChange(true);
          sessionStorage.setItem(RECOVERY_FLAG_KEY, 'true');
        }

        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          logger.error('getSession error during init', error);
          // If refresh token not found, clear state cleanly
          if ((error as any)?.code === 'refresh_token_not_found' || 
              error.message?.includes('Refresh Token Not Found')) {
            logger.info('Refresh token invalid — clearing auth state');
            clearUserState();
          }
          initDoneRef.current = true;
          setIsLoading(false);
          return;
        }

        initDoneRef.current = true;
        await handleUserSession(session, true);
      } catch (error) {
        logger.error('Error getting initial session', error);
        initDoneRef.current = true;
        setIsLoading(false);
      }
    };

    initAuth();

    return () => {
      subscription.unsubscribe();
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
