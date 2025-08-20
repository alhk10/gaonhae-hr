/**
 * Sales Module Service
 * Handles feature flag checks and access control for the sales module
 */

import { supabase } from '@/integrations/supabase/client';

export interface SalesModuleConfig {
  enabled: boolean;
  allowedRoles: string[];
  rolloutPhase: 'development' | 'pilot' | 'production';
}

/**
 * Check if the sales module is enabled system-wide
 */
export async function isSalesModuleEnabled(): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'salesModuleEnabled')
      .maybeSingle();

    if (error) {
      console.error('Error checking sales module status:', error);
      return false;
    }

    if (!data?.setting_value) {
      return false;
    }

    const config = data.setting_value as unknown as SalesModuleConfig;
    return config.enabled === true;
  } catch (error) {
    console.error('Error checking sales module status:', error);
    return false;
  }
}

/**
 * Check if current user has access to the sales module
 */
export async function hasSalesModuleAccess(): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('has_sales_module_access');
    
    if (error) {
      console.error('Error checking sales module access:', error);
      return false;
    }

    return data === true;
  } catch (error) {
    console.error('Error checking sales module access:', error);
    return false;
  }
}

/**
 * Get sales module configuration
 */
export async function getSalesModuleConfig(): Promise<SalesModuleConfig | null> {
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'salesModuleEnabled')
      .maybeSingle();

    if (error) {
      console.error('Error fetching sales module config:', error);
      return null;
    }

    return (data?.setting_value as unknown as SalesModuleConfig) || null;
  } catch (error) {
    console.error('Error fetching sales module config:', error);
    return null;
  }
}

/**
 * Update sales module configuration (superadmin only)
 */
export async function updateSalesModuleConfig(config: SalesModuleConfig): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('system_settings')
      .upsert({
        setting_key: 'salesModuleEnabled',
        setting_value: config as any,
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error updating sales module config:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error updating sales module config:', error);
    return false;
  }
}

/**
 * Log access attempt for security auditing
 */
export async function logSalesModuleAccess(
  action: string, 
  success: boolean, 
  details?: Record<string, any>
) {
  try {
    await supabase.rpc('log_security_event', {
      p_user_email: (await supabase.auth.getUser()).data.user?.email || 'unknown',
      p_action: `sales_module_${action}`,
      p_details: {
        success,
        module: 'sales',
        timestamp: new Date().toISOString(),
        ...details
      }
    });
  } catch (error) {
    console.error('Error logging sales module access:', error);
  }
}