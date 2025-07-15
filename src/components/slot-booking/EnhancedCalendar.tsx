
import React from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Info, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface EnhancedCalendarProps {
  selectedDates: Date[];
  onDateSelect: (date: Date | undefined) => void;
  onDatesChange: (dates: Date[]) => void;
  isDateDisabled: (date: Date) => boolean;
  approvedBookingDates: Set<string>;
  employeeBookingDates: Set<string>;
  branchColor: string;
  isLoading?: boolean;
}

const EnhancedCalendar: React.FC<EnhancedCalendarProps> = ({
  selectedDates,
  onDateSelect,
  onDatesChange,
  isDateDisabled,
  approvedBookingDates,
  employeeBookingDates,
  branchColor,
  isLoading = false
}) => {
  return (
    <Card className="w-full h-fit">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <CalendarIcon className="w-5 h-5" />
          Select Dates
          {selectedDates.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {selectedDates.length} selected
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Compact Calendar Legend */}
        <div className="grid grid-cols-1 gap-2 p-3 bg-muted/30 rounded-lg text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-200 border border-blue-400"></div>
            <span>Others' approved bookings</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-200 border border-red-400"></div>
            <span>Your existing bookings</span>
          </div>
          <div className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full border-2" 
              style={{ backgroundColor: branchColor, borderColor: branchColor }}
            ></div>
            <span>Your selections</span>
          </div>
        </div>

        {/* Calendar with Full Width */}
        <div className="w-full">
          <Calendar
            mode="multiple"
            selected={selectedDates}
            onSelect={(dates) => {
              if (dates) {
                onDatesChange(dates);
              }
            }}
            onDayClick={onDateSelect}
            className={cn(
              "rounded-md border w-full",
              isLoading && "opacity-50 pointer-events-none"
            )}
            disabled={isDateDisabled}
            modifiers={{
              booked: (date) => {
                const dateString = format(date, 'yyyy-MM-dd');
                return approvedBookingDates.has(dateString);
              },
              myBooking: (date) => {
                const dateString = format(date, 'yyyy-MM-dd');
                return employeeBookingDates.has(dateString);
              }
            }}
            modifiersStyles={{
              booked: {
                backgroundColor: '#dbeafe',
                color: '#1d4ed8',
                fontWeight: 'normal'
              },
              myBooking: {
                backgroundColor: '#fee2e2',
                color: '#dc2626',
                textDecoration: 'line-through',
                fontWeight: 'bold'
              }
            }}
          />
        </div>

        {/* Compact Help text */}
        <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
          <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">How to select dates:</p>
            <ul className="text-xs space-y-1 text-blue-700">
              <li>• Click dates to select multiple slots</li>
              <li>• Click again to deselect</li>
              <li>• Red strikethrough = your existing bookings</li>
              <li>• Blue = other approved bookings</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default EnhancedCalendar;
