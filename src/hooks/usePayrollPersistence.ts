import { useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import { formatPeriodForAPI } from '@/utils/periodUtils';
import type { PayrollState, FullTimeEmployee, CasualEmployee } from '@/types/payroll';

export const usePayrollPersistence = (
  payrollState: PayrollState,
  setPayrollState: React.Dispatch<React.SetStateAction<PayrollState>>
) => {
  const savePayrollToSupabase = useCallback(async () => {
    logger.info('Saving payroll to Supabase', { 
      period: payrollState.currentPeriod,
      fullTimeCount: payrollState.fullTimeEmployees.length,
      casualCount: payrollState.casualEmployees.length
    });

    const formattedPeriod = formatPeriodForAPI(payrollState.currentPeriod);
    const [year, month] = formattedPeriod.split('-').map(Number);

    try {
      // Save full-time employees
      for (const employee of payrollState.fullTimeEmployees) {
        const { data: existing } = await supabase
          .from('payroll_records')
          .select('id')
          .eq('employee_id', employee.employeeId)
          .eq('year', year)
          .eq('month', month.toString().padStart(2, '0'))
          .maybeSingle();

        const payrollData = {
          employee_id: employee.employeeId,
          year,
          month: month.toString().padStart(2, '0'),
          payroll_data: {
            name: employee.name,
            baseSalary: employee.baseSalary,
            allowances: employee.allowances,
            cpfEmployee: employee.cpfEmployee,
            cpfEmployer: employee.cpfEmployer,
            grossPay: employee.grossPay,
            netPay: employee.netPay,
            claims: employee.claims || 0,
            type: 'Full-Time'
          }
        };

        if (existing) {
          await supabase
            .from('payroll_records')
            .update(payrollData)
            .eq('id', existing.id);
        } else {
          await supabase
            .from('payroll_records')
            .insert([{ ...payrollData, id: uuidv4() }]);
        }
      }

      // Save casual employees
      for (const employee of payrollState.casualEmployees) {
        const { data: existing } = await supabase
          .from('payroll_records')
          .select('id')
          .eq('employee_id', employee.employeeId)
          .eq('year', year)
          .eq('month', month.toString().padStart(2, '0'))
          .maybeSingle();

        const payrollData = {
          employee_id: employee.employeeId,
          year,
          month: month.toString().padStart(2, '0'),
          payroll_data: {
            name: employee.name,
            hourlyRate: employee.hourlyRate,
            hoursWorked: employee.hoursWorked,
            daysWorked: employee.daysWorked,
            baseSalary: employee.baseSalary,
            totalPay: employee.totalPay,
            employeeCPF: employee.employeeCPF,
            employerCPF: employee.employerCPF,
            grossPay: employee.grossPay,
            netPay: employee.netPay,
            claims: employee.claims || 0,
            slotBookingPay: employee.slotBookingPay,
            slotBookingMetadata: employee.slotBookingMetadata,
            warnings: employee.warnings,
            type: 'Casual'
          }
        };

        if (existing) {
          await supabase
            .from('payroll_records')
            .update(payrollData)
            .eq('id', existing.id);
        } else {
          await supabase
            .from('payroll_records')
            .insert([{ ...payrollData, id: uuidv4() }]);
        }
      }

      logger.info('Payroll saved successfully');
    } catch (error) {
      logger.error('Failed to save payroll', error);
      throw error;
    }
  }, [payrollState]);

  const loadPayrollFromSupabase = useCallback(async () => {
    const formattedPeriod = formatPeriodForAPI(payrollState.currentPeriod);
    const [year, month] = formattedPeriod.split('-').map(Number);
    const isNovember2025OrLater = (year > 2025) || (year === 2025 && month >= 11);

    if (isNovember2025OrLater) {
      logger.debug('Skipping auto-load for November 2025+', { period: payrollState.currentPeriod });
      return;
    }

    logger.info('Loading payroll from Supabase', { period: payrollState.currentPeriod });

    try {
      setPayrollState(prev => ({ ...prev, isLoading: true }));

      const { data: records, error } = await supabase
        .from('payroll_records')
        .select('*')
        .eq('year', year)
        .eq('month', month.toString().padStart(2, '0'));

      if (error) throw error;

      const fullTimeEmployees: FullTimeEmployee[] = [];
      const casualEmployees: CasualEmployee[] = [];

      records?.forEach(record => {
        const data = record.payroll_data as any;
        
        if (data.type === 'Full-Time') {
          fullTimeEmployees.push({
            id: record.id,
            name: data.name,
            employeeId: record.employee_id!,
            baseSalary: data.baseSalary,
            allowances: data.allowances,
            cpfEmployee: data.cpfEmployee,
            cpfEmployer: data.cpfEmployer,
            grossPay: data.grossPay,
            netPay: data.netPay,
            cpfContribution: data.cpfEmployee + data.cpfEmployer,
            claims: data.claims
          });
        } else if (data.type === 'Casual') {
          casualEmployees.push({
            id: record.id,
            name: data.name,
            employeeId: record.employee_id!,
            hourlyRate: data.hourlyRate || 0,
            hoursWorked: data.hoursWorked || 0,
            daysWorked: data.daysWorked || 0,
            baseSalary: data.baseSalary,
            totalPay: data.totalPay,
            employeeCPF: data.employeeCPF,
            employerCPF: data.employerCPF,
            grossPay: data.grossPay,
            netPay: data.netPay,
            cpfEmployee: data.employeeCPF,
            cpfEmployer: data.employerCPF,
            cpf: data.employeeCPF + data.employerCPF,
            total: data.netPay,
            claims: data.claims,
            slotBookingPay: data.slotBookingPay,
            slotBookingMetadata: data.slotBookingMetadata,
            warnings: data.warnings
          });
        }
      });

      setPayrollState(prev => ({
        ...prev,
        fullTimeEmployees,
        casualEmployees,
        isLoading: false
      }));

      logger.info('Payroll loaded successfully', {
        fullTimeCount: fullTimeEmployees.length,
        casualCount: casualEmployees.length
      });
    } catch (error) {
      logger.error('Failed to load payroll', error);
      setPayrollState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  }, [payrollState.currentPeriod, setPayrollState]);

  return { savePayrollToSupabase, loadPayrollFromSupabase };
};
