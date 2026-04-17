
import React, { useState, useEffect } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/sonner';
import { CalendarDays, Users, MapPin, Clock, Edit2, Save, X, Trash2 } from 'lucide-react';
import { getAttendanceRecords, updateAttendanceRecord, deleteAttendanceRecord, type AttendanceRecord } from '@/services/attendanceService';
import { getEmployees } from '@/services/employeeService';
import { getBranches, type Branch } from '@/services/settingsService';
import { useAuth } from '@/contexts/AuthContext';
import BulkAttendanceDialog from './BulkAttendanceDialog';
import { formatDate } from '@/utils/dateFormat';

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales: { 'en-US': enUS },
});

const AttendanceCalendarView = () => {
  const { user } = useAuth();
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formData, setFormData] = useState({
    checkIn: '',
    checkOut: '',
    location: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [attendanceData, employeeData, branchData] = await Promise.all([
        getAttendanceRecords(),
        getEmployees(),
        getBranches()
      ]);
      
      setAttendanceRecords(attendanceData);
      setEmployees(employeeData);
      setBranches(branchData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast('Error loading attendance data');
    } finally {
      setLoading(false);
    }
  };

  const events = attendanceRecords.map(record => {
    const employee = employees.find(emp => emp.id === record.employeeId);
    return {
      id: record.id,
      title: `${employee?.name || 'Unknown'} - ${record.status}`,
      start: new Date(record.date),
      end: new Date(record.date),
      resource: record,
      allDay: true
    };
  });

  const handleSelectEvent = (event: any) => {
    setSelectedRecord(event.resource);
    setIsEditing(false);
    setFormData({
      checkIn: event.resource.checkIn || '',
      checkOut: event.resource.checkOut || '',
      location: event.resource.location || ''
    });
    setIsDialogOpen(true);
  };

  const handleSelectSlot = (slotInfo: any) => {
    if (user?.role !== 'employee') {
      setSelectedDate(slotInfo.start);
      setIsBulkDialogOpen(true);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (selectedRecord) {
      setFormData({
        checkIn: selectedRecord.checkIn || '',
        checkOut: selectedRecord.checkOut || '',
        location: selectedRecord.location || ''
      });
    }
  };

  const calculateHours = (checkIn: string, checkOut: string): number => {
    if (!checkIn || !checkOut) return 0;
    
    const [inHours, inMinutes] = checkIn.split(':').map(Number);
    const [outHours, outMinutes] = checkOut.split(':').map(Number);
    
    const inTime = inHours * 60 + inMinutes;
    const outTime = outHours * 60 + outMinutes;
    
    if (outTime <= inTime) return 0;
    
    return (outTime - inTime) / 60;
  };

  const determineStatus = (checkIn: string): string => {
    if (!checkIn) return 'Absent';
    const [hours, minutes] = checkIn.split(':').map(Number);
    const checkInMinutes = hours * 60 + minutes;
    const nineAM = 9 * 60; // 9:00 AM in minutes
    
    return checkInMinutes > nineAM ? 'Late' : 'Present';
  };

  const handleSave = async () => {
    if (!selectedRecord) return;

    setIsSubmitting(true);
    try {
      const hoursWorked = calculateHours(formData.checkIn, formData.checkOut);
      const status = determineStatus(formData.checkIn);

      await updateAttendanceRecord(selectedRecord.id, {
        checkIn: formData.checkIn || null,
        checkOut: formData.checkOut || null,
        location: formData.location || null,
        hoursWorked,
        status
      });

      toast('Attendance record updated successfully');
      await loadData();
      setIsEditing(false);
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error updating attendance record:', error);
      toast('Error updating attendance record');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedRecord) return;

    setIsDeleting(true);
    try {
      await deleteAttendanceRecord(selectedRecord.id);
      toast('Attendance record deleted successfully');
      await loadData();
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error deleting attendance record:', error);
      toast('Error deleting attendance record');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const eventStyleGetter = (event: any) => {
    const record = event.resource as AttendanceRecord;
    
    // Find branch by location name and use its color
    const branch = branches.find(b => b.name === record.location);
    let backgroundColor = branch?.color || '#6b7280'; // Default gray if no branch found
    
    // Convert Tailwind color classes to actual hex colors if needed
    const colorMap: { [key: string]: string } = {
      '#3b82f6': '#3b82f6', // blue
      '#991b1b': '#991b1b', // red  
      '#6b7280': '#6b7280', // gray
      '#eab308': '#eab308', // yellow
      '#22c55e': '#22c55e', // green
      '#8b5cf6': '#8b5cf6', // purple
      'bg-blue-500': '#3b82f6',
      'bg-red-500': '#991b1b', 
      'bg-gray-500': '#6b7280',
      'bg-yellow-500': '#eab308',
      'bg-green-500': '#22c55e',
      'bg-purple-500': '#8b5cf6'
    };
    
    backgroundColor = colorMap[backgroundColor] || backgroundColor;
    
    // Add status indicator via border for visual differentiation
    let borderColor = backgroundColor;
    let borderWidth = '2px';
    if (record.status === 'Late') {
      borderColor = '#f59e0b'; // Yellow border for late
    } else if (record.status === 'Absent') {
      borderColor = '#ef4444'; // Red border for absent
    }
    
    return {
      style: {
        backgroundColor,
        borderRadius: '4px',
        opacity: 0.8,
        color: 'white',
        border: `${borderWidth} solid ${borderColor}`,
        display: 'block'
      }
    };
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading calendar...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CalendarDays className="w-5 h-5" />
            <span>Attendance Calendar</span>
          </CardTitle>
          <CardDescription>
            View employee attendance records in calendar format. Click on any record to view details.
            {user?.role !== 'employee' && ' Click on any date to add bulk attendance records.'}
          </CardDescription>
          
          {/* Branch Color Legend */}
          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
            <p className="text-sm font-medium mb-2">Branch Colors:</p>
            <div className="flex flex-wrap gap-3">
              {branches.map(branch => (
                <div key={branch.id} className="flex items-center gap-2">
                  <div 
                    className="w-4 h-4 rounded border border-border" 
                    style={{ 
                      backgroundColor: branch.color?.startsWith('#') 
                        ? branch.color 
                        : branch.color === 'bg-blue-500' ? '#3b82f6'
                        : branch.color === 'bg-red-500' ? '#991b1b'
                        : branch.color === 'bg-gray-500' ? '#6b7280'
                        : branch.color === 'bg-yellow-500' ? '#eab308'
                        : branch.color === 'bg-green-500' ? '#22c55e'
                        : branch.color === 'bg-purple-500' ? '#8b5cf6'
                        : '#6b7280'
                    }}
                  />
                  <span className="text-sm text-muted-foreground">{branch.name}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              • Yellow border: Late arrival • Red border: Absent
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <div style={{ height: '800px' }}>
            <Calendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              onSelectEvent={handleSelectEvent}
              onSelectSlot={handleSelectSlot}
              selectable={user?.role !== 'employee'}
              eventPropGetter={eventStyleGetter}
              views={['month']}
              defaultView="month"
              popup
              dayLayoutAlgorithm="no-overlap"
              tooltipAccessor={(event) => {
                const employee = employees.find(emp => emp.id === event.resource.employeeId);
                const branch = branches.find(b => b.name === event.resource.location);
                return `${employee?.name || 'Unknown'} - ${event.resource.status} at ${branch?.name || event.resource.location || 'Unknown'} (${event.resource.hoursWorked}h)`;
              }}
              formats={{
                dayHeaderFormat: (date, culture, localizer) =>
                  localizer?.format(date, 'dddd', culture) || ''
              }}
              components={{
                month: {
                  dateHeader: ({ date, label }) => (
                    <div className="rbc-date-cell">
                      <div className="rbc-row-bg">
                        <div className="rbc-day-bg rbc-today" style={{ minHeight: '120px' }}>
                          <span className="rbc-date-cell-text">{label}</span>
                        </div>
                      </div>
                    </div>
                  )
                }
              }}
              style={{
                height: '100%',
                fontSize: '14px'
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Attendance Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open);
        if (!open) {
          setIsEditing(false);
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Users className="w-5 h-5" />
              <span>{isEditing ? 'Edit Attendance Record' : 'Attendance Record Details'}</span>
            </DialogTitle>
            <DialogDescription>
              {isEditing ? 'Edit attendance record information' : 'View attendance record information'}
            </DialogDescription>
          </DialogHeader>
          
          {selectedRecord && (
            <div className="space-y-4">
              {/* Read-only fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Employee</p>
                  <p className="text-sm font-semibold">
                    {employees.find(emp => emp.id === selectedRecord.employeeId)?.name || 'Unknown'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Date</p>
                  <p className="text-sm">{formatDate(new Date(selectedRecord.date))}</p>
                </div>
              </div>
              
              {/* Editable fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Check In</Label>
                  {isEditing ? (
                    <Input
                      type="time"
                      value={formData.checkIn}
                      onChange={(e) => handleInputChange('checkIn', e.target.value)}
                      className="mt-1"
                    />
                  ) : (
                    <p className="text-sm mt-1">{selectedRecord.checkIn || '-'}</p>
                  )}
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Check Out</Label>
                  {isEditing ? (
                    <Input
                      type="time"
                      value={formData.checkOut}
                      onChange={(e) => handleInputChange('checkOut', e.target.value)}
                      className="mt-1"
                    />
                  ) : (
                    <p className="text-sm mt-1">{selectedRecord.checkOut || '-'}</p>
                  )}
                </div>
              </div>
              
              {/* Location field */}
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Location</Label>
                {isEditing ? (
                  <Select value={formData.location} onValueChange={(value) => handleInputChange('location', value)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map(branch => (
                        <SelectItem key={branch.id} value={branch.name}>
                          {branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex items-center space-x-1 mt-1">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <p className="text-sm">{selectedRecord.location || 'Not specified'}</p>
                  </div>
                )}
              </div>

              {/* Read-only calculated fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Hours Worked</p>
                  <p className="text-sm">
                    {isEditing 
                      ? calculateHours(formData.checkIn, formData.checkOut).toFixed(1)
                      : (selectedRecord.hoursWorked?.toFixed(1) || '0.0')
                    }h
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <Badge variant={
                    (isEditing ? determineStatus(formData.checkIn) : selectedRecord.status) === 'Present' ? 'default' : 
                    (isEditing ? determineStatus(formData.checkIn) : selectedRecord.status) === 'Late' ? 'secondary' : 
                    'destructive'
                  }>
                    {isEditing ? determineStatus(formData.checkIn) : selectedRecord.status}
                  </Badge>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex justify-between">
            {!isEditing ? (
              <>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" disabled={isDeleting}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Attendance Record</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete this attendance record? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {isDeleting ? 'Deleting...' : 'Delete'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                
                <Button onClick={handleEdit} variant="outline">
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </>
            ) : (
              <div className="flex gap-2 w-full">
                <Button onClick={handleCancel} variant="outline" disabled={isSubmitting}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={isSubmitting}>
                  <Save className="h-4 w-4 mr-2" />
                  {isSubmitting ? 'Saving...' : 'Save'}
                </Button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Attendance Dialog */}
      <BulkAttendanceDialog
        isOpen={isBulkDialogOpen}
        onClose={() => setIsBulkDialogOpen(false)}
        employees={employees}
        selectedDate={selectedDate || new Date()}
        onSuccess={loadData}
      />
    </div>
  );
};

export default AttendanceCalendarView;
