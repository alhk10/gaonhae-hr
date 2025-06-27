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
import { Calendar, Clock, Users, Plus, UserPlus } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { supabase } from '@/integrations/supabase/client';
import { getEmployees } from '@/services/employeeService';
import BulkAttendanceDialog from '@/components/attendance/BulkAttendanceDialog';

interface AttendanceRecord {
  id: number;
  employee_id: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  status: string;
  hours_worked: number | null;
  employee?: {
    name: string;
  };
}

interface Employee {
  id: string;
  name: string;
}

const Attendance = () => {
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddAttendanceOpen, setIsAddAttendanceOpen] = useState(false);
  const [isBulkAttendanceOpen, setIsBulkAttendanceOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      // Load attendance records
      const { data: attendance, error: attendanceError } = await supabase
        .from('attendance')
        .select(`
          *,
          employee:employee_id(name)
        `)
        .order('date', { ascending: false });

      if (attendanceError) {
        console.error('Error fetching attendance:', attendanceError);
        toast('Error loading attendance data');
      } else {
        setAttendanceRecords(attendance || []);
      }

      // Load employees
      const employeesData = await getEmployees();
      setEmployees(employeesData);
      
    } catch (error) {
      console.error('Error loading data:', error);
      toast('Error loading data');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateHours = (checkIn: string, checkOut: string) => {
    if (!checkIn || !checkOut) return 0;
    
    const checkInTime = new Date(`2000-01-01T${checkIn}`);
    const checkOutTime = new Date(`2000-01-01T${checkOut}`);
    const totalMinutes = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60);
    
    return Math.max(0, totalMinutes / 60);
  };

  const determineStatus = (checkIn: string, date: string) => {
    if (!checkIn) return 'Absent';
    
    const checkInTime = new Date(`2000-01-01T${checkIn}`);
    const nineAM = new Date(`2000-01-01T09:00`);
    
    return checkInTime > nineAM ? 'Late' : 'Present';
  };

  const handleAddAttendance = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    
    const employeeId = formData.get('employee') as string;
    const date = formData.get('date') as string;
    const checkIn = formData.get('checkIn') as string;
    const checkOut = formData.get('checkOut') as string;

    if (!employeeId || !date) {
      toast('Please fill in all required fields');
      return;
    }

    const hoursWorked = calculateHours(checkIn, checkOut);
    const status = determineStatus(checkIn, date);

    try {
      const { error } = await supabase
        .from('attendance')
        .insert({
          employee_id: employeeId,
          date,
          check_in: checkIn || null,
          check_out: checkOut || null,
          status,
          hours_worked: hoursWorked
        });

      if (error) {
        console.error('Error adding attendance:', error);
        toast('Error adding attendance record');
      } else {
        toast('Attendance record added successfully');
        setIsAddAttendanceOpen(false);
        loadData();
      }
    } catch (error) {
      console.error('Error adding attendance:', error);
      toast('Error adding attendance record');
    }
  };

  const handleBulkAttendance = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    
    // Get selected employees using the checkbox approach
    const checkboxes = document.querySelectorAll('input[name="employees"]:checked') as NodeListOf<HTMLInputElement>;
    const selectedEmployees = Array.from(checkboxes).map(checkbox => checkbox.value);
    
    const date = formData.get('date') as string;
    const checkIn = formData.get('checkIn') as string;
    const checkOut = formData.get('checkOut') as string;

    if (selectedEmployees.length === 0 || !date) {
      toast('Please select employees and fill in required fields');
      return;
    }

    const hoursWorked = calculateHours(checkIn, checkOut);
    const status = determineStatus(checkIn, date);

    try {
      const attendanceRecords = selectedEmployees.map(employeeId => ({
        employee_id: employeeId,
        date,
        check_in: checkIn || null,
        check_out: checkOut || null,
        status,
        hours_worked: hoursWorked
      }));

      const { error } = await supabase
        .from('attendance')
        .insert(attendanceRecords);

      if (error) {
        console.error('Error adding bulk attendance:', error);
        toast('Error adding bulk attendance records');
      } else {
        toast(`Bulk attendance added for ${selectedEmployees.length} employees`);
        setIsBulkAttendanceOpen(false);
        loadData();
      }
    } catch (error) {
      console.error('Error adding bulk attendance:', error);
      toast('Error adding bulk attendance records');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'present': return 'default';
      case 'absent': return 'destructive';
      case 'late': return 'secondary';
      case 'half-day': return 'outline';
      default: return 'secondary';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex h-[calc(100vh-73px)]">
          <Sidebar />
          <main className="flex-1 p-6 overflow-auto">
            <div className="flex items-center justify-center h-full">
              <p>Loading attendance data...</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const todayRecords = attendanceRecords.filter(record => 
    record.date === new Date().toISOString().split('T')[0]
  );
  const presentToday = todayRecords.filter(record => record.status === 'Present').length;
  const absentToday = todayRecords.filter(record => record.status === 'Absent').length;
  const lateToday = todayRecords.filter(record => record.status === 'Late').length;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex h-[calc(100vh-73px)]">
        <Sidebar />
        <main className="flex-1 p-6 overflow-auto">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Attendance Management</h2>
                <p className="text-gray-600">Track and manage employee attendance</p>
              </div>
              <div className="flex space-x-2">
                <Dialog open={isAddAttendanceOpen} onOpenChange={setIsAddAttendanceOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Attendance
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Add Attendance Record</DialogTitle>
                      <DialogDescription>Add attendance record for a single employee.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAddAttendance}>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label htmlFor="employee">Employee</Label>
                          <Select name="employee" required>
                            <SelectTrigger>
                              <SelectValue placeholder="Select employee" />
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
                          <Label htmlFor="date">Date</Label>
                          <Input
                            name="date"
                            type="date"
                            required
                            defaultValue={new Date().toISOString().split('T')[0]}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="grid gap-2">
                            <Label htmlFor="checkIn">Check In</Label>
                            <Input name="checkIn" type="time" />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="checkOut">Check Out</Label>
                            <Input name="checkOut" type="time" />
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsAddAttendanceOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit">Add Attendance</Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>

                <BulkAttendanceDialog
                  isOpen={isBulkAttendanceOpen}
                  onClose={() => setIsBulkAttendanceOpen(false)}
                  employees={employees.map(emp => ({
                    id: emp.id,
                    name: emp.name,
                    branch: emp.branch || 'Main Office',
                    position: emp.position
                  }))}
                  onSubmit={handleBulkAttendance}
                />

                <Button variant="outline" onClick={() => setIsBulkAttendanceOpen(true)}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Bulk Attendance
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Present Today</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-green-600">{presentToday}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Absent Today</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-red-600">{absentToday}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Late Today</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-yellow-600">{lateToday}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Total Records</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{attendanceRecords.length}</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="w-5 h-5" />
                  <span>Attendance Records</span>
                </CardTitle>
                <CardDescription>All employee attendance records</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Check In</TableHead>
                      <TableHead>Check Out</TableHead>
                      <TableHead>Hours</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendanceRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">
                          {(record.employee as any)?.name || 'Unknown'} ({record.employee_id})
                        </TableCell>
                        <TableCell>{record.date}</TableCell>
                        <TableCell>{record.check_in || '-'}</TableCell>
                        <TableCell>{record.check_out || '-'}</TableCell>
                        <TableCell>{record.hours_worked?.toFixed(1) || '0.0'}h</TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(record.status)}>
                            {record.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Attendance;
