
import { useState, useEffect } from 'react';
import AuthGuard from '@/components/auth/AuthGuard';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
import { formatDate } from '@/utils/dateFormat';
  Clock, 
  Users, 
  Calendar, 
  TrendingUp, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Search,
  Settings,
  Plus,
  Edit,
  Trash2
} from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { 
  getAttendanceRecords, 
  updateAttendanceRecord, 
  deleteAttendanceRecord,
  AttendanceRecord 
} from '@/services/attendanceService';
import { getEmployees } from '@/services/employeeService';
import BulkAttendanceDialog from '@/components/attendance/BulkAttendanceDialog';
import EditAttendanceDialog from '@/components/attendance/EditAttendanceDialog';
import AttendanceCalendarView from '@/components/attendance/AttendanceCalendarView';
import AttendanceSettings from '@/components/attendance/AttendanceSettings';

interface AttendanceWithEmployee extends AttendanceRecord {
  employeeName: string;
}

const Attendance = () => {
  console.log('⏰ Attendance page loading - comprehensive version');
  
  const [activeTab, setActiveTab] = useState('overview');
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceWithEmployee[]>([]);
  const [employees, setEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [filterEmployee, setFilterEmployee] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [attendanceData, employeesData] = await Promise.all([
        getAttendanceRecords(),
        getEmployees()
      ]);

      // Map employee names to attendance records
      const recordsWithEmployees = attendanceData.map(record => ({
        ...record,
        employeeName: employeesData.find(emp => emp.id === record.employeeId)?.name || 'Unknown Employee'
      }));

      setAttendanceRecords(recordsWithEmployees);
      setEmployees(employeesData);
      console.log('📊 Loaded attendance records:', recordsWithEmployees.length);
      console.log('👥 Loaded employees:', employeesData.length);
    } catch (error) {
      console.error('Error loading attendance data:', error);
      toast.error('Failed to load attendance data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditRecord = (record: AttendanceRecord) => {
    setSelectedRecord(record);
    setIsEditDialogOpen(true);
  };

  const handleDeleteRecord = async (recordId: number) => {
    if (!confirm('Are you sure you want to delete this attendance record?')) {
      return;
    }

    try {
      await deleteAttendanceRecord(recordId);
      toast.success('Attendance record deleted');
      loadData();
    } catch (error) {
      console.error('Error deleting attendance record:', error);
      toast.error('Failed to delete attendance record');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'present':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'absent':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'late':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'present':
        return 'bg-green-100 text-green-800';
      case 'absent':
        return 'bg-red-100 text-red-800';
      case 'late':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredRecords = attendanceRecords.filter(record => {
    const matchesEmployee = filterEmployee === 'all' || record.employeeId === filterEmployee;
    const matchesStatus = filterStatus === 'all' || record.status.toLowerCase() === filterStatus.toLowerCase();
    const matchesSearch = searchTerm === '' || 
      record.employeeName.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesEmployee && matchesStatus && matchesSearch;
  });

  const todayRecords = attendanceRecords.filter(record => 
    new Date(record.date).toDateString() === new Date().toDateString()
  );

  const presentToday = todayRecords.filter(record => record.status.toLowerCase() === 'present').length;
  const absentToday = todayRecords.filter(record => record.status.toLowerCase() === 'absent').length;
  const lateToday = todayRecords.filter(record => record.status.toLowerCase() === 'late').length;

  const thisMonthRecords = attendanceRecords.filter(record => {
    const recordDate = new Date(record.date);
    const now = new Date();
    return recordDate.getMonth() === now.getMonth() && recordDate.getFullYear() === now.getFullYear();
  });

  const avgHoursThisMonth = thisMonthRecords.length > 0 
    ? thisMonthRecords.reduce((sum, record) => sum + (record.hoursWorked || 0), 0) / thisMonthRecords.length
    : 0;

  return (
    <AuthGuard>
      <ResponsiveLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Attendance Management</h1>
              <p className="text-gray-600 mt-1">Track and manage employee attendance records</p>
            </div>
            <div className="flex items-center space-x-4">
              <Button onClick={() => setIsBulkDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Bulk Actions
              </Button>
              <Button onClick={() => setIsSettingsOpen(true)} variant="outline">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Present Today</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{presentToday}</div>
                <p className="text-xs text-muted-foreground">
                  {employees.length > 0 ? `${((presentToday / employees.length) * 100).toFixed(1)}%` : '0%'} of employees
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Late Today</CardTitle>
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{lateToday}</div>
                <p className="text-xs text-muted-foreground">Late arrivals</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Absent Today</CardTitle>
                <XCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{absentToday}</div>
                <p className="text-xs text-muted-foreground">Not present</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Hours</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{avgHoursThisMonth.toFixed(1)}h</div>
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
              <TabsTrigger value="records">
                <Users className="w-4 h-4 mr-2" />
                Records
              </TabsTrigger>
              <TabsTrigger value="calendar">
                <Calendar className="w-4 h-4 mr-2" />
                Calendar
              </TabsTrigger>
              <TabsTrigger value="analytics">
                <TrendingUp className="w-4 h-4 mr-2" />
                Analytics
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Today's Attendance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {todayRecords.slice(0, 5).map((record) => (
                        <div key={record.id} className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            {getStatusIcon(record.status)}
                            <div>
                              <p className="font-medium">{record.employeeName}</p>
                              <p className="text-sm text-gray-500">
                                {record.checkIn ? `In: ${record.checkIn}` : 'No check-in'}
                                {record.checkOut ? ` | Out: ${record.checkOut}` : ''}
                              </p>
                            </div>
                          </div>
                          <Badge className={getStatusColor(record.status)} variant="secondary">
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
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Total Employees</span>
                        <span className="text-sm">{employees.length}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Present Rate</span>
                        <span className="text-sm text-green-600">
                          {employees.length > 0 ? `${((presentToday / employees.length) * 100).toFixed(1)}%` : '0%'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Late Rate</span>
                        <span className="text-sm text-yellow-600">
                          {employees.length > 0 ? `${((lateToday / employees.length) * 100).toFixed(1)}%` : '0%'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Absent Rate</span>
                        <span className="text-sm text-red-600">
                          {employees.length > 0 ? `${((absentToday / employees.length) * 100).toFixed(1)}%` : '0%'}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="records" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Attendance Records</CardTitle>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <Search className="w-4 h-4 text-gray-400" />
                        <Input
                          placeholder="Search employees..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-64"
                        />
                      </div>
                      <Select value={filterEmployee} onValueChange={setFilterEmployee}>
                        <SelectTrigger className="w-48">
                          <SelectValue placeholder="All Employees" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Employees</SelectItem>
                          {employees.map((employee: any) => (
                            <SelectItem key={employee.id} value={employee.id}>
                              {employee.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger className="w-32">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          <SelectItem value="present">Present</SelectItem>
                          <SelectItem value="absent">Absent</SelectItem>
                          <SelectItem value="late">Late</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="text-center py-8">Loading attendance records...</div>
                  ) : filteredRecords.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No attendance records found
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredRecords.map((record) => (
                        <div key={record.id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3">
                                {getStatusIcon(record.status)}
                                <div>
                                  <h3 className="font-semibold">{record.employeeName}</h3>
                                  <p className="text-sm text-gray-600">
                                    {formatDate(new Date(record.date))} • {record.hoursWorked?.toFixed(1) || 0}h worked
                                  </p>
                                </div>
                              </div>
                              <div className="mt-2">
                                <div className="flex items-center space-x-4 text-sm text-gray-600">
                                  {record.checkIn && (
                                    <span>Check-in: {record.checkIn}</span>
                                  )}
                                  {record.checkOut && (
                                    <span>Check-out: {record.checkOut}</span>
                                  )}
                                  {record.location && (
                                    <span>Location: {record.location}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-3">
                              <Badge className={getStatusColor(record.status)}>
                                {record.status}
                              </Badge>
                              <div className="flex space-x-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEditRecord(record)}
                                >
                                  <Edit className="w-3 h-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDeleteRecord(record.id)}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
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
              <AttendanceCalendarView />
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Monthly Trends</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">This Month Records</span>
                        <span className="text-sm">{thisMonthRecords.length}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Average Hours/Day</span>
                        <span className="text-sm">{avgHoursThisMonth.toFixed(1)}h</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Perfect Attendance</span>
                        <span className="text-sm">
                          {employees.filter((emp: any) => {
                            const empRecords = thisMonthRecords.filter(r => r.employeeId === emp.id);
                            return empRecords.every(r => r.status.toLowerCase() === 'present');
                          }).length} employees
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Top Performers</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {employees
                        .map((emp: any) => {
                          const empRecords = thisMonthRecords.filter(r => r.employeeId === emp.id);
                          const totalHours = empRecords.reduce((sum, r) => sum + (r.hoursWorked || 0), 0);
                          return { name: emp.name, hours: totalHours };
                        })
                        .sort((a, b) => b.hours - a.hours)
                        .slice(0, 5)
                        .map((emp) => (
                          <div key={emp.name} className="flex justify-between items-center">
                            <span className="text-sm font-medium">{emp.name}</span>
                            <span className="text-sm">{emp.hours.toFixed(1)}h</span>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>

          <BulkAttendanceDialog
            isOpen={isBulkDialogOpen}
            onClose={() => setIsBulkDialogOpen(false)}
            employees={employees}
            selectedDate={selectedDate}
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
