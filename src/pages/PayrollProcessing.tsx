import React, { useState, useEffect } from 'react';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DollarSign, ArrowLeft, CreditCard, FileText, Users, Calculator, Edit, Trash2, UserPlus, Save, ArrowRight, RefreshCw, History, AlertCircle, Download } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { useNavigate } from 'react-router-dom';
import { usePayroll } from '@/contexts/PayrollContext';
import { getEmployees, getEmployeeById, getEmployeesForPayroll } from '@/services/employeeService';
import { getEmployeePayrollDataOptimized } from '@/services/payrollOptimizationService';
import { getEmployeeClaims, type Claim } from '@/services/claimsService';
import { MISSING_EMPLOYEES_WORKAROUND, getAttendanceDataForMissingEmployees, shouldApplyWorkaround } from '@/utils/payrollWorkarounds';
import { supabase } from '@/integrations/supabase/client';
import PayrollPeriodSelector from '@/components/payroll/PayrollPeriodSelector';
import EditSalaryDialog from '@/components/payroll/EditSalaryDialog';
import EditAllowancesDialog from '@/components/payroll/EditAllowancesDialog';
import EditDeductionsDialog from '@/components/payroll/EditDeductionsDialog';
import { SlotBreakdownDialog } from '@/components/payroll/SlotBreakdownDialog';
import { getSlotBookingPayForPeriod } from '@/services/slotBookingPayrollService';
import { format } from 'date-fns';
import { calculateCPF, calculateAge } from '@/utils/cpfCalculations';
import { calculateFullTimePayroll, calculateCasualPayroll } from '@/utils/payrollCalculations';
import { getPayrollStatus, finalizePayroll, updatePayrollLockStatus, getPayrollRecordsForPeriod, updateSalaryPaymentStatus, updateCpfPaymentStatus, deletePayrollRecord, getSavedPayrollForPeriod } from '@/services/payrollService';
import { supabase as authService } from '@/integrations/supabase/client';
import { forceRefreshSession } from '@/services/sessionRefreshService';
import { usePayrollPersistence, type HistoricalPayrollResult } from '@/hooks/usePayrollPersistence';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { formatDate } from '@/utils/dateFormat';

// Helper to parse "January 2026" into { year: 2026, monthName: 'January', monthIndex: 1 }
const parsePeriod = (period: string) => {
  const [monthName, yearStr] = period.split(' ');
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const monthIndex = monthNames.indexOf(monthName) + 1;
  return { year: parseInt(yearStr), monthName, monthIndex, formatted: `${yearStr}-${monthIndex.toString().padStart(2, '0')}` };
};

// Load monthly overrides from payroll_monthly_overrides table
const loadMonthlyOverrides = async (employeeIds: string[], year: number, month: string) => {
  const { data } = await supabase
    .from('payroll_monthly_overrides')
    .select('*')
    .in('employee_id', employeeIds)
    .eq('year', year)
    .eq('month', month);
  
  const overridesMap: { [empId: string]: any } = {};
  (data || []).forEach((o: any) => {
    overridesMap[o.employee_id] = o;
  });
  return overridesMap;
};

// Upsert a monthly override for a specific employee
const upsertMonthlyOverride = async (
  employeeId: string, year: number, month: string,
  updates: { base_salary?: number; hourly_rate?: number; allowances?: any[]; deductions?: any[] }
) => {
  // First try to get existing
  const { data: existing } = await supabase
    .from('payroll_monthly_overrides')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('year', year)
    .eq('month', month)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('payroll_monthly_overrides')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', existing.id);
    return { error };
  } else {
    const { error } = await supabase
      .from('payroll_monthly_overrides')
      .insert({ employee_id: employeeId, year, month, ...updates });
    return { error };
  }
};


const PayrollProcessing = () => {
  const navigate = useNavigate();
  const { 
    payrollState, 
    setPayrollStatus,
    savePayrollToSupabase,
    autoAddCasualEmployeesWithAttendance,
    addCasualEmployee,
    removeCasualEmployee,
    addEmployeesToPayroll,
    setCurrentPeriod,
    refreshAvailableEmployees,
    removeEmployeeFromPayroll
  } = usePayroll();


  
  const [currentStep, setCurrentStep] = useState<'processing' | 'payment' | 'cpf'>('processing');
  const [selectedPeriod, setSelectedPeriod] = useState(format(new Date(), 'MMMM yyyy'));
  const [employeeClaims, setEmployeeClaims] = useState<{[key: string]: Claim[]}>({});
  const [allEmployees, setAllEmployees] = useState<any[]>([]);
  const [employeeAllowances, setEmployeeAllowances] = useState<{[key: string]: any[]}>({});
  const [employeeDeductions, setEmployeeDeductions] = useState<{[key: string]: any[]}>({});
  const [payrollData, setPayrollData] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [isPeriodLocked, setIsPeriodLocked] = useState(false);
  const [periodStatus, setPeriodStatus] = useState<{ status: string; finalizedBy?: string; finalizedAt?: string } | null>(null);
  const [paidStatus, setPaidStatus] = useState<{[key: string]: boolean}>({});
  const [cpfPaidStatus, setCpfPaidStatus] = useState<{[key: string]: boolean}>({});
  
  // Historical data state
  const [isUsingHistoricalData, setIsUsingHistoricalData] = useState(false);
  const [historicalProcessedAt, setHistoricalProcessedAt] = useState<string | null>(null);

  // Helper function to force recalculate payroll
  const forceRecalculatePayroll = async (period: string = selectedPeriod, showToast: boolean = true) => {
    setLoading(true);
    try {
      // Force refresh session before any operations to handle expired JWT
      await forceRefreshSession();
      
      const formatPeriodForAPILocal = (p: string): string => {
        const [monthName, year] = p.split(' ');
        const monthNames = [
          'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'
        ];
        const monthIndex = monthNames.indexOf(monthName) + 1;
        return `${year}-${monthIndex.toString().padStart(2, '0')}`;
      };
      
      const formattedPeriod = formatPeriodForAPILocal(period);
      console.log('[ForceRecalculate] Starting for period:', period, formattedPeriod);
      
      // Delete cached payroll record using the service (which handles session refresh)
      try {
        await deletePayrollRecord(`PERIOD_${formattedPeriod}`);
      } catch (deleteError) {
        // Ignore if record doesn't exist
        console.log('[ForceRecalculate] Note: Could not delete cached record (may not exist):', deleteError);
      }
      
      // Clear current payroll state
      setCurrentPeriod(period);
      
      // Wait for state to clear
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Refetch all employees
      const employees = await getEmployeesForPayroll();
      setAllEmployees(employees);
      
      // Load optimized payroll data
      const employeeIds = employees.map(emp => emp.id);
      const optimizedPayrollData = await getEmployeePayrollDataOptimized(employeeIds, period);
      setPayrollData(optimizedPayrollData);
      
      // Load per-month overrides and merge
      const { year: pYear, formatted: pMonth } = parsePeriod(period);
      const overrides = await loadMonthlyOverrides(employeeIds, pYear, pMonth);
      
      const mergedAllowances = { ...(optimizedPayrollData?.allowances || {}) };
      const mergedDeductions = { ...(optimizedPayrollData?.deductions || {}) };
      
      Object.entries(overrides).forEach(([empId, override]) => {
        // Honour the presence of an override row: an empty array explicitly clears
        // that month's allowances/deductions and must NOT silently revert to base.
        if (Array.isArray(override.allowances)) {
          mergedAllowances[empId] = (override.allowances as any[]).map((a: any, idx: number) => ({
            id: idx, employee_id: empId, name: a.name, amount: a.amount, type: a.type || 'Fixed'
          }));
        }
        if (Array.isArray(override.deductions)) {
          mergedDeductions[empId] = (override.deductions as any[]).map((d: any, idx: number) => ({
            id: idx, employee_id: empId, name: d.name, amount: d.amount, type: d.type || 'Fixed'
          }));
        }
        const empIdx = employees.findIndex(e => e.id === empId);
        if (empIdx >= 0) {
          if (override.base_salary != null) employees[empIdx] = { ...employees[empIdx], baseSalary: Number(override.base_salary) };
          if (override.hourly_rate != null) employees[empIdx] = { ...employees[empIdx], hourlyRate: Number(override.hourly_rate) };
          // Sync override allowances/deductions onto employee object so calculators see the same source of truth
          if (Array.isArray(override.allowances)) {
            employees[empIdx] = { ...employees[empIdx], allowances: mergedAllowances[empId] as any };
          }
          if (Array.isArray(override.deductions)) {
            employees[empIdx] = { ...employees[empIdx], deductions: mergedDeductions[empId] as any };
          }
        }
      });
      
      setAllEmployees([...employees]);
      setEmployeeAllowances(mergedAllowances);
      setEmployeeDeductions(mergedDeductions);
      
      if (optimizedPayrollData) {
        optimizedPayrollData.allowances = mergedAllowances;
        optimizedPayrollData.deductions = mergedDeductions;
      }
      
      // Refresh available employees in context
      await refreshAvailableEmployees();
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Add all employees to payroll with the correct period
      console.log('[ForceRecalculate] Adding employees with period:', period);
      await addEmployeesToPayroll(employeeIds, optimizedPayrollData, period, employees);
      
      if (showToast) {
        toast.success('Payroll recalculated successfully');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to recalculate payroll');
    } finally {
      setLoading(false);
    }
  };

  // Handle period change with auto-recalculation
  const handlePeriodChange = async (newPeriod: string) => {
    setSelectedPeriod(newPeriod);
    await forceRecalculatePayroll(newPeriod, false);
  };

  // Edit dialog states
  const [editSalaryDialog, setEditSalaryDialog] = useState<{
    isOpen: boolean;
    employeeId: string;
    employeeName: string;
    currentSalary: number;
    employeeType: 'Full-Time' | 'Casual';
    paymentType: 'Monthly' | 'Hourly' | 'Daily';
  }>({
    isOpen: false,
    employeeId: '',
    employeeName: '',
    currentSalary: 0,
    employeeType: 'Full-Time',
    paymentType: 'Monthly'
  });

  const [editAllowancesDialog, setEditAllowancesDialog] = useState<{
    isOpen: boolean;
    employeeId: string;
    employeeName: string;
    allowances: any[];
  }>({
    isOpen: false,
    employeeId: '',
    employeeName: '',
    allowances: []
  });

  const [editDeductionsDialog, setEditDeductionsDialog] = useState<{
    isOpen: boolean;
    employeeId: string;
    employeeName: string;
    deductions: any[];
  }>({
    isOpen: false,
    employeeId: '',
    employeeName: '',
    deductions: []
  });

  // Slot breakdown dialog state
  const [slotBreakdownOpen, setSlotBreakdownOpen] = useState(false);
  const [slotBreakdownData, setSlotBreakdownData] = useState<{
    employeeId: string;
    employeeName: string;
    breakdown: Array<{ 
      date: string; 
      branchName: string; 
      pay: number; 
      hasAttendance: boolean;
      checkIn?: string | null;
      checkOut?: string | null;
      hoursWorked?: number;
      attendanceId?: number | null;
      fullSlotRate?: number;
    }>;
    totalPay: number;
    totalSlots: number;
    fullSlotRate?: number;
    rateBreakdown?: Array<{ item: string; amount: number }>;
    milestoneBonus?: number;
    milestoneBonusThreshold?: number;
  } | null>(null);

  const [payeeDialogEmployeeId, setPayeeDialogEmployeeId] = useState<string | null>(null);
  const payeeDialogEmployee = payeeDialogEmployeeId
    ? allEmployees.find((e) => e.id === payeeDialogEmployeeId)
    : null;

  // Load all employee data with allowances and deductions - OPTIMIZED
  useEffect(() => {
    const loadAllEmployeeData = async () => {
      console.log('[PayrollProcessing] 🔄 LOADING PAYROLL DATA - START');
      console.log('[PayrollProcessing] Selected Period:', selectedPeriod);
      
      try {
        setLoading(true);
        setIsUsingHistoricalData(false);
        setHistoricalProcessedAt(null);
        
        // Force refresh session before any operations to handle expired JWT
        await forceRefreshSession();
        
        const formatPeriodForAPI = (period: string): string => {
          const [monthName, year] = period.split(' ');
          const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
          ];
          const monthIndex = monthNames.indexOf(monthName) + 1;
          return `${year}-${monthIndex.toString().padStart(2, '0')}`;
        };
        
        const formattedPeriod = formatPeriodForAPI(selectedPeriod);
        const [year, month] = formattedPeriod.split('-').map(Number);
        const isNovember2025OrLater = (year > 2025) || (year === 2025 && month >= 11);
        
        // STEP 1: Check for saved historical payroll data first
        const savedPayroll = await getSavedPayrollForPeriod(selectedPeriod);
        
        if (savedPayroll.hasData && savedPayroll.fullTimeEmployees.length + savedPayroll.casualEmployees.length > 0) {
          console.log('\n╔══════════════════════════════════════════════════════════╗');
          console.log('║  📋 HISTORICAL PAYROLL DATA FOUND                        ║');
          console.log('╠══════════════════════════════════════════════════════════╣');
          console.log('║  Period:', selectedPeriod.padEnd(44), '║');
          console.log('║  Full-Time:', String(savedPayroll.fullTimeEmployees.length).padEnd(42), '║');
          console.log('║  Casual:', String(savedPayroll.casualEmployees.length).padEnd(45), '║');
          console.log('║  Processed:', (savedPayroll.processedAt || 'Unknown').substring(0, 19).padEnd(41), '║');
          console.log('╚══════════════════════════════════════════════════════════╝\n');
          
          // Use saved historical data - don't recalculate!
          setIsUsingHistoricalData(true);
          setHistoricalProcessedAt(savedPayroll.processedAt || null);
          
          // Build allowances/deductions maps from historical data
          const historicalAllowances: {[key: string]: any[]} = {};
          const historicalDeductions: {[key: string]: any[]} = {};
          
          [...savedPayroll.fullTimeEmployees, ...savedPayroll.casualEmployees].forEach(emp => {
            historicalAllowances[emp.employeeId] = emp.allowances.map((a, idx) => ({
              id: idx,
              employee_id: emp.employeeId,
              name: a.name,
              amount: a.amount,
              type: 'Fixed',
            }));
            historicalDeductions[emp.employeeId] = emp.deductions.map((d, idx) => ({
              id: idx,
              employee_id: emp.employeeId,
              name: d.name,
              amount: d.amount,
              type: 'Fixed',
            }));
          });
          
          setEmployeeAllowances(historicalAllowances);
          setEmployeeDeductions(historicalDeductions);
          
          // Still need employee base info for display purposes
          const employees = await getEmployeesForPayroll();
          setAllEmployees(employees);
          
          // Load period status and lock info
          const status = await getPayrollStatus(formattedPeriod);
          setPeriodStatus(status);
          setIsPeriodLocked(status?.status === 'finalized' || false);
          
          // Load existing payment status from Supabase
          const paymentRecords = await getPayrollRecordsForPeriod(selectedPeriod);
          const salaryStatus: {[key: string]: boolean} = {};
          const cpfStatus: {[key: string]: boolean} = {};
          paymentRecords.forEach(record => {
            if (record.employeeId) {
              salaryStatus[record.employeeId] = record.salaryPaid;
              cpfStatus[record.employeeId] = record.cpfPaid;
            }
          });
          setPaidStatus(salaryStatus);
          setCpfPaidStatus(cpfStatus);
          
          // Set payroll state from historical data
          setCurrentPeriod(selectedPeriod);
          
          // Update payroll context with historical values
          // Convert saved data to the format expected by payrollState
          const fullTimeFromSaved = savedPayroll.fullTimeEmployees.map(emp => ({
            id: emp.employeeId,
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
              id: `hist-${idx}`,
              employeeId: emp.employeeId,
              name: a.name,
              amount: a.amount,
              type: 'Fixed' as const,
            })),
            deductions: emp.deductions.map((d, idx) => ({
              id: `hist-${idx}`,
              employeeId: emp.employeeId,
              name: d.name,
              amount: d.amount,
              type: 'Fixed' as const,
            })),
          }));

          const casualFromSaved = savedPayroll.casualEmployees.map(emp => ({
            id: emp.employeeId,
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
          
          // Directly update payroll state with historical data via addEmployeesToPayroll bypass
          // For now, we'll trigger the normal flow but skip the force delete
          await refreshAvailableEmployees();
          
          // Wait and then add employees to payroll using historical values
          await new Promise(resolve => setTimeout(resolve, 200));
          
          const employeeIds = employees.map(emp => emp.id);
          const optimizedPayrollData = await getEmployeePayrollDataOptimized(employeeIds, selectedPeriod);
          
          // Override with historical values
          if (optimizedPayrollData) {
            Object.keys(historicalAllowances).forEach(empId => {
              optimizedPayrollData.allowances[empId] = historicalAllowances[empId];
            });
            Object.keys(historicalDeductions).forEach(empId => {
              optimizedPayrollData.deductions[empId] = historicalDeductions[empId];
            });
          }
          
          setPayrollData(optimizedPayrollData);
          setEmployeeAllowances(optimizedPayrollData?.allowances || {});
          setEmployeeDeductions(optimizedPayrollData?.deductions || {});
          
          // Convert claims data to expected format (same as non-historical path)
          const claimsData: {[key: string]: Claim[]} = {};
          Object.entries(optimizedPayrollData?.claims || {}).forEach(([empId, claims]) => {
            claimsData[empId] = claims.map(claim => ({
              id: claim.id,
              employeeId: claim.employee_id,
              employee: claim.employee_id,
              type: claim.type,
              amount: claim.amount,
              description: claim.description,
              status: claim.status,
              date: claim.submitted_date,
              submittedDate: claim.submitted_date,
              reviewedDate: claim.reviewed_date,
              reviewedBy: claim.reviewed_by,
              receiptUrl: claim.receipt_url
            }));
          });
          setEmployeeClaims(claimsData);
          
          await addEmployeesToPayroll(employeeIds, optimizedPayrollData, selectedPeriod, employees);
          
          console.log('[PayrollProcessing] ✅ Historical data loaded successfully');
          setLoading(false);
          return; // Exit early - we've loaded historical data
        }
        
        // STEP 2: No historical data - proceed with normal calculation
        console.log('\n╔══════════════════════════════════════════════════════════╗');
        console.log('║  🔄 NO HISTORICAL DATA - CALCULATING FRESH               ║');
        console.log('╠══════════════════════════════════════════════════════════╣');
        console.log('║  Period:', selectedPeriod.padEnd(44), '║');
        console.log('╚══════════════════════════════════════════════════════════╝\n');
        
        // Clear any existing payroll state
        setCurrentPeriod(selectedPeriod);
        
        // Force wait for state to clear
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Load period status and lock info
        const status = await getPayrollStatus(formattedPeriod);
        setPeriodStatus(status);
        setIsPeriodLocked(status?.status === 'finalized' || false);
        
        // Load existing payment status from Supabase
        const paymentRecords = await getPayrollRecordsForPeriod(selectedPeriod);
        const salaryStatus: {[key: string]: boolean} = {};
        const cpfStatus: {[key: string]: boolean} = {};
        paymentRecords.forEach(record => {
          if (record.employeeId) {
            salaryStatus[record.employeeId] = record.salaryPaid;
            cpfStatus[record.employeeId] = record.cpfPaid;
          }
        });
        setPaidStatus(salaryStatus);
        setCpfPaidStatus(cpfStatus);
        console.log('[PayrollProcessing] 💰 Loaded payment status from Supabase', { salaryStatus, cpfStatus });
        
        // Get all employees with full payroll data
        const employees = await getEmployeesForPayroll();
        setAllEmployees(employees);

        if (employees.length > 0) {
          // Load all payroll data in a single optimized call
          const employeeIds = employees.map(emp => emp.id);
          const optimizedPayrollData = await getEmployeePayrollDataOptimized(employeeIds, selectedPeriod);
          
          if (!optimizedPayrollData) {
            throw new Error('Failed to fetch payroll data - received null/undefined');
          }
          
          setPayrollData(optimizedPayrollData);
          
          // Load per-month overrides and merge with base data
          const { year: periodYear, formatted: periodMonth } = parsePeriod(selectedPeriod);
          const overrides = await loadMonthlyOverrides(employeeIds, periodYear, periodMonth);
          
          const mergedAllowances = { ...(optimizedPayrollData?.allowances || {}) };
          const mergedDeductions = { ...(optimizedPayrollData?.deductions || {}) };
          
          Object.entries(overrides).forEach(([empId, override]) => {
            // Honour the presence of an override row: an empty array explicitly clears
            // that month's allowances/deductions and must NOT silently revert to base.
            if (Array.isArray(override.allowances)) {
              mergedAllowances[empId] = (override.allowances as any[]).map((a: any, idx: number) => ({
                id: idx, employee_id: empId, name: a.name, amount: a.amount, type: a.type || 'Fixed'
              }));
            }
            if (Array.isArray(override.deductions)) {
              mergedDeductions[empId] = (override.deductions as any[]).map((d: any, idx: number) => ({
                id: idx, employee_id: empId, name: d.name, amount: d.amount, type: d.type || 'Fixed'
              }));
            }
            // Apply salary/hourly rate overrides to optimizedPayrollData for calculation
            // Also update allEmployees local state for salary overrides
            setAllEmployees(prev => prev.map(emp => {
              if (emp.id !== empId) return emp;
              const updated = { ...emp };
              if (override.base_salary != null) updated.baseSalary = Number(override.base_salary);
              if (override.hourly_rate != null) updated.hourlyRate = Number(override.hourly_rate);
              return updated;
            }));
            // Also update the employees array used for addEmployeesToPayroll
            const empIdx = employees.findIndex(e => e.id === empId);
            if (empIdx >= 0) {
              if (override.base_salary != null) employees[empIdx] = { ...employees[empIdx], baseSalary: Number(override.base_salary) };
              if (override.hourly_rate != null) employees[empIdx] = { ...employees[empIdx], hourlyRate: Number(override.hourly_rate) };
              if (Array.isArray(override.allowances)) {
                employees[empIdx] = { ...employees[empIdx], allowances: mergedAllowances[empId] as any };
              }
              if (Array.isArray(override.deductions)) {
                employees[empIdx] = { ...employees[empIdx], deductions: mergedDeductions[empId] as any };
              }
            }
          });
          
          setEmployeeAllowances(mergedAllowances);
          setEmployeeDeductions(mergedDeductions);
          
          // Also update optimizedPayrollData allowances/deductions for addEmployeesToPayroll
          optimizedPayrollData.allowances = mergedAllowances;
          optimizedPayrollData.deductions = mergedDeductions;
          
          // Convert claims data to expected format
          const claimsData: {[key: string]: Claim[]} = {};
          Object.entries(optimizedPayrollData?.claims || {}).forEach(([empId, claims]) => {
            claimsData[empId] = claims.map(claim => ({
              id: claim.id,
              employeeId: claim.employee_id,
              employee: claim.employee_id, // Add missing employee field
              type: claim.type,
              amount: claim.amount,
              description: claim.description,
              status: claim.status,
              date: claim.submitted_date, // Add missing date field  
              submittedDate: claim.submitted_date,
              reviewedDate: claim.reviewed_date,
              reviewedBy: claim.reviewed_by,
              receiptUrl: claim.receipt_url
            }));
          });
          setEmployeeClaims(claimsData);
          
          // Force fresh payroll calculation
          
          // CRITICAL: Set period FIRST before adding any employees
          console.log('\n╔══════════════════════════════════════════════════════╗');
          console.log('║  [PayrollProcessing] 📝 SETTING UP PAYROLL          ║');
          console.log('╠══════════════════════════════════════════════════════╣');
          console.log('║  Period:', selectedPeriod.padEnd(40), '║');
          console.log('║  Total Employees:', employees.length.toString().padEnd(32), '║');
          console.log('╚══════════════════════════════════════════════════════╝\n');
          console.log('[PayrollProcessing] 🔧 Setting current period to:', selectedPeriod);
          setCurrentPeriod(selectedPeriod);
          
          // Force refresh available employees
          await refreshAvailableEmployees();
          
          // Wait for the context state to fully update
          await new Promise(resolve => setTimeout(resolve, 200));
          
          // Convert employees to EmployeeProfile format and add to payroll
          const allEmployeeIds = employees.map(emp => emp.id);
          // getEmployeesForPayroll() returns camelCase objects - pass them directly
          // These already have the correct structure with baseSalary, qualifications, etc.
          const employeeProfiles = employees;
          
          console.log('\n[PayrollProcessing] 📝 Adding all employees to payroll...');
          console.log('[PayrollProcessing] Period being passed:', selectedPeriod);
          console.log('[PayrollProcessing] Number of employees:', allEmployeeIds.length);
          console.log('[PayrollProcessing] Employee profiles prepared:', employeeProfiles.length);
          await addEmployeesToPayroll(allEmployeeIds, optimizedPayrollData, selectedPeriod, employeeProfiles);
          console.log('[PayrollProcessing] ✅ All employees added to payroll\n');
          
          // Wait for payroll state to update before applying workaround
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Workaround disabled - all employee data comes from database
        }
      } catch (error) {
        console.error('❌ [PayrollProcessing] Error loading employee data:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        toast.error(`Failed to load employee data: ${errorMessage}. Please check console for details.`);
      } finally {
        setLoading(false);
      }
    };

    loadAllEmployeeData();
  }, [selectedPeriod]);

  const handleEditSalary = (employee: any) => {
    const currentSalary = employee.type === 'Full-Time' 
      ? employee.baseSalary || 0
      : employee.paymentType === 'Hourly' 
        ? employee.hourlyRate || 0
        : employee.baseSalary || 0;

    setEditSalaryDialog({
      isOpen: true,
      employeeId: employee.id,
      employeeName: employee.name,
      currentSalary,
      employeeType: employee.type,
      paymentType: employee.paymentType
    });
  };

  const handleEditAllowances = (employee: any) => {
    const allowances = employeeAllowances[employee.id] || [];
    setEditAllowancesDialog({
      isOpen: true,
      employeeId: employee.id,
      employeeName: employee.name,
      allowances: allowances.map(a => ({
        id: a.id.toString(),
        name: a.name,
        amount: Number(a.amount),
        type: a.type || 'Fixed'
      }))
    });
  };

  const handleEditDeductions = (employee: any) => {
    const deductions = employeeDeductions[employee.id] || [];
    setEditDeductionsDialog({
      isOpen: true,
      employeeId: employee.id,
      employeeName: employee.name,
      deductions: deductions.map(d => ({
        id: d.id.toString(),
        name: d.name,
        amount: Number(d.amount),
        type: d.type || 'Fixed'
      }))
    });
  };

  const handleSalarySave = async (newSalary: number) => {
    const { year, formatted: month } = parsePeriod(selectedPeriod);
    const isHourly = editSalaryDialog.employeeType !== 'Full-Time' && editSalaryDialog.paymentType === 'Hourly';
    
    const updates = isHourly 
      ? { hourly_rate: newSalary } 
      : { base_salary: newSalary };
    
    const { error } = await upsertMonthlyOverride(editSalaryDialog.employeeId, year, month, updates);

    if (error) {
      console.error('Error updating salary override:', error);
      toast('Error updating salary');
      return;
    }

    // Update local state
    setAllEmployees(prev => prev.map(emp => 
      emp.id === editSalaryDialog.employeeId 
        ? { 
            ...emp, 
            ...(editSalaryDialog.employeeType === 'Full-Time' 
              ? { baseSalary: newSalary }
              : editSalaryDialog.paymentType === 'Hourly'
                ? { hourlyRate: newSalary }
                : { baseSalary: newSalary }
            )
          }
        : emp
    ));
  };

  const handleAllowancesSave = async (allowances: any[]) => {
    const { year, formatted: month } = parsePeriod(selectedPeriod);
    
    const { error } = await upsertMonthlyOverride(
      editAllowancesDialog.employeeId, year, month,
      { allowances: allowances.map(a => ({ name: a.name, amount: Number(a.amount), type: a.type || 'Fixed' })) }
    );

    if (error) {
      console.error('Error updating allowances override:', error);
      toast('Error updating allowances');
      return;
    }

    // Update local state
    setEmployeeAllowances(prev => ({
      ...prev,
      [editAllowancesDialog.employeeId]: allowances
    }));
  };

  const handleDeductionsSave = async (deductions: any[]) => {
    const { year, formatted: month } = parsePeriod(selectedPeriod);
    
    const { error } = await upsertMonthlyOverride(
      editDeductionsDialog.employeeId, year, month,
      { deductions: deductions.map(d => ({ name: d.name, amount: Number(d.amount), type: d.type || 'Fixed' })) }
    );

    if (error) {
      console.error('Error updating deductions override:', error);
      toast('Error updating deductions');
      return;
    }

    // Update local state
    setEmployeeDeductions(prev => ({
      ...prev,
      [editDeductionsDialog.employeeId]: deductions
    }));
  };

  const handleRemoveEmployee = async (employeeId: string, employeeName: string) => {
    if (window.confirm(`Are you sure you want to remove ${employeeName} from this payroll period?`)) {
      try {
        // Remove from local state
        setAllEmployees(prev => prev.filter(emp => emp.id !== employeeId));
        toast.success(`${employeeName} removed from payroll`);
      } catch (error) {
        console.error('Error removing employee:', error);
        toast.error('Error removing employee');
      }
    }
  };

  // Partner claim types that should NOT be included in payroll (they go to Branch P&L)
  // Only excluded for employees with Partner position
  const PARTNER_CLAIM_TYPES = [
    'Transport',
    'Office Stationeries', 
    'Training Equipment',
    'Other Business Expense'
  ];

  const getApprovedClaimsTotal = (employeeId: string): number => {
    const claims = employeeClaims[employeeId] || [];
    const employeeInfo = allEmployees.find(e => e.id === employeeId);
    const isPartner = employeeInfo?.position?.toLowerCase().includes('partner');
    const total = claims
      .filter(claim => 
        claim.status === 'Approved' && 
        (!isPartner || !PARTNER_CLAIM_TYPES.includes(claim.type))
      )
      .reduce((sum, claim) => sum + claim.amount, 0);
    
    return total;
  };


  const handleProcessPayment = async () => {
    try {
      // Force recalculate before processing payments
      await forceRecalculatePayroll(selectedPeriod, false);
      
      // Get list of employees marked as paid
      const paidEmployeeIds = Object.entries(paidStatus)
        .filter(([_, isPaid]) => isPaid)
        .map(([employeeId]) => employeeId);

      if (paidEmployeeIds.length === 0) {
        toast.error("Please select at least one employee to mark as paid");
        return;
      }

      // Save payroll records for each paid employee
      const { savePayrollRecord } = await import('@/services/payrollService');
      const { getSlotBookingPayForPeriod } = await import('@/services/slotBookingPayrollService');

      for (const employeeId of paidEmployeeIds) {
        const employee = allEmployees.find(e => e.id === employeeId);
        if (!employee) continue;

        const fullTimePayroll = payrollState.fullTimeEmployees.find(e => e.employeeId === employeeId);
        const casualPayroll = payrollState.casualEmployees.find(e => e.employeeId === employeeId);

        const allowances = employeeAllowances[employeeId] || [];
        const deductions = employeeDeductions[employeeId] || [];
        const approvedClaims = getApprovedClaimsTotal(employeeId);

        let payrollDataToSave: any = {
          employeeType: employee.type,
          baseSalary: employee.baseSalary || 0,
          totalAllowances: allowances.reduce((sum: number, a: any) => sum + Number(a.amount || 0), 0),
          totalDeductions: deductions.reduce((sum: number, d: any) => sum + Number(d.amount || 0), 0),
          approvedClaims,
          allowances: allowances.map((a: any) => ({ name: a.name, amount: Number(a.amount || 0) })),
          deductions: deductions.map((d: any) => ({ name: d.name, amount: Number(d.amount || 0) })),
        };

        if (employee.type === 'Casual' && casualPayroll) {
          // Fetch slot breakdown data for casual employees
          let slotBreakdown: any[] = [];
          try {
            const fullEmployeeProfile = await getEmployeeById(employeeId);
            if (fullEmployeeProfile) {
              const slotData = await getSlotBookingPayForPeriod(employeeId, selectedPeriod, fullEmployeeProfile);
              slotBreakdown = slotData.breakdown || [];
            }
          } catch (error) {
            console.error('Error fetching slot data for payslip:', error);
          }

          payrollDataToSave = {
            ...payrollDataToSave,
            grossSalary: casualPayroll.grossPay || 0,
            employeeCPF: casualPayroll.employeeCPF || 0,
            employerCPF: casualPayroll.employerCPF || 0,
            totalCPF: (casualPayroll.employeeCPF || 0) + (casualPayroll.employerCPF || 0),
            netSalary: casualPayroll.totalPay || 0,
            slotBookingPay: casualPayroll.slotBookingPay || 0,
            slotBreakdown,
            calculationMethod: casualPayroll.slotBookingMetadata?.calculationMethod || 'legacy_rates',
          };
        } else if (fullTimePayroll) {
          // Recompute using merged override allowances/deductions so the saved snapshot
          // matches the values displayed on the Processing/Payment screens
          const effectiveEmployee = {
            ...employee,
            // Honour empty per-month overrides (cleared lists must stay cleared).
            allowances: employeeId in employeeAllowances ? (allowances as any) : (employee.allowances || []),
            deductions: employeeId in employeeDeductions ? (deductions as any) : (employee.deductions || []),
          };
          const recalc = calculateFullTimePayroll(effectiveEmployee as any, approvedClaims, 0);
          payrollDataToSave = {
            ...payrollDataToSave,
            grossSalary: recalc.grossSalary,
            employeeCPF: recalc.employeeCPF,
            employerCPF: recalc.employerCPF,
            totalCPF: recalc.totalCPF,
            netSalary: recalc.netSalary,
          };
        }

        await savePayrollRecord(employeeId, selectedPeriod, payrollDataToSave);
      }

      toast.success(`Payroll records saved for ${paidEmployeeIds.length} employee(s). Payslips are now available.`);
      setPayrollStatus('paid');
      setCurrentStep('cpf');
    } catch (error) {
      console.error('Error processing payments:', error);
      toast.error('Error processing payments. Please try again.');
    }
  };

  const handleCPFSubmission = async () => {
    try {
      await savePayrollToSupabase();
      
      // Get current user
      const { data: { user } } = await authService.auth.getUser();
      const userId = user?.email || 'system';
      
      // Auto-lock payroll after completion
      const formatPeriodForAPI = (period: string): string => {
        const [monthName, year] = period.split(' ');
        const monthNames = [
          'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'
        ];
        const monthIndex = monthNames.indexOf(monthName) + 1;
        return `${year}-${monthIndex.toString().padStart(2, '0')}`;
      };
      
      const formattedPeriod = formatPeriodForAPI(selectedPeriod);
      await finalizePayroll(formattedPeriod, userId);
      
      setPayrollStatus('completed');
      setIsPeriodLocked(true);
      setPeriodStatus({ status: 'finalized', finalizedBy: userId, finalizedAt: new Date().toISOString() });
      
      toast('CPF contributions submitted and payroll locked successfully!');
      navigate('/payroll');
    } catch (error) {
      console.error('Error submitting CPF:', error);
      toast('Error submitting CPF contributions');
    }
  };

  const handleBackStep = () => {
    if (currentStep === 'payment') {
      setCurrentStep('processing');
      setPayrollStatus('draft');
    } else if (currentStep === 'cpf') {
      setCurrentStep('payment');
      setPayrollStatus('approved');
    }
  };

  if (loading) {
    return (
      <ResponsiveLayout>
        <div className="text-center flex items-center justify-center h-full">
          <div>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-lg text-gray-600">Loading payroll data...</p>
            <p className="text-sm text-gray-500">Please wait while we fetch employee information</p>
          </div>
        </div>
      </ResponsiveLayout>
    );
  }

  const renderProcessingStep = () => {
    // CRITICAL FIX: Merge employee data with calculated payroll data safely
    // Filter out resigned employees from the processing view
    const fullTimeEmployeeData = allEmployees
      .filter(emp => emp.type === 'Full-Time' && !emp.resignDate) // Exclude resigned employees
      .map(emp => {
        const payrollData = payrollState.fullTimeEmployees.find(pe => pe.employeeId === emp.id);
        // Only merge specific calculated fields, don't overwrite arrays
        if (payrollData) {
          return {
            ...emp,
            netPay: payrollData.netPay,
            grossPay: payrollData.grossPay,
            cpfEmployee: payrollData.cpfEmployee,
            cpfEmployer: payrollData.cpfEmployer,
          };
        }
        return emp;
      });
    
    const casualEmployeeData = allEmployees
      .filter(emp => emp.type === 'Casual' && !emp.resignDate) // Exclude resigned employees
      .map(emp => {
        const payrollData = payrollState.casualEmployees.find(pe => pe.employeeId === emp.id);
        // Only merge specific calculated fields, preserve employee structure
        if (payrollData) {
          return {
            ...emp,
            netPay: payrollData.netPay,
            grossPay: payrollData.grossPay,
            cpfEmployee: payrollData.cpfEmployee,
            cpfEmployer: payrollData.cpfEmployer,
            slotBookingPay: payrollData.slotBookingPay,
            slotBookingMetadata: payrollData.slotBookingMetadata,
            warnings: payrollData.warnings,
          };
        }
        return emp;
      });
    
    const fullTimeEmployees = fullTimeEmployeeData;
    const casualEmployees = casualEmployeeData;
    
    // Filter allEmployees for summary cards to show only active employees
    const activeEmployeesCount = allEmployees.filter(emp => !emp.resignDate).length;
    
    console.log('DEBUG PayrollProcessing: Full-time employees with payroll:', fullTimeEmployees.length);
    console.log('DEBUG PayrollProcessing: Casual employees with payroll:', casualEmployees.length);
    console.log('DEBUG PayrollProcessing: Payroll data:', payrollData);
    
    return (
      <div className="space-y-8">
        {/* Payroll Period Selector */}
        <PayrollPeriodSelector 
          selectedPeriod={selectedPeriod}
          onPeriodChange={handlePeriodChange}
        />

        {/* Historical Data Indicator Banner */}
        {isUsingHistoricalData && (
          <Alert className="border-amber-300 bg-amber-50">
            <History className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-800">Viewing Saved Payroll Data</AlertTitle>
            <AlertDescription className="text-amber-700">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <span>
                  Displaying allowances, deductions, and CPF amounts as they were at time of processing
                  {historicalProcessedAt && ` (${format(new Date(historicalProcessedAt), 'dd MMM yyyy, HH:mm')})`}.
                </span>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    if (window.confirm('This will recalculate payroll using current employee data (allowances, deductions, etc.). Any previously saved values will be overwritten. Continue?')) {
                      forceRecalculatePayroll(selectedPeriod, true);
                    }
                  }}
                  className="border-amber-400 text-amber-700 hover:bg-amber-100"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Recalculate from Current Data
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="w-8 h-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm text-blue-600">Active Employees</p>
                  <p className="text-2xl font-bold text-blue-900">{activeEmployeesCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center">
                <DollarSign className="w-8 h-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm text-green-600">Total Payroll</p>
                  <p className="text-2xl font-bold text-green-900">
                    S${(payrollState.fullTimeEmployees.reduce((sum, emp) => sum + emp.netPay, 0) + 
                        payrollState.casualEmployees.reduce((sum, emp) => sum + emp.totalPay, 0)).toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center">
                <Calculator className="w-8 h-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm text-purple-600">Total CPF</p>
                  <p className="text-2xl font-bold text-purple-900">
                    S${(
                      payrollState.fullTimeEmployees.reduce((sum, emp) => sum + (emp.cpfEmployer || 0) + (emp.cpfEmployee || 0), 0) + 
                      payrollState.casualEmployees.reduce((sum, emp) => sum + (emp.employerCPF || 0) + (emp.employeeCPF || 0), 0)
                    ).toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Full-Time Employees - More compact layout */}
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100">
            <CardTitle className="flex items-center space-x-3 text-blue-900">
              <div className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-bold">
                {fullTimeEmployees.length}
              </div>
              <span>Full-Time Employees - {selectedPeriod}</span>
            </CardTitle>
            <CardDescription className="text-blue-700">Review and edit salaries, allowances, deductions, and claims for full-time staff</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {fullTimeEmployees.length > 0 ? (
              <div className="overflow-x-auto">
                <Table className="table-fixed w-full">
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="font-semibold w-[140px]">Employee</TableHead>
                        <TableHead className="font-semibold w-[100px]">Basic Salary</TableHead>
                        <TableHead className="font-semibold w-[120px]">Allowances</TableHead>
                        <TableHead className="font-semibold w-[120px]">Deductions</TableHead>
                        <TableHead className="font-semibold w-[80px]">Claims</TableHead>
                        <TableHead className="font-semibold text-right w-[100px]">Net Pay</TableHead>
                        <TableHead className="font-semibold text-center w-[60px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fullTimeEmployees.map((employee) => {
                        const allowances = employeeAllowances[employee.id] || [];
                        const deductions = employeeDeductions[employee.id] || [];
                        const approvedClaims = getApprovedClaimsTotal(employee.id);
                        const totalAllowances = allowances.reduce((sum, a) => sum + Number(a.amount), 0);
                        const totalDeductions = deductions.reduce((sum, d) => sum + Number(d.amount), 0);
                        
                        // Calculate proper CPF using the 2025 rate table
                        const employeeAge = employee.dateOfBirth ? calculateAge(employee.dateOfBirth) : 30;
                        const cpfCalc = calculateCPF(employee.baseSalary || 0, employee.residencyStatus || 'Singapore Citizen', employeeAge);
                        
                        // Build effective employee with merged override allowances/deductions
                        // so Net Pay matches the displayed Allowances/Deductions columns
                        const effectiveEmployee = {
                          ...employee,
                          // Honour empty per-month overrides (cleared lists must stay cleared).
                          allowances: employee.id in employeeAllowances ? (allowances as any) : (employee.allowances || []),
                          deductions: employee.id in employeeDeductions ? (deductions as any) : (employee.deductions || []),
                        };
                        
                        // Calculate net pay using proper payroll calculation
                        const payrollCalc = calculateFullTimePayroll(effectiveEmployee, approvedClaims, 0);
                        const netPay = payrollCalc.netSalary;
                        
                        return (
                          <TableRow key={employee.id} className="hover:bg-gray-50">
                            <TableCell className="truncate">
                              <div className="min-w-0">
                                <p className="font-medium text-sm truncate">{employee.name}</p>
                                <p className="text-xs text-gray-500 truncate">{employee.id}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-1">
                                <div className="font-medium">
                                  S${(employee.baseSalary || 0).toLocaleString()}
                                </div>
                                {!isPeriodLocked && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => handleEditSalary(employee)}
                                    className="h-6 w-6 p-0"
                                  >
                                    <Edit className="w-3 h-3" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="flex items-center space-x-1">
                                  {allowances.length > 0 ? (
                                    <div className="text-sm">
                                      <div className="font-medium text-green-700">
                                        S${totalAllowances.toLocaleString()}
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        {allowances.length} item(s)
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-gray-400 text-sm">None</span>
                                  )}
                                  {!isPeriodLocked && (
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      onClick={() => handleEditAllowances(employee)}
                                      className="h-6 w-6 p-0"
                                    >
                                      <Edit className="w-3 h-3" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="flex items-center space-x-1">
                                  {deductions.length > 0 ? (
                                    <div className="text-sm">
                                      <div className="font-medium text-red-700">
                                        S${totalDeductions.toLocaleString()}
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        {deductions.length} item(s)
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-gray-400 text-sm">None</span>
                                  )}
                                  {!isPeriodLocked && (
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      onClick={() => handleEditDeductions(employee)}
                                      className="h-6 w-6 p-0"
                                    >
                                      <Edit className="w-3 h-3" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-center">
                                <div className="bg-blue-50 px-2 py-1 rounded text-sm">
                                  <span className="font-medium text-blue-900">S${approvedClaims.toFixed(2)}</span>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="font-bold text-green-600">
                                S${netPay.toLocaleString()}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleRemoveEmployee(employee.id, employee.name)}
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg">No full-time employees found</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Casual Employees - More compact layout */}
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100">
            <CardTitle className="flex items-center space-x-3 text-purple-900">
              <div className="bg-purple-600 text-white px-3 py-1 rounded-full text-sm font-bold">
                {casualEmployees.length}
              </div>
              <span>Casual Employees - {selectedPeriod}</span>
            </CardTitle>
            <CardDescription className="text-purple-700">Review and edit rates, work periods, allowances, and claims for casual staff</CardDescription>
            
            {/* November 2025+ Warning Banner */}
            {(() => {
              const [monthName, year] = selectedPeriod.split(' ');
              const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
              const monthIndex = monthNames.indexOf(monthName);
              const yearNum = parseInt(year);
              const isNovember2025OrLater = (yearNum > 2025) || (yearNum === 2025 && monthIndex >= 10);
              
              if (isNovember2025OrLater) {
                return (
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-lg font-bold">⚡</span>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-blue-900 text-sm mb-1">
                          Dynamic Pricing Active for {selectedPeriod}
                        </h4>
                        <p className="text-xs text-blue-800">
                          Casual employee pay is calculated using slot bookings + attendance + dynamic pricing (base rates, Dan levels, coaching/referee certifications, years of service bonuses).
                        </p>
                      </div>
                    </div>
                  </div>
                );
              }
              return null;
            })()}
          </CardHeader>
          <CardContent className="p-0">
            {casualEmployees.length > 0 ? (
              <div className="overflow-x-auto">
                <Table className="table-fixed w-full">
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="font-semibold w-[180px]">Employee</TableHead>
                        <TableHead className="font-semibold w-[120px]">Allowances</TableHead>
                        <TableHead className="font-semibold w-[120px]">Deductions</TableHead>
                        <TableHead className="font-semibold w-[80px]">Claims</TableHead>
                        <TableHead className="font-semibold w-[100px]">Employee CPF</TableHead>
                        <TableHead className="font-semibold text-right w-[120px]">Net Pay</TableHead>
                        <TableHead className="font-semibold text-center w-[60px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {casualEmployees.map((employee) => {
                        const allowances = employeeAllowances[employee.id] || [];
                        const deductions = employeeDeductions[employee.id] || [];
                        const approvedClaims = getApprovedClaimsTotal(employee.id);
                        const totalAllowances = allowances.reduce((sum, a) => sum + Number(a.amount), 0);
                        const totalDeductions = deductions.reduce((sum, d) => sum + Number(d.amount), 0);
                        
                        // Get gross pay from employee data
                        const grossPay = employee.grossPay || employee.totalPay || 0;
                        
                        // Calculate Employee CPF based on residency status
                        // Singapore Citizens and "Citizen" should have CPF deducted
                        let employeeCPF = employee.cpfEmployee || employee.employeeCPF || 0;
                        
                        // If CPF is 0 but employee should have CPF (Singapore Citizen/Citizen), calculate it
                        if (employeeCPF === 0 && grossPay > 0) {
                          // Check employee's residency status from allEmployees or employee data
                          const empProfile = allEmployees.find(e => e.id === employee.id);
                          const residencyStatus = empProfile?.residencyStatus || employee.residencyStatus || '';
                          
                          // Singapore Citizens and Citizens should have CPF deducted
                          if (residencyStatus === 'Singapore Citizen' || residencyStatus === 'Citizen') {
                            const cpfSalary = Math.min(grossPay, 6800);
                            if (cpfSalary > 750) {
                              employeeCPF = Math.round(cpfSalary * 0.20 * 100) / 100;
                            } else if (cpfSalary > 500) {
                              employeeCPF = Math.round((cpfSalary - 500) * 0.60 * 100) / 100;
                            }
                          }
                        }
                        
                        // Calculate Net Pay = Gross Pay - Employee CPF - Deductions
                        // This ensures CPF is always properly deducted for display
                        const netPay = grossPay - employeeCPF - totalDeductions;
                        
                        return (
                          <TableRow key={employee.id} className="hover:bg-gray-50">
                            <TableCell className="truncate">
                              <div className="min-w-0">
                                <p className="font-medium text-sm truncate">{employee.name}</p>
                                <p className="text-xs text-gray-500 truncate">{employee.id}</p>
                                {employee.slotBookingMetadata?.totalSlots > 0 && (
                                  <p className="text-xs text-purple-600 mt-1">
                                    {employee.slotBookingMetadata.totalSlots} slot(s) attended
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="flex items-center space-x-1">
                                  {allowances.length > 0 ? (
                                    <div className="text-sm">
                                      <div className="font-medium text-green-700">
                                        S${totalAllowances.toLocaleString()}
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        {allowances.length} item(s)
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-gray-400 text-sm">None</span>
                                  )}
                                  {!isPeriodLocked && (
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      onClick={() => handleEditAllowances(employee)}
                                      className="h-6 w-6 p-0"
                                    >
                                      <Edit className="w-3 h-3" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="flex items-center space-x-1">
                                  {deductions.length > 0 ? (
                                    <div className="text-sm">
                                      <div className="font-medium text-red-700">
                                        S${totalDeductions.toLocaleString()}
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        {deductions.length} item(s)
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-gray-400 text-sm">None</span>
                                  )}
                                  {!isPeriodLocked && (
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      onClick={() => handleEditDeductions(employee)}
                                      className="h-6 w-6 p-0"
                                    >
                                      <Edit className="w-3 h-3" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-center">
                                <div className="bg-blue-50 px-2 py-1 rounded text-sm">
                                  <span className="font-medium text-blue-900">S${approvedClaims.toFixed(2)}</span>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-center">
                                <div className="bg-purple-50 px-2 py-1 rounded text-sm">
                                  <span className="font-medium text-purple-900">S${employeeCPF.toFixed(2)}</span>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex flex-col items-end">
                                <div className="font-bold text-green-600">
                                  S${netPay.toLocaleString()}
                                </div>
                                {employee.slotBookingMetadata?.calculationMethod === 'dynamic_pricing' && (
                                  <button
                                    onClick={async () => {
                                      try {
                                        // Fetch full employee profile with qualifications
                                        const fullEmployeeProfile = await getEmployeeById(employee.id);
                                        if (!fullEmployeeProfile) {
                                          toast.error('Could not load employee profile');
                                          return;
                                        }
                                        
                                        const slotData = await getSlotBookingPayForPeriod(
                                          employee.id,
                                          selectedPeriod,
                                          fullEmployeeProfile
                                        );
                                        setSlotBreakdownData({
                                          employeeId: employee.id,
                                          employeeName: employee.name,
                                          breakdown: slotData.breakdown,
                                          totalPay: slotData.totalPay,
                                          totalSlots: slotData.totalSlots,
                                          fullSlotRate: slotData.fullSlotRate,
                                          rateBreakdown: slotData.rateBreakdown,
                                          milestoneBonus: slotData.milestoneBonus,
                                          milestoneBonusThreshold: slotData.milestoneBonusThreshold,
                                        });
                                        setSlotBreakdownOpen(true);
                                      } catch (error) {
                                        console.error('Error fetching slot breakdown:', error);
                                        toast.error('Failed to load slot breakdown');
                                      }
                                    }}
                                    className="text-xs text-muted-foreground hover:text-primary hover:underline cursor-pointer transition-colors"
                                  >
                                    {employee.slotBookingMetadata.totalSlots} slot{employee.slotBookingMetadata.totalSlots !== 1 ? 's' : ''}
                                  </button>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleRemoveEmployee(employee.id, employee.name)}
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg">No casual employees found</p>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Action Buttons */}
        <div className="flex justify-between items-center">
          <Button
            onClick={async () => {
              try {
                await savePayrollToSupabase();
                toast.success('Draft saved successfully');
              } catch (error) {
                console.error('Error saving draft:', error);
                toast.error('Failed to save draft');
              }
            }}
            variant="outline"
            className="flex items-center space-x-2"
          >
            <Save className="w-4 h-4" />
            <span>Save Draft</span>
          </Button>
          <Button
            onClick={() => {
              if (currentStep === 'processing') {
                setCurrentStep('payment');
                setPayrollStatus('paid');
              } else if (currentStep === 'payment') {
                setCurrentStep('cpf');
                setPayrollStatus('completed');
              }
            }}
            disabled={currentStep === 'cpf'}
            className="flex items-center space-x-2"
          >
            <ArrowRight className="w-4 h-4" />
            <span>Next</span>
          </Button>
        </div>
      </div>
    );
  };

  const renderPaymentStep = () => {
    // Get full-time employees from payroll context - they should already be calculated
    // De-duplicate by employee ID to prevent duplicate rows
    const seenFullTimeIds = new Set<string>();
    const activeFullTimeEmployees = payrollState.fullTimeEmployees
      .filter(emp => {
        const empId = emp.employeeId || emp.id;
        // Skip if already seen this employee
        if (seenFullTimeIds.has(empId)) return false;
        seenFullTimeIds.add(empId);
        
        const employeeInfo = allEmployees.find(e => e.id === empId);
        return employeeInfo && !employeeInfo.resignDate;
      })
      .map(emp => {
        const empId = emp.employeeId || emp.id;
        const employeeInfo = allEmployees.find(e => e.id === empId);
        const approvedClaims = getApprovedClaimsTotal(empId);
        
        // Recompute using merged override allowances/deductions for consistency with Processing step
        const effectiveEmployee = employeeInfo ? {
          ...employeeInfo,
          // Honour empty per-month overrides (cleared lists must stay cleared).
          allowances: empId in employeeAllowances
            ? (employeeAllowances[empId] as any)
            : (employeeInfo.allowances || []),
          deductions: empId in employeeDeductions
            ? (employeeDeductions[empId] as any)
            : (employeeInfo.deductions || []),
        } : null;
        
        const recalculated = effectiveEmployee
          ? calculateFullTimePayroll(effectiveEmployee as any, 0, 0)
          : null;
        
        const netPay = recalculated ? recalculated.netSalary : (emp.netPay || 0);
        const grossSalary = recalculated ? recalculated.grossSalary : (emp.grossPay || employeeInfo?.baseSalary || 0);
        return {
          id: empId,
          employeeId: empId,
          name: employeeInfo?.displayName || employeeInfo?.name || emp.name,
          netPay: netPay,
          grossSalary: grossSalary,
          bankName: employeeInfo?.bankName || '',
          bankAccount: employeeInfo?.bankAccount || '',
          paymentType: emp.paymentType || 'Monthly',
          totalPay: netPay + approvedClaims
        };
      })
      .filter(emp => emp.totalPay > 0);
    
    // Get casual employees from payroll context - they should already be calculated
    // De-duplicate by employee ID to prevent duplicate rows
    const seenCasualIds = new Set<string>();
    const activeCasualEmployees = payrollState.casualEmployees
      .filter(emp => {
        // Skip if already seen this employee
        if (seenCasualIds.has(emp.employeeId)) return false;
        seenCasualIds.add(emp.employeeId);
        
        // Check if the employee exists in allEmployees and is not resigned
        const employeeInfo = allEmployees.find(e => e.id === emp.employeeId);
        return employeeInfo && !employeeInfo.resignDate;
      })
      .map(emp => {
        const employeeInfo = allEmployees.find(e => e.id === emp.employeeId);
        const approvedClaims = getApprovedClaimsTotal(emp.employeeId);
        
        // Get gross pay (total salary before CPF deduction)
        const grossPay = emp.grossPay || emp.totalPay || emp.netPay || 0;
        
        // Get deductions for this employee
        const empDeductions = employeeDeductions[emp.employeeId] || [];
        const totalDeductions = empDeductions.reduce((sum, d) => sum + Number(d.amount || 0), 0);
        
        // Calculate Employee CPF for Singapore Citizens/Citizens
        let employeeCPF = emp.cpfEmployee || emp.employeeCPF || 0;
        
        // If CPF is 0 but employee should have CPF, calculate it
        if (employeeCPF === 0 && grossPay > 0) {
          const residencyStatus = employeeInfo?.residencyStatus || '';
          if (residencyStatus === 'Singapore Citizen' || residencyStatus === 'Citizen') {
            const cpfSalary = Math.min(grossPay, 6800);
            if (cpfSalary > 750) {
              employeeCPF = Math.round(cpfSalary * 0.20 * 100) / 100;
            } else if (cpfSalary > 500) {
              employeeCPF = Math.round((cpfSalary - 500) * 0.60 * 100) / 100;
            }
          }
        }
        
        // Net Pay = Gross Pay - Employee CPF - Deductions
        const netPay = grossPay - employeeCPF - totalDeductions;
        
        return {
          id: emp.employeeId,
          employeeId: emp.employeeId,
          name: employeeInfo?.displayName || employeeInfo?.name || emp.name,
          totalPay: grossPay, // Total Salary = Gross Pay
          netPay: netPay,      // Net Pay = Gross Pay - CPF - Deductions
          bankName: employeeInfo?.bankName || '',
          bankAccount: employeeInfo?.bankAccount || '',
          slotBookingMetadata: emp.slotBookingMetadata
        };
      })
      .filter(emp => emp.netPay > 0);

    const handlePaidToggle = async (employeeId: string, checked: boolean) => {
      // Update local state immediately for responsive UI
      setPaidStatus(prev => ({
        ...prev,
        [employeeId]: checked
      }));
      
      // Save to Supabase
      try {
        const { data: { user } } = await authService.auth.getUser();
        const paidBy = user?.email || 'system';
        await updateSalaryPaymentStatus(employeeId, selectedPeriod, checked, paidBy);
        console.log('[PayrollProcessing] 💾 Saved salary payment status', { employeeId, checked });
      } catch (error) {
        console.error('Error saving salary payment status:', error);
        toast.error('Failed to save payment status');
        // Revert local state on error
        setPaidStatus(prev => ({
          ...prev,
          [employeeId]: !checked
        }));
      }
    };

    // Calculate total net salary (already includes claims in totalPay/netPay)
    const totalNetSalary = 
      activeFullTimeEmployees.reduce((sum, emp) => sum + emp.totalPay, 0) +
      activeCasualEmployees.reduce((sum, emp) => sum + emp.netPay, 0);
    
    return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <CreditCard className="w-5 h-5" />
          <span>Payment Processing</span>
        </CardTitle>
        <CardDescription>
          Total Net Salary: <span className="font-semibold text-foreground">S${totalNetSalary.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee Name</TableHead>
              <TableHead>Payment Type</TableHead>
              <TableHead>Total Salary</TableHead>
              <TableHead>Net Salary</TableHead>
              <TableHead>Bank Name</TableHead>
              <TableHead>Bank Account</TableHead>
              <TableHead className="text-center">Paid</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {activeFullTimeEmployees.map((employee) => {
              const isPaid = paidStatus[employee.employeeId] || false;
              
              return (
                <TableRow key={employee.id} className="h-12">
                  <TableCell className="font-medium py-2">{employee.name}</TableCell>
                  <TableCell className="py-2">
                    <Badge variant="outline">Monthly</Badge>
                  </TableCell>
                  <TableCell className="py-2">S${employee.grossSalary.toFixed(2)}</TableCell>
                  <TableCell className="py-2 font-bold">S${employee.totalPay.toFixed(2)}</TableCell>
                  <TableCell className="py-2">{employee.bankName || 'Unknown'}</TableCell>
                  <TableCell className="py-2">{employee.bankAccount || 'Unknown'}</TableCell>
                  <TableCell className="py-2 text-center">
                    <input
                      type="checkbox"
                      checked={isPaid}
                      onChange={(e) => handlePaidToggle(employee.employeeId, e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                    />
                  </TableCell>
                </TableRow>
              );
            })}
            {activeCasualEmployees.map((employee) => {
              const isPaid = paidStatus[employee.employeeId] || false;
              
              return (
                <TableRow key={employee.id} className="h-12">
                  <TableCell className="font-medium py-2">{employee.name}</TableCell>
                  <TableCell className="py-2">
                    <Badge variant="success" className="text-xs">Dynamic Pricing</Badge>
                  </TableCell>
                  <TableCell className="py-2">S${employee.totalPay.toFixed(2)}</TableCell>
                  <TableCell className="py-2 font-bold">S${employee.netPay.toFixed(2)}</TableCell>
                  <TableCell className="py-2">{employee.bankName || 'Unknown'}</TableCell>
                  <TableCell className="py-2">{employee.bankAccount || 'Unknown'}</TableCell>
                  <TableCell className="py-2 text-center">
                    <input
                      type="checkbox"
                      checked={isPaid}
                      onChange={(e) => handlePaidToggle(employee.employeeId, e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <div className="flex justify-between mt-4">
          <Button variant="outline" onClick={handleBackStep}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Button onClick={handleProcessPayment}>
            <CreditCard className="w-4 h-4 mr-2" />
            Process Payments
          </Button>
        </div>
      </CardContent>
    </Card>
    );
  };

  const renderCPFStep = () => {
    // Filter for CPF eligible employees (Singapore Citizens and PRs only - exclude EP, S Pass, Work Permit)
    // Also filter out resigned employees and remove duplicates
    const cpfEligibleResidencyStatuses = ['Singapore Citizen', 'Citizen', 'PR', 'Permanent Resident'];
    const seenEmployeeIds = new Set<string>();
    
    const cpfEligibleEmployees = allEmployees
      .filter(emp => {
        // Filter out resigned employees
        if (emp.resignDate) return false;
        
        // Filter for CPF eligible residency status only
        const isEligible = cpfEligibleResidencyStatuses.some(status => 
          emp.residencyStatus?.toLowerCase() === status.toLowerCase()
        );
        if (!isEligible) return false;
        
        // Remove duplicates
        if (seenEmployeeIds.has(emp.id)) return false;
        seenEmployeeIds.add(emp.id);
        
        return true;
      })
      .map(emp => {
        // Get payroll data for this employee
        const fullTimeData = payrollState.fullTimeEmployees.find(pe => pe.employeeId === emp.id);
        const casualData = payrollState.casualEmployees.find(pe => pe.employeeId === emp.id);
        const payrollInfo = fullTimeData || casualData;
        
        // Calculate allowances
        const allowances = employeeAllowances[emp.id] || [];
        const totalAllowanceAmount = allowances.reduce((sum, a) => sum + Number(a.amount || 0), 0);
        
        // Get gross pay (base salary for full-time, slot booking pay for casual)
        let grossPay = 0;
        if (emp.type === 'Full-Time') {
          grossPay = emp.baseSalary || 0;
        } else {
          // For casual employees, use slot booking pay (gross pay)
          grossPay = casualData?.grossPay || casualData?.totalPay || 0;
        }
        
        // Get CPF values - handle both FullTimeEmployee (cpfEmployee/cpfEmployer) and CasualEmployee (employeeCPF/employerCPF)
        const employeeCPF = (payrollInfo as any)?.cpfEmployee || (payrollInfo as any)?.employeeCPF || 0;
        const employerCPF = (payrollInfo as any)?.cpfEmployer || (payrollInfo as any)?.employerCPF || 0;
        
        return {
          id: emp.id,
          name: emp.displayName || emp.name,
          nric: emp.nric,
          type: emp.type,
          grossPay,
          totalAllowanceAmount,
          employeeCPF,
          employerCPF
        };
      })
      // Filter out employees with zero CPF contributions
      .filter(emp => emp.employeeCPF > 0 || emp.employerCPF > 0);
    
    const handleCpfPaidToggle = async (employeeId: string, checked: boolean) => {
      // Update local state immediately for responsive UI
      setCpfPaidStatus(prev => ({
        ...prev,
        [employeeId]: checked
      }));
      
      // Save to Supabase
      try {
        const { data: { user } } = await authService.auth.getUser();
        const paidBy = user?.email || 'system';
        await updateCpfPaymentStatus(employeeId, selectedPeriod, checked, paidBy);
        console.log('[PayrollProcessing] 💾 Saved CPF payment status', { employeeId, checked });
      } catch (error) {
        console.error('Error saving CPF payment status:', error);
        toast.error('Failed to save CPF payment status');
        // Revert local state on error
        setCpfPaidStatus(prev => ({
          ...prev,
          [employeeId]: !checked
        }));
      }
    };

    const handleExportCpfEzpay = async () => {
      try {
        if (cpfEligibleEmployees.length === 0) {
          toast.error('No CPF-eligible employees to export');
          return;
        }
        const ids = cpfEligibleEmployees.map(e => e.id);
        const { data: rows, error } = await supabase
          .from('employees')
          .select('id, nric, name, date_of_birth, residency_status, join_date, resign_date, pr_start_date, cpf_contribution_type, additional_wages_default, self_help_group, agency_fund_amount, sdl_payable')
          .in('id', ids);
        if (error) throw error;

        const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
        const fmtDate = (d?: string | null) => {
          if (!d) return '';
          const dt = new Date(d);
          if (isNaN(dt.getTime())) return '';
          const dd = String(dt.getDate()).padStart(2, '0');
          return `${dd}.${MONTHS[dt.getMonth()]}.${dt.getFullYear()}`;
        };
        const csvEscape = (v: any) => {
          const s = v === null || v === undefined ? '' : String(v);
          return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        };

        // Period bounds from selectedPeriod (supports 'YYYY-MM' or 'Month YYYY')
        let periodStart: Date, periodEnd: Date;
        const ymMatch = /^(\d{4})-(\d{2})$/.exec(selectedPeriod);
        if (ymMatch) {
          const y = Number(ymMatch[1]); const m = Number(ymMatch[2]) - 1;
          periodStart = new Date(y, m, 1);
          periodEnd = new Date(y, m + 1, 0);
        } else {
          const dt = new Date(selectedPeriod + ' 1');
          periodStart = new Date(dt.getFullYear(), dt.getMonth(), 1);
          periodEnd = new Date(dt.getFullYear(), dt.getMonth() + 1, 0);
        }
        const periodKey = `${periodStart.getFullYear()}-${String(periodStart.getMonth() + 1).padStart(2, '0')}`;

        const citizenshipFor = (status?: string | null) => {
          const s = (status || '').toLowerCase();
          if (s.includes('pr yr 1') || s.includes('pr year 1')) return '1';
          if (s.includes('pr yr 2') || s.includes('pr year 2')) return '2';
          return '3';
        };

        const headers = [
          'CPF Account No', 'Name of Employee (as per NRIC)', 'Ordinary Wages ($)',
          'Additional Wages ($)', 'Agency Fund ($)', 'Agency (CDAC/MBMF/SINDA/ECF)',
          'Citizenship', 'PR Start Date', 'Type (F/G or G/G)', 'Employment Status',
          'Date Left Employment', 'Date of Birth', 'SDL Payable'
        ];

        const lines = [headers.join(',')];
        for (const cpfRow of cpfEligibleEmployees) {
          const e: any = (rows || []).find(r => r.id === cpfRow.id) || {};
          const join = e.join_date ? new Date(e.join_date) : null;
          const resign = e.resign_date ? new Date(e.resign_date) : null;
          const joinedInPeriod = join && join >= periodStart && join <= periodEnd;
          const leftInPeriod = resign && resign >= periodStart && resign <= periodEnd;
          const employmentStatus = joinedInPeriod && leftInPeriod ? 'New & Leaving'
            : joinedInPeriod ? 'New'
            : leftInPeriod ? 'Left'
            : 'Existing';

          const row = [
            e.nric || '',
            (e.name || cpfRow.name || '').toUpperCase(),
            Number(cpfRow.grossPay || 0).toFixed(2),
            Number(e.additional_wages_default || 0).toFixed(2),
            e.agency_fund_amount !== null && e.agency_fund_amount !== undefined ? Number(e.agency_fund_amount).toFixed(2) : '',
            e.self_help_group || '',
            citizenshipFor(e.residency_status),
            fmtDate(e.pr_start_date),
            e.cpf_contribution_type || '',
            employmentStatus,
            leftInPeriod ? fmtDate(e.resign_date) : '',
            fmtDate(e.date_of_birth),
            e.sdl_payable === false ? 'No' : 'Yes',
          ].map(csvEscape);
          lines.push(row.join(','));
        }

        const blob = new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `CPF_ezpay_${periodKey}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('CPF ezpay CSV exported');
      } catch (err: any) {
        console.error('Export CPF ezpay failed:', err);
        toast.error(err?.message || 'Failed to export CPF ezpay CSV');
      }
    };
    
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="w-5 h-5" />
            <span>CPF Contribution Submission</span>
          </CardTitle>
          <CardDescription>Submit CPF contributions for employees (Claims are not subject to CPF)</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee Name</TableHead>
                <TableHead>NRIC/FIN</TableHead>
                <TableHead>Basic/Rate</TableHead>
                <TableHead>Total Allowance Amount</TableHead>
                <TableHead>Employee CPF</TableHead>
                <TableHead>Employer CPF</TableHead>
                <TableHead className="text-center">Paid</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cpfEligibleEmployees.map((employee) => {
                const isPaid = cpfPaidStatus[employee.id] || false;
                
                return (
                  <TableRow key={employee.id}>
                    <TableCell className="font-medium">{employee.name}</TableCell>
                    <TableCell>{employee.nric || 'N/A'}</TableCell>
                    <TableCell>S${employee.grossPay.toFixed(2)}</TableCell>
                    <TableCell>S${employee.totalAllowanceAmount.toFixed(2)}</TableCell>
                    <TableCell>S${employee.employeeCPF.toFixed(2)}</TableCell>
                    <TableCell>S${employee.employerCPF.toFixed(2)}</TableCell>
                    <TableCell className="text-center">
                      <input
                        type="checkbox"
                        checked={isPaid}
                        onChange={(e) => handleCpfPaidToggle(employee.id, e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <div className="flex justify-between mt-4">
            <Button variant="outline" onClick={handleBackStep}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleExportCpfEzpay}>
                <Download className="w-4 h-4 mr-2" />
                Export CPF ezpay
              </Button>
              <Button onClick={handleCPFSubmission}>
                <FileText className="w-4 h-4 mr-2" />
                Submit CPF Contributions
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <ResponsiveLayout>
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow-lg border">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Payroll Processing</h1>
              <div className="flex items-center gap-2 mt-2">
                <p className="text-gray-600">Process payroll for {selectedPeriod}</p>
                {isPeriodLocked && (
                  <Badge variant="secondary" className="bg-red-100 text-red-800 border-red-200">
                    🔒 Locked
                  </Badge>
                )}
              </div>
              {periodStatus?.finalizedBy && (
                <p className="text-xs text-gray-500 mt-1">
                  Finalized by {periodStatus.finalizedBy} on {formatDate(new Date(periodStatus.finalizedAt || ''))}
                </p>
              )}
            </div>
            <div className="flex items-center space-x-3">
              <Button
                onClick={async () => {
                  if (confirm('This will delete cached payroll and recalculate all employees with current slot booking data. Continue?')) {
                    await forceRecalculatePayroll(selectedPeriod, true);
                  }
                }}
                variant="outline"
                className="gap-2"
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Recalculating...' : 'Force Recalculate'}
              </Button>
              <Badge variant={currentStep === 'processing' ? 'default' : 'secondary'} className="px-4 py-2">
                1. Processing
              </Badge>
              <Badge variant={currentStep === 'payment' ? 'default' : 'secondary'} className="px-4 py-2">
                2. Payment
              </Badge>
              <Badge variant={currentStep === 'cpf' ? 'default' : 'secondary'} className="px-4 py-2">
                3. CPF
              </Badge>
            </div>
          </div>
        </div>

        {currentStep === 'processing' && renderProcessingStep()}
        {currentStep === 'payment' && renderPaymentStep()}
        {currentStep === 'cpf' && renderCPFStep()}

        {/* Edit Dialogs */}
        <EditSalaryDialog
          isOpen={editSalaryDialog.isOpen}
          onClose={() => setEditSalaryDialog(prev => ({ ...prev, isOpen: false }))}
          employeeName={editSalaryDialog.employeeName}
          currentSalary={editSalaryDialog.currentSalary}
          employeeType={editSalaryDialog.employeeType}
          paymentType={editSalaryDialog.paymentType}
          onSave={handleSalarySave}
        />

        <EditAllowancesDialog
          isOpen={editAllowancesDialog.isOpen}
          onClose={() => setEditAllowancesDialog(prev => ({ ...prev, isOpen: false }))}
          employeeName={editAllowancesDialog.employeeName}
          allowances={editAllowancesDialog.allowances}
          onSave={handleAllowancesSave}
        />

        <EditDeductionsDialog
          isOpen={editDeductionsDialog.isOpen}
          onClose={() => setEditDeductionsDialog(prev => ({ ...prev, isOpen: false }))}
          employeeName={editDeductionsDialog.employeeName}
          deductions={editDeductionsDialog.deductions}
          onSave={handleDeductionsSave}
        />

        {/* Slot Breakdown Dialog */}
        {slotBreakdownData && (
          <SlotBreakdownDialog
            isOpen={slotBreakdownOpen}
            onClose={() => {
              setSlotBreakdownOpen(false);
              setSlotBreakdownData(null);
            }}
            employeeName={slotBreakdownData.employeeName}
            employeeId={slotBreakdownData.employeeId}
            breakdown={slotBreakdownData.breakdown}
            totalPay={slotBreakdownData.totalPay}
            totalSlots={slotBreakdownData.totalSlots}
            fullSlotRate={slotBreakdownData.fullSlotRate}
            rateBreakdown={slotBreakdownData.rateBreakdown}
            milestoneBonus={slotBreakdownData.milestoneBonus}
            milestoneBonusThreshold={slotBreakdownData.milestoneBonusThreshold}
            onUpdate={async () => {
              // Refresh the slot breakdown data after an update
              try {
                const fullEmployeeProfile = await getEmployeeById(slotBreakdownData.employeeId);
                if (fullEmployeeProfile) {
                  const slotData = await getSlotBookingPayForPeriod(
                    slotBreakdownData.employeeId,
                    selectedPeriod,
                    fullEmployeeProfile
                  );
                  setSlotBreakdownData({
                    employeeId: slotBreakdownData.employeeId,
                    employeeName: slotBreakdownData.employeeName,
                    breakdown: slotData.breakdown,
                    totalPay: slotData.totalPay,
                    totalSlots: slotData.totalSlots,
                    fullSlotRate: slotData.fullSlotRate,
                    rateBreakdown: slotData.rateBreakdown,
                    milestoneBonus: slotData.milestoneBonus,
                    milestoneBonusThreshold: slotData.milestoneBonusThreshold,
                  });
                }
              } catch (error) {
                console.error('Error refreshing slot breakdown:', error);
              }
            }}
          />
        )}
      </div>
    </ResponsiveLayout>
  );
};

export default PayrollProcessing;
