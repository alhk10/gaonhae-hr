/**
 * Sales Access Guard
 * Protects sales module routes with feature flag and role checks
 * Supports invoice access for non-superadmin users with branch permissions
 */

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { hasSalesModuleAccess, logSalesModuleAccess } from '@/services/salesModuleService';
import { hasAnyInvoiceAccess } from '@/services/invoiceAccessService';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, AlertTriangle } from 'lucide-react';

interface SalesAccessGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  requireInvoiceAccess?: boolean;
}

const SalesAccessGuard: React.FC<SalesAccessGuardProps> = ({ 
  children, 
  fallback,
  requireInvoiceAccess = false
}) => {
  const { user, userrole, isLoading } = useAuth();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      console.log('🔐 SalesAccessGuard: Checking sales module access...');
      
      if (isLoading) {
        console.log('🔐 SalesAccessGuard: Auth still loading...');
        return;
      }

      if (!user) {
        console.log('🔐 SalesAccessGuard: No user - access denied');
        setHasAccess(false);
        setChecking(false);
        await logSalesModuleAccess('access_attempt', false, { reason: 'no_user' });
        return;
      }

      // Superadmins always have access
      if (userrole === 'superadmin') {
        try {
          const access = await hasSalesModuleAccess();
          console.log('🔐 SalesAccessGuard: Superadmin access check result:', access);
          
          setHasAccess(access);
          setChecking(false);
          
          await logSalesModuleAccess('access_attempt', access, { 
            user_role: userrole,
            user_email: user.email 
          });
          
          if (!access) {
            console.warn('🔐 SalesAccessGuard: Access denied - feature flag disabled');
          }
        } catch (error) {
          console.error('🔐 SalesAccessGuard: Error checking access:', error);
          setHasAccess(false);
          setChecking(false);
        }
        return;
      }

      // For non-superadmins, check if they have invoice access (when requireInvoiceAccess is true)
      if (requireInvoiceAccess) {
        try {
          const invoiceAccess = await hasAnyInvoiceAccess();
          console.log('🔐 SalesAccessGuard: Invoice access check result:', invoiceAccess);
          
          setHasAccess(invoiceAccess);
          setChecking(false);
          
          await logSalesModuleAccess('access_attempt', invoiceAccess, { 
            user_role: userrole,
            user_email: user.email,
            access_type: 'invoice_access'
          });
          return;
        } catch (error) {
          console.error('🔐 SalesAccessGuard: Error checking invoice access:', error);
        }
      }

      // Non-superadmin without invoice access
      console.log('🔐 SalesAccessGuard: Non-superadmin user - access denied', { userrole });
      setHasAccess(false);
      setChecking(false);
      await logSalesModuleAccess('access_attempt', false, { 
        reason: 'insufficient_role', 
        user_role: userrole 
      });

      try {
        const access = await hasSalesModuleAccess();
        console.log('🔐 SalesAccessGuard: Access check result:', access);
        
        setHasAccess(access);
        setChecking(false);
        
        await logSalesModuleAccess('access_attempt', access, { 
          user_role: userrole,
          user_email: user.email 
        });
        
        if (!access) {
          console.warn('🔐 SalesAccessGuard: Access denied - feature flag disabled or role insufficient');
        }
      } catch (error) {
        console.error('🔐 SalesAccessGuard: Error checking access:', error);
        setHasAccess(false);
        setChecking(false);
        await logSalesModuleAccess('access_attempt', false, { 
          reason: 'check_error', 
          error: error instanceof Error ? error.message : 'unknown' 
        });
      }
    };

    checkAccess();
  }, [user, userrole, isLoading]);

  // Show loading state
  if (isLoading || checking) {
    return fallback || (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Checking access permissions...</p>
        </div>
      </div>
    );
  }

  // Show access denied
  if (hasAccess === false) {
    return fallback || (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <Alert className="border-destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="space-y-2">
              <div className="font-semibold">Sales Module Access Denied</div>
              <div className="text-sm text-muted-foreground">
                {!user ? (
                  'Please log in to access this module.'
                ) : userrole !== 'superadmin' ? (
                  'This module is currently restricted to superadmin users only.'
                ) : (
                  'The Sales Module is currently disabled. Please contact your system administrator.'
                )}
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                Access attempt has been logged for security purposes.
              </div>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  // Access granted
  return <>{children}</>;
};

export default SalesAccessGuard;