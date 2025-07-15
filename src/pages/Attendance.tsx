
import React, { useState, useEffect } from 'react';
import AuthGuard from '@/components/auth/AuthGuard';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AttendanceCalendarView from '@/components/attendance/AttendanceCalendarView';
import AttendanceSettings from '@/components/attendance/AttendanceSettings';
import BulkAttendanceDialog from '@/components/attendance/BulkAttendanceDialog';
import EditAttendanceDialog from '@/components/attendance/EditAttendanceDialog';
import { Clock, Users, Calendar, Settings, Search, Filter, Edit, Plus, Download } from 'lucide-react';
import { getAttendanceRecords, deleteAttendanceRecord } from '@/services/attendanceService';
import { getEmployees } from '@/services/employeeService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/sonner';

interface AttendanceRecord {
  id: number;
  employeeId: string;
  employeeName: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  breakStart: string | null;
  breakEnd: string | null;
  hoursWorked: number;
  status: string;
  location: string | null;
  clockInLocation: string | null;
  clockOutLocation: string | null;
}

const Attendance = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('today');
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [attendanceData, employeesData] = await Promise.all([
        getAttendanceRecords(),
        getEmployees()
      ]);
      
      // Transform attendance data to match our interface
      const transformedAttendance = attendanceData.map((record: any) => ({
        id: record.id,
        employeeId: record.employee_id,
        employeeName: employeesData.find(emp => emp.id === record.employee_id)?.name || 'Unknown',
        date: record.date,
        checkIn: record.check_in,
        checkOut: record.check_out,
        breakStart: record.break_start,
        breakEnd: record.break_end,
        hoursWorked: Number(record.hours_worked) || 0,
        status: record.status,
        location: record.location,
        clockInLocation: record.clock_in_location,
        clockOutLocation: record.clock_out_location
      }));
      
      setAttendanceRecords(transformedAttendance);
      setEmployees(employeesData);
    } catch (error) {
      console.error('Error loading attendance data:', error);
      toast.error('Error loading attendance data');
    } finally {
      setLoading(false);
    }
  };

  const handleEditRecord = (record: AttendanceRecord) => {
    setSelectedRecord(record);
    setIsEditDialogOpen(true);
  };

  const handleDeleteRecord = async (recordId: number) => {
    if (window.confirm('Are you sure you want to delete this attendance record?')) {
      try {
        await deleteAttendanceRecord(recordId);
        toast.success('Attendance record deleted successfully');
        await loadData();
      } catch (error) {
        console.error('Error deleting record:', error);
        toast.error('Error deleting attendance record');
      }
    }
  };

  const getFilteredRecords = () => {
    let filtered = attendanceRecords;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(record =>
        record.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.employeeId.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(record => record.status === statusFilter);
    }

    // Date filter
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];

    switch (dateFilter) {
      case 'today':
        filtered = filtered.filter(record => record.date === today);
        break;
      case 'yesterday':
        filtered = filtered.filter(record => record.date === yesterday);
        break;
      case 'week':
        filtered = filtered.filter(record => record.date >= weekAgo);
        break;
      default:
        break;
    }

    return filtered;
  };

  const filteredRecords = getFilteredRecords();

  // Calculate statistics
  const todayRecords = attendanceRecords.filter(record => 
    record.date === new Date().toISOString().split('T')[0]
  );
  const presentToday = todayRecords.filter(record => record.status === 'Present').length;
  const absentToday = todayRecords.filter(record => record.status === 'Absent').length;
  const lateToday = todayRecords.filter(record => record.status === 'Late').length;
  const totalHoursToday = todayRecords.reduce((sum, record) => sum + record.hoursWorked, 0);

  const uniqueStatuses = [...new Set(attendanceRecords.map(record => record.status))];

  if (loading) {
    return (
      <AuthGuard>
        <ResponsiveLayout>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Loading attendance data...</span>
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
              <h1 className="text-3xl font-bold text-gray-900">Attendance Management</h1>
              <p className="text-gray-600 mt-1">Track and manage employee attendance records</p>
            </div>
            <div className="flex space-x-2">
              <Button onClick={() => setIsBulkDialogOpen(true)} className="flex items-center">
                <Plus className="w-4 h-4 mr-2" />
                Bulk Entry
              </Button>
              <Button variant="outline" onClick={() => setIsSettingsOpen(true)} className="flex items-center">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Present Today</p>
                    <p className="text-2xl font-bold text-green-600">{presentToday}</p>
                  </div>
                  <Users className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Absent Today</p>
                    <p className="text-2xl font-bold text-red-600">{absentToday}</p>
                  </div>
                  <Users className="w-8 h-8 text-red-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Late Today</p>
                    <p className="text-2xl font-bold text-yellow-600">{lateToday}</p>
                  </div>
                  <Clock className="w-8 h-8 text-yellow-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Total Hours</p>
                    <p className="text-2xl font-bold">{totalHoursToday.toFixed(1)}</p>
                  </div>
                  <Clock className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="records">Records</TabsTrigger>
              <TabsTrigger value="calendar">Calendar</TabsTrigger>
              <TabsTrigger value="reports">Reports</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Today's Attendance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {todayRecords.slice(0, 8).map((record) => (
                        <div key={record.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">{record.employeeName}</p>
                            <p className="text-sm text-gray-600">
                              {record.checkIn ? `In: ${record.checkIn}` : 'No check-in'}
                              {record.checkOut && ` • Out: ${record.checkOut}`}
                            </p>
                            <p className="text-xs text-gray-500">
                              Hours: {record.hoursWorked.toFixed(1)}
                            </p>
                          </div>
                          <Badge variant={
                            record.status === 'Present' ? 'default' :
                            record.status === 'Late' ? 'secondary' : 'destructive'
                          }>
                            {record.status}
                          </Badge>
                        </div>
                      ))}
                      {todayRecords.length === 0 && (
                        <p className="text-gray-500 text-center py-4">No attendance records for today</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Attendance Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-3 bg-green-50 rounded-lg">
                          <p className="text-2xl font-bold text-green-600">{presentToday}</p>
                          <p className="text-sm text-green-700">Present</p>
                        </div>
                        <div className="text-center p-3 bg-red-50 rounded-lg">
                          <p className="text-2xl font-bold text-red-600">{absentToday}</p>
                          <p className="text-sm text-red-700">Absent</p>
                        </div>
                      </div>
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <p className="text-2xl font-bold text-blue-600">{totalHoursToday.toFixed(1)}</p>
                        <p className="text-sm text-blue-700">Total Hours Today</p>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <p className="text-2xl font-bold text-gray-600">{employees.length}</p>
                        <p className="text-sm text-gray-700">Total Employees</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="records" className="space-y-6">
              {/* Filters */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-center space-x-4 space-y-2">
                    <div className="flex items-center space-x-2">
                      <Search className="w-4 h-4 text-gray-500" />
                      <Input
                        placeholder="Search employees..."
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
                        {uniqueStatuses.map(status => (
                          <SelectItem key={status} value={status}>{status}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={dateFilter} onValueChange={setDateFilter}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Date" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Dates</SelectItem>
                        <SelectItem value="today">Today</SelectItem>
                        <SelectItem value="yesterday">Yesterday</SelectItem>
                        <SelectItem value="week">This Week</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-2" />
                      Export
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Records List */}
              <Card>
                <CardHeader>
                  <CardTitle>Attendance Records ({filteredRecords.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {filteredRecords.map((record) => (
                      <div key={record.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <p className="font-medium">{record.employeeName}</p>
                            <Badge variant={
                              record.status === 'Present' ? 'default' :
                              record.status === 'Late' ? 'secondary' : 'destructive'
                            }>
                              {record.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            Date: {new Date(record.date).toLocaleDateString()}
                          </p>
                          <p className="text-sm text-gray-600">
                            {record.checkIn ? `Check-in: ${record.checkIn}` : 'No check-in'}
                            {record.checkOut && ` • Check-out: ${record.checkOut}`}
                          </p>
                          <p className="text-sm text-gray-500">
                            Hours worked: {record.hoursWorked.toFixed(1)}
                            {record.location && ` • Location: ${record.location}`}
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditRecord(record)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteRecord(record.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))}
                    {filteredRecords.length === 0 && (
                      <p className="text-gray-500 text-center py-8">No attendance records found matching your criteria</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="calendar">
              <AttendanceCalendarView />
            </TabsContent>

            <TabsContent value="reports" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Weekly Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-4">Attendance summary for the past week</p>
                    <div className="space-y-2">
                      {/* Calculate weekly stats */}
                      {Array.from({ length: 7 }, (_, i) => {
                        const date = new Date();
                        date.setDate(date.getDate() - i);
                        const dateStr = date.toISOString().split('T')[0];
                        const dayRecords = attendanceRecords.filter(record => record.date === dateStr);
                        const presentCount = dayRecords.filter(record => record.status === 'Present').length;
                        return (
                          <div key={dateStr} className="flex justify-between items-center p-2 hover:bg-gray-50 rounded">
                            <span className="text-sm">{date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</span>
                            <div className="text-right">
                              <p className="font-semibold">{presentCount}</p>
                              <p className="text-xs text-gray-500">present</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Employee Statistics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-4">Top performing employees</p>
                    <div className="space-y-2">
                      {/* Calculate employee stats */}
                      {employees.slice(0, 5).map(employee => {
                        const empRecords = attendanceRecords.filter(record => record.employeeId === employee.id);
                        const presentDays = empRecords.filter(record => record.status === 'Present').length;
                        const totalHours = empRecords.reduce((sum, record) => sum + record.hoursWorked, 0);
                        return (
                          <div key={employee.id} className="flex justify-between items-center p-2 hover:bg-gray-50 rounded">
                            <span className="text-sm">{employee.name}</span>
                            <div className="text-right">
                              <p className="font-semibold">{totalHours.toFixed(1)}h</p>
                              <p className="text-xs text-gray-500">{presentDays} days</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>

          {/* Dialogs */}
          <AttendanceSettings 
            isOpen={isSettingsOpen} 
            onClose={() => setIsSettingsOpen(false)} 
          />
          
          <BulkAttendanceDialog
            isOpen={isBulkDialogOpen}
            onClose={() => setIsBulkDialogOpen(false)}
            onSuccess={loadData}
          />

          <EditAttendanceDialog
            isOpen={isEditDialogOpen}
            onClose={() => setIsEditDialogOpen(false)}
            record={selectedRecord}
            onSuccess={loadData}
          />
        </div>
      </ResponsiveLayout>
    </AuthGuard>
  );
};

export default Attendance;
