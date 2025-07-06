
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
import { CalendarDays, Check, X, User, Calendar as CalendarIcon, Clock, Plus } from 'lucide-react';
import { getAllLeaveRequests, updateLeaveStatus, type LeaveRequest } from '@/services/leaveService';
import { useAuth } from '@/contexts/AuthContext';
import BulkLeaveDialog from './BulkLeaveDialog';

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales: { 'en-US': enUS },
});

const LeaveCalendarView = () => {
  const { user } = useAuth();
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isBulkLeaveOpen, setIsBulkLeaveOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaves();
  }, []);

  const loadLeaves = async () => {
    try {
      setLoading(true);
      const allLeaves = await getAllLeaveRequests();
      // Filter out rejected leaves - only show pending and approved
      const visibleLeaves = allLeaves.filter(leave => leave.status !== 'Rejected');
      setLeaves(visibleLeaves);
      console.log('Loaded visible leaves (excluding rejected):', visibleLeaves);
    } catch (error) {
      console.error('Error loading leaves:', error);
      toast('Error loading leave requests');
    } finally {
      setLoading(false);
    }
  };

  const events = leaves.map(leave => ({
    id: leave.id,
    title: `${leave.employeeName} - ${leave.type}`,
    start: new Date(leave.startDate),
    end: new Date(leave.endDate),
    resource: leave,
    allDay: true
  }));

  const handleSelectEvent = (event: any) => {
    setSelectedLeave(event.resource);
    setIsDialogOpen(true);
  };

  const handleSelectSlot = (slotInfo: any) => {
    if (user?.role !== 'employee') {
      setSelectedDate(slotInfo.start);
      setIsBulkLeaveOpen(true);
    }
  };

  const handleApprove = async () => {
    if (!selectedLeave || !user) return;
    
    try {
      await updateLeaveStatus(selectedLeave.id, 'Approved', user.name);
      toast(`Leave request approved for ${selectedLeave.employeeName}`);
      setIsDialogOpen(false);
      await loadLeaves();
    } catch (error) {
      console.error('Error approving leave:', error);
      toast('Error approving leave request');
    }
  };

  const handleReject = async () => {
    if (!selectedLeave || !user) return;
    
    try {
      await updateLeaveStatus(selectedLeave.id, 'Rejected', user.name);
      toast(`Leave request rejected for ${selectedLeave.employeeName}`);
      setIsDialogOpen(false);
      await loadLeaves();
    } catch (error) {
      console.error('Error rejecting leave:', error);
      toast('Error rejecting leave request');
    }
  };

  const eventStyleGetter = (event: any) => {
    const leave = event.resource as LeaveRequest;
    let backgroundColor = '#3174ad';
    
    switch (leave.status) {
      case 'Approved':
        backgroundColor = '#10b981';
        break;
      case 'Pending':
        backgroundColor = '#f59e0b';
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
            <span>Leave Calendar</span>
          </CardTitle>
          <CardDescription>
            View and manage leave requests in calendar format. Click on any leave to approve or reject it.
            {user?.role !== 'employee' && ' Click on any date to add bulk leave requests.'}
            Only pending and approved leaves are shown.
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
              tooltipAccessor={(event) => `${event.resource.employeeName} - ${event.resource.type} (${event.resource.status})`}
              formats={{
                dayHeaderFormat: (date, culture, localizer) =>
                  localizer?.format(date, 'dddd', culture) || ''
              }}
              style={{
                height: '100%',
                fontSize: '14px'
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Leave Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <User className="w-5 h-5" />
              <span>Leave Request Details</span>
            </DialogTitle>
            <DialogDescription>
              Review and approve or reject this leave request
            </DialogDescription>
          </DialogHeader>
          
          {selectedLeave && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Employee</p>
                  <p className="text-sm font-semibold">{selectedLeave.employeeName}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Type</p>
                  <p className="text-sm font-semibold">{selectedLeave.type}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Start Date</p>
                  <p className="text-sm">{new Date(selectedLeave.startDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">End Date</p>
                  <p className="text-sm">{new Date(selectedLeave.endDate).toLocaleDateString()}</p>
                </div>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-500">Duration</p>
                <p className="text-sm">{selectedLeave.days} day(s)</p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-500">Status</p>
                <Badge variant={selectedLeave.status === 'Approved' ? 'default' : selectedLeave.status === 'Pending' ? 'secondary' : 'destructive'}>
                  {selectedLeave.status}
                </Badge>
              </div>
              
              {selectedLeave.reason && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Reason</p>
                  <p className="text-sm">{selectedLeave.reason}</p>
                </div>
              )}
              
              <div>
                <p className="text-sm font-medium text-gray-500">Applied On</p>
                <div className="flex items-center space-x-1">
                  <CalendarIcon className="w-4 h-4 text-gray-400" />
                  <p className="text-sm">{new Date(selectedLeave.appliedOn).toLocaleDateString()}</p>
                </div>
              </div>
              
              {selectedLeave.status === 'Pending' && user?.role !== 'employee' && (
                <div className="flex space-x-2 pt-4">
                  <Button onClick={handleApprove} className="flex-1 bg-green-600 hover:bg-green-700">
                    <Check className="w-4 h-4 mr-2" />
                    Approve
                  </Button>
                  <Button onClick={handleReject} variant="destructive" className="flex-1">
                    <X className="w-4 h-4 mr-2" />
                    Reject
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk Leave Dialog */}
      <BulkLeaveDialog
        isOpen={isBulkLeaveOpen}
        onClose={() => setIsBulkLeaveOpen(false)}
        selectedDate={selectedDate}
        onSuccess={loadLeaves}
      />
    </div>
  );
};

export default LeaveCalendarView;
