/**
 * Student Portal Access Manager Component
 * Manages portal access for individual students
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { KeyRound, Shield, ShieldOff, Loader2 } from 'lucide-react';
import { 
  getStudentAuthByStudentId, 
  enablePortalAccess, 
  revokePortalAccess,
  StudentAuth 
} from '@/services/studentAuthService';

interface StudentPortalAccessManagerProps {
  studentId: string;
  studentEmail: string | null;
  onAccessChanged?: () => void;
}

const StudentPortalAccessManager: React.FC<StudentPortalAccessManagerProps> = ({
  studentId,
  studentEmail,
  onAccessChanged
}) => {
  const [portalAuth, setPortalAuth] = useState<StudentAuth | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadPortalStatus();
  }, [studentId]);

  const loadPortalStatus = async () => {
    try {
      setLoading(true);
      const auth = await getStudentAuthByStudentId(studentId);
      setPortalAuth(auth);
    } catch (error) {
      console.error('Error loading portal status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEnableAccess = async () => {
    if (!studentEmail) {
      toast.error('Student must have an email address to enable portal access');
      return;
    }

    try {
      setActionLoading(true);
      const result = await enablePortalAccess(studentId, studentEmail);
      
      if (result.success) {
        toast.success('Portal access enabled successfully');
        await loadPortalStatus();
        onAccessChanged?.();
      } else {
        toast.error(result.error || 'Failed to enable portal access');
      }
    } catch (error) {
      console.error('Error enabling portal access:', error);
      toast.error('Failed to enable portal access');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevokeAccess = async () => {
    try {
      setActionLoading(true);
      const success = await revokePortalAccess(studentId);
      
      if (success) {
        toast.success('Portal access revoked successfully');
        setPortalAuth(null);
        onAccessChanged?.();
      } else {
        toast.error('Failed to revoke portal access');
      }
    } catch (error) {
      console.error('Error revoking portal access:', error);
      toast.error('Failed to revoke portal access');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="w-5 h-5" />
            Portal Access
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading portal status...
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasAccess = portalAuth !== null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="w-5 h-5" />
          Portal Access
          <Badge variant={hasAccess ? 'default' : 'secondary'} className="ml-auto">
            {hasAccess ? 'Enabled' : 'Not Enabled'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {hasAccess ? (
            <>
              <div className="flex items-center gap-2 text-sm">
                <Shield className="w-4 h-4 text-green-500" />
                <span>This student can access the Student Portal</span>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Portal Email</label>
                <p className="text-foreground">{portalAuth.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Access Created</label>
                <p className="text-foreground">
                  {new Date(portalAuth.created_at).toLocaleDateString()}
                </p>
              </div>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    disabled={actionLoading}
                  >
                    {actionLoading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <ShieldOff className="w-4 h-4 mr-2" />
                    )}
                    Revoke Access
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Revoke Portal Access</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to revoke portal access for this student? 
                      They will no longer be able to log in to the Student Portal.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleRevokeAccess}>
                      Revoke Access
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ShieldOff className="w-4 h-4" />
                <span>This student does not have portal access</span>
              </div>
              
              {!studentEmail ? (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    To enable portal access, the student must have an email address. 
                    Please add an email address first.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Email to be used</label>
                    <p className="text-foreground">{studentEmail}</p>
                  </div>
                  <Button 
                    onClick={handleEnableAccess}
                    disabled={actionLoading}
                    size="sm"
                  >
                    {actionLoading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Shield className="w-4 h-4 mr-2" />
                    )}
                    Enable Portal Access
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default StudentPortalAccessManager;
