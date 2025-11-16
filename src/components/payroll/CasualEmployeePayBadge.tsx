import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CalendarCheck2, Clock } from "lucide-react";

interface CasualEmployeePayBadgeProps {
  warnings: string[];
  slotCount?: number;
}

export const CasualEmployeePayBadge = ({ warnings, slotCount }: CasualEmployeePayBadgeProps) => {
  const isSlotBooking = warnings.some(w => w.includes('slot booking'));
  
  if (isSlotBooking) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <Badge variant="default" className="bg-green-100 text-green-700 border-green-300 text-xs flex items-center gap-1">
              <CalendarCheck2 className="w-3 h-3" />
              Slot Booking
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>Pay calculated using slot booking + dynamic pricing</p>
            {slotCount !== undefined && <p className="text-xs">Slots: {slotCount}</p>}
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
          <p className="text-xs text-muted-foreground">Pre-November 2025 method</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
