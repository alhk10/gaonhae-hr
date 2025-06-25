
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '@/types/auth';
import { getEmployeeById } from '@/services/employeeService';

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
    
    // Define users with updated emails from employee details
    const users: { [key: string]: User } = {
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

    // Load employee emails dynamically from database
    try {
      // Get employee emails from the database for a broader range of employee IDs
      const employeeIds = [
        'EMP001', 'EMP002', 'EMP003', 'EMP004', 'EMP005',
        'CAS001', 'CAS002', 'CAS003', 'CAS004', 'CAS005',
        // Add more potential employee IDs to catch Kim Hasung
        'KIM001', 'HASUNG001', 'DAVID001'
      ];
      
      console.log('AuthContext: Checking employee IDs:', employeeIds);
      
      for (const empId of employeeIds) {
        try {
          const employee = await getEmployeeById(empId);
          if (employee && employee.email) {
            console.log(`AuthContext: Found employee ${empId} with email: ${employee.email}`);
            users[employee.email] = {
              id: employee.id,
              name: employee.name,
              email: employee.email,
              role: 'employee'
            };
          }
        } catch (empError) {
          // Continue checking other IDs if one fails
          console.log(`AuthContext: Employee ID ${empId} not found, continuing...`);
        }
      }

      // Also try to find employee by email directly if not found by ID
      console.log('AuthContext: Checking if email exists in database:', email);
      
    } catch (error) {
      console.error('AuthContext: Error loading employee emails:', error);
    }

    console.log('AuthContext: Available user emails:', Object.keys(users));
    console.log('AuthContext: Looking for email:', email);

    const foundUser = users[email];
    if (foundUser && password === 'password') {
      console.log('AuthContext: Login successful for user:', foundUser);
      console.log('AuthContext: User role is:', foundUser.role);
      
      // Clear any existing stored data
      localStorage.removeItem('currentUser');
      localStorage.removeItem('requiresPasswordChange');
      
      // Store user data
      localStorage.setItem('currentUser', JSON.stringify(foundUser));
      setUser(foundUser);
      
      // Check if this is first login (using default password)
      if (password === 'password') {
        localStorage.setItem('requiresPasswordChange', 'true');
        setRequiresPasswordChange(true);
        console.log('AuthContext: Password change required for first login');
      }
      
      // Double-check stored data
      const storedCheck = localStorage.getItem('currentUser');
      console.log('AuthContext: Stored user verification:', storedCheck ? JSON.parse(storedCheck) : null);
      
      return true;
    }

    console.log('AuthContext: Login failed for email:', email);
    console.log('AuthContext: Available emails were:', Object.keys(users));
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
