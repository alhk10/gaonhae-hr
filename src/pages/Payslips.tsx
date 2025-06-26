import React, { useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DollarSign, Calendar, FileText } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { usePayroll } from '@/contexts/PayrollContext';
import { useAuth } from '@/contexts/AuthContext';
import { getEmployeeById } from '@/services/employeeService';
import { getEmployeeClaims } from '@/services/claimsService';
import { calculateCPF, calculateAge } from '@/utils/cpfCalculations';
import { supabase } from '@/integrations/supabase/client';
import { EmployeeProfile } from '@/types/employee';
import { generatePayslipPDF } from '@/utils/payslipPDFGenerator';

const Payslips = () => {
  const { payrollState } = usePayroll();
  const { user } = useAuth();
  const [currentEmployee, setCurrentEmployee] = useState<EmployeeProfile | null>(null);
  const [approvedClaimsTotal, setApprovedClaimsTotal] = useState(0);
  const [employeeAllowances, setEmployeeAllowances] = useState<any[]>([]);
  const [employeeDeductions, setEmployeeDeductions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const loadEmployeeData = async () => {
      try {
        setLoading(true);
        
        if (!user?.employeeId) {
          console.error('No employee ID found for current user');
          setLoading(false);
          return;
        }

        console.log('Loading employee data for ID:', user.employeeId);
        
        // Use the current user's employee ID
        const employee = await getEmployeeById(user.employeeId);
        console.log('Loaded employee:', employee);
        setCurrentEmployee(employee);
        
        if (!employee) {
          console.error('Employee not found:', user.employeeId);
          setLoading(false);
          return;
        }
        
        // Load approved claims
        const claims = await getEmployeeClaims(employee.id);
        console.log('Loaded claims:', claims);
        const approvedTotal = claims
          .filter(claim => claim.status === 'Approved')
          .reduce((sum, claim) => sum + claim.amount, 0);
        console.log('Approved claims total:', approvedTotal);
        setApprovedClaimsTotal(approvedTotal);

        // Load current allowances and deductions from Supabase
        const { data: allowances } = await supabase
          .from('allowances')
          .select('*')
          .eq('employee_id', employee.id);

        const { data: deductions } = await supabase
          .from('deductions')
          .select('*')
          .eq('employee_id', employee.id);

        console.log('Loaded allowances:', allowances);
        console.log('Loaded deductions:', deductions);

        setEmployeeAllowances(allowances || []);
        setEmployeeDeductions(deductions || []);
      } catch (error) {
        console.error('Error loading payroll data:', error);
        toast("Error loading employee data");
      } finally {
        setLoading(false);
      }
    };

    if (user?.employeeId) {
      loadEmployeeData();
    } else {
      setLoading(false);
    }
  }, [user?.employeeId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex h-[calc(100vh-73px)]">
          <Sidebar />
          <main className="flex-1 p-6 overflow-auto">
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading payslip data...</p>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!user?.employeeId) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex h-[calc(100vh-73px)]">
          <Sidebar />
          <main className="flex-1 p-6 overflow-auto">
            <div className="text-center">
              <p className="text-red-600">No employee ID found for current user</p>
              <p className="text-sm text-gray-500 mt-2">Please contact your administrator</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!currentEmployee) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex h-[calc(100vh-73px)]">
          <Sidebar />
          <main className="flex-1 p-6 overflow-auto">
            <div className="text-center">
              <p className="text-red-600">Employee record not found</p>
              <p className="text-sm text-gray-500 mt-2">
                Employee ID: {user.employeeId} could not be found in the system
              </p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const generatePayslipData = (month: string) => {
    console.log('Generating payslip data for month:', month);
    console.log('Current employee:', currentEmployee);
    console.log('Employee allowances:', employeeAllowances);
    console.log('Employee deductions:', employeeDeductions);
    
    const baseSalary = currentEmployee?.baseSalary || 0;
    const totalAllowances = employeeAllowances.reduce((sum, a) => sum + Number(a.amount), 0);
    const totalDeductions = employeeDeductions.reduce((sum, d) => sum + Number(d.amount), 0);
    const grossSalary = baseSalary + totalAllowances;
    
    const age = calculateAge(currentEmployee?.dateOfBirth || '');
    const cpfCalc = calculateCPF(grossSalary, currentEmployee?.residencyStatus || 'Citizen', age);
    
    const netSalary = grossSalary - cpfCalc.employeeCPF - totalDeductions + approvedClaimsTotal;
    
    const payslipData = {
      baseSalary,
      totalAllowances,
      totalDeductions,
      grossSalary,
      employeeCPF: cpfCalc.employeeCPF,
      employerCPF: cpfCalc.employerCPF,
      totalCPF: cpfCalc.employeeCPF + cpfCalc.employerCPF,
      approvedClaims: approvedClaimsTotal,
      netSalary,
      allowances: employeeAllowances.map(a => ({ name: a.name, amount: Number(a.amount) })),
      deductions: employeeDeductions.map(d => ({ name: d.name, amount: Number(d.amount) }))
    };
    
    console.log('Generated payslip data:', payslipData);
    return payslipData;
  };

  const handleDownloadPayslipPDF = (month: string) => {
    try {
      console.log('Starting PDF download for month:', month);
      
      if (!currentEmployee) {
        console.error('No current employee data available');
        toast("Error: No employee data available");
        return;
      }

      const payslipData = generatePayslipData(month);
      
      const pdfData = {
        employee: {
          id: currentEmployee.id,
          name: currentEmployee.name,
          nric: currentEmployee.nric,
          branch: currentEmployee.branch,
          position: currentEmployee.position,
          bankName: currentEmployee.bankName,
          bankAccount: currentEmployee.bankAccount
        },
        month,
        ...payslipData
      };
      
      console.log('PDF data being passed to generator:', pdfData);
      
      generatePayslipPDF(pdfData);
      toast(`PDF payslip downloaded for ${month}`, {
        description: `Employee: ${currentEmployee.name} (${currentEmployee.id})`
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast(`Error generating PDF for ${month}`, {
        description: 'Please check console for details'
      });
    }
  };

  // Generate payslips for recent months using current employee data
  const payslips = [
    { month: 'December 2024', ...generatePayslipData('December 2024') },
    { month: 'November 2024', ...generatePayslipData('November 2024') },
    { month: 'October 2024', ...generatePayslipData('October 2024') },
    { month: 'September 2024', ...generatePayslipData('September 2024') },
  ];

  const totalEarningsYear = payslips.reduce((sum, payslip) => sum + payslip.grossSalary + payslip.approvedClaims, 0);
  const totalCPFYear = payslips.reduce((sum, payslip) => sum + payslip.totalCPF, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex h-[calc(100vh-73px)]">
        <Sidebar />
        <main className="flex-1 p-6 overflow-auto">
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">My Payslips</h2>
              <p className="text-gray-600">View and download your payslips with live data</p>
              <p className="text-sm text-gray-500 mt-1">
                Employee: {currentEmployee?.name} ({currentEmployee?.id})
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Earnings (Year)</p>
                      <p className="text-2xl font-bold text-gray-900">S${totalEarningsYear.toLocaleString()}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Including claims: S${(payslips.reduce((sum, p) => sum + p.approvedClaims, 0)).toLocaleString()}
                      </p>
                    </div>
                    <DollarSign className="w-8 h-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">CPF Contributions (Year)</p>
                      <p className="text-2xl font-bold text-gray-900">S${totalCPFYear.toLocaleString()}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Employee + Employer CPF
                      </p>
                    </div>
                    <Calendar className="w-8 h-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Recent Payslips</CardTitle>
                <CardDescription>Download your monthly payslips as PDF</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {payslips.map((payslip, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{payslip.month}</p>
                        <p className="text-sm text-gray-600">
                          Net: S${payslip.netSalary.toLocaleString()} • 
                          Gross: S${(payslip.grossSalary + payslip.approvedClaims).toLocaleString()} • 
                          CPF: S${payslip.totalCPF.toLocaleString()}
                          {payslip.approvedClaims > 0 && ` • Claims: S${payslip.approvedClaims.toLocaleString()}`}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="default" 
                          size="sm"
                          onClick={() => handleDownloadPayslipPDF(payslip.month)}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <FileText className="w-4 h-4 mr-2" />
                          Download PDF
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Payslips;
