
import { convertTailwindColorToHex } from '@/utils/colorUtils';
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { X, Calendar, Trash2, DollarSign, Info } from 'lucide-react';
import { format } from 'date-fns';
import { isFromNovember2024 } from '@/utils/slotPayCalculation';
import { formatMonthShort } from '@/utils/dateFormat';

interface SelectedDatesManagerProps {
  selectedDates: Date[];
  onRemoveDate: (index: number) => void;
  onClearAll: () => void;
  branchColor: string;
  branchName: string;
  calculatedPay?: { date: string; amount: number; breakdown: { item: string; amount: number }[] }[];
}

const SelectedDatesManager: React.FC<SelectedDatesManagerProps> = ({
  selectedDates,
  onRemoveDate,
  onClearAll,
  branchColor,
  branchName,
  calculatedPay = []
}) => {
  if (selectedDates.length === 0) {
    return null;
  }

  // Only calculate total for dates from November 2025 onwards
  const totalPay = calculatedPay
    .filter(pay => isFromNovember2024(pay.date))
    .reduce((sum, item) => sum + item.amount, 0);

  const getPayForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    // Only return pay info if the date is from November 2025 onwards
    if (!isFromNovember2024(dateStr)) {
      return null;
    }
    return calculatedPay.find(pay => pay.date === dateStr);
  };

  return (
    <TooltipProvider>
      <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="w-4 h-4" />
            Selected ({selectedDates.length})
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={onClearAll}
            className="text-red-600 hover:text-red-700 hover:bg-red-50 h-7 px-2"
          >
            <Trash2 className="w-3 h-3 mr-1" />
            Clear
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground mb-2">
            Booking at <span className="font-medium">{branchName}</span>
          </div>
          
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {selectedDates.map((date, index) => {
              const payInfo = getPayForDate(date);
              
              return (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 rounded border text-sm"
                  style={{ 
                    backgroundColor: `${convertTailwindColorToHex(branchColor)}08`,
                    borderColor: `${convertTailwindColorToHex(branchColor)}30`
                  }}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div 
                      className="w-2 h-2 rounded-full flex-shrink-0" 
                      style={{ backgroundColor: convertTailwindColorToHex(branchColor) }}
                    ></div>
                    <span className="font-medium truncate">
                      {formatMonthShort(date)}
                    </span>
                    <Badge variant="outline" className="text-xs px-1 py-0">
                      {format(date, 'EEE')}
                    </Badge>
                    {payInfo && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge variant="secondary" className="flex items-center gap-1 cursor-help ml-auto">
                            <DollarSign className="w-3 h-3" />
                            <span>${payInfo.amount}</span>
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <div className="space-y-1">
                            <p className="font-semibold text-xs mb-2">Pay Breakdown</p>
                            {payInfo.breakdown.map((item, idx) => (
                              <div key={idx} className="flex justify-between text-xs gap-4">
                                <span>{item.item}</span>
                                <span className="font-medium">${item.amount}</span>
                              </div>
                            ))}
                            <div className="border-t pt-1 mt-2 flex justify-between text-xs font-bold">
                              <span>Total</span>
                              <span>${payInfo.amount}</span>
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemoveDate(index)}
                    className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex-shrink-0 ml-2"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              );
            })}
          </div>

          {totalPay > 0 && (
            <div className="mt-3 pt-3 border-t flex justify-between items-center text-sm">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Info className="w-3 h-3" />
                <span>Total Estimated Pay</span>
              </div>
              <span className="font-bold text-lg">${totalPay}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
    </TooltipProvider>
  );
};

export default SelectedDatesManager;
