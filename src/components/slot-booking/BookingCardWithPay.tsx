import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Check, X, UserCheck, UserX, Edit, DollarSign } from 'lucide-react';
import { convertTailwindColorToHex } from '@/utils/colorUtils';
import { SlotBooking, Branch } from '@/services/slotBookingService';
import { EmployeeQualifications } from '@/types/employee';
import { calculateSlotPay, getPayBreakdown } from '@/utils/slotPayCalculation';
import { supabase } from '@/integrations/supabase/client';

interface BookingCardWithPayProps {
  booking: SlotBooking;
  branch?: Branch;
  hasClockedIn: boolean;
  showPay: boolean;
  isMobile: boolean;
  getEmployeeQualifications: (employeeId: string) => Promise<EmployeeQualifications | null>;
  handleApproval: (bookingId: string, status: 'approved' | 'rejected', approvedBy?: string) => Promise<void>;
  handleSwapClick: (booking: SlotBooking, event: React.MouseEvent) => void;
  handleCancelClick: (booking: SlotBooking, event: React.MouseEvent) => void;
  handleApprovalClick: (booking: SlotBooking, event: React.MouseEvent) => void;
}

export const BookingCardWithPay: React.FC<BookingCardWithPayProps> = ({
  booking,
  branch,
  hasClockedIn,
  showPay,
  isMobile,
  getEmployeeQualifications,
  handleApproval,
  handleSwapClick,
  handleCancelClick,
  handleApprovalClick,
}) => {
  const [calculatedPay, setCalculatedPay] = useState<number | null>(null);
  const [payBreakdown, setPayBreakdown] = useState<{ item: string; amount: number }[]>([]);
  const [isLoadingPay, setIsLoadingPay] = useState(false);

  useEffect(() => {
    if (showPay) {
      loadPayData();
    }
  }, [booking.employeeId, booking.date, showPay]);

  const loadPayData = async () => {
    setIsLoadingPay(true);
    try {
      const qualifications = await getEmployeeQualifications(booking.employeeId);
      
      // Fetch employee's join date
      const { data: employeeData } = await supabase
        .from('employees')
        .select('join_date')
        .eq('id', booking.employeeId)
        .single();
      
      const joinDate = employeeData?.join_date;
      
      const pay = await calculateSlotPay(booking.date, qualifications || undefined, joinDate);
      const breakdown = await getPayBreakdown(booking.date, qualifications || undefined, joinDate);
      
      setCalculatedPay(pay);
      setPayBreakdown(breakdown);
    } catch (error) {
      console.error('Error loading pay data:', error);
    } finally {
      setIsLoadingPay(false);
    }
  };

  return (
    <Card className={`${isMobile ? 'p-2' : 'p-3'}`}>
      <div className={`flex items-start ${isMobile ? 'flex-col gap-2' : 'justify-between'}`}>
        <div className="flex items-center space-x-2 flex-1">
          <div 
            className="w-3 h-3 rounded-full flex-shrink-0" 
            style={{ backgroundColor: convertTailwindColorToHex(branch?.color || '#6b7280') }}
          ></div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className={`font-medium ${isMobile ? 'text-sm' : 'text-sm'}`}>
                {booking.employeeName}
                {booking.status === 'approved' && hasClockedIn && (
                  <span className="ml-2 text-green-600" title="Employee has clocked in">✅✅</span>
                )}
              </p>
              {showPay && calculatedPay !== null && !isLoadingPay && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="secondary" className="flex items-center gap-1 cursor-help">
                      <DollarSign className="w-3 h-3" />
                      <span>${calculatedPay}</span>
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <div className="space-y-1">
                      <p className="font-semibold text-xs mb-2">Pay Breakdown</p>
                      {payBreakdown.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-xs gap-4">
                          <span>{item.item}</span>
                          <span className="font-medium">${item.amount}</span>
                        </div>
                      ))}
                      <div className="border-t pt-1 mt-2 flex justify-between text-xs font-bold">
                        <span>Total</span>
                        <span>${calculatedPay}</span>
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
            <p className={`text-muted-foreground ${isMobile ? 'text-xs' : 'text-xs'}`}>{branch?.name}</p>
            <Badge 
              variant={
                booking.status === 'approved' ? 'default' :
                booking.status === 'pending' ? 'secondary' :
                'destructive'
              }
              className={`mt-1 ${isMobile ? 'text-xs' : 'text-xs'}`}
            >
              {booking.status}
            </Badge>
          </div>
        </div>
        <div className={`flex space-x-1 ${isMobile ? 'w-full justify-end' : ''}`}>
          {booking.status === 'pending' && (
            <>
              <Button 
                size="sm" 
                variant="outline" 
                className={`p-0 ${isMobile ? 'h-8 w-8' : 'h-6 w-6'}`}
                onClick={() => handleApproval(booking.id, 'approved', 'Admin')}
              >
                <Check className={`text-green-600 ${isMobile ? 'w-4 h-4' : 'w-3 h-3'}`} />
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                className={`p-0 ${isMobile ? 'h-8 w-8' : 'h-6 w-6'}`}
                onClick={() => handleApproval(booking.id, 'rejected', 'Admin')}
              >
                <X className={`text-red-600 ${isMobile ? 'w-4 h-4' : 'w-3 h-3'}`} />
              </Button>
            </>
          )}
          <Button 
            size="sm" 
            variant="outline" 
            className={`p-0 ${isMobile ? 'h-8 w-8' : 'h-6 w-6'}`}
            onClick={() => handleSwapClick(booking, new MouseEvent('click') as any)}
          >
            <UserCheck className={`${isMobile ? 'w-4 h-4' : 'w-3 h-3'}`} />
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            className={`p-0 ${isMobile ? 'h-8 w-8' : 'h-6 w-6'}`}
            onClick={() => handleCancelClick(booking, new MouseEvent('click') as any)}
          >
            <UserX className={`text-red-600 ${isMobile ? 'w-4 h-4' : 'w-3 h-3'}`} />
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            className={`p-0 ${isMobile ? 'h-8 w-8' : 'h-6 w-6'}`}
            onClick={() => handleApprovalClick(booking, new MouseEvent('click') as any)}
          >
            <Edit className={`${isMobile ? 'w-4 h-4' : 'w-3 h-3'}`} />
          </Button>
        </div>
      </div>
    </Card>
  );
};
