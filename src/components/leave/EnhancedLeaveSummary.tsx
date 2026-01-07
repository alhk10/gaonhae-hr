
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Calendar, AlertTriangle, CheckCircle, Trash2, DollarSign, TrendingUp, Banknote } from 'lucide-react';
import { 
  getEligibleEmployeesForLeave, 
  calculateEmployeeLeaveEntitlement,
  cleanupIneligibleLeaveData,
  type EligibleEmployee,
  type LeaveEntitlementCalculation 
} from '@/services/enhancedLeaveService';
import { 
  getEmployeesWithUnusedLeave,
  getAllEncashmentRecords 
} from '@/services/leaveEncashmentService';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const WORK_DAYS_PER_YEAR = 261; // Standard work days in a year (52 weeks × 5 days, excluding weekends)

const EnhancedLeaveSummary = () => {
  const { user, userrole } = useAuth();
  const [eligibleEmployees, setEligibleEmployees] = useState<EligibleEmployee[]>([]);
  const [entitlements, setEntitlements] = useState<Record<string, LeaveEntitlementCalculation>>({});
  const [unusedLeaveData, setUnusedLeaveData] = useState<any[]>([]);
  const [encashmentRecords, setEncashmentRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cleanupInProgress, setCleanupInProgress] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [encashingEmployeeId, setEncashingEmployeeId] = useState<string | null>(null);
  const [employeeSalaries, setEmployeeSalaries] = useState<Record<string, number>>({});

  useEffect(() => {
    loadAllData();
  }, [selectedYear]);

  const loadAllData = async () => {
    try {
      setLoading(true);
      
      // Load eligible employees and entitlements (DB function already filters for active employees)
      const allEmployees = await getEligibleEmployeesForLeave(selectedYear);
      
      // Additionally filter out any resigned employees on the client side and get salaries
      const { data: activeEmployeeData } = await supabase
        .from('employees')
        .select('id, base_salary')
        .is('resign_date', null);
      
      const activeIds = new Set((activeEmployeeData || []).map(e => e.id));
      const salaryMap: Record<string, number> = {};
      (activeEmployeeData || []).forEach(e => {
        salaryMap[e.id] = Number(e.base_salary) || 0;
      });
      setEmployeeSalaries(salaryMap);
      
      const employees = allEmployees.filter(emp => activeIds.has(emp.id));
      
      setEligibleEmployees(employees);

      // Calculate entitlements for each employee
      const entitlementPromises = employees.map(async (emp) => {
        try {
          const entitlement = await calculateEmployeeLeaveEntitlement(emp.id, selectedYear);
          return { id: emp.id, entitlement };
        } catch (error) {
          console.error(`Error calculating entitlement for ${emp.id}:`, error);
          return { 
            id: emp.id, 
            entitlement: { 
              baseAnnualLeave: 0,
              yearsOfService: 0,
              serviceBonusDays: 0,
              totalAnnualLeave: 0,
              mondayHolidayBonus: 0, 
              finalAnnualLeave: 0, 
              medicalLeave: 0 
            } 
          };
        }
      });

      const results = await Promise.all(entitlementPromises);
      const entitlementsMap = results.reduce((acc, { id, entitlement }) => {
        acc[id] = entitlement;
        return acc;
      }, {} as Record<string, LeaveEntitlementCalculation>);

      setEntitlements(entitlementsMap);

      // Load encashment data (filter for active employees only)
      const [unusedLeave, encashmentHistory] = await Promise.all([
        getEmployeesWithUnusedLeave(selectedYear),
        getAllEncashmentRecords(selectedYear)
      ]);

      // Filter unused leave to only active employees
      const filteredUnusedLeave = unusedLeave.filter(emp => activeIds.has(emp.employee_id));
      
      setUnusedLeaveData(filteredUnusedLeave);
      setEncashmentRecords(encashmentHistory);

    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load leave data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateEncashmentAmount = (unusedDays: number, annualSalary: number): number => {
    // Formula: (unused leave days / work days in year) × annual salary
    return (unusedDays / WORK_DAYS_PER_YEAR) * annualSalary;
  };

  const handleEncashLeave = async (employeeId: string, employeeName: string, unusedDays: number) => {
    const annualSalary = employeeSalaries[employeeId] || 0;
    
    if (annualSalary <= 0) {
      toast({
        title: "Error",
        description: "Employee has no base salary configured. Cannot calculate encashment.",
        variant: "destructive",
      });
      return;
    }

    const encashmentAmount = calculateEncashmentAmount(unusedDays, annualSalary * 12); // Convert monthly to annual
    
    if (!confirm(`Add leave encashment allowance of $${encashmentAmount.toFixed(2)} for ${employeeName}?\n\nCalculation: ${unusedDays} days ÷ ${WORK_DAYS_PER_YEAR} work days × $${(annualSalary * 12).toFixed(2)} annual salary`)) {
      return;
    }

    try {
      setEncashingEmployeeId(employeeId);
      
      // Add the encashment as an allowance
      const { error } = await supabase
        .from('allowances')
        .insert({
          employee_id: employeeId,
          name: `Leave Encashment - ${unusedDays} days (${selectedYear})`,
          amount: encashmentAmount,
          type: 'Adhoc'
        });

      if (error) throw error;

      toast({
        title: "Encashment Added",
        description: `Leave encashment allowance of $${encashmentAmount.toFixed(2)} added for ${employeeName}`,
      });

      // Reload data to refresh the view
      await loadAllData();
    } catch (error) {
      console.error('Error adding encashment:', error);
      toast({
        title: "Error",
        description: "Failed to add leave encashment allowance",
        variant: "destructive",
      });
    } finally {
      setEncashingEmployeeId(null);
    }
  };

  const handleCleanupIneligibleData = async () => {
    if (!user || userrole !== 'superadmin') {
      toast({
        title: "Access Denied",
        description: "Only superadmin can perform data cleanup",
        variant: "destructive",
      });
      return;
    }

    if (!confirm('Are you sure you want to clean up leave data from ineligible employees? This action cannot be undone.')) {
      return;
    }

    try {
      setCleanupInProgress(true);
      const result = await cleanupIneligibleLeaveData();
      
      toast({
        title: "Cleanup Completed",
        description: `Removed ${result.deletedLeaveRequests} leave requests and ${result.deletedMondayBonuses} Monday holiday bonuses from ineligible employees.`,
      });

      // Reload data after cleanup
      await loadAllData();
    } catch (error) {
      console.error('Error during cleanup:', error);
      toast({
        title: "Cleanup Failed",
        description: "Failed to clean up ineligible leave data",
        variant: "destructive",
      });
    } finally {
      setCleanupInProgress(false);
    }
  };

  const totalAnnualLeavePool = Object.values(entitlements).reduce(
    (total, ent) => total + ent.finalAnnualLeave, 0
  );

  const totalMondayBonuses = Object.values(entitlements).reduce(
    (total, ent) => total + ent.mondayHolidayBonus, 0
  );

  const totalUnusedDays = unusedLeaveData.reduce((sum, emp) => sum + emp.unused_leave_days, 0);
  
  const totalEncashmentAmount = encashmentRecords
    .filter(record => record.status === 'Processed')
    .reduce((sum, record) => sum + record.total_encashment_amount, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading leave entitlements...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center">
              <Users className="w-6 h-6 text-green-600" />
              <div className="ml-3">
                <p className="text-xs text-green-600">Eligible Employees</p>
                <p className="text-xl font-bold text-green-900">{eligibleEmployees.length}</p>
                <p className="text-xs text-green-500">Full-Time only</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center">
              <Calendar className="w-6 h-6 text-blue-600" />
              <div className="ml-3">
                <p className="text-xs text-blue-600">Total Annual Leave Pool</p>
                <p className="text-xl font-bold text-blue-900">{totalAnnualLeavePool}</p>
                <p className="text-xs text-blue-500">Days available</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center">
              <CheckCircle className="w-6 h-6 text-purple-600" />
              <div className="ml-3">
                <p className="text-xs text-purple-600">Monday Holiday Bonuses</p>
                <p className="text-xl font-bold text-purple-900">{totalMondayBonuses}</p>
                <p className="text-xs text-purple-500">Extra days granted</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center">
              <TrendingUp className="w-6 h-6 text-orange-600" />
              <div className="ml-3">
                <p className="text-xs text-orange-600">Unused Leave Days</p>
                <p className="text-xl font-bold text-orange-900">{totalUnusedDays}</p>
                <p className="text-xs text-orange-500">Available for encashment</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-emerald-50 to-emerald-100 border-emerald-200">
          <CardContent className="p-4">
            <div className="flex items-center">
              <DollarSign className="w-6 h-6 text-emerald-600" />
              <div className="ml-3">
                <p className="text-xs text-emerald-600">Encashment Amount</p>
                <p className="text-xl font-bold text-emerald-900">${totalEncashmentAmount.toFixed(0)}</p>
                <p className="text-xs text-emerald-500">Total processed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center">
              <AlertTriangle className="w-6 h-6 text-gray-600" />
              <div className="ml-3">
                <p className="text-xs text-gray-600">System Status</p>
                <p className="text-sm font-bold text-gray-900">Validated</p>
                <p className="text-xs text-gray-500">DB triggers active</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Admin Actions */}
      {userrole === 'superadmin' && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800 flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2" />
              Admin Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-700">
                  Clean up leave data from employees who are not eligible for leave (Casual employees and Senior Partners).
                </p>
                <p className="text-xs text-red-600 mt-1">
                  This will remove leave requests and Monday holiday bonuses from ineligible employees.
                </p>
              </div>
              <Button
                onClick={handleCleanupIneligibleData}
                disabled={cleanupInProgress}
                variant="destructive"
                size="sm"
                className="ml-4"
              >
                {cleanupInProgress ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Cleaning...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Cleanup Ineligible Data
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="entitlements" className="space-y-4">
        <TabsList>
          <TabsTrigger value="entitlements">Employee Entitlements</TabsTrigger>
          <TabsTrigger value="unused-leave">Unused Leave & Encashment</TabsTrigger>
        </TabsList>

        <TabsContent value="entitlements">
          <Card>
            <CardHeader>
              <CardTitle>Employee Leave Entitlements ({selectedYear})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {eligibleEmployees.map((employee) => {
                  const entitlement = entitlements[employee.id];
                  if (!entitlement) return null;

                  return (
                    <div key={employee.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{employee.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {employee.type}{employee.position ? ` - ${employee.position}` : ''}
                          </Badge>
                          {!employee.joinDate && (
                            <Badge variant="secondary" className="text-xs">
                              No Join Date
                            </Badge>
                          )}
                        </div>
                        {employee.joinDate && (
                          <p className="text-xs text-gray-500 mt-1">
                            Joined: {new Date(employee.joinDate).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex space-x-4 text-sm">
                        <div className="text-center">
                          <p className="text-xs text-gray-500">Base Annual</p>
                          <p className="font-medium">{entitlement.baseAnnualLeave}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-500">Service Bonus</p>
                          <p className="font-medium text-green-600">+{entitlement.serviceBonusDays}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-500">Monday Bonus</p>
                          <p className="font-medium text-purple-600">+{entitlement.mondayHolidayBonus}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-500">Total Annual</p>
                          <p className="font-bold text-blue-600">{entitlement.finalAnnualLeave}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-500">Medical</p>
                          <p className="font-medium text-green-600">{entitlement.medicalLeave}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="unused-leave">
          <Card>
            <CardHeader>
              <CardTitle>Unused Leave & Encashment Status ({selectedYear})</CardTitle>
            </CardHeader>
            <CardContent>
              {unusedLeaveData.length === 0 ? (
                <div className="text-center p-8">
                  <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Unused Leave</h3>
                  <p className="text-gray-600">No employees have unused leave for {selectedYear}.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {unusedLeaveData.map((employee) => {
                    const encashmentRecord = encashmentRecords.find(
                      record => record.employee_id === employee.employee_id
                    );

                    return (
                      <div key={employee.employee_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{employee.employee_name}</span>
                            {encashmentRecord && (
                              <Badge variant="default" className="bg-green-600">
                                Encashed
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-4 text-sm">
                          <div className="text-center">
                            <p className="text-xs text-gray-500">Total Entitlement</p>
                            <p className="font-medium">{employee.total_entitlement}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-gray-500">Used</p>
                            <p className="font-medium text-blue-600">{employee.total_used}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-gray-500">Unused</p>
                            <p className="font-bold text-orange-600">{employee.unused_leave_days}</p>
                          </div>
                          {employee.unused_leave_days > 0 && userrole === 'superadmin' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-emerald-600 border-emerald-600 hover:bg-emerald-50"
                              onClick={() => handleEncashLeave(
                                employee.employee_id, 
                                employee.employee_name, 
                                employee.unused_leave_days
                              )}
                              disabled={encashingEmployeeId === employee.employee_id}
                            >
                              {encashingEmployeeId === employee.employee_id ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-600" />
                              ) : (
                                <>
                                  <Banknote className="w-4 h-4 mr-1" />
                                  Encash
                                </>
                              )}
                            </Button>
                          )}
                          {encashmentRecord && (
                            <>
                              <div className="text-center">
                                <p className="text-xs text-gray-500">Encashed Days</p>
                                <p className="font-medium text-green-600">{encashmentRecord.encashed_days}</p>
                              </div>
                              <div className="text-center">
                                <p className="text-xs text-gray-500">Amount</p>
                                <p className="font-bold text-green-600">${encashmentRecord.total_encashment_amount.toFixed(2)}</p>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EnhancedLeaveSummary;
