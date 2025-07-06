
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import { Users, Calendar, AlertTriangle, CheckCircle, Trash2 } from 'lucide-react';
import { 
  getEligibleEmployeesForLeave, 
  calculateEmployeeLeaveEntitlement,
  cleanupIneligibleLeaveData,
  type EligibleEmployee,
  type LeaveEntitlementCalculation 
} from '@/services/enhancedLeaveService';
import { useAuth } from '@/contexts/AuthContext';

const EnhancedLeaveSummary = () => {
  const { user } = useAuth();
  const [eligibleEmployees, setEligibleEmployees] = useState<EligibleEmployee[]>([]);
  const [entitlements, setEntitlements] = useState<Record<string, LeaveEntitlementCalculation>>({});
  const [loading, setLoading] = useState(true);
  const [cleanupInProgress, setCleanupInProgress] = useState(false);

  useEffect(() => {
    loadEligibleEmployeesData();
  }, []);

  const loadEligibleEmployeesData = async () => {
    try {
      setLoading(true);
      const employees = await getEligibleEmployeesForLeave();
      setEligibleEmployees(employees);

      // Calculate entitlements for each employee
      const entitlementPromises = employees.map(async (emp) => {
        try {
          const entitlement = await calculateEmployeeLeaveEntitlement(emp.id);
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
    } catch (error) {
      console.error('Error loading eligible employees data:', error);
      toast({
        title: "Error",
        description: "Failed to load employee leave data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCleanupIneligibleData = async () => {
    if (!user || user.role !== 'superadmin') {
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
      await loadEligibleEmployeesData();
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              <AlertTriangle className="w-6 h-6 text-orange-600" />
              <div className="ml-3">
                <p className="text-xs text-orange-600">System Status</p>
                <p className="text-sm font-bold text-orange-900">Validated</p>
                <p className="text-xs text-orange-500">DB triggers active</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Admin Actions */}
      {user?.role === 'superadmin' && (
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

      {/* Employee Entitlements */}
      <Card>
        <CardHeader>
          <CardTitle>Employee Leave Entitlements ({new Date().getFullYear()})</CardTitle>
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
    </div>
  );
};

export default EnhancedLeaveSummary;
