import React, { useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Users, Plus, Info, Settings } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { getEmployees } from '@/services/employeeService';
import { getAllLeaveRequests, addLeaveRequest, updateLeaveStatus, LeaveRequest } from '@/services/leaveService';
import LeaveCalendarView from '@/components/leave/LeaveCalendarView';
import LeaveSettings from '@/components/leave/LeaveSettings';
import LeaveSummaryPanel from '@/components/leave/LeaveSummaryPanel';
import { useAuth } from '@/contexts/AuthContext';
import { calculateLeaveBalance, getLeaveEntitlementSummary } from '@/utils/leaveCalculations';
import { getLeaveTypes } from '@/services/leaveTypesService';

const LeaveManagement = () => {
  const { user } = useAuth();
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<string[]>([]);
  const [isAddLeaveOpen, setIsAddLeaveOpen] = useState(false);
  const [isBulkLeaveOpen, setIsBulkLeaveOpen] = useState(false);
  const [isLeaveDetailsOpen, setIsLeaveDetailsOpen] = useState(false);
  const [isLeaveSettingsOpen, setIsLeaveSettingsOpen] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      console.log('Loading leave and employee data...');
      
      const [leaveData, employeeData, leaveTypesData] = await Promise.all([
        getAllLeaveRequests(),
        getEmployees(),
        getLeaveTypes()
      ]);
      
      console.log('Loaded employees:', employeeData);
      console.log('Loaded leaves:', leaveData);
      console.log('Loaded leave types:', leaveTypesData);
      
      setLeaves(leaveData);
      // Filter out casual employees and Senior Partners as they are not entitled to leaves
      const eligibleEmployees = employeeData.filter(emp => 
        emp.type === 'Full-Time' && emp.position !== 'Senior Partner'
      );
      setEmployees(eligibleEmployees);
      setLeaveTypes(leaveTypesData.map(type => type.name));
    } catch (error) {
      console.error('Error loading data:', error);
      toast("Error loading data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaveRequests = async () => {
    try {
      setLoading(true);
      const data = await getAllLeaveRequests();
      setLeaves(data);
    } catch (error) {
      console.error('Error fetching leave requests:', error);
      toast("Error loading leave requests. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const refreshLeaveTypes = async () => {
    try {
      const leaveTypesData = await getLeaveTypes();
      setLeaveTypes(leaveTypesData.map(type => type.name));
      console.log('Leave types refreshed:', leaveTypesData);
    } catch (error) {
      console.error('Error refreshing leave types:', error);
    }
  };

  const handleApprove = async (id: number) => {
    try {
      await updateLeaveStatus(id, 'Approved', 'Current User');
      await fetchLeaveRequests();
      toast("Leave application approved");
    } catch (error) {
      console.error('Error approving leave:', error);
      toast("Error approving leave. Please try again.");
    }
  };

  const handleReject = async (id: number) => {
    try {
      await updateLeaveStatus(id, 'Rejected');
      await fetchLeaveRequests();
      toast("Leave application rejected");
    } catch (error) {
      console.error('Error rejecting leave:', error);
      toast("Error rejecting leave. Please try again.");
    }
  };

  const handleAddLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    
    const employeeId = formData.get('employee') as string;
    const employee = employees.find(emp => emp.id === employeeId);
    
    if (!employee) {
      toast("Please select a valid employee");
      return;
    }

    // Check that the employee is eligible (full-time and not Senior Partner)
    if (employee.type === 'Casual' || employee.position === 'Senior Partner') {
      toast("This employee is not entitled to leave benefits");
      return;
    }

    const leaveType = formData.get('type') as string;
    
    // Check if employee has remaining leave days
    if (employee.joinDate && leaveType === 'Annual Leave') {
      const leaveBalance = calculateLeaveBalance(employee.id, employee.joinDate, leaves);
      if (leaveBalance.annualLeave.remaining <= 0) {
        toast(`${employee.name} has no remaining annual leave days`);
        return;
      }
    }

    const startDate = formData.get('startDate') as string;
    const endDate = formData.get('endDate') as string;
    const daysDiff = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 3600 * 24)) + 1;

    const newLeave: Omit<LeaveRequest, 'id'> = {
      employeeId: employee.id,
      employeeName: employee.name,
      type: leaveType,
      startDate,
      endDate,
      days: daysDiff,
      status: 'Approved',
      reason: formData.get('reason') as string,
      appliedOn: new Date().toISOString().split('T')[0],
      approvedBy: 'Admin',
      approvedOn: new Date().toISOString().split('T')[0]
    };

    try {
      await addLeaveRequest(newLeave);
      await fetchLeaveRequests();
      setIsAddLeaveOpen(false);
      toast("Leave added successfully");
    } catch (error) {
      console.error('Error adding leave:', error);
      toast("Error adding leave. Please try again.");
    }
  };

  const handleBulkLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const selectedEmployees = formData.getAll('employees') as string[];
    
    const startDate = formData.get('startDate') as string;
    const endDate = formData.get('endDate') as string;
    const daysDiff = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 3600 * 24)) + 1;
    
    try {
      const promises = selectedEmployees.map(employeeId => {
        const employee = employees.find(emp => emp.id === employeeId);
        if (!employee || employee.type === 'Casual' || employee.position === 'Senior Partner') return Promise.resolve();

        const newLeave: Omit<LeaveRequest, 'id'> = {
          employeeId: employee.id,
          employeeName: employee.name,
          type: formData.get('type') as string,
          startDate,
          endDate,
          days: daysDiff,
          status: 'Approved',
          reason: formData.get('reason') as string,
          appliedOn: new Date().toISOString().split('T')[0],
          approvedBy: 'Admin',
          approvedOn: new Date().toISOString().split('T')[0]
        };
        
        return addLeaveRequest(newLeave);
      });
      
      await Promise.all(promises);
      await fetchLeaveRequests();
      setIsBulkLeaveOpen(false);
      toast(`Bulk leave added for ${selectedEmployees.length} employees`);
    } catch (error) {
      console.error('Error adding bulk leave:', error);
      toast("Error adding bulk leave. Please try again.");
    }
  };

  const showLeaveDetails = (leave: LeaveRequest) => {
    setSelectedLeave(leave);
    setIsLeaveDetailsOpen(true);
  };

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
                <p className="mt-4 text-gray-600">Loading leave requests...</p>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex h-[calc(100vh-73px)]">
        <Sidebar />
        <main className="flex-1 p-6 overflow-auto">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Leave Management</h2>
                <p className="text-gray-600">Manage employee leave applications</p>
              </div>
              <div className="flex space-x-2">
                <Dialog open={isAddLeaveOpen} onOpenChange={setIsAddLeaveOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Leave
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Add Leave</DialogTitle>
                      <DialogDescription>Add a new leave application for an eligible employee.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAddLeave}>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label htmlFor="employee">Employee (Eligible Only)</Label>
                          <Select name="employee" required>
                            <SelectTrigger>
                              <SelectValue placeholder="Select eligible employee" />
                            </SelectTrigger>
                            <SelectContent>
                              {employees.map((employee) => (
                                <SelectItem key={employee.id} value={employee.id}>
                                  {employee.name} ({employee.id})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="type">Leave Type</Label>
                          <Select name="type" required>
                            <SelectTrigger>
                              <SelectValue placeholder="Select leave type" />
                            </SelectTrigger>
                            <SelectContent>
                              {leaveTypes.map((type) => (
                                <SelectItem key={type} value={type}>
                                  {type}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="grid gap-2">
                            <Label htmlFor="startDate">Start Date</Label>
                            <Input name="startDate" type="date" required />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="endDate">End Date</Label>
                            <Input name="endDate" type="date" required />
                          </div>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="reason">Reason</Label>
                          <Textarea name="reason" placeholder="Enter reason for leave" required />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsAddLeaveOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit">Add Leave</Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>

                <Dialog open={isBulkLeaveOpen} onOpenChange={setIsBulkLeaveOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <Users className="w-4 h-4 mr-2" />
                      Bulk Leave
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Bulk Leave</DialogTitle>
                      <DialogDescription>Add leave for multiple eligible employees at once.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleBulkLeave}>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label>Select Employees (Eligible Only)</Label>
                          <div className="space-y-2 max-h-32 overflow-y-auto">
                            {employees.map((employee) => (
                              <label key={employee.id} className="flex items-center space-x-2">
                                <input type="checkbox" name="employees" value={employee.id} />
                                <span>{employee.name} ({employee.id})</span>
                              </label>
                            ))}
                          </div>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="type">Leave Type</Label>
                          <Select name="type" required>
                            <SelectTrigger>
                              <SelectValue placeholder="Select leave type" />
                            </SelectTrigger>
                            <SelectContent>
                              {leaveTypes.map((type) => (
                                <SelectItem key={type} value={type}>
                                  {type}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="grid gap-2">
                            <Label htmlFor="startDate">Start Date</Label>
                            <Input name="startDate" type="date" required />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="endDate">End Date</Label>
                            <Input name="endDate" type="date" required />
                          </div>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="reason">Reason</Label>
                          <Textarea name="reason" placeholder="Enter reason for leave" required />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsBulkLeaveOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit">Add Bulk Leave</Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>

                {user?.role === 'superadmin' && (
                  <Dialog open={isLeaveSettingsOpen} onOpenChange={setIsLeaveSettingsOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline">
                        <Settings className="w-4 h-4 mr-2" />
                        Leave Settings
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-auto">
                      <DialogHeader>
                        <DialogTitle>Leave Settings</DialogTitle>
                        <DialogDescription>Configure leave types and policies (Superadmin Only)</DialogDescription>
                      </DialogHeader>
                      <LeaveSettings />
                      <DialogFooter>
                        <Button onClick={async () => {
                          setIsLeaveSettingsOpen(false);
                          // Reload leave types after settings are closed
                          await refreshLeaveTypes();
                          toast("Leave settings updated successfully");
                        }}>Close</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </div>

            {/* Updated Information Banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h3 className="font-medium text-blue-900">Leave Policy Information</h3>
                  <div className="text-sm text-blue-700 mt-1 space-y-1">
                    <p>• Only full-time employees (excluding Senior Partners) are entitled to annual leave and medical leave benefits</p>
                    <p>• Annual leave starts at 14 days + 1 additional day per year of service (max 18 days)</p>
                    <p>• Annual leave is pro-rated for employees joining mid-year</p>
                    <p>• Medical leave is fixed at 14 days per year for all eligible employees</p>
                    <p>• Casual employees and Senior Partners are not included in leave management</p>
                    <p>• Click on calendar entries to view details and approve/reject pending requests</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Leave Summary Panel */}
            <LeaveSummaryPanel />

            {/* Tabs for Leave Calendar and Employee Balance */}
            <Card>
              <CardHeader>
                <CardTitle>Leave Overview</CardTitle>
                <CardDescription>Calendar view and employee leave balances</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="calendar" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="calendar">Leave Calendar</TabsTrigger>
                    <TabsTrigger value="balances">Employee Balances</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="calendar" className="space-y-4">
                    <LeaveCalendarView leaves={leaves} onLeaveUpdate={fetchLeaveRequests} />
                  </TabsContent>
                  
                  <TabsContent value="balances" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {employees.map((employee) => {
                        const leaveBalance = employee.joinDate 
                          ? calculateLeaveBalance(employee.id, employee.joinDate, leaves)
                          : { annualLeave: { total: 0, used: 0, remaining: 0 }, medicalLeave: { total: 14, used: 0, remaining: 14 } };
                        
                        return (
                          <Card key={employee.id} className="hover:shadow-md transition-shadow">
                            <CardContent className="p-4">
                              <div className="space-y-2">
                                <h4 className="font-medium text-gray-900">{employee.name}</h4>
                                <p className="text-xs text-gray-500">{employee.id}</p>
                                {employee.joinDate && (
                                  <p className="text-xs text-blue-600">
                                    {getLeaveEntitlementSummary(employee.joinDate)}
                                  </p>
                                )}
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                  <div className="text-center p-2 bg-blue-50 rounded">
                                    <p className="text-xs text-gray-600">Annual</p>
                                    <p className="font-bold text-blue-600">{leaveBalance.annualLeave.remaining}</p>
                                    <p className="text-xs text-gray-500">remaining</p>
                                  </div>
                                  <div className="text-center p-2 bg-green-50 rounded">
                                    <p className="text-xs text-gray-600">Medical</p>
                                    <p className="font-bold text-green-600">{leaveBalance.medicalLeave.remaining}</p>
                                    <p className="text-xs text-gray-500">remaining</p>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="w-5 h-5" />
                  <span>Leave Applications</span>
                </CardTitle>
                <CardDescription>Review and manage leave requests from eligible employees</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Dates</TableHead>
                      <TableHead>Days</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leaves.map((leave) => (
                      <TableRow key={leave.id}>
                        <TableCell className="font-medium">{leave.employeeName}</TableCell>
                        <TableCell>{leave.type}</TableCell>
                        <TableCell>
                          {leave.startDate === leave.endDate 
                            ? leave.startDate 
                            : `${leave.startDate} to ${leave.endDate}`
                          }
                        </TableCell>
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
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm" onClick={() => showLeaveDetails(leave)}>
                              View
                            </Button>
                            {leave.status === 'Pending' && (
                              <>
                                <Button variant="outline" size="sm" onClick={() => handleApprove(leave.id)}>
                                  Approve
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => handleReject(leave.id)}>
                                  Reject
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {leaves.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                          No leave requests found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Dialog open={isLeaveDetailsOpen} onOpenChange={setIsLeaveDetailsOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Leave Details</DialogTitle>
                </DialogHeader>
                {selectedLeave && (
                  <div className="space-y-4">
                    <div>
                      <Label>Employee</Label>
                      <p>{selectedLeave.employeeName} ({selectedLeave.employeeId})</p>
                    </div>
                    <div>
                      <Label>Leave Type</Label>
                      <p>{selectedLeave.type}</p>
                    </div>
                    <div>
                      <Label>Dates</Label>
                      <p>
                        {selectedLeave.startDate === selectedLeave.endDate 
                          ? selectedLeave.startDate 
                          : `${selectedLeave.startDate} to ${selectedLeave.endDate}`
                        }
                      </p>
                    </div>
                    <div>
                      <Label>Days</Label>
                      <p>{selectedLeave.days}</p>
                    </div>
                    <div>
                      <Label>Reason</Label>
                      <p>{selectedLeave.reason || 'No reason provided'}</p>
                    </div>
                    <div>
                      <Label>Applied On</Label>
                      <p>{selectedLeave.appliedOn}</p>
                    </div>
                    <div>
                      <Label>Status</Label>
                      <Badge variant={selectedLeave.status === 'Approved' ? 'default' : selectedLeave.status === 'Pending' ? 'secondary' : 'destructive'}>
                        {selectedLeave.status}
                      </Badge>
                    </div>
                    {selectedLeave.approvedBy && (
                      <div>
                        <Label>Approved By</Label>
                        <p>{selectedLeave.approvedBy} on {selectedLeave.approvedOn}</p>
                      </div>
                    )}
                  </div>
                )}
                <DialogFooter>
                  <Button onClick={() => setIsLeaveDetailsOpen(false)}>Close</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </main>
      </div>
    </div>
  );
};

export default LeaveManagement;
