
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
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="w-5 h-5" />
            Selected Dates ({selectedDates.length})
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={onClearAll}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Clear All
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="text-sm text-gray-600 mb-3">
            Booking slots at <span className="font-medium">{branchName}</span>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {selectedDates.map((date, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 rounded-lg border"
                style={{ 
                  backgroundColor: `${branchColor}10`,
                  borderColor: `${branchColor}30`
                }}
              >
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full flex-shrink-0" 
                    style={{ backgroundColor: branchColor }}
                  ></div>
                  <span className="text-sm font-medium">
                    {format(date, 'MMM dd, yyyy')}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {format(date, 'EEE')}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemoveDate(index)}
                  className="h-6 w-6 p-0 text-gray-500 hover:text-red-600 hover:bg-red-50"
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
