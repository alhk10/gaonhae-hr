
import React, { useState, useEffect } from 'react';
import AuthGuard from '@/components/auth/AuthGuard';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, FileText, Users, TrendingUp, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { getAllLeaveRequests, updateLeaveStatus } from '@/services/leaveService';
import { getEmployees } from '@/services/employeeService';
import BulkLeaveDialog from '@/components/leave/BulkLeaveDialog';
import LeaveCalendarView from '@/components/leave/LeaveCalendarView';
import EnhancedLeaveSummary from '@/components/leave/EnhancedLeaveSummary';
import LeaveSettings from '@/components/leave/LeaveSettings';

interface LeaveRequestWithEmployee {
  id: number;
  employeeId: string;
  employeeName: string;
  type: string;
  startDate: string;
  endDate: string;
  daysRequested: number;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  appliedDate: string;
  reviewedBy?: string;
  reviewedDate?: string;
}

const LeaveManagement = () => {
  console.log('🏖️ Leave Management page loading - comprehensive version v2.1');
  
  const [activeTab, setActiveTab] = useState('overview');
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequestWithEmployee[]>([]);
  const [employees, setEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [selectedRequests, setSelectedRequests] = useState<number[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [requestsData, employeesData] = await Promise.all([
        getAllLeaveRequests(),
        getEmployees()
      ]);

      // Map employee names to leave requests
      const requestsWithEmployees = requestsData.map(request => ({
        id: request.id,
        employeeId: request.employeeId,
        employeeName: employeesData.find(emp => emp.id === request.employeeId)?.name || 'Unknown Employee',
        type: request.type,
        startDate: request.startDate,
        endDate: request.endDate,
        daysRequested: request.days,
        reason: request.reason,
        status: request.status,
        appliedDate: request.appliedOn,
        reviewedBy: request.approvedBy,
        reviewedDate: request.approvedOn
      }));

      setLeaveRequests(requestsWithEmployees);
      setEmployees(employeesData);
      console.log('📋 Loaded leave requests:', requestsWithEmployees.length);
      console.log('👥 Loaded employees:', employeesData.length);
    } catch (error) {
      console.error('Error loading leave data:', error);
      toast.error('Failed to load leave data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveRequest = async (requestId: number) => {
    try {
      await updateLeaveStatus(requestId, 'Approved');
      toast.success('Leave request approved');
      loadData();
    } catch (error) {
      console.error('Error approving leave request:', error);
      toast.error('Failed to approve leave request');
    }
  };

  const handleRejectRequest = async (requestId: number) => {
    try {
      await updateLeaveStatus(requestId, 'Rejected');
      toast.success('Leave request rejected');
      loadData();
    } catch (error) {
      console.error('Error rejecting leave request:', error);
      toast.error('Failed to reject leave request');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Approved':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'Rejected':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Approved':
        return 'bg-green-100 text-green-800';
      case 'Rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const filteredRequests = leaveRequests.filter(request => {
    if (filterStatus === 'all') return true;
    return request.status.toLowerCase() === filterStatus.toLowerCase();
  });

  const pendingRequests = leaveRequests.filter(req => req.status === 'Pending');
  const approvedRequests = leaveRequests.filter(req => req.status === 'Approved');
  const rejectedRequests = leaveRequests.filter(req => req.status === 'Rejected');

  return (
    <AuthGuard>
      <ResponsiveLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Leave Management</h1>
              <p className="text-gray-600 mt-1">Manage employee leave requests and policies</p>
            </div>
            <div className="flex items-center space-x-4">
              <Button onClick={() => setIsBulkDialogOpen(true)}>
                <FileText className="w-4 h-4 mr-2" />
                Bulk Actions
              </Button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{leaveRequests.length}</div>
                <p className="text-xs text-muted-foreground">All time</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{pendingRequests.length}</div>
                <p className="text-xs text-muted-foreground">Awaiting review</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Approved</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{approvedRequests.length}</div>
                <p className="text-xs text-muted-foreground">This month</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Rejected</CardTitle>
                <XCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{rejectedRequests.length}</div>
                <p className="text-xs text-muted-foreground">This month</p>
              </CardContent>
            </Card>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">
                <TrendingUp className="w-4 h-4 mr-2" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="requests">
                <FileText className="w-4 h-4 mr-2" />
                Requests
              </TabsTrigger>
              <TabsTrigger value="calendar">
                <Calendar className="w-4 h-4 mr-2" />
                Calendar
              </TabsTrigger>
              <TabsTrigger value="settings">
                <Users className="w-4 h-4 mr-2" />
                Settings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <EnhancedLeaveSummary />
            </TabsContent>

            <TabsContent value="requests" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Leave Requests</CardTitle>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant={filterStatus === 'all' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFilterStatus('all')}
                      >
                        All
                      </Button>
                      <Button
                        variant={filterStatus === 'pending' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFilterStatus('pending')}
                      >
                        Pending
                      </Button>
                      <Button
                        variant={filterStatus === 'approved' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFilterStatus('approved')}
                      >
                        Approved
                      </Button>
                      <Button
                        variant={filterStatus === 'rejected' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFilterStatus('rejected')}
                      >
                        Rejected
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="text-center py-8">Loading leave requests...</div>
                  ) : filteredRequests.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No leave requests found
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredRequests.map((request) => (
                        <div key={request.id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3">
                                {getStatusIcon(request.status)}
                                <div>
                                  <h3 className="font-semibold">{request.employeeName}</h3>
                                  <p className="text-sm text-gray-600">
                                    {request.type} • {request.daysRequested} days
                                  </p>
                                </div>
                              </div>
                              <div className="mt-2">
                                <p className="text-sm text-gray-600">
                                  {new Date(request.startDate).toLocaleDateString()} - {new Date(request.endDate).toLocaleDateString()}
                                </p>
                                {request.reason && (
                                  <p className="text-sm text-gray-500 mt-1">
                                    Reason: {request.reason}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center space-x-3">
                              <Badge className={getStatusColor(request.status)}>
                                {request.status}
                              </Badge>
                              {request.status === 'Pending' && (
                                <div className="flex space-x-2">
                                  <Button
                                    size="sm"
                                    onClick={() => handleApproveRequest(request.id)}
                                    className="bg-green-600 hover:bg-green-700"
                                  >
                                    Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleRejectRequest(request.id)}
                                  >
                                    Reject
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="calendar" className="space-y-6">
              <LeaveCalendarView />
            </TabsContent>

            <TabsContent value="settings" className="space-y-6">
              <LeaveSettings />
            </TabsContent>
          </Tabs>

          <BulkLeaveDialog
            isOpen={isBulkDialogOpen}
            onClose={() => setIsBulkDialogOpen(false)}
            selectedDate={selectedDate}
            onSuccess={loadData}
          />
        </div>
      </ResponsiveLayout>
    </AuthGuard>
  );
};

export default LeaveManagement;
