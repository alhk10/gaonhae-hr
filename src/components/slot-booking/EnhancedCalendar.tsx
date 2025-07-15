
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
    <Card className="w-full h-fit flex flex-col">
      <CardHeader className="pb-3 flex-shrink-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarIcon className="w-4 h-4" />
          Select Dates
          {selectedDates.length > 0 && (
            <Badge variant="secondary" className="ml-2 text-xs">
              {selectedDates.length} selected
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col space-y-3 p-4 pt-0">
        {/* Compact Calendar Legend */}
        <div className="grid grid-cols-1 gap-1.5 p-2 bg-muted/20 rounded text-xs flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-200 border border-blue-400"></div>
            <span>Others' approved bookings</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-red-200 border border-red-400"></div>
            <span>Your existing bookings</span>
          </div>
          <div className="flex items-center gap-2">
            <div 
              className="w-2.5 h-2.5 rounded-full border-2" 
              style={{ backgroundColor: branchColor, borderColor: branchColor }}
            ></div>
            <span>Your selections</span>
          </div>
        </div>

        {/* Calendar with Dynamic Stretching */}
        <div className="flex-1 flex flex-col min-h-0">
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
              "rounded-md border w-full flex-1 h-full",
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
        <div className="flex items-start gap-2 p-2 bg-blue-50 rounded text-xs flex-shrink-0">
          <Info className="w-3.5 h-3.5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-blue-800">
            <p className="font-medium mb-1">How to select dates:</p>
            <ul className="text-xs space-y-0.5 text-blue-700">
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
