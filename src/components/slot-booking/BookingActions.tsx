
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, CheckCircle, AlertCircle, Plus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface BookingActionsProps {
  selectedDates: Date[];
  branchName: string;
  branchColor: string;
  isBooking: boolean;
  employeeVerified: boolean | null;
  onBookSlots: () => void;
  onBulkBookingOpen: () => void;
}

const BookingActions: React.FC<BookingActionsProps> = ({
  selectedDates,
  branchName,
  branchColor,
  isBooking,
  employeeVerified,
  onBookSlots,
  onBulkBookingOpen
}) => {
  const { user } = useAuth();
  
  const canBook = selectedDates.length > 0 && employeeVerified !== false && !isBooking;
  const isEmployee = user?.role === 'employee';

  return (
    <Card className="w-full">
      <CardContent className="pt-3">
        <div className="space-y-4">
          {/* Employee Verification Status */}
          {employeeVerified === false && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-red-800">Employee record not found</p>
                <p className="text-red-700">Please contact administrator before booking slots.</p>
              </div>
            </div>
          )}

          {/* Booking Summary */}
          {selectedDates.length > 0 && (
            <div 
              className="p-4 rounded-lg border"
              style={{ 
                backgroundColor: `${branchColor}15`,
                borderColor: `${branchColor}40`
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5" style={{ color: branchColor }} />
                <span className="font-medium">Booking Summary</span>
              </div>
              <div className="text-sm text-gray-700 space-y-1">
                <p><span className="font-medium">Branch:</span> {branchName}</p>
                <p><span className="font-medium">Dates:</span> {selectedDates.length} slot{selectedDates.length !== 1 ? 's' : ''}</p>
                <p><span className="font-medium">Status:</span> Will be marked as "Pending" for approval</p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              onClick={onBulkBookingOpen}
              className="flex-1"
              variant="default"
            >
              <Plus className="w-4 h-4 mr-2" />
              Bulk Booking
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BookingActions;
