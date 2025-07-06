
import React, { useState, useEffect } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/components/ui/sonner';
import { CalendarDays, Users, MapPin, Clock } from 'lucide-react';
import { getAttendanceRecords, type AttendanceRecord } from '@/services/attendanceService';
import { getEmployees } from '@/services/employeeService';
import { useAuth } from '@/contexts/AuthContext';
import BulkAttendanceDialog from './BulkAttendanceDialog';

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
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [attendanceData, employeeData] = await Promise.all([
        getAttendanceRecords(),
        getEmployees()
      ]);
      
      setAttendanceRecords(attendanceData);
      setEmployees(employeeData);
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
    setIsDialogOpen(true);
  };

  const handleSelectSlot = (slotInfo: any) => {
    if (user?.role !== 'employee') {
      setSelectedDate(slotInfo.start);
      setIsBulkDialogOpen(true);
    }
  };

  const eventStyleGetter = (event: any) => {
    const record = event.resource as AttendanceRecord;
    let backgroundColor = '#3174ad';
    
    switch (record.status) {
      case 'Present':
        backgroundColor = '#10b981';
        break;
      case 'Late':
        backgroundColor = '#f59e0b';
        break;
      case 'Absent':
        backgroundColor = '#ef4444';
        break;
      case 'Half Day':
        backgroundColor = '#8b5cf6';
        break;
      default:
        backgroundColor = '#6b7280';
    }
    
    return {
      style: {
        backgroundColor,
        borderRadius: '4px',
        opacity: 0.8,
        color: 'white',
        border: '0px',
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
                return `${employee?.name || 'Unknown'} - ${event.resource.status} (${event.resource.hoursWorked}h)`;
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
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Users className="w-5 h-5" />
              <span>Attendance Record Details</span>
            </DialogTitle>
            <DialogDescription>
              View attendance record information
            </DialogDescription>
          </DialogHeader>
          
          {selectedRecord && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Employee</p>
                  <p className="text-sm font-semibold">
                    {employees.find(emp => emp.id === selectedRecord.employeeId)?.name || 'Unknown'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Date</p>
                  <p className="text-sm">{new Date(selectedRecord.date).toLocaleDateString()}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Check In</p>
                  <p className="text-sm">{selectedRecord.checkIn || '-'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Check Out</p>
                  <p className="text-sm">{selectedRecord.checkOut || '-'}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Hours Worked</p>
                  <p className="text-sm">{selectedRecord.hoursWorked?.toFixed(1) || '0.0'}h</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Status</p>
                  <Badge variant={
                    selectedRecord.status === 'Present' ? 'default' : 
                    selectedRecord.status === 'Late' ? 'secondary' : 
                    'destructive'
                  }>
                    {selectedRecord.status}
                  </Badge>
                </div>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-500">Location</p>
                <div className="flex items-center space-x-1">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <p className="text-sm">{selectedRecord.location || 'Not specified'}</p>
                </div>
              </div>
            </div>
          )}
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
