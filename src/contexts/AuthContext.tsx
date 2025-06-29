
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '@/types/auth';
import { getEmployees } from '@/services/employeeService';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  requiresPasswordChange: boolean;
  updatePassword: (newPassword: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [requiresPasswordChange, setRequiresPasswordChange] = useState(false);

  useEffect(() => {
    // Check if user is already logged in
    const initializeAuth = () => {
      try {
        const storedUser = localStorage.getItem('currentUser');
        const storedSession = localStorage.getItem('userSession');
        
        if (storedUser && storedSession) {
          const userData = JSON.parse(storedUser);
          const sessionData = JSON.parse(storedSession);
          
          // Verify session is still valid (within 24 hours)
          const sessionTime = new Date(sessionData.timestamp);
          const currentTime = new Date();
          const timeDiff = currentTime.getTime() - sessionTime.getTime();
          const hoursDiff = timeDiff / (1000 * 3600);
          
          if (hoursDiff < 24) {
            console.log('AuthContext: Loading stored user session:', userData);
            setUser(userData);
            
            // Check if password change is required
            const passwordChangeRequired = localStorage.getItem('requiresPasswordChange');
            setRequiresPasswordChange(passwordChangeRequired === 'true');
          } else {
            // Session expired, clear storage
            console.log('AuthContext: Session expired, clearing storage');
            localStorage.removeItem('currentUser');
            localStorage.removeItem('userSession');
            localStorage.removeItem('requiresPasswordChange');
          }
        }
      } catch (error) {
        console.error('AuthContext: Error parsing stored user:', error);
        localStorage.clear();
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const saveUserSession = (userData: User, password?: string) => {
    try {
      // Save user data
      localStorage.setItem('currentUser', JSON.stringify(userData));
      
      // Save session with timestamp
      const sessionData = {
        timestamp: new Date().toISOString(),
        userId: userData.id,
        email: userData.email
      };
      localStorage.setItem('userSession', JSON.stringify(sessionData));
      
      // Save encrypted password (in real app, this should be handled server-side)
      if (password && password !== 'password') {
        const userPasswords = JSON.parse(localStorage.getItem('userPasswords') || '{}');
        userPasswords[userData.email] = btoa(password); // Basic encoding (not secure, for demo only)
        localStorage.setItem('userPasswords', JSON.stringify(userPasswords));
      }
      
      console.log('AuthContext: User session saved successfully');
    } catch (error) {
      console.error('AuthContext: Error saving user session:', error);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    console.log('AuthContext: Attempting login with:', email);
    
    // Check stored passwords first
    const userPasswords = JSON.parse(localStorage.getItem('userPasswords') || '{}');
    const storedPassword = userPasswords[email];
    
    if (storedPassword && atob(storedPassword) === password) {
      console.log('AuthContext: Using stored password for login');
    } else if (password !== 'password') {
      // If not default password and no stored password matches
      console.log('AuthContext: Invalid password');
      return false;
    }
    
    // Define system admin users
    const systemUsers: { [key: string]: User } = {
      'alhk10@gmail.com': {
        id: 'ADMIN001',
        name: 'System Administrator',
        email: 'alhk10@gmail.com',
        role: 'superadmin'
      },
      'manager@company.sg': {
        id: 'MANAGER001', 
        name: 'Department Manager',
        email: 'manager@company.sg',
        role: 'manager'
      },
    };

    // Check system users first
    if (systemUsers[email]) {
      console.log('AuthContext: System user login successful:', systemUsers[email]);
      const foundUser = systemUsers[email];
      
      setUser(foundUser);
      saveUserSession(foundUser, password);
      
      if (password === 'password' && !storedPassword) {
        console.log('AuthContext: Setting password change requirement');
        localStorage.setItem('requiresPasswordChange', 'true');
        setRequiresPasswordChange(true);
      } else {
        console.log('AuthContext: No password change required');
        setRequiresPasswordChange(false);
      }
      
      return true;
    }

    // Load all employees from database for regular employee login
    try {
      console.log('AuthContext: Loading employees from database...');
      const employees = await getEmployees();
      console.log('AuthContext: Loaded employees:', employees.length);
      
      // Find employee with matching email
      const employee = employees.find(emp => emp.email === email);
      
      if (employee) {
        console.log('AuthContext: Employee found:', employee);
        
        const userRecord: User = {
          id: employee.id,
          name: employee.name,
          email: employee.email,
          role: 'employee',
          department: employee.branch,
          employeeId: employee.id
        };
        
        setUser(userRecord);
        saveUserSession(userRecord, password);
        
        if (password === 'password' && !storedPassword) {
          console.log('AuthContext: Setting password change requirement for employee');
          localStorage.setItem('requiresPasswordChange', 'true');
          setRequiresPasswordChange(true);
        } else {
          console.log('AuthContext: No password change required for employee');
          setRequiresPasswordChange(false);
        }
        
        return true;
      }
      
      console.log('AuthContext: No matching employee found for email:', email);
      console.log('AuthContext: Available employee emails:', employees.map(emp => emp.email).filter(Boolean));
      
    } catch (error) {
      console.error('AuthContext: Error loading employees:', error);
    }

    console.log('AuthContext: Login failed for email:', email);
    return false;
  };

  const updatePassword = async (newPassword: string): Promise<boolean> => {
    console.log('AuthContext: Updating password for user:', user?.email);
    
    if (!user?.email) {
      console.error('AuthContext: No user email found');
      return false;
    }
    
    try {
      // Save new password
      const userPasswords = JSON.parse(localStorage.getItem('userPasswords') || '{}');
      userPasswords[user.email] = btoa(newPassword);
      localStorage.setItem('userPasswords', JSON.stringify(userPasswords));
      
      // Clear password change requirement
      localStorage.removeItem('requiresPasswordChange');
      setRequiresPasswordChange(false);
      
      // Update session with new password
      saveUserSession(user, newPassword);
      
      console.log('AuthContext: Password updated successfully');
      return true;
    } catch (error) {
      console.error('AuthContext: Error updating password:', error);
      return false;
    }
  };

  const logout = () => {
    console.log('AuthContext: Logging out user:', user);
    setUser(null);
    setRequiresPasswordChange(false);
    localStorage.removeItem('currentUser');
    localStorage.removeItem('userSession');
    localStorage.removeItem('requiresPasswordChange');
  };

  // Debug log current user state
  useEffect(() => {
    console.log('AuthContext: Current user state changed:', user);
    console.log('AuthContext: requiresPasswordChange state:', requiresPasswordChange);
    if (user) {
      console.log('AuthContext: Current user role:', user.role);
    }
  }, [user, requiresPasswordChange]);

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      logout, 
      isLoading, 
      requiresPasswordChange, 
      updatePassword 
    }}>
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
