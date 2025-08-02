import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar, ChevronLeft, ChevronRight, RefreshCw, Clock, TrendingUp } from 'lucide-react';
import { getAllPayrollRecords, PayrollRecord, getPayrollStatus } from '@/services/payrollService';
import { formatCurrency } from '@/utils/payrollCalculations';
import { usePayroll } from '@/contexts/PayrollContext';
import { useToast } from '@/hooks/use-toast';

interface PayrollPeriodSelectorProps {
  selectedPeriod: string;
  onPeriodChange: (period: string) => void;
  isLoading?: boolean;
}

interface PayrollStatus {
  status: string;
  finalizedBy?: string;
  finalizedAt?: string;
}

const PayrollPeriodSelector: React.FC<PayrollPeriodSelectorProps> = ({
  selectedPeriod,
  onPeriodChange,
  isLoading = false
}) => {
  const [availablePeriods, setAvailablePeriods] = useState<string[]>([]);
  const [periodStats, setPeriodStats] = useState<Record<string, { count: number; total: number }>>({});
  const [isLoadingPeriods, setIsLoadingPeriods] = useState(false);
  const [localPayrollStatus, setLocalPayrollStatus] = useState<PayrollStatus | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  
  const payrollContext = usePayroll();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // Safety check - ensure context is available
  if (!payrollContext) {
    return (
      <Card className="mb-6">
        <CardContent className="p-6 text-center">
          <div className="text-gray-500">Loading payroll period selector...</div>
        </CardContent>
      </Card>
    );
  }
  
  const { payrollState, setPayrollStatus } = payrollContext;

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  // Convert period to YYYY-MM format for API calls
  const formatPeriodForAPI = (period: string): string => {
    const [monthName, year] = period.split(' ');
    const monthIndex = months.indexOf(monthName) + 1;
    return `${year}-${monthIndex.toString().padStart(2, '0')}`;
  };

  // Parse selected period
  const [selectedMonthName, selectedYearStr] = selectedPeriod.split(' ');
  const selectedMonthIndex = months.indexOf(selectedMonthName);
  const selectedYear = parseInt(selectedYearStr);

  const loadAvailablePeriodsAndStats = async () => {
    setIsLoadingPeriods(true);
    try {
      const records = await getAllPayrollRecords();
      
      // Group records by period
      const periodMap = new Map<string, PayrollRecord[]>();
      records.forEach(record => {
        const period = `${record.month} ${record.year}`;
        if (!periodMap.has(period)) {
          periodMap.set(period, []);
        }
        periodMap.get(period)!.push(record);
      });

      // Extract unique periods and calculate stats
      const periods = Array.from(periodMap.keys()).sort((a, b) => {
        const [monthA, yearA] = a.split(' ');
        const [monthB, yearB] = b.split(' ');
        const yearDiff = parseInt(yearB) - parseInt(yearA);
        if (yearDiff !== 0) return yearDiff;
        return months.indexOf(monthB) - months.indexOf(monthA);
      });

      const stats: Record<string, { count: number; total: number }> = {};
      periodMap.forEach((records, period) => {
        stats[period] = {
          count: records.length,
          total: records.reduce((sum, record) => sum + record.payrollData.netSalary, 0)
        };
      });

      setAvailablePeriods(periods);
      setPeriodStats(stats);
    } catch (error) {
      console.error('Error loading payroll periods:', error);
    } finally {
      setIsLoadingPeriods(false);
    }
  };

  const loadPayrollStatus = async () => {
    setIsLoadingStatus(true);
    try {
      const formattedPeriod = formatPeriodForAPI(selectedPeriod);
      const status = await getPayrollStatus(formattedPeriod);
      setLocalPayrollStatus(status);
    } catch (error) {
      console.error('Error loading payroll status:', error);
    } finally {
      setIsLoadingStatus(false);
    }
  };

  useEffect(() => {
    loadAvailablePeriodsAndStats();
  }, []);

  useEffect(() => {
    loadPayrollStatus();
  }, [selectedPeriod]);

  const navigatePeriod = (direction: 'prev' | 'next') => {
    let newMonth = selectedMonthIndex;
    let newYear = selectedYear;

    if (direction === 'prev') {
      newMonth = selectedMonthIndex === 0 ? 11 : selectedMonthIndex - 1;
      newYear = selectedMonthIndex === 0 ? selectedYear - 1 : selectedYear;
    } else {
      newMonth = selectedMonthIndex === 11 ? 0 : selectedMonthIndex + 1;
      newYear = selectedMonthIndex === 11 ? selectedYear + 1 : selectedYear;
    }

    const newPeriod = `${months[newMonth]} ${newYear}`;
    onPeriodChange(newPeriod);
  };

  const isCurrentPeriod = () => {
    return selectedMonthIndex === currentMonth && selectedYear === currentYear;
  };

  const isPastPeriod = () => {
    const selected = new Date(selectedYear, selectedMonthIndex);
    const current = new Date(currentYear, currentMonth);
    return selected < current;
  };

  const currentPeriodStats = periodStats[selectedPeriod];
  const hasPeriodData = availablePeriods.includes(selectedPeriod);

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <Calendar className="w-5 h-5 mr-2" />
            Payroll Period
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadAvailablePeriodsAndStats}
            disabled={isLoadingPeriods}
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingPeriods ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Period Navigation */}
        <div className="flex items-center justify-between">
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
              value={selectedMonthIndex.toString()}
              onValueChange={(value) => {
                const month = parseInt(value);
                const newPeriod = `${months[month]} ${selectedYear}`;
                onPeriodChange(newPeriod);
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
                const newPeriod = `${months[selectedMonthIndex]} ${year}`;
                onPeriodChange(newPeriod);
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

        {/* Period Status and Stats */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Badge variant={isCurrentPeriod() ? "default" : isPastPeriod() ? "secondary" : "outline"}>
              {isCurrentPeriod() ? "Current Period" : isPastPeriod() ? "Past Period" : "Future Period"}
            </Badge>
            
            {hasPeriodData && (
              <Badge variant="outline" className="text-green-600 border-green-200">
                <TrendingUp className="w-3 h-3 mr-1" />
                {currentPeriodStats?.count || 0} records
              </Badge>
            )}
          </div>

          <div className="flex items-center text-sm text-gray-500">
            <Clock className="w-3 h-3 mr-1" />
            Last updated: {new Date().toLocaleDateString()}
          </div>
        </div>

        {/* Period Statistics */}
        {currentPeriodStats && (
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-blue-800">
                Period Total: {formatCurrency(currentPeriodStats.total)}
              </span>
              <span className="text-xs text-blue-600">
                {currentPeriodStats.count} employee{currentPeriodStats.count !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PayrollPeriodSelector;