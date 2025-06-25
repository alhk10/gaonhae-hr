
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '@/types/auth';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      const userData = JSON.parse(storedUser);
      console.log('Loading stored user:', userData);
      setUser(userData);
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    console.log('Attempting login with:', email);
    
    // Define users with proper roles
    const users: { [key: string]: User } = {
      'admin@company.sg': {
        id: 'ADMIN001',
        name: 'System Administrator',
        email: 'admin@company.sg',
        role: 'superadmin'
      },
      'manager@company.sg': {
        id: 'MANAGER001', 
        name: 'Department Manager',
        email: 'manager@company.sg',
        role: 'manager'
      },
      'john.tan@company.sg': {
        id: 'EMP001',
        name: 'John Tan',
        email: 'john.tan@company.sg',
        role: 'employee'
      },
      'mary.ng@company.sg': {
        id: 'EMP002',
        name: 'Mary Ng', 
        email: 'mary.ng@company.sg',
        role: 'employee'
      },
      'david.lim@company.sg': {
        id: 'EMP003',
        name: 'David Lim',
        email: 'david.lim@company.sg', 
        role: 'employee'
      },
      'alice.wong@company.sg': {
        id: 'CAS001',
        name: 'Alice Wong',
        email: 'alice.wong@company.sg',
        role: 'employee'
      },
      'bob.chen@company.sg': {
        id: 'CAS002',
        name: 'Bob Chen',
        email: 'bob.chen@company.sg',
        role: 'employee'
      },
      'sarah.lee@company.sg': {
        id: 'CAS003',
        name: 'Sarah Lee',
        email: 'sarah.lee@company.sg',
        role: 'employee'
      }
    };

    const foundUser = users[email];
    if (foundUser && password === 'password') {
      console.log('Login successful for user:', foundUser);
      setUser(foundUser);
      localStorage.setItem('currentUser', JSON.stringify(foundUser));
      return true;
    }

    console.log('Login failed for email:', email);
    return false;
  };

  const logout = () => {
    console.log('Logging out user:', user);
    setUser(null);
    localStorage.removeItem('currentUser');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
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
