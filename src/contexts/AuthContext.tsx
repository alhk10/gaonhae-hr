
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
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        console.log('AuthContext: Loading stored user:', userData);
        setUser(userData);
        
        // Check if password change is required
        const passwordChangeRequired = localStorage.getItem('requiresPasswordChange');
        setRequiresPasswordChange(passwordChangeRequired === 'true');
      } catch (error) {
        console.error('AuthContext: Error parsing stored user:', error);
        localStorage.removeItem('currentUser');
        localStorage.removeItem('requiresPasswordChange');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    console.log('AuthContext: Attempting login with:', email);
    
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
    if (systemUsers[email] && password === 'password') {
      console.log('AuthContext: System user login successful:', systemUsers[email]);
      const foundUser = systemUsers[email];
      
      localStorage.setItem('currentUser', JSON.stringify(foundUser));
      setUser(foundUser);
      
      if (password === 'password') {
        localStorage.setItem('requiresPasswordChange', 'true');
        setRequiresPasswordChange(true);
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
      
      if (employee && password === 'password') {
        console.log('AuthContext: Employee login successful:', employee);
        
        const userRecord: User = {
          id: employee.id,
          name: employee.name,
          email: employee.email,
          role: 'employee',
          department: employee.branch,
          employeeId: employee.id
        };
        
        localStorage.setItem('currentUser', JSON.stringify(userRecord));
        setUser(userRecord);
        
        if (password === 'password') {
          localStorage.setItem('requiresPasswordChange', 'true');
          setRequiresPasswordChange(true);
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
    
    // In a real implementation, this would call an API
    // For now, we'll just clear the password change requirement
    localStorage.removeItem('requiresPasswordChange');
    setRequiresPasswordChange(false);
    
    console.log('AuthContext: Password updated successfully');
    return true;
  };

  const logout = () => {
    console.log('AuthContext: Logging out user:', user);
    setUser(null);
    setRequiresPasswordChange(false);
    localStorage.removeItem('currentUser');
    localStorage.removeItem('requiresPasswordChange');
  };

  // Debug log current user state
  useEffect(() => {
    console.log('AuthContext: Current user state changed:', user);
    if (user) {
      console.log('AuthContext: Current user role:', user.role);
    }
  }, [user]);

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
