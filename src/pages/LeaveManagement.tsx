import React, { useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/use-toast';
import { CalendarDays, Users, Check, X, Clock, Calendar, Trash2, AlertTriangle, Info, Shield, Award } from 'lucide-react';
import { getAllLeaveRequests, updateLeaveStatus, type LeaveRequest } from '@/services/leaveService';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import LeaveCalendarView from '@/components/leave/LeaveCalendarView';
import LeaveSummaryPanel from '@/components/leave/LeaveSummaryPanel';
import EnhancedLeaveSummary from '@/components/leave/EnhancedLeaveSummary';
import { getEmployees } from '@/services/employeeService';
import { isEligibleForLeave } from '@/utils/employeeEligibility';
import { getEligibleEmployeesForLeave, calculateEmployeeLeaveEntitlement } from '@/services/enhancedLeaveService';

const LeaveManagement = () => {
  const { user } = useAuth();
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [eligibleEmployees, setEligibleEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOnlyEligible, setShowOnlyEligible] = useState(true);
  const [systemValidated, setSystemValidated] = useState(false);
  const [stats, setStats] = useState({
    totalRequests: 0,
    pendingRequests: 0,
    approvedRequests: 0,
    rejectedRequests: 0,
    eligibleEmployees: 0,
    ineligibleEmployees: 0,
    averageYearsOfService: 0,
    totalLeaveEntitlement: 0
  });

  useEffect(() => {
    loadData();
    validateSystemIntegrity();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load leaves, employees, and eligible employees with entitlements in parallel
      const [allLeaves, allEmployees, eligibleEmployeesWithEntitlements] = await Promise.all([
        getAllLeaveRequests(),
        getEmployees(),
        getEligibleEmployeesForLeave()
      ]);
      
      setLeaves(allLeaves);
      setEmployees(allEmployees);
      setEligibleEmployees(eligibleEmployeesWithEntitlements);
      
      // Filter eligible employees and their leave requests
      const eligibleEmployeeIds = new Set(eligibleEmployeesWithEntitlements.map(emp => emp.id));
      const eligibleLeaveRequests = allLeaves.filter(leave => eligibleEmployeeIds.has(leave.employeeId));
      
      // Calculate enhanced stats
      const averageYears = eligibleEmployeesWithEntitlements.length > 0 
        ? Math.round(eligibleEmployeesWithEntitlements.reduce((sum, emp) => sum + (emp.yearsOfService || 0), 0) / eligibleEmployeesWithEntitlements.length)
        : 0;
        
      const totalEntitlement = eligibleEmployeesWithEntitlements.reduce((sum, emp) => 
        sum + (emp.leaveEntitlement?.finalAnnualLeave || 0), 0);
      
      setStats({
        totalRequests: eligibleLeaveRequests.length,
        pendingRequests: eligibleLeaveRequests.filter(l => l.status === 'Pending').length,
        approvedRequests: eligibleLeaveRequests.filter(l => l.status === 'Approved').length,
        rejectedRequests: eligibleLeaveRequests.filter(l => l.status === 'Rejected').length,
        eligibleEmployees: eligibleEmployeesWithEntitlements.length,
        ineligibleEmployees: allEmployees.length - eligibleEmployeesWithEntitlements.length,
        averageYearsOfService: averageYears,
        totalLeaveEntitlement: totalEntitlement
      });
      
      console.log('Loaded leaves:', allLeaves.length, 'Eligible leaves:', eligibleLeaveRequests.length);
      console.log('Eligible employees with entitlements:', eligibleEmployeesWithEntitlements.length, 'Total employees:', allEmployees.length);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Error loading leave data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const validateSystemIntegrity = async () => {
    try {
      // Test the database functions
      const { data, error } = await supabase.rpc('calculate_years_of_service', {
        join_date: '2020-01-01'
      });
      
      if (error) {
        console.warn('Database function validation failed:', error);
        setSystemValidated(false);
      } else {
        setSystemValidated(true);
      }
    } catch (error) {
      console.warn('System validation check failed:', error);
      setSystemValidated(false);
    }
  };

  const handleApprove = async (leaveId: number) => {
    try {
      await updateLeaveStatus(leaveId, 'Approved', user?.name);
      toast({
        title: "Success",
        description: "Leave request approved",
      });
      await loadData();
    } catch (error: any) {
      console.error('Error approving leave:', error);
      const errorMessage = error?.message?.includes('not eligible') 
        ? 'Cannot approve: Employee is not eligible for leave'
        : error?.message?.includes('exceeds') 
        ? `Cannot approve: ${error.message}`
        : 'Error approving leave request';
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleReject = async (leaveId: number) => {
    try {
      await updateLeaveStatus(leaveId, 'Rejected', user?.name);
      toast({
        title: "Success",
        description: "Leave request rejected",
      });
      await loadData();
    } catch (error) {
      console.error('Error rejecting leave:', error);
      toast({
        title: "Error",
        description: "Error rejecting leave request",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (leaveId: number) => {
    if (!user || user.role !== 'superadmin') {
      toast({
        title: "Access Denied",
        description: "Only superadmin can delete leave records",
        variant: "destructive",
      });
      return;
    }

    if (!confirm('Are you sure you want to delete this leave record? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('leave_requests')
        .delete()
        .eq('id', leaveId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Leave record deleted successfully",
      });
      await loadData();
    } catch (error: any) {
      console.error('Error deleting leave:', error);
      const errorMessage = error?.message || 'Error deleting leave record';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  // Get employee info with eligibility status and years of service
  const getEmployeeInfo = (employeeId: string) => {
    const employee = employees.find(emp => emp.id === employeeId);
    const eligibleEmployee = eligibleEmployees.find(emp => emp.id === employeeId);
    
    if (!employee) return { type: 'Unknown', eligible: false, displayText: 'Unknown Employee', yearsOfService: 0 };
    
    const eligible = isEligibleForLeave(employee);
    const yearsOfService = eligibleEmployee?.yearsOfService || 0;
    const entitlement = eligibleEmployee?.leaveEntitlement;
    
    let displayText = `${employee.type}${employee.position ? ` (${employee.position})` : ''}`;
    if (eligible && yearsOfService > 0) {
      displayText += ` - ${yearsOfService}Y`;
    }
    
    return { 
      type: employee.type, 
      position: employee.position,
      eligible, 
      displayText,
      hasJoinDate: !!employee.joinDate,
      yearsOfService,
      entitlement
    };
  };

  // Filter leaves based on eligibility toggle
  const filteredLeaves = showOnlyEligible 
    ? leaves.filter(leave => {
        const employee = employees.find(emp => emp.id === leave.employeeId);
        return employee && isEligibleForLeave(employee);
      })
    : leaves;

  // Get enhanced policy information
  const getPolicyInfo = () => {
    return {
      basePolicy: "14 annual leave days + 1 additional day per year of service (maximum 18 days total)",
      medicalLeave: "14 medical leave days",
      eligibility: "Full-Time employees only (excluding Senior Partners)",
      proRating: "Pro-rated from join date for employees who joined mid-year",
      mondayBonus: "Additional days for public holidays falling on Monday"
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex h-[calc(100vh-73px)]">
          <Sidebar />
          <main className="flex-1 p-6 overflow-auto">
            <div className="text-center flex items-center justify-center h-full">
              <div>
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-lg text-gray-600">Loading leave data...</p>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const policyInfo = getPolicyInfo();

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex h-[calc(100vh-73px)]">
        <Sidebar />
        <main className="flex-1 p-6 overflow-auto">
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Leave Management</h1>
              <p className="text-gray-600 mt-2">Manage and approve employee leave requests</p>
              <div className="flex items-center space-x-4 mt-2">
                <p className="text-sm text-gray-500">{stats.eligibleEmployees} eligible employees</p>
                {stats.ineligibleEmployees > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {stats.ineligibleEmployees} ineligible employees
                  </Badge>
                )}
                <div className="flex items-center space-x-1">
                  <Shield className={`w-4 h-4 ${systemValidated ? 'text-green-600' : 'text-orange-600'}`} />
                  <span className={`text-xs ${systemValidated ? 'text-green-600' : 'text-orange-600'}`}>
                    {systemValidated ? 'Database Functions Active' : 'Validation Pending'}
                  </span>
                </div>
              </div>
            </div>

            {/* Enhanced Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
              <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <CalendarDays className="w-6 h-6 text-blue-600" />
                    <div className="ml-3">
                      <p className="text-xs text-blue-600">Total Requests</p>
                      <p className="text-xl font-bold text-blue-900">{stats.totalRequests}</p>
                      <p className="text-xs text-blue-500">Eligible only</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-200">
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <Clock className="w-6 h-6 text-yellow-600" />
                    <div className="ml-3">
                      <p className="text-xs text-yellow-600">Pending</p>
                      <p className="text-xl font-bold text-yellow-900">{stats.pendingRequests}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <Check className="w-6 h-6 text-green-600" />
                    <div className="ml-3">
                      <p className="text-xs text-green-600">Approved</p>
                      <p className="text-xl font-bold text-green-900">{stats.approvedRequests}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-red-50 to-red-100 border-red-200">
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <X className="w-6 h-6 text-red-600" />
                    <div className="ml-3">
                      <p className="text-xs text-red-600">Rejected</p>
                      <p className="text-xl font-bold text-red-900">{stats.rejectedRequests}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <Users className="w-6 h-6 text-purple-600" />
                    <div className="ml-3">
                      <p className="text-xs text-purple-600">Eligible Staff</p>
                      <p className="text-xl font-bold text-purple-900">{stats.eligibleEmployees}</p>
                      <p className="text-xs text-purple-500">Full-Time only</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-indigo-50 to-indigo-100 border-indigo-200">
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <Award className="w-6 h-6 text-indigo-600" />
                    <div className="ml-3">
                      <p className="text-xs text-indigo-600">Avg. Service</p>
                      <p className="text-xl font-bold text-indigo-900">{stats.averageYearsOfService}Y</p>
                      <p className="text-xs text-indigo-500">Years</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Updated Policy Information */}
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-blue-800">Updated Leave Policy (2025)</h3>
                    <div className="text-sm text-blue-700 mt-1 space-y-1">
                      <p>• <strong>Annual Leave:</strong> {policyInfo.basePolicy}</p>
                      <p>• <strong>Medical Leave:</strong> {policyInfo.medicalLeave}</p>
                      <p>• <strong>Monday Holiday Bonus:</strong> +1 annual leave day for each public holiday that falls on Monday</p>
                      <p>• <strong>Eligibility:</strong> {policyInfo.eligibility}</p>
                      <p>• <strong>Pro-rating:</strong> {policyInfo.proRating}</p>
                      <p>• <strong>Database Validation:</strong> {systemValidated ? '✅ Active - Automatic entitlement calculation and validation' : '⚠️ Pending validation'}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Warning for ineligible employees with leave requests */}
            {leaves.some(leave => !getEmployeeInfo(leave.employeeId).eligible) && (
              <Card className="border-orange-200 bg-orange-50">
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5" />
                    <div>
                      <h3 className="font-medium text-orange-800">Legacy Data Warning</h3>
                      <p className="text-sm text-orange-700 mt-1">
                        Some leave requests are from employees not eligible under the current policy (Casual employees or Senior Partners). 
                        These may be legacy requests. Database triggers now prevent new invalid requests based on the updated policy.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Main Content */}
            <Tabs defaultValue="list" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="list">Leave Requests</TabsTrigger>
                <TabsTrigger value="calendar">Calendar View</TabsTrigger>
                <TabsTrigger value="summary">Summary</TabsTrigger>
                <TabsTrigger value="enhanced">System Overview</TabsTrigger>
              </TabsList>

              <TabsContent value="list">
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle>Leave Requests</CardTitle>
                        <CardDescription>
                          Review and manage employee leave requests with new policy validation
                        </CardDescription>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant={showOnlyEligible ? "default" : "outline"}
                          size="sm"
                          onClick={() => setShowOnlyEligible(!showOnlyEligible)}
                        >
                          {showOnlyEligible ? "Show All" : "Eligible Only"}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {filteredLeaves.length > 0 ? (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Employee</TableHead>
                              <TableHead>Type & Service</TableHead>
                              <TableHead>Leave Type</TableHead>
                              <TableHead>Start Date</TableHead>
                              <TableHead>End Date</TableHead>
                              <TableHead>Days</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Applied On</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredLeaves.map((leave) => {
                              const employeeInfo = getEmployeeInfo(leave.employeeId);
                              return (
                                <TableRow key={leave.id} className={!employeeInfo.eligible ? 'bg-orange-50' : ''}>
                                  <TableCell className="font-medium">{leave.employeeName}</TableCell>
                                  <TableCell>
                                    <div className="flex items-center space-x-2">
                                      <span className="text-sm">{employeeInfo.displayText}</span>
                                      {!employeeInfo.eligible && (
                                        <Badge variant="destructive" className="text-xs">
                                          Ineligible
                                        </Badge>
                                      )}
                                      {employeeInfo.eligible && !employeeInfo.hasJoinDate && (
                                        <Badge variant="secondary" className="text-xs">
                                          No Join Date
                                        </Badge>
                                      )}
                                      {employeeInfo.entitlement && (
                                        <Badge variant="outline" className="text-xs">
                                          {employeeInfo.entitlement.finalAnnualLeave}AL
                                        </Badge>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell>{leave.type}</TableCell>
                                  <TableCell>{new Date(leave.startDate).toLocaleDateString()}</TableCell>
                                  <TableCell>{new Date(leave.endDate).toLocaleDateString()}</TableCell>
                                  <TableCell>{leave.days}</TableCell>
                                  <TableCell>
                                    <Badge 
                                      variant={
                                        leave.status === 'Approved' ? 'default' : 
                                        leave.status === 'Pending' ? 'secondary' : 
                                        'destructive'
                                      }
                                    >
                                      {leave.status}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>{new Date(leave.appliedOn).toLocaleDateString()}</TableCell>
                                  <TableCell>
                                    <div className="flex space-x-2">
                                      {leave.status === 'Pending' && user?.role !== 'employee' && (
                                        <>
                                          <Button
                                            size="sm"
                                            onClick={() => handleApprove(leave.id)}
                                            className="bg-green-600 hover:bg-green-700"
                                            disabled={!employeeInfo.eligible}
                                            title={!employeeInfo.eligible ? "Employee not eligible for leave" : "Approve leave request"}
                                          >
                                            <Check className="w-4 h-4" />
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="destructive"
                                            onClick={() => handleReject(leave.id)}
                                            title="Reject leave request"
                                          >
                                            <X className="w-4 h-4" />
                                          </Button>
                                        </>
                                      )}
                                      
                                      {user?.role === 'superadmin' && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => handleDelete(leave.id)}
                                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                          title="Delete leave record (Superadmin only)"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </Button>
                                      )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="text-center py-12 text-gray-500">
                        <CalendarDays className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <p className="text-lg">
                          {showOnlyEligible ? 'No leave requests from eligible employees' : 'No leave requests found'}
                        </p>
                        <p className="text-sm">
                          {showOnlyEligible 
                            ? 'Toggle to "Show All" to see requests from all employees' 
                            : 'Leave requests will appear here once submitted by employees'
                          }
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="calendar">
                <LeaveCalendarView />
              </TabsContent>

              <TabsContent value="summary">
                <LeaveSummaryPanel />
              </TabsContent>

              <TabsContent value="enhanced">
                <EnhancedLeaveSummary />
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
};

export default LeaveManagement;
