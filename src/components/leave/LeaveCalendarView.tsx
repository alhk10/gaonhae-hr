
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { LeaveRequest } from '@/services/leaveService';

interface LeaveCalendarViewProps {
  leaves: LeaveRequest[];
}

const LeaveCalendarView = ({ leaves }: LeaveCalendarViewProps) => {
  const [currentDate, setCurrentDate] = useState(new Date());

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
      
      return checkDate >= startDate && checkDate <= endDate && leave.status === 'Approved';
    });
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
                className="text-xs px-1 py-0.5 rounded text-white truncate"
                style={{
                  backgroundColor: getLeaveTypeColor(leave.type)
                }}
                title={`${leave.employeeName} - ${leave.type}`}
              >
                {leave.employeeName.split(' ')[0]}
              </div>
            ))}
            {dayLeaves.length > 2 && (
              <div className="text-xs text-gray-500 px-1">
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
    const colors: { [key: string]: string } = {
      'Annual Leave': '#3b82f6', // blue
      'Medical Leave': '#ef4444', // red
      'Emergency Leave': '#f59e0b', // amber
      'Maternity Leave': '#ec4899', // pink
      'Paternity Leave': '#06b6d4', // cyan
    };
    return colors[type] || '#6b7280'; // gray default
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
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
        
        {/* Legend */}
        <div className="flex flex-wrap gap-3 text-xs">
          {Object.entries({
            'Annual Leave': '#3b82f6',
            'Medical Leave': '#ef4444',
            'Emergency Leave': '#f59e0b',
            'Maternity Leave': '#ec4899',
            'Paternity Leave': '#06b6d4'
          }).map(([type, color]) => (
            <div key={type} className="flex items-center space-x-1">
              <div 
                className="w-3 h-3 rounded"
                style={{ backgroundColor: color }}
              ></div>
              <span className="text-gray-600">{type}</span>
            </div>
          ))}
        </div>
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
  );
};

export default LeaveCalendarView;
