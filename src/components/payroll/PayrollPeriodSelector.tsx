
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addMonths, subMonths } from 'date-fns';

interface PayrollPeriodSelectorProps {
  selectedPeriod: string;
  onPeriodChange: (period: string) => void;
}

const PayrollPeriodSelector = ({ selectedPeriod, onPeriodChange }: PayrollPeriodSelectorProps) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const handlePreviousMonth = () => {
    const prevMonth = subMonths(currentDate, 1);
    setCurrentDate(prevMonth);
    const periodString = format(prevMonth, 'MMMM yyyy');
    onPeriodChange(periodString);
  };

  const handleNextMonth = () => {
    const nextMonth = addMonths(currentDate, 1);
    setCurrentDate(nextMonth);
    const periodString = format(nextMonth, 'MMMM yyyy');
    onPeriodChange(periodString);
  };

  const handleCurrentMonth = () => {
    const now = new Date();
    setCurrentDate(now);
    const periodString = format(now, 'MMMM yyyy');
    onPeriodChange(periodString);
  };

  // Generate period options for the last 12 months and next 3 months
  const generatePeriodOptions = () => {
    const options = [];
    const now = new Date();
    
    // Previous 12 months
    for (let i = 12; i >= 1; i--) {
      const date = subMonths(now, i);
      options.push({
        value: format(date, 'MMMM yyyy'),
        label: format(date, 'MMMM yyyy')
      });
    }
    
    // Current month
    options.push({
      value: format(now, 'MMMM yyyy'),
      label: format(now, 'MMMM yyyy') + ' (Current)'
    });
    
    // Next 3 months
    for (let i = 1; i <= 3; i++) {
      const date = addMonths(now, i);
      options.push({
        value: format(date, 'MMMM yyyy'),
        label: format(date, 'MMMM yyyy')
      });
    }
    
    return options;
  };

  const periodOptions = generatePeriodOptions();

  return (
    <Card className="mb-6">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center space-x-2">
          <Calendar className="w-5 h-5" />
          <span>Payroll Period Selection</span>
        </CardTitle>
        <CardDescription>
          Select the payroll period you want to process or review
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between space-x-4">
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={handlePreviousMonth}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleCurrentMonth}>
              Current
            </Button>
            <Button variant="outline" size="sm" onClick={handleNextMonth}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="flex-1 max-w-xs">
            <Select value={selectedPeriod} onValueChange={onPeriodChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                {periodOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PayrollPeriodSelector;
