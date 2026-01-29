import { useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import { formatPeriodForAPI } from '@/utils/periodUtils';
import type { PayrollState, FullTimeEmployee, CasualEmployee } from '@/types/payroll';
import { withSessionRefresh } from '@/services/sessionRefreshService';
import { getSavedPayrollForPeriod, type SavedPayrollEmployee } from '@/services/payrollService';

export interface HistoricalPayrollResult {
  isHistorical: boolean;
  processedAt?: string;
  fullTimeEmployees: FullTimeEmployee[];
  casualEmployees: CasualEmployee[];
  employeeAllowances: { [key: string]: any[] };
  employeeDeductions: { [key: string]: any[] };
}

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

    return withSessionRefresh(async () => {
      const formattedPeriod = formatPeriodForAPI(payrollState.currentPeriod);
      const [year, month] = formattedPeriod.split('-').map(Number);

      // Save full-time employees with complete allowances/deductions arrays
      for (const employee of payrollState.fullTimeEmployees) {
        const { data: existing } = await supabase
          .from('payroll_records')
          .select('id')
          .eq('employee_id', employee.employeeId)
          .eq('year', year)
          .eq('month', month.toString().padStart(2, '0'))
          .maybeSingle();

        // Extract allowances and deductions arrays for historical preservation
        const allowancesArray = employee.allowancesArray?.map(a => ({ 
          name: a.name, 
          amount: Number(a.amount) 
        })) || [];
        const deductionsArray = employee.deductions?.map(d => ({ 
          name: d.name, 
          amount: Number(d.amount) 
        })) || [];
        const totalAllowances = allowancesArray.reduce((sum, a) => sum + a.amount, 0);
        const totalDeductions = deductionsArray.reduce((sum, d) => sum + d.amount, 0);

        const payrollData = {
          employee_id: employee.employeeId,
          year,
          month: month.toString().padStart(2, '0'),
          payroll_data: {
            name: employee.name,
            type: 'Full-Time',
            baseSalary: employee.baseSalary,
            // Save individual items as arrays for historical data
            allowances: allowancesArray,
            deductions: deductionsArray,
            totalAllowances,
            totalDeductions,
            cpfEmployee: employee.cpfEmployee,
            cpfEmployer: employee.cpfEmployer,
            grossPay: employee.grossPay,
            netPay: employee.netPay,
            approvedClaims: employee.claims || 0,
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

      // Save casual employees with complete data including slot breakdown
      for (const employee of payrollState.casualEmployees) {
        const { data: existing } = await supabase
          .from('payroll_records')
          .select('id')
          .eq('employee_id', employee.employeeId)
          .eq('year', year)
          .eq('month', month.toString().padStart(2, '0'))
          .maybeSingle();

        // Extract allowances and deductions for historical preservation
        const allowancesArray = Array.isArray(employee.allowances) 
          ? employee.allowances.map((a: any) => ({ name: a.name, amount: Number(a.amount) }))
          : [];
        const deductionsArray = Array.isArray(employee.deductions)
          ? employee.deductions.map((d: any) => ({ name: d.name, amount: Number(d.amount) }))
          : [];
        const totalAllowances = allowancesArray.reduce((sum, a) => sum + a.amount, 0);
        const totalDeductions = deductionsArray.reduce((sum, d) => sum + d.amount, 0);

        const payrollData = {
          employee_id: employee.employeeId,
          year,
          month: month.toString().padStart(2, '0'),
          payroll_data: {
            name: employee.name,
            type: 'Casual',
            baseSalary: employee.baseSalary || 0,
            hourlyRate: employee.hourlyRate,
            hoursWorked: employee.hoursWorked,
            daysWorked: employee.daysWorked,
            // Save individual items as arrays for historical data
            allowances: allowancesArray,
            deductions: deductionsArray,
            totalAllowances,
            totalDeductions,
            totalPay: employee.totalPay,
            employeeCPF: employee.employeeCPF,
            employerCPF: employee.employerCPF,
            grossPay: employee.grossPay,
            netPay: employee.netPay,
            approvedClaims: employee.claims || 0,
            slotBookingPay: employee.slotBookingPay,
            slotBreakdown: employee.slotBookingMetadata?.breakdown || [],
            calculationMethod: employee.slotBookingMetadata?.calculationMethod || 'legacy_rates',
            slotBookingMetadata: employee.slotBookingMetadata,
            warnings: employee.warnings,
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

      logger.info('Payroll saved successfully with historical data');
    });
  }, [payrollState]);

  // Load historical payroll data - returns saved data without recalculating
  const loadHistoricalPayroll = useCallback(async (period: string): Promise<HistoricalPayrollResult> => {
    logger.info('Loading historical payroll data', { period });

    try {
      const savedData = await getSavedPayrollForPeriod(period);

      if (!savedData.hasData) {
        logger.debug('No historical data found', { period });
        return {
          isHistorical: false,
          fullTimeEmployees: [],
          casualEmployees: [],
          employeeAllowances: {},
          employeeDeductions: {},
        };
      }

      // Convert saved data to payroll state format
      const fullTimeEmployees: FullTimeEmployee[] = savedData.fullTimeEmployees.map((emp: SavedPayrollEmployee) => ({
        id: uuidv4(),
        name: emp.name,
        employeeId: emp.employeeId,
        baseSalary: emp.baseSalary,
        allowances: emp.totalAllowances,
        cpfContribution: emp.employeeCPF + emp.employerCPF,
        cpfEmployee: emp.employeeCPF,
        cpfEmployer: emp.employerCPF,
        grossPay: emp.grossPay,
        netPay: emp.netPay,
        claims: emp.approvedClaims,
        allowancesArray: emp.allowances.map((a, idx) => ({
          id: `hist-allow-${idx}`,
          employeeId: emp.employeeId,
          name: a.name,
          amount: a.amount,
          type: 'Fixed' as const,
        })),
        deductions: emp.deductions.map((d, idx) => ({
          id: `hist-deduct-${idx}`,
          employeeId: emp.employeeId,
          name: d.name,
          amount: d.amount,
          type: 'Fixed' as const,
        })),
      }));

      const casualEmployees: CasualEmployee[] = savedData.casualEmployees.map((emp: SavedPayrollEmployee) => ({
        id: uuidv4(),
        name: emp.name,
        employeeId: emp.employeeId,
        baseSalary: emp.baseSalary || 0,
        hourlyRate: emp.hourlyRate || 0,
        hoursWorked: emp.hoursWorked || 0,
        daysWorked: emp.daysWorked || 0,
        totalPay: emp.netPay,
        employeeCPF: emp.employeeCPF,
        employerCPF: emp.employerCPF,
        grossPay: emp.grossPay,
        netPay: emp.netPay,
        cpfEmployee: emp.employeeCPF,
        cpfEmployer: emp.employerCPF,
        cpf: emp.employeeCPF + emp.employerCPF,
        total: emp.netPay,
        claims: emp.approvedClaims,
        slotBookingPay: emp.slotBookingPay || 0,
        slotBookingMetadata: {
          totalSlots: emp.slotBreakdown?.length || 0,
          hasBookings: (emp.slotBreakdown?.length || 0) > 0,
          breakdown: emp.slotBreakdown || [],
          calculationMethod: emp.calculationMethod || 'legacy_rates',
        },
        allowances: emp.allowances,
        deductions: emp.deductions,
        warnings: [],
      }));

      // Build allowances/deductions maps from historical data
      const employeeAllowances: { [key: string]: any[] } = {};
      const employeeDeductions: { [key: string]: any[] } = {};

      [...savedData.fullTimeEmployees, ...savedData.casualEmployees].forEach((emp: SavedPayrollEmployee) => {
        employeeAllowances[emp.employeeId] = emp.allowances.map((a, idx) => ({
          id: idx,
          employee_id: emp.employeeId,
          name: a.name,
          amount: a.amount,
          type: 'Fixed',
        }));
        employeeDeductions[emp.employeeId] = emp.deductions.map((d, idx) => ({
          id: idx,
          employee_id: emp.employeeId,
          name: d.name,
          amount: d.amount,
          type: 'Fixed',
        }));
      });

      logger.info('Historical payroll loaded successfully', {
        fullTimeCount: fullTimeEmployees.length,
        casualCount: casualEmployees.length,
        processedAt: savedData.processedAt,
      });

      return {
        isHistorical: true,
        processedAt: savedData.processedAt,
        fullTimeEmployees,
        casualEmployees,
        employeeAllowances,
        employeeDeductions,
      };
    } catch (error) {
      logger.error('Error loading historical payroll', error);
      return {
        isHistorical: false,
        fullTimeEmployees: [],
        casualEmployees: [],
        employeeAllowances: {},
        employeeDeductions: {},
      };
    }
  }, []);

  const loadPayrollFromSupabase = useCallback(async () => {
    const formattedPeriod = formatPeriodForAPI(payrollState.currentPeriod);
    const [year, month] = formattedPeriod.split('-').map(Number);
    const isNovember2025OrLater = (year > 2025) || (year === 2025 && month >= 11);

    // For November 2025+, defer to the loadHistoricalPayroll function
    // This function is now primarily for legacy periods
    if (isNovember2025OrLater) {
      logger.debug('November 2025+ detected - use loadHistoricalPayroll instead', { period: payrollState.currentPeriod });
      return;
    }

    logger.info('Loading payroll from Supabase (legacy mode)', { period: payrollState.currentPeriod });

    setPayrollState(prev => ({ ...prev, isLoading: true }));

    try {
      await withSessionRefresh(async () => {
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
              allowances: data.totalAllowances || data.allowances,
              cpfEmployee: data.cpfEmployee,
              cpfEmployer: data.cpfEmployer,
              grossPay: data.grossPay,
              netPay: data.netPay,
              cpfContribution: data.cpfEmployee + data.cpfEmployer,
              claims: data.approvedClaims || data.claims,
              // Include saved arrays for historical viewing
              allowancesArray: data.allowances || [],
              deductions: data.deductions || [],
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
              totalPay: data.totalPay || data.netPay,
              employeeCPF: data.employeeCPF,
              employerCPF: data.employerCPF,
              grossPay: data.grossPay,
              netPay: data.netPay,
              cpfEmployee: data.employeeCPF,
              cpfEmployer: data.employerCPF,
              cpf: data.employeeCPF + data.employerCPF,
              total: data.netPay,
              claims: data.approvedClaims || data.claims,
              slotBookingPay: data.slotBookingPay,
              slotBookingMetadata: data.slotBookingMetadata || {
                totalSlots: data.slotBreakdown?.length || 0,
                hasBookings: (data.slotBreakdown?.length || 0) > 0,
                breakdown: data.slotBreakdown || [],
                calculationMethod: data.calculationMethod || 'legacy_rates',
              },
              allowances: data.allowances || [],
              deductions: data.deductions || [],
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
      });
    } catch (error) {
      logger.error('Failed to load payroll', error);
      setPayrollState(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  }, [payrollState.currentPeriod, setPayrollState]);

  return { savePayrollToSupabase, loadPayrollFromSupabase, loadHistoricalPayroll };
};