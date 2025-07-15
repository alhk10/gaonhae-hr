
import React, { useState, useEffect } from 'react';
import AuthGuard from '@/components/auth/AuthGuard';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import LeaveCalendarView from '@/components/leave/LeaveCalendarView';
import EnhancedLeaveSummary from '@/components/leave/EnhancedLeaveSummary';
import LeaveEncashmentManager from '@/components/leave/LeaveEncashmentManager';
import BulkLeaveDialog from '@/components/leave/BulkLeaveDialog';
import { Calendar, Users, Clock, Settings, DollarSign, Plus, Search, Filter } from 'lucide-react';
import { getAllLeaveRequests, updateLeaveStatus, type LeaveRequest } from '@/services/leaveService';
import { getEmployees } from '@/services/employeeService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/sonner';

const LeaveManagement = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isBulkLeaveOpen, setIsBulkLeaveOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [requestsData, employeesData] = await Promise.all([
        getAllLeaveRequests(),
        getEmployees()
      ]);
      setLeaveRequests(requestsData);
      setEmployees(employeesData);
    } catch (error) {
      console.error('Error loading leave data:', error);
      toast.error('Error loading leave data');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveLeave = async (requestId: number) => {
    try {
      await updateLeaveStatus(requestId, 'Approved', user?.name || 'System');
      toast.success('Leave request approved');
      await loadData();
    } catch (error) {
      console.error('Error approving leave:', error);
      toast.error('Error approving leave request');
    }
  };

  const handleRejectLeave = async (requestId: number) => {
    try {
      await updateLeaveStatus(requestId, 'Rejected', user?.name || 'System');
      toast.success('Leave request rejected');
      await loadData();
    } catch (error) {
      console.error('Error rejecting leave:', error);
      toast.error('Error rejecting leave request');
    }
  };

  const filteredRequests = leaveRequests.filter(request => {
    const matchesSearch = request.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
    const matchesType = typeFilter === 'all' || request.type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const pendingRequests = leaveRequests.filter(req => req.status === 'Pending');
  const approvedRequests = leaveRequests.filter(req => req.status === 'Approved');
  const rejectedRequests = leaveRequests.filter(req => req.status === 'Rejected');

  const leaveTypes = [...new Set(leaveRequests.map(req => req.type))];

  if (loading) {
    return (
      <AuthGuard>
        <ResponsiveLayout>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Loading leave management...</span>
          </div>
        </ResponsiveLayout>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <ResponsiveLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Leave Management</h1>
              <p className="text-gray-600 mt-1">Manage employee leave requests and policies</p>
            </div>
            <Button onClick={() => setIsBulkLeaveOpen(true)} className="flex items-center">
              <Plus className="w-4 h-4 mr-2" />
              Bulk Leave
            </Button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Pending Requests</p>
                    <p className="text-2xl font-bold text-yellow-600">{pendingRequests.length}</p>
                  </div>
                  <Clock className="w-8 h-8 text-yellow-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Approved</p>
                    <p className="text-2xl font-bold text-green-600">{approvedRequests.length}</p>
                  </div>
                  <Calendar className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Rejected</p>
                    <p className="text-2xl font-bold text-red-600">{rejectedRequests.length}</p>
                  </div>
                  <Users className="w-8 h-8 text-red-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Total Employees</p>
                    <p className="text-2xl font-bold">{employees.length}</p>
                  </div>
                  <Users className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="requests">Requests</TabsTrigger>
              <TabsTrigger value="calendar">Calendar</TabsTrigger>
              <TabsTrigger value="encashment">Encashment</TabsTrigger>
              <TabsTrigger value="summary">Summary</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Leave Requests</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {pendingRequests.slice(0, 5).map((request) => (
                        <div key={request.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">{request.employeeName}</p>
                            <p className="text-sm text-gray-600">
                              {request.type} • {request.days} day(s)
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(request.startDate).toLocaleDateString()} - {new Date(request.endDate).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              onClick={() => handleApproveLeave(request.id)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleRejectLeave(request.id)}
                            >
                              Reject
                            </Button>
                          </div>
                        </div>
                      ))}
                      {pendingRequests.length === 0 && (
                        <p className="text-gray-500 text-center py-4">No pending requests</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Leave Statistics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {leaveTypes.map(type => (
                        <div key={type} className="flex justify-between items-center">
                          <span>{type}</span>
                          <Badge variant="secondary">
                            {leaveRequests.filter(r => r.type === type).length}
                          </Badge>
                        </div>
                      ))}
                      {leaveTypes.length === 0 && (
                        <p className="text-gray-500 text-center py-4">No leave types found</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="requests" className="space-y-6">
              {/* Filters */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-center space-x-4 space-y-2">
                    <div className="flex items-center space-x-2">
                      <Search className="w-4 h-4 text-gray-500" />
                      <Input
                        placeholder="Search employees or leave types..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-64"
                      />
                    </div>
                    
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="Pending">Pending</SelectItem>
                        <SelectItem value="Approved">Approved</SelectItem>
                        <SelectItem value="Rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        {leaveTypes.map(type => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Leave Requests List */}
              <Card>
                <CardHeader>
                  <CardTitle>Leave Requests ({filteredRequests.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {filteredRequests.map((request) => (
                      <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <p className="font-medium">{request.employeeName}</p>
                            <Badge variant={
                              request.status === 'Approved' ? 'default' :
                              request.status === 'Pending' ? 'secondary' : 'destructive'
                            }>
                              {request.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {request.type} • {new Date(request.startDate).toLocaleDateString()} to {new Date(request.endDate).toLocaleDateString()} • {request.days} day(s)
                          </p>
                          {request.reason && (
                            <p className="text-sm text-gray-500 mt-1">Reason: {request.reason}</p>
                          )}
                          <p className="text-xs text-gray-400 mt-1">
                            Applied: {new Date(request.appliedOn).toLocaleDateString()}
                            {request.approvedBy && ` • Reviewed by: ${request.approvedBy}`}
                          </p>
                        </div>
                        {request.status === 'Pending' && (
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              onClick={() => handleApproveLeave(request.id)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleRejectLeave(request.id)}
                            >
                              Reject
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                    {filteredRequests.length === 0 && (
                      <p className="text-gray-500 text-center py-8">No leave requests found matching your criteria</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="calendar">
              <LeaveCalendarView />
            </TabsContent>

            <TabsContent value="encashment">
              <LeaveEncashmentManager />
            </TabsContent>

            <TabsContent value="summary">
              <EnhancedLeaveSummary />
            </TabsContent>
          </Tabs>

          <BulkLeaveDialog
            isOpen={isBulkLeaveOpen}
            onClose={() => setIsBulkLeaveOpen(false)}
            selectedDate={new Date()}
            onSuccess={loadData}
          />
        </div>
      </ResponsiveLayout>
    </AuthGuard>
  );
};

export default LeaveManagement;
