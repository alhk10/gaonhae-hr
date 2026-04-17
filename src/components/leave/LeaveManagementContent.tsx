
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
import { formatDate } from '@/utils/dateFormat';
  Clock, 
  Users, 
  Calendar, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  TrendingUp
} from 'lucide-react';
import { toast } from 'sonner';
import { getAllLeaveRequests, updateLeaveRequest } from '@/services/leaveService';
import { getEmployees } from '@/services/employeeService';
import EnhancedLeaveSummary from '@/components/leave/EnhancedLeaveSummary';
import LeaveCalendarView from '@/components/leave/LeaveCalendarView';
import LeaveSettings from '@/components/leave/LeaveSettings';
import BulkLeaveDialog from '@/components/leave/BulkLeaveDialog';

interface LeaveRequestWithEmployee {
  id: number;
  employeeId: string;
  employeeName: string;
  type: string;
  startDate: string;
  endDate: string;
  days: number;
  status: 'Pending' | 'Approved' | 'Rejected';
  reason: string;
  appliedDate: string;
}

const LeaveManagementContent = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequestWithEmployee[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');

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

      const activeEmployees = employeesData.filter(emp => !emp.resignDate);
      setEmployees(activeEmployees);

      const requestsWithNames: LeaveRequestWithEmployee[] = requestsData
        .map((request: any) => {
          const employee = employeesData.find(emp => emp.id === request.employeeId);
          return {
            id: request.id,
            employeeId: request.employeeId,
            employeeName: employee?.name || request.employeeName || 'Unknown',
            type: request.type,
            startDate: request.startDate,
            endDate: request.endDate,
            days: request.days,
            status: request.status,
            reason: request.reason || '',
            appliedDate: request.appliedOn || new Date().toISOString(),
            _hasResignDate: !!employee?.resignDate
          };
        })
        .filter((req: any) => !req._hasResignDate)
        .map(({ _hasResignDate, ...req }: any) => req);

      setLeaveRequests(requestsWithNames);
    } catch (error) {
      console.error('Error loading leave data:', error);
      toast.error('Failed to load leave data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveRequest = async (requestId: number) => {
    try {
      await updateLeaveRequest(requestId, 'Approved');
      toast.success('Leave request approved');
      loadData();
    } catch (error) {
      console.error('Error approving request:', error);
      toast.error('Failed to approve leave request');
    }
  };

  const handleRejectRequest = async (requestId: number) => {
    try {
      await updateLeaveRequest(requestId, 'Rejected');
      toast.success('Leave request rejected');
      loadData();
    } catch (error) {
      console.error('Error rejecting request:', error);
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
        return <Clock className="w-4 h-4 text-yellow-500" />;
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

  const filteredRequests = filterStatus === 'all' 
    ? leaveRequests 
    : leaveRequests.filter(r => r.status === filterStatus);

  const pendingCount = leaveRequests.filter(r => r.status === 'Pending').length;
  const approvedCount = leaveRequests.filter(r => r.status === 'Approved').length;
  const rejectedCount = leaveRequests.filter(r => r.status === 'Rejected').length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading leave management data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Leave Management</h2>
          <p className="text-gray-600 mt-1">Manage employee leave requests</p>
        </div>
        <Button onClick={() => setIsBulkDialogOpen(true)}>
          <Users className="w-4 h-4 mr-2" />
          Bulk Actions
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{leaveRequests.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{approvedCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{rejectedCount}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="requests">Requests</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <EnhancedLeaveSummary />
        </TabsContent>

        <TabsContent value="requests" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Leave Requests</CardTitle>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Approved">Approved</SelectItem>
                    <SelectItem value="Rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {filteredRequests.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No leave requests found</div>
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
                              <p className="text-sm text-gray-600">{request.type} • {request.days} day(s)</p>
                            </div>
                          </div>
                          <div className="mt-2 text-sm text-gray-600">
                            <p>
                              {formatDate(new Date(request.startDate))} 
                              {' → '}
                              {formatDate(new Date(request.endDate))}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <Badge className={getStatusColor(request.status)}>{request.status}</Badge>
                          {request.status === 'Pending' && (
                            <div className="flex space-x-2">
                              <Button size="sm" onClick={() => handleApproveRequest(request.id)}>Approve</Button>
                              <Button size="sm" variant="outline" onClick={() => handleRejectRequest(request.id)}>Reject</Button>
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
        selectedDate={null}
        onSuccess={loadData}
      />
    </div>
  );
};

export default LeaveManagementContent;
