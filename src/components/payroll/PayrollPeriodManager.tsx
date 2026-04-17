
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, ChevronLeft, ChevronRight, Clock, AlertCircle } from 'lucide-react';
import { usePayroll } from '@/contexts/PayrollContext';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { formatDate } from '@/utils/dateFormat';

const PayrollPeriodManager: React.FC = () => {
  const { payrollState, setCurrentPeriod, loadPayrollFromSupabase, isLoading } = usePayroll();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  const handlePeriodChange = async (month: number, year: number) => {
    const periodString = `${months[month]} ${year}`;
    setCurrentPeriod(periodString);
    await loadPayrollFromSupabase();
  };

  const navigatePeriod = (direction: 'prev' | 'next') => {
    let newMonth = selectedMonth;
    let newYear = selectedYear;

    if (direction === 'prev') {
      newMonth = selectedMonth === 0 ? 11 : selectedMonth - 1;
      newYear = selectedMonth === 0 ? selectedYear - 1 : selectedYear;
    } else {
      newMonth = selectedMonth === 11 ? 0 : selectedMonth + 1;
      newYear = selectedMonth === 11 ? selectedYear + 1 : selectedYear;
    }

    setSelectedMonth(newMonth);
    setSelectedYear(newYear);
    handlePeriodChange(newMonth, newYear);
  };

  const isCurrentPeriod = () => {
    const current = new Date();
    return selectedMonth === current.getMonth() && selectedYear === current.getFullYear();
  };

  const isPastPeriod = () => {
    const current = new Date();
    const selected = new Date(selectedYear, selectedMonth);
    return selected < new Date(current.getFullYear(), current.getMonth());
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Calendar className="w-5 h-5 mr-2" />
          Payroll Period
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigatePeriod('prev')}
            disabled={isLoading}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <div className="flex items-center space-x-2">
            <Select
              value={selectedMonth.toString()}
              onValueChange={(value) => {
                const month = parseInt(value);
                setSelectedMonth(month);
                handlePeriodChange(month, selectedYear);
              }}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {months.map((month, index) => (
                  <SelectItem key={index} value={index.toString()}>
                    {month}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={selectedYear.toString()}
              onValueChange={(value) => {
                const year = parseInt(value);
                setSelectedYear(year);
                handlePeriodChange(selectedMonth, year);
              }}
            >
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => navigatePeriod('next')}
            disabled={isLoading}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Badge variant={isCurrentPeriod() ? "default" : "secondary"}>
              {isCurrentPeriod() ? "Current Period" : isPastPeriod() ? "Past Period" : "Future Period"}
            </Badge>
            <Badge variant="outline">
              {payrollState.status.charAt(0).toUpperCase() + payrollState.status.slice(1)}
            </Badge>
          </div>

          <div className="flex items-center text-sm text-gray-500">
            <Clock className="w-3 h-3 mr-1" />
            Last updated: {formatDate(payrollState.lastUpdated)}
          </div>
        </div>

        {isPastPeriod() && payrollState.status === 'draft' && (
          <Alert className="mt-4 border-amber-200 bg-amber-50">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              This is a past payroll period that hasn't been finalized. Consider completing the payroll process.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default PayrollPeriodManager;
