
import React, { useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, Search, X } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { getAttendanceRecords, updateAttendanceStatus, AttendanceRecord } from '@/services/attendanceService';

const Attendance = () => {
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAttendanceData();
  }, []);

  const fetchAttendanceData = async () => {
    try {
      setLoading(true);
      const data = await getAttendanceRecords();
      setAttendanceData(data);
    } catch (error) {
      console.error('Error fetching attendance data:', error);
      toast("Error loading attendance data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const filteredData = attendanceData.filter(record => {
    const matchesSearch = record.employee.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || record.status.toLowerCase() === statusFilter.toLowerCase();
    const matchesDate = !dateFilter || record.date === dateFilter;
    
    return matchesSearch && matchesStatus && matchesDate;
  });

  const handleEditRecord = (record: AttendanceRecord) => {
    setEditingRecord(record);
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;

    const formData = new FormData(e.target as HTMLFormElement);
    const clockIn = formData.get('clockIn') as string;
    const clockOut = formData.get('clockOut') as string;
    
    let status: 'Present' | 'Absent' | 'Half Day' | 'Late' = 'Present';
    let hours = 0;
    
    if (!clockIn || !clockOut) {
      status = 'Absent';
      hours = 0;
    } else {
      const inTime = new Date(`2000-01-01 ${clockIn}`);
      const outTime = new Date(`2000-01-01 ${clockOut}`);
      hours = (outTime.getTime() - inTime.getTime()) / (1000 * 60 * 60);
      
      // Check if late (after 9:00 AM)
      const startTime = new Date(`2000-01-01 09:00`);
      if (inTime > startTime) {
        status = 'Late';
      }
    }

    try {
      await updateAttendanceStatus(editingRecord.employeeId, editingRecord.date, status);
      await fetchAttendanceData(); // Refresh data
      setIsEditDialogOpen(false);
      setEditingRecord(null);
      toast("Attendance record updated");
    } catch (error) {
      console.error('Error updating attendance:', error);
      toast("Error updating attendance. Please try again.");
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setDateFilter('');
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
                <p className="mt-4 text-gray-600">Loading attendance data...</p>
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
              <h2 className="text-2xl font-bold text-gray-900">Attendance Management</h2>
              <p className="text-gray-600">View and edit employee attendance records</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Total Records</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{attendanceData.length}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Present Today</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-green-600">
                    {attendanceData.filter(record => record.status === 'Present' || record.status === 'Late').length}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Absent Today</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-red-600">
                    {attendanceData.filter(record => record.status === 'Absent').length}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Average Hours</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">
                    {attendanceData.length > 0 ? (attendanceData.reduce((sum, record) => sum + record.hours, 0) / attendanceData.length).toFixed(1) : '0'}h
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center space-x-2">
                      <Clock className="w-5 h-5" />
                      <span>Attendance Records</span>
                    </CardTitle>
                    <CardDescription>Employee attendance with search and filters</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        placeholder="Search by employee name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="present">Present</SelectItem>
                      <SelectItem value="absent">Absent</SelectItem>
                      <SelectItem value="late">Late</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="w-40"
                  />
                  <Button variant="outline" onClick={clearFilters}>
                    <X className="w-4 h-4 mr-2" />
                    Clear
                  </Button>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Clock In</TableHead>
                      <TableHead>Clock Out</TableHead>
                      <TableHead>Hours</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">{record.employee}</TableCell>
                        <TableCell>{record.date}</TableCell>
                        <TableCell>{record.clockIn || '-'}</TableCell>
                        <TableCell>{record.clockOut || '-'}</TableCell>
                        <TableCell>{record.hours}h</TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              record.status === 'Present' ? 'default' : 
                              record.status === 'Late' ? 'secondary' :
                              'outline'
                            }
                          >
                            {record.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleEditRecord(record)}
                          >
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredData.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                          No attendance records found matching your filters.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Edit Attendance</DialogTitle>
                  <DialogDescription>
                    Edit attendance record for {editingRecord?.employee}
                  </DialogDescription>
                </DialogHeader>
                {editingRecord && (
                  <form onSubmit={handleSaveEdit}>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="employee">Employee</Label>
                        <Input value={editingRecord.employee} disabled />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="date">Date</Label>
                        <Input value={editingRecord.date} disabled />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="clockIn">Clock In</Label>
                          <Input 
                            name="clockIn" 
                            type="time" 
                            defaultValue={editingRecord.clockIn || ''}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="clockOut">Clock Out</Label>
                          <Input 
                            name="clockOut" 
                            type="time" 
                            defaultValue={editingRecord.clockOut || ''}
                          />
                        </div>
                      </div>
                      <p className="text-sm text-gray-600">
                        Leave times empty to mark as absent
                      </p>
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit">Save Changes</Button>
                    </DialogFooter>
                  </form>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Attendance;
