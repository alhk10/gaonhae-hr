// System Test Validator - Comprehensive authentication and system validation

import { supabase } from '@/integrations/supabase/client';

export interface SystemTestResult {
  component: string;
  test: string;
  status: 'PASS' | 'FAIL' | 'WARNING';
  message: string;
  details?: any;
}

export class SystemTestValidator {
  private results: SystemTestResult[] = [];

  // Test superadmin detection
  async testSuperadminDetection(email: string = 'alhk10@gmail.com'): Promise<SystemTestResult> {
    try {
      const { data, error } = await supabase
        .from('superadmin_users')
        .select('id, is_active, employee_email')
        .eq('employee_email', email)
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        return {
          component: 'Database',
          test: 'Superadmin Detection',
          status: 'FAIL',
          message: `Database error: ${error.message}`,
          details: { error, email }
        };
      }

      if (data) {
        return {
          component: 'Database',
          test: 'Superadmin Detection',
          status: 'PASS',
          message: `✅ Superadmin found for ${email}`,
          details: { data, email }
        };
      } else {
        return {
          component: 'Database',
          test: 'Superadmin Detection',
          status: 'FAIL',
          message: `❌ No superadmin record found for ${email}`,
          details: { email }
        };
      }
    } catch (error) {
      return {
        component: 'Database',
        test: 'Superadmin Detection',
        status: 'FAIL',
        message: `Exception during superadmin check: ${error}`,
        details: { error, email }
      };
    }
  }

  // Test employee data access
  async testEmployeeDataAccess(email: string = 'alhk10@gmail.com'): Promise<SystemTestResult> {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('id, name, email')
        .eq('email', email)
        .maybeSingle();

      if (error) {
        return {
          component: 'Database',
          test: 'Employee Data Access',
          status: 'FAIL',
          message: `Database error: ${error.message}`,
          details: { error, email }
        };
      }

      if (data) {
        return {
          component: 'Database',
          test: 'Employee Data Access',
          status: 'PASS',
          message: `✅ Employee record found for ${email}`,
          details: { data, email }
        };
      } else {
        return {
          component: 'Database',
          test: 'Employee Data Access',
          status: 'WARNING',
          message: `⚠️ No employee record found for ${email}`,
          details: { email }
        };
      }
    } catch (error) {
      return {
        component: 'Database',
        test: 'Employee Data Access',
        status: 'FAIL',
        message: `Exception during employee lookup: ${error}`,
        details: { error, email }
      };
    }
  }

  // Test RLS policies
  async testRLSPolicies(): Promise<SystemTestResult[]> {
    const results: SystemTestResult[] = [];
    
    try {
      // Test basic read access to key tables
      const tables = [
        'superadmin_users',
        'employees', 
        'admin_access',
        'employee_page_access'
      ];

      for (const table of tables) {
        try {
          const { error } = await supabase
            .from(table as any)
            .select('*')
            .limit(1);

          if (error) {
            results.push({
              component: 'RLS Policies',
              test: `${table} Access`,
              status: 'FAIL',
              message: `❌ RLS policy blocking access: ${error.message}`,
              details: { table, error }
            });
          } else {
            results.push({
              component: 'RLS Policies',
              test: `${table} Access`,
              status: 'PASS',
              message: `✅ RLS policy allows proper access`,
              details: { table }
            });
          }
        } catch (error) {
          results.push({
            component: 'RLS Policies',
            test: `${table} Access`,
            status: 'FAIL',
            message: `Exception testing ${table}: ${error}`,
            details: { table, error }
          });
        }
      }
    } catch (error) {
      results.push({
        component: 'RLS Policies',
        test: 'General RLS Test',
        status: 'FAIL',
        message: `RLS testing failed: ${error}`,
        details: { error }
      });
    }

    return results;
  }

  // Run all system tests
  async runAllTests(testEmail: string = 'alhk10@gmail.com'): Promise<SystemTestResult[]> {
    console.log('🧪 System Test Validator: Starting comprehensive system tests...');
    
    const results: SystemTestResult[] = [];

    // Test 1: Superladmin Detection
    const superladminTest = await this.testSuperadminDetection(testEmail);
    results.push(superladminTest);

    // Test 2: Employee Data Access  
    const employeeTest = await this.testEmployeeDataAccess(testEmail);
    results.push(employeeTest);

    // Test 3: RLS Policies
    const rlsTests = await this.testRLSPolicies();
    results.push(...rlsTests);

    // Log summary
    const passed = results.filter(r => r.status === 'PASS').length;
    const failed = results.filter(r => r.status === 'FAIL').length;
    const warnings = results.filter(r => r.status === 'WARNING').length;

    console.log(`🧪 System Test Summary: ${passed} passed, ${failed} failed, ${warnings} warnings`);
    
    results.forEach(result => {
      const emoji = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️';
      console.log(`${emoji} ${result.component} - ${result.test}: ${result.message}`);
    });

    return results;
  }
}

// Global instance for easy testing
export const systemValidator = new SystemTestValidator();