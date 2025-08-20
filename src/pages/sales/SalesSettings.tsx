/**
 * Sales Settings
 * Feature flag management and sales module configuration
 */

import React, { useState, useEffect } from 'react';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { 
  getSalesModuleConfig, 
  updateSalesModuleConfig, 
  type SalesModuleConfig 
} from '@/services/salesModuleService';
import { 
  Settings, 
  Shield, 
  AlertTriangle, 
  CheckCircle,
  RefreshCw
} from 'lucide-react';

const SalesSettings = () => {
  const [config, setConfig] = useState<SalesModuleConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const loadConfig = async () => {
    try {
      setLoading(true);
      const currentConfig = await getSalesModuleConfig();
      
      // Set default config if none exists
      const defaultConfig: SalesModuleConfig = {
        enabled: false,
        allowedRoles: ['superadmin'],
        rolloutPhase: 'development'
      };
      
      setConfig(currentConfig || defaultConfig);
    } catch (error) {
      console.error('Error loading sales module config:', error);
      toast({
        title: "Error",
        description: "Failed to load sales module configuration",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const handleSave = async () => {
    if (!config) return;

    try {
      setSaving(true);
      const success = await updateSalesModuleConfig(config);
      
      if (success) {
        toast({
          title: "Success",
          description: `Sales module ${config.enabled ? 'enabled' : 'disabled'} successfully`,
        });
      } else {
        throw new Error('Failed to update configuration');
      }
    } catch (error) {
      console.error('Error saving sales module config:', error);
      toast({
        title: "Error",
        description: "Failed to save sales module configuration",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleEnabled = () => {
    if (!config) return;
    setConfig({ ...config, enabled: !config.enabled });
  };

  if (loading) {
    return (
      <ResponsiveLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">Loading configuration...</p>
          </div>
        </div>
      </ResponsiveLayout>
    );
  }

  return (
    <ResponsiveLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Sales Module Settings</h1>
            <p className="text-muted-foreground">
              Configure feature flags and access control for the sales module
            </p>
          </div>
        </div>

        {/* Status Alert */}
        <Alert className={config?.enabled ? "border-green-200 bg-green-50" : "border-orange-200 bg-orange-50"}>
          {config?.enabled ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-orange-600" />
          )}
          <AlertDescription className={config?.enabled ? "text-green-800" : "text-orange-800"}>
            <div className="font-semibold">
              Sales Module is currently {config?.enabled ? 'ENABLED' : 'DISABLED'}
            </div>
            <div className="text-sm mt-1">
              {config?.enabled 
                ? 'Superadmin users can access all sales features.' 
                : 'No users can access sales features until enabled.'
              }
            </div>
          </AlertDescription>
        </Alert>

        {/* Feature Flag Control */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Feature Flag Control
            </CardTitle>
            <CardDescription>
              Master switch for the entire Sales Module
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="font-medium">Enable Sales Module</p>
                <p className="text-sm text-muted-foreground">
                  Allow authorized users to access sales functionality
                </p>
              </div>
              <Switch
                checked={config?.enabled || false}
                onCheckedChange={toggleEnabled}
                disabled={saving}
              />
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <div className="space-y-1">
                <p className="font-medium">Rollout Phase</p>
                <p className="text-sm text-muted-foreground">
                  Current deployment phase
                </p>
              </div>
              <Badge variant="secondary">
                {config?.rolloutPhase || 'development'}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="font-medium">Allowed Roles</p>
                <p className="text-sm text-muted-foreground">
                  User roles with access permission
                </p>
              </div>
              <div className="flex gap-2">
                {config?.allowedRoles?.map(role => (
                  <Badge key={role} variant="outline">
                    {role}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security & Access Control
            </CardTitle>
            <CardDescription>
              How access control works for the Sales Module
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium">Role-Based Access</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Only superadmin users during development</li>
                  <li>• Future: Branch managers in pilot phase</li>
                  <li>• Future: All staff in production phase</li>
                </ul>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium">Security Features</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• All access attempts logged</li>
                  <li>• Row-level security on all tables</li>
                  <li>• Feature flag can disable instantly</li>
                </ul>
              </div>
            </div>

            <Alert className="bg-blue-50 border-blue-200">
              <Shield className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <div className="font-semibold">Zero Impact Guarantee</div>
                <div className="text-sm mt-1">
                  The Sales Module is completely isolated from the existing HR system. 
                  Disabling it has zero impact on current operations.
                </div>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="min-w-32"
          >
            {saving ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </div>
    </ResponsiveLayout>
  );
};

export default SalesSettings;