import React, { useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/sonner';
import { CalendarDays, Clock, Users, MapPin, Calendar as CalendarIcon, Plus, Trash2, Settings, Edit } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { getAttendanceRecords, addAttendanceRecord, updateAttendanceRecord, type AttendanceRecord } from '@/services/attendanceService';
import { getEmployees } from '@/services/employeeService';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import BulkAttendanceDialog from '@/components/attendance/BulkAttendanceDialog';
import EditAttendanceDialog from '@/components/attendance/EditAttendanceDialog';
import AttendanceCalendarView from '@/components/attendance/AttendanceCalendarView';
import AttendanceSettings from '@/components/attendance/AttendanceSettings';

const Attendance = () => {
  const { user } = useAuth();
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [stats, setStats] = useState({
    totalPresent: 0,
    totalAbsent: 0,
    totalLate: 0,
    averageHours: 0
  });
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [attendanceData, employeeData] = await Promise.all([
        getAttendanceRecords(),
        getEmployees()
      ]);
      
      setAttendanceRecords(attendanceData);
      setEmployees(employeeData);
      
      // Calculate stats for selected date
      const dateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '';
      const todayRecords = attendanceData.filter(record => record.date === dateStr);
      
      const totalPresent = todayRecords.filter(r => r.status === 'Present').length;
      const totalAbsent = employeeData.length - todayRecords.length;
      const totalLate = todayRecords.filter(r => r.status === 'Late').length;
      const averageHours = todayRecords.length > 0 
        ? todayRecords.reduce((sum, r) => sum + (r.hoursWorked || 0), 0) / todayRecords.length 
        : 0;
      
      setStats({
        totalPresent,
        totalAbsent,
        totalLate,
        averageHours
      });
      
    } catch (error) {
      console.error('Error loading attendance data:', error);
      toast('Error loading attendance data');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (record: AttendanceRecord) => {
    console.log('Editing attendance record:', record);
    setSelectedRecord(record);
    setIsEditDialogOpen(true);
  };

  const handleDelete = async (recordId: number) => {
    if (!user || user.role !== 'superadmin') {
      toast('Only superadmin can delete attendance records');
      return;
    }

    if (!confirm('Are you sure you want to delete this attendance record? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('attendance')
        .delete()
        .eq('id', recordId);

      if (error) throw error;

      toast('Attendance record deleted successfully');
      await loadData();
    } catch (error) {
      console.error('Error deleting attendance record:', error);
      toast('Error deleting attendance record');
    }
  };

  const filteredRecords = selectedDate 
    ? attendanceRecords.filter(record => record.date === format(selectedDate, 'yyyy-MM-dd'))
    : attendanceRecords;

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
                <p className="mt-4 text-lg text-gray-600">Loading attendance data...</p>
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
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Attendance Management</h1>
                <p className="text-gray-600 mt-2">Track and manage employee attendance</p>
              </div>
              
              <div className="flex space-x-3">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn(
                      "w-[240px] justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                
                {user?.role !== 'employee' && (
                  <>
                    <Button onClick={() => setIsBulkDialogOpen(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Bulk Add
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setIsSettingsOpen(true)}
                      className="flex items-center space-x-2"
                    >
                      <Settings className="w-4 h-4" />
                      <span>Settings</span>
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Users className="w-8 h-8 text-green-600" />
                    <div className="ml-4">
                      <p className="text-sm text-green-600">Present</p>
                      <p className="text-2xl font-bold text-green-900">{stats.totalPresent}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-red-50 to-red-100 border-red-200">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Users className="w-8 h-8 text-red-600" />
                    <div className="ml-4">
                      <p className="text-sm text-red-600">Absent</p>
                      <p className="text-2xl font-bold text-red-900">{stats.totalAbsent}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-200">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Clock className="w-8 h-8 text-yellow-600" />
                    <div className="ml-4">
                      <p className="text-sm text-yellow-600">Late</p>
                      <p className="text-2xl font-bold text-yellow-900">{stats.totalLate}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Clock className="w-8 h-8 text-blue-600" />
                    <div className="ml-4">
                      <p className="text-sm text-blue-600">Avg Hours</p>
                      <p className="text-2xl font-bold text-blue-900">{stats.averageHours.toFixed(1)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Content with Tabs */}
            <Tabs defaultValue="list" className="space-y-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="list">Attendance Records</TabsTrigger>
                <TabsTrigger value="calendar">Calendar View</TabsTrigger>
              </TabsList>

              <TabsContent value="list">
                <Card>
                  <CardHeader>
                    <CardTitle>
                      Attendance Records - {selectedDate ? format(selectedDate, "MMMM d, yyyy") : "All Dates"}
                    </CardTitle>
                    <CardDescription>
                      View and manage employee attendance for the selected date
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {filteredRecords.length > 0 ? (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Employee</TableHead>
                              <TableHead>Date</TableHead>
                              <TableHead>Check In</TableHead>
                              <TableHead>Check Out</TableHead>
                              <TableHead>Hours</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Location</TableHead>
                              {user?.role === 'superadmin' && <TableHead>Actions</TableHead>}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredRecords.map((record) => (
                              <TableRow key={record.id}>
                                <TableCell className="font-medium">
                                  {employees.find(emp => emp.id === record.employeeId)?.name || 'Unknown'}
                                </TableCell>
                                <TableCell>{new Date(record.date).toLocaleDateString()}</TableCell>
                                <TableCell>{record.checkIn || '-'}</TableCell>
                                <TableCell>{record.checkOut || '-'}</TableCell>
                                <TableCell>{record.hoursWorked ? `${record.hoursWorked.toFixed(1)}h` : '-'}</TableCell>
                                <TableCell>
                                  <Badge 
                                    variant={
                                      record.status === 'Present' ? 'default' : 
                                      record.status === 'Late' ? 'secondary' : 
                                      'destructive'
                                    }
                                  >
                                    {record.status}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center">
                                    <MapPin className="w-4 h-4 mr-1 text-gray-400" />
                                    <span className="text-sm">{record.location || 'Not specified'}</span>
                                  </div>
                                </TableCell>
                                {user?.role === 'superadmin' && (
                                  <TableCell>
                                    <div className="flex space-x-2">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleEdit(record)}
                                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                      >
                                        <Edit className="w-4 h-4" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleDelete(record.id)}
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                )}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="text-center py-12 text-gray-500">
                        <CalendarDays className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <p className="text-lg">No attendance records found</p>
                        <p className="text-sm">
                          {selectedDate 
                            ? `No records for ${format(selectedDate, "MMMM d, yyyy")}`
                            : "Attendance records will appear here"
                          }
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="calendar">
                <AttendanceCalendarView />
              </TabsContent>
            </Tabs>
          </div>

          <BulkAttendanceDialog
            isOpen={isBulkDialogOpen}
            onClose={() => setIsBulkDialogOpen(false)}
            employees={employees}
            selectedDate={selectedDate || new Date()}
            onSuccess={loadData}
          />

          <EditAttendanceDialog
            isOpen={isEditDialogOpen}
            onClose={() => setIsEditDialogOpen(false)}
            record={selectedRecord}
            onSuccess={loadData}
          />

          <AttendanceSettings
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
          />
        </main>
      </div>
    </div>
  );
};

export default Attendance;
