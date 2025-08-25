
import { convertTailwindColorToHex } from '@/utils/colorUtils';
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, Calendar, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

interface SelectedDatesManagerProps {
  selectedDates: Date[];
  onRemoveDate: (index: number) => void;
  onClearAll: () => void;
  branchColor: string;
  branchName: string;
}

const SelectedDatesManager: React.FC<SelectedDatesManagerProps> = ({
  selectedDates,
  onRemoveDate,
  onClearAll,
  branchColor,
  branchName
}) => {
  if (selectedDates.length === 0) {
    return null;
  }

  return (
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
          <div className="text-xs text-gray-600 mb-2">
            Booking at <span className="font-medium">{branchName}</span>
          </div>
          
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {selectedDates.map((date, index) => (
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
                    {format(date, 'MMM dd')}
                  </span>
                  <Badge variant="outline" className="text-xs px-1 py-0">
                    {format(date, 'EEE')}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemoveDate(index)}
                  className="h-5 w-5 p-0 text-gray-500 hover:text-red-600 hover:bg-red-50 flex-shrink-0"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SelectedDatesManager;
