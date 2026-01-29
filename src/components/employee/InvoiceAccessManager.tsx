/**
 * Invoice Access Manager Component
 * Manages branch-based invoice access permissions for employees
 * Only visible to superadmins in the Employee Details page
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, FileText, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { 
  getEmployeeInvoiceAccess, 
  updateEmployeeInvoiceAccess,
  type BranchInvoiceAccess 
} from '@/services/invoiceAccessService';

interface InvoiceAccessManagerProps {
  employeeId: string;
  employeeName: string;
  isEditing: boolean;
}

interface Branch {
  id: string;
  name: string;
  country: string | null;
}

const InvoiceAccessManager: React.FC<InvoiceAccessManagerProps> = ({
  employeeId,
  employeeName,
  isEditing
}) => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchAccess, setBranchAccess] = useState<Map<string, BranchInvoiceAccess>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadData();
  }, [employeeId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load branches
      const { data: branchData, error: branchError } = await supabase
        .from('branches')
        .select('id, name, country')
        .order('name');

      if (branchError) throw branchError;

      // Filter out non-operational branches
      const operationalBranches = (branchData || []).filter(
        b => !['Competition', 'Headquarters'].includes(b.name)
      );
      setBranches(operationalBranches);

      // Load existing access
      const accessData = await getEmployeeInvoiceAccess(employeeId);
      
      // Create access map with all branches
      const accessMap = new Map<string, BranchInvoiceAccess>();
      operationalBranches.forEach(branch => {
        const existing = accessData.find(a => a.branch_id === branch.id);
        accessMap.set(branch.id, {
          branch_id: branch.id,
          branch_name: branch.name,
          can_create: existing?.can_create ?? false,
          can_edit: existing?.can_edit ?? false,
          can_delete: existing?.can_delete ?? false
        });
      });
      setBranchAccess(accessMap);
    } catch (error) {
      console.error('Error loading invoice access data:', error);
      toast.error('Failed to load invoice access settings');
    } finally {
      setLoading(false);
    }
  };

  const handleBranchToggle = (branchId: string, enabled: boolean) => {
    setBranchAccess(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(branchId);
      if (current) {
        if (enabled) {
          // Enable with default permissions (create & edit)
          newMap.set(branchId, {
            ...current,
            can_create: true,
            can_edit: true,
            can_delete: false
          });
        } else {
          // Disable all permissions
          newMap.set(branchId, {
            ...current,
            can_create: false,
            can_edit: false,
            can_delete: false
          });
        }
      }
      return newMap;
    });
    setHasChanges(true);
  };

  const handlePermissionChange = (
    branchId: string, 
    permission: 'can_create' | 'can_edit' | 'can_delete', 
    value: boolean
  ) => {
    setBranchAccess(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(branchId);
      if (current) {
        newMap.set(branchId, { ...current, [permission]: value });
      }
      return newMap;
    });
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const accessArray = Array.from(branchAccess.values());
      await updateEmployeeInvoiceAccess(employeeId, accessArray);
      toast.success('Invoice access permissions saved');
      setHasChanges(false);
    } catch (error) {
      console.error('Error saving invoice access:', error);
      toast.error('Failed to save invoice access permissions');
    } finally {
      setSaving(false);
    }
  };

  const isBranchEnabled = (branchId: string): boolean => {
    const access = branchAccess.get(branchId);
    return (access?.can_create || access?.can_edit || access?.can_delete) ?? false;
  };

  const getEnabledBranchCount = (): number => {
    return Array.from(branchAccess.values()).filter(
      a => a.can_create || a.can_edit || a.can_delete
    ).length;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading invoice access settings...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Invoicing Access by Branch</CardTitle>
          </div>
          {getEnabledBranchCount() > 0 && (
            <Badge variant="secondary">
              {getEnabledBranchCount()} branch{getEnabledBranchCount() !== 1 ? 'es' : ''} enabled
            </Badge>
          )}
        </div>
        <CardDescription>
          Grant {employeeName} access to create and manage invoices for specific branches.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {branches.length === 0 ? (
          <p className="text-sm text-muted-foreground">No branches available.</p>
        ) : (
          <div className="space-y-4">
            {branches.map((branch) => {
              const access = branchAccess.get(branch.id);
              const isEnabled = isBranchEnabled(branch.id);

              return (
                <div 
                  key={branch.id} 
                  className={`rounded-lg border p-4 transition-colors ${
                    isEnabled ? 'bg-accent/50 border-accent' : 'bg-background'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        id={`branch-${branch.id}`}
                        checked={isEnabled}
                        onCheckedChange={(checked) => handleBranchToggle(branch.id, checked as boolean)}
                        disabled={!isEditing}
                      />
                      <div>
                        <label
                          htmlFor={`branch-${branch.id}`}
                          className="text-sm font-medium cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            {branch.name}
                          </div>
                        </label>
                        {branch.country && (
                          <span className="text-xs text-muted-foreground">{branch.country}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {isEnabled && (
                    <div className="mt-3 ml-7 flex flex-wrap gap-4">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`${branch.id}-create`}
                          checked={access?.can_create ?? false}
                          onCheckedChange={(checked) => 
                            handlePermissionChange(branch.id, 'can_create', checked as boolean)
                          }
                          disabled={!isEditing}
                        />
                        <label 
                          htmlFor={`${branch.id}-create`}
                          className="text-sm text-muted-foreground cursor-pointer"
                        >
                          Create
                        </label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`${branch.id}-edit`}
                          checked={access?.can_edit ?? false}
                          onCheckedChange={(checked) => 
                            handlePermissionChange(branch.id, 'can_edit', checked as boolean)
                          }
                          disabled={!isEditing}
                        />
                        <label 
                          htmlFor={`${branch.id}-edit`}
                          className="text-sm text-muted-foreground cursor-pointer"
                        >
                          Edit
                        </label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`${branch.id}-delete`}
                          checked={access?.can_delete ?? false}
                          onCheckedChange={(checked) => 
                            handlePermissionChange(branch.id, 'can_delete', checked as boolean)
                          }
                          disabled={!isEditing}
                        />
                        <label 
                          htmlFor={`${branch.id}-delete`}
                          className="text-sm text-muted-foreground cursor-pointer"
                        >
                          Delete
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {isEditing && hasChanges && (
          <div className="flex justify-end pt-4 border-t">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Invoice Access'
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default InvoiceAccessManager;
