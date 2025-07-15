
import React, { useState, useEffect } from 'react';
import AuthGuard from '@/components/auth/AuthGuard';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import AttendanceCalendarView from '@/components/attendance/AttendanceCalendarView';
import BulkAttendanceDialog from '@/components/attendance/BulkAttendanceDialog';
import EditAttendanceDialog from '@/components/attendance/EditAttendanceDialog';
import AttendanceSettings from '@/components/attendance/AttendanceSettings';
import { Calendar, Users, Clock, MapPin, Settings, Plus, BarChart3 } from 'lucide-react';
import { getAttendanceRecords, type AttendanceRecord } from '@/services/attendanceService';
import { getEmployees } from '@/services/employeeService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/sonner';

const Attendance = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
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
      setAttendanceRecords(attendanceData);
      setEmployees(employeesData);
    } catch (error) {
      console.error('Error loading attendance data:', error);
      toast('Error loading attendance data');
    } finally {
      setLoading(false);
    }
  };

  const handleEditRecord = (record: AttendanceRecord) => {
    setSelectedRecord(record);
    setIsEditDialogOpen(true);
  };

  // Calculate statistics
  const today = new Date().toISOString().split('T')[0];
  const thisMonth = new Date().toISOString().slice(0, 7);
  
  const todayRecords = attendanceRecords.filter(record => record.date === today);
  const thisMonthRecords = attendanceRecords.filter(record => record.date.startsWith(thisMonth));
  
  const presentToday = todayRecords.filter(record => record.status === 'Present').length;
  const lateToday = todayRecords.filter(record => record.status === 'Late').length;
  const absentToday = todayRecords.filter(record => record.status === 'Absent').length;
  
  const averageHours = thisMonthRecords.length > 0 
    ? thisMonthRecords.reduce((sum, record) => sum + (record.hoursWorked || 0), 0) / thisMonthRecords.length
    : 0;

  if (loading) {
    return (
      <AuthGuard>
        <ResponsiveLayout>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Loading attendance management...</span>
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
              <Button 
                variant="outline"
                onClick={() => setIsSettingsOpen(true)}
                className="flex items-center"
              >
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
              <Button onClick={() => setIsBulkDialogOpen(true)} className="flex items-center">
                <Plus className="w-4 h-4 mr-2" />
                Bulk Attendance
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
                    <p className="text-sm font-medium text-gray-500">Avg Hours</p>
                    <p className="text-2xl font-bold">{averageHours.toFixed(1)}h</p>
                  </div>
                  <BarChart3 className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="calendar">Calendar</TabsTrigger>
              <TabsTrigger value="today">Today</TabsTrigger>
              <TabsTrigger value="records">All Records</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Today's Attendance Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-2xl font-bold text-green-600">{presentToday}</p>
                          <p className="text-sm text-gray-600">Present</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-yellow-600">{lateToday}</p>
                          <p className="text-sm text-gray-600">Late</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-red-600">{absentToday}</p>
                          <p className="text-sm text-gray-600">Absent</p>
                        </div>
                      </div>
                      <div className="pt-4 border-t">
                        <p className="text-sm text-gray-600">
                          Total Employees: {employees.length}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {attendanceRecords.slice(0, 5).map((record) => {
                        const employee = employees.find(emp => emp.id === record.employeeId);
                        return (
                          <div key={record.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <p className="font-medium">{employee?.name || 'Unknown Employee'}</p>
                              <p className="text-sm text-gray-600">
                                {new Date(record.date).toLocaleDateString()} • {record.hoursWorked?.toFixed(1)}h
                              </p>
                            </div>
                            <Badge variant={
                              record.status === 'Present' ? 'default' :
                              record.status === 'Late' ? 'secondary' : 'destructive'
                            }>
                              {record.status}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="calendar">
              <AttendanceCalendarView />
            </TabsContent>

            <TabsContent value="today" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Today's Attendance ({new Date().toLocaleDateString()})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {todayRecords.length > 0 ? (
                      todayRecords.map((record) => {
                        const employee = employees.find(emp => emp.id === record.employeeId);
                        return (
                          <div key={record.id} className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3">
                                <p className="font-medium">{employee?.name || 'Unknown Employee'}</p>
                                <Badge variant={
                                  record.status === 'Present' ? 'default' :
                                  record.status === 'Late' ? 'secondary' : 'destructive'
                                }>
                                  {record.status}
                                </Badge>
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2 text-sm text-gray-600">
                                <div>
                                  <span className="font-medium">Check In:</span> {record.checkIn || '-'}
                                </div>
                                <div>
                                  <span className="font-medium">Check Out:</span> {record.checkOut || '-'}
                                </div>
                                <div>
                                  <span className="font-medium">Hours:</span> {record.hoursWorked?.toFixed(1) || '0.0'}h
                                </div>
                                <div className="flex items-center">
                                  <MapPin className="w-3 h-3 mr-1" />
                                  {record.location || 'Not specified'}
                                </div>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditRecord(record)}
                            >
                              Edit
                            </Button>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-gray-500 text-center py-8">No attendance records for today</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="records" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>All Attendance Records</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {attendanceRecords.map((record) => {
                      const employee = employees.find(emp => emp.id === record.employeeId);
                      return (
                        <div key={record.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3">
                              <p className="font-medium">{employee?.name || 'Unknown Employee'}</p>
                              <Badge variant={
                                record.status === 'Present' ? 'default' :
                                record.status === 'Late' ? 'secondary' : 'destructive'
                              }>
                                {record.status}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-2 text-sm text-gray-600">
                              <div>
                                <span className="font-medium">Date:</span> {new Date(record.date).toLocaleDateString()}
                              </div>
                              <div>
                                <span className="font-medium">Check In:</span> {record.checkIn || '-'}
                              </div>
                              <div>
                                <span className="font-medium">Check Out:</span> {record.checkOut || '-'}
                              </div>
                              <div>
                                <span className="font-medium">Hours:</span> {record.hoursWorked?.toFixed(1) || '0.0'}h
                              </div>
                              <div className="flex items-center">
                                <MapPin className="w-3 h-3 mr-1" />
                                {record.location || 'Not specified'}
                              </div>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditRecord(record)}
                          >
                            Edit
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings">
              <Card>
                <CardHeader>
                  <CardTitle>Attendance Settings</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 mb-4">
                    Configure working hours and grace periods for each branch.
                  </p>
                  <Button onClick={() => setIsSettingsOpen(true)}>
                    <Settings className="w-4 h-4 mr-2" />
                    Open Settings
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <BulkAttendanceDialog
            isOpen={isBulkDialogOpen}
            onClose={() => setIsBulkDialogOpen(false)}
            employees={employees}
            selectedDate={new Date()}
            onSuccess={loadData}
          />

          {selectedRecord && (
            <EditAttendanceDialog
              isOpen={isEditDialogOpen}
              onClose={() => {
                setIsEditDialogOpen(false);
                setSelectedRecord(null);
              }}
              record={selectedRecord}
              onSuccess={loadData}
            />
          )}

          <AttendanceSettings
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
          />
        </div>
      </ResponsiveLayout>
    </AuthGuard>
  );
};

export default Attendance;
