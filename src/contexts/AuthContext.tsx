
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { User, AuthContextType } from '@/types/auth';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock users for demo - expanded with different roles
const mockUsers: User[] = [
  {
    id: '1',
    email: 'admin@company.sg',
    name: 'Sarah Lim',
    role: 'superadmin',
    employeeId: 'ADM001'
  },
  {
    id: '2',
    email: 'manager@company.sg',
    name: 'David Tan',
    role: 'manager',
    department: 'Operations',
    employeeId: 'MGR001'
  },
  {
    id: '3',
    email: 'employee@company.sg',
    name: 'Michelle Wong',
    role: 'employee',
    department: 'Operations',
    employeeId: 'EMP001',
    managerId: '2'
  }
];

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const foundUser = mockUsers.find(u => u.email === email);
    if (foundUser) {
      setUser(foundUser);
    } else {
      throw new Error('Invalid credentials');
    }
    setIsLoading(false);
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};
