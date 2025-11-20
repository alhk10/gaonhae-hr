import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CalendarCheck2, Clock } from "lucide-react";

interface CasualEmployeePayBadgeProps {
  warnings?: string[];
  slotCount?: number;
  slotBookingPay?: number;
  calculationMethod?: 'dynamic_pricing' | 'legacy_rates';
}

export const CasualEmployeePayBadge = ({ warnings = [], slotCount, slotBookingPay, calculationMethod }: CasualEmployeePayBadgeProps) => {
  // Determine if dynamic pricing is being used
  const isDynamicPricing = calculationMethod === 'dynamic_pricing' || 
                           (slotBookingPay !== undefined && slotBookingPay > 0) || 
                           warnings.some(w => w.includes('slot booking') || w.includes('dynamic pricing'));
  
  if (isDynamicPricing) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <Badge variant="default" className="bg-green-100 text-green-700 border-green-300 text-xs flex items-center gap-1 font-semibold">
              <CalendarCheck2 className="w-3 h-3" />
              Dynamic Pricing
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1">
              <p className="font-semibold">Pay calculated using dynamic pricing</p>
              {slotCount !== undefined && slotCount > 0 && (
                <p className="text-xs">✓ Slots with attendance: {slotCount}</p>
              )}
              {slotBookingPay !== undefined && slotBookingPay > 0 && (
                <p className="text-xs">✓ Slot booking pay: S${slotBookingPay.toFixed(2)}</p>
              )}
              <p className="text-xs text-muted-foreground">Effective: November 2025 onwards</p>
            </div>
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
          <div className="space-y-1">
            <p>Pay calculated using standard rates</p>
            <p className="text-xs text-muted-foreground">Hourly/Daily/Monthly method</p>
            <p className="text-xs text-muted-foreground">Pre-November 2025 or no slot bookings</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
