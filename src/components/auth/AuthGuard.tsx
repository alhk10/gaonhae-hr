
import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const AuthGuard: React.FC<AuthGuardProps> = ({ 
  children, 
  fallback = (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
    </div>
  )
}) => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Only redirect if auth is fully resolved (not loading) and no user
    if (!isLoading && !user) {
      console.log('AuthGuard: No authenticated user, redirecting to home');
      navigate('/', { replace: true });
    }
  }, [user, isLoading, navigate]);

  // Show loading while checking authentication — never flash login
  if (isLoading) {
    return <>{fallback}</>;
  }

  // If no user after loading complete, show fallback while redirect happens
  if (!user) {
    return <>{fallback}</>;
  }

  // User is authenticated, show protected content
  return <>{children}</>;
};

export default AuthGuard;
