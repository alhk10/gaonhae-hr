import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CalendarCheck2, Clock } from "lucide-react";

interface CasualEmployeePayBadgeProps {
  warnings: string[];
  slotCount?: number;
  slotBookingPay?: number;
}

export const CasualEmployeePayBadge = ({ warnings, slotCount, slotBookingPay }: CasualEmployeePayBadgeProps) => {
  // Check if this is using slot booking dynamic pricing
  const isSlotBooking = (slotBookingPay !== undefined && slotBookingPay > 0) || 
                        warnings.some(w => w.includes('slot booking') || w.includes('dynamic pricing'));
  
  if (isSlotBooking) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <Badge variant="default" className="bg-green-100 text-green-700 border-green-300 text-xs flex items-center gap-1">
              <CalendarCheck2 className="w-3 h-3" />
              Dynamic Pricing
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>Pay calculated using slot booking + dynamic pricing</p>
            {slotCount !== undefined && <p className="text-xs">Slots with attendance: {slotCount}</p>}
            {slotBookingPay !== undefined && <p className="text-xs">Total: S${slotBookingPay.toFixed(2)}</p>}
            <p className="text-xs text-muted-foreground">Effective November 2025+</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <Badge variant="secondary" className="text-xs flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Legacy Rates
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>Pay calculated using hourly/daily/monthly rates</p>
          <p className="text-xs text-muted-foreground">Pre-November 2025 method or no slot bookings</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
