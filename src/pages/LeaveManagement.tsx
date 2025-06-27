
import React, { useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/sonner';
import { CalendarDays, Users, Check, X, Clock, Calendar, Trash2 } from 'lucide-react';
import { getAllLeaveRequests, updateLeaveStatus, type LeaveRequest } from '@/services/leaveService';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import LeaveCalendarView from '@/components/leave/LeaveCalendarView';
import LeaveSummaryPanel from '@/components/leave/LeaveSummaryPanel';

const LeaveManagement = () => {
  const { user } = useAuth();
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRequests: 0,
    pendingRequests: 0,
    approvedRequests: 0,
    rejectedRequests: 0
  });

  useEffect(() => {
    loadLeaves();
  }, []);

  const loadLeaves = async () => {
    try {
      setLoading(true);
      const allLeaves = await getAllLeaveRequests();
      setLeaves(allLeaves);
      
      // Calculate stats
      setStats({
        totalRequests: allLeaves.length,
        pendingRequests: allLeaves.filter(l => l.status === 'Pending').length,
        approvedRequests: allLeaves.filter(l => l.status === 'Approved').length,
        rejectedRequests: allLeaves.filter(l => l.status === 'Rejected').length
      });
      
      console.log('Loaded leaves:', allLeaves);
    } catch (error) {
      console.error('Error loading leaves:', error);
      toast('Error loading leave requests');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (leaveId: number) => {
    try {
      await updateLeaveStatus(leaveId, 'Approved', user?.name);
      toast('Leave request approved');
      await loadLeaves();
    } catch (error) {
      console.error('Error approving leave:', error);
      toast('Error approving leave request');
    }
  };

  const handleReject = async (leaveId: number) => {
    try {
      await updateLeaveStatus(leaveId, 'Rejected', user?.name);
      toast('Leave request rejected');
      await loadLeaves();
    } catch (error) {
      console.error('Error rejecting leave:', error);
      toast('Error rejecting leave request');
    }
  };

  const handleDelete = async (leaveId: number) => {
    if (!user || user.role !== 'superadmin') {
      toast('Only superadmin can delete leave records');
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

      toast('Leave record deleted successfully');
      await loadLeaves();
    } catch (error) {
      console.error('Error deleting leave:', error);
      toast('Error deleting leave record');
    }
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
                <p className="mt-4 text-lg text-gray-600">Loading leave requests...</p>
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
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Leave Management</h1>
              <p className="text-gray-600 mt-2">Manage and approve employee leave requests</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <CalendarDays className="w-8 h-8 text-blue-600" />
                    <div className="ml-4">
                      <p className="text-sm text-blue-600">Total Requests</p>
                      <p className="text-2xl font-bold text-blue-900">{stats.totalRequests}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-200">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Clock className="w-8 h-8 text-yellow-600" />
                    <div className="ml-4">
                      <p className="text-sm text-yellow-600">Pending</p>
                      <p className="text-2xl font-bold text-yellow-900">{stats.pendingRequests}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Check className="w-8 h-8 text-green-600" />
                    <div className="ml-4">
                      <p className="text-sm text-green-600">Approved</p>
                      <p className="text-2xl font-bold text-green-900">{stats.approvedRequests}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-red-50 to-red-100 border-red-200">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <X className="w-8 h-8 text-red-600" />
                    <div className="ml-4">
                      <p className="text-sm text-red-600">Rejected</p>
                      <p className="text-2xl font-bold text-red-900">{stats.rejectedRequests}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Content */}
            <Tabs defaultValue="list" className="space-y-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="list">Leave Requests</TabsTrigger>
                <TabsTrigger value="calendar">Calendar View</TabsTrigger>
                <TabsTrigger value="summary">Summary</TabsTrigger>
              </TabsList>

              <TabsContent value="list">
                <Card>
                  <CardHeader>
                    <CardTitle>All Leave Requests</CardTitle>
                    <CardDescription>Review and manage employee leave requests</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {leaves.length > 0 ? (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Employee</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Start Date</TableHead>
                              <TableHead>End Date</TableHead>
                              <TableHead>Days</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Applied On</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {leaves.map((leave) => (
                              <TableRow key={leave.id}>
                                <TableCell className="font-medium">{leave.employeeName}</TableCell>
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
                                        >
                                          <Check className="w-4 h-4" />
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="destructive"
                                          onClick={() => handleReject(leave.id)}
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
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="text-center py-12 text-gray-500">
                        <CalendarDays className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <p className="text-lg">No leave requests found</p>
                        <p className="text-sm">Leave requests will appear here once submitted by employees</p>
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
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
};

export default LeaveManagement;
