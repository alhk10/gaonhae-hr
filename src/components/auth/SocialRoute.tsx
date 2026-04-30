import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import AuthGuard from './AuthGuard';
import { useAuth } from '@/contexts/AuthContext';

const SocialRouteInner = ({ children }: { children: ReactNode }) => {
  const { userrole, isLoading } = useAuth();
  if (isLoading) return null;
  if (userrole !== 'superadmin') {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

const SocialRoute = ({ children }: { children: ReactNode }) => (
  <AuthGuard>
    <SocialRouteInner>{children}</SocialRouteInner>
  </AuthGuard>
);

export default SocialRoute;
