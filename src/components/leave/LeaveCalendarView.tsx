
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Calendar, Check, X, Eye } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { LeaveRequest, updateLeaveStatus } from '@/services/leaveService';
import { getLeaveTypes, LeaveType } from '@/services/leaveTypesService';

interface LeaveCalendarViewProps {
  leaves: LeaveRequest[];
  onLeaveUpdate?: () => void;
}

const LeaveCalendarView = ({ leaves, onLeaveUpdate }: LeaveCalendarViewProps) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null);
  const [isLeaveDetailOpen, setIsLeaveDetailOpen] = useState(false);

  useEffect(() => {
    const loadLeaveTypes = async () => {
      try {
        const types = await getLeaveTypes();
        setLeaveTypes(types);
      } catch (error) {
        console.error('Error loading leave types for calendar:', error);
      }
    };
    loadLeaveTypes();
  }, []);

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getLeaveForDate = (dateString: string) => {
    return leaves.filter(leave => {
      const startDate = new Date(leave.startDate);
      const endDate = new Date(leave.endDate);
      const checkDate = new Date(dateString);
      
      return checkDate >= startDate && checkDate <= endDate;
    });
  };

  const handleApproveLeave = async (leaveId: number) => {
    try {
      await updateLeaveStatus(leaveId, 'Approved', 'Admin');
      toast("Leave approved successfully");
      if (onLeaveUpdate) {
        onLeaveUpdate();
      }
      setIsLeaveDetailOpen(false);
    } catch (error) {
      console.error('Error approving leave:', error);
      toast("Error approving leave");
    }
  };

  const handleRejectLeave = async (leaveId: number) => {
    try {
      await updateLeaveStatus(leaveId, 'Rejected', 'Admin');
      toast("Leave rejected successfully");
      if (onLeaveUpdate) {
        onLeaveUpdate();
      }
      setIsLeaveDetailOpen(false);
    } catch (error) {
      console.error('Error rejecting leave:', error);
      toast("Error rejecting leave");
    }
  };

  const showLeaveDetail = (leave: LeaveRequest) => {
    setSelectedLeave(leave);
    setIsLeaveDetailOpen(true);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const renderCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-20 border border-gray-100"></div>);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateString = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayLeaves = getLeaveForDate(dateString);
      const isToday = new Date().toDateString() === new Date(dateString).toDateString();

      days.push(
        <div
          key={day}
          className={`h-20 border border-gray-100 p-1 ${isToday ? 'bg-blue-50 border-blue-200' : ''}`}
        >
          <div className={`text-sm font-medium ${isToday ? 'text-blue-600' : 'text-gray-900'} mb-1`}>
            {day}
          </div>
          <div className="space-y-1">
            {dayLeaves.slice(0, 2).map((leave, index) => (
              <div
                key={index}
                className="text-xs px-1 py-0.5 rounded text-white truncate cursor-pointer hover:opacity-80 transition-opacity"
                style={{
                  backgroundColor: getLeaveTypeColor(leave.type)
                }}
                title={`${leave.employeeName} - ${leave.type} (${leave.status})`}
                onClick={() => showLeaveDetail(leave)}
              >
                <div className="flex items-center justify-between">
                  <span>{leave.employeeName.split(' ')[0]}</span>
                  {leave.status === 'Pending' && (
                    <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                  )}
                </div>
              </div>
            ))}
            {dayLeaves.length > 2 && (
              <div className="text-xs text-gray-500 px-1 cursor-pointer hover:text-gray-700" 
                   onClick={() => dayLeaves.length > 2 && showLeaveDetail(dayLeaves[2])}>
                +{dayLeaves.length - 2} more
              </div>
            )}
          </div>
        </div>
      );
    }

    return days;
  };

  const getLeaveTypeColor = (type: string) => {
    // Generate colors based on leave type index to ensure consistency
    const colors = [
      '#3b82f6', // blue
      '#ef4444', // red
      '#f59e0b', // amber
      '#ec4899', // pink
      '#06b6d4', // cyan
      '#10b981', // emerald
      '#8b5cf6', // violet
      '#f97316', // orange
    ];
    
    const typeIndex = leaveTypes.findIndex(lt => lt.name === type);
    return colors[typeIndex % colors.length] || '#6b7280'; // gray default
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="w-5 h-5" />
              <span>Leave Calendar</span>
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="font-medium min-w-[140px] text-center">
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </span>
              <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          {/* Dynamic Legend based on active leave types */}
          <div className="flex flex-wrap gap-3 text-xs">
            {leaveTypes.filter(type => type.isActive).map((type, index) => (
              <div key={type.id} className="flex items-center space-x-1">
                <div 
                  className="w-3 h-3 rounded"
                  style={{ backgroundColor: getLeaveTypeColor(type.name) }}
                ></div>
                <span className="text-gray-600">{type.name}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Click on leave entries to view details and approve/reject requests. Yellow dots indicate pending requests.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-0 mb-2">
            {dayNames.map(day => (
              <div key={day} className="h-8 flex items-center justify-center text-sm font-medium text-gray-500 border-b">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0">
            {renderCalendarDays()}
          </div>
        </CardContent>
      </Card>

      {/* Leave Detail Dialog */}
      <Dialog open={isLeaveDetailOpen} onOpenChange={setIsLeaveDetailOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Eye className="w-5 h-5" />
              <span>Leave Request Details</span>
            </DialogTitle>
            <DialogDescription>
              Review and manage this leave request
            </DialogDescription>
          </DialogHeader>
          {selectedLeave && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Employee</label>
                  <p className="text-sm">{selectedLeave.employeeName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Employee ID</label>
                  <p className="text-sm">{selectedLeave.employeeId}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Leave Type</label>
                  <p className="text-sm">{selectedLeave.type}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Status</label>
                  <Badge 
                    variant={
                      selectedLeave.status === 'Approved' ? 'default' : 
                      selectedLeave.status === 'Pending' ? 'secondary' : 
                      'destructive'
                    }
                  >
                    {selectedLeave.status}
                  </Badge>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Start Date</label>
                  <p className="text-sm">{selectedLeave.startDate}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">End Date</label>
                  <p className="text-sm">{selectedLeave.endDate}</p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Days Requested</label>
                <p className="text-sm">{selectedLeave.days} day{selectedLeave.days !== 1 ? 's' : ''}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Reason</label>
                <p className="text-sm">{selectedLeave.reason || 'No reason provided'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Applied On</label>
                <p className="text-sm">{selectedLeave.appliedOn}</p>
              </div>
              {selectedLeave.approvedBy && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Approved By</label>
                  <p className="text-sm">{selectedLeave.approvedBy} on {selectedLeave.approvedOn}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <div className="flex space-x-2 w-full">
              <Button variant="outline" onClick={() => setIsLeaveDetailOpen(false)} className="flex-1">
                Close
              </Button>
              {selectedLeave?.status === 'Pending' && (
                <>
                  <Button 
                    variant="outline" 
                    onClick={() => handleRejectLeave(selectedLeave.id)}
                    className="flex-1 text-red-600 hover:text-red-700"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Reject
                  </Button>
                  <Button 
                    onClick={() => handleApproveLeave(selectedLeave.id)}
                    className="flex-1"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Approve
                  </Button>
                </>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default LeaveCalendarView;
