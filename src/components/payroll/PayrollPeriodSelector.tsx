
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Calendar, ChevronLeft, ChevronRight, RefreshCw, Clock, TrendingUp, Save, Lock } from 'lucide-react';
import { getAllPayrollRecords, PayrollRecord, saveDraftPayroll, finalizePayroll, getPayrollStatus } from '@/services/payrollService';
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
  const [payrollStatus, setPayrollStatus] = useState<PayrollStatus | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [showFinalizeDialog, setShowFinalizeDialog] = useState(false);
  
  const { payrollState } = usePayroll();
  const { toast } = useToast();

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
      setPayrollStatus(status);
    } catch (error) {
      console.error('Error loading payroll status:', error);
    } finally {
      setIsLoadingStatus(false);
    }
  };

  const handleSaveDraft = async () => {
    setIsSaving(true);
    try {
      const formattedPeriod = formatPeriodForAPI(selectedPeriod);
      const payrollData = {
        fullTimeEmployees: payrollState.fullTimeEmployees,
        casualEmployees: payrollState.casualEmployees,
        period: selectedPeriod,
        savedAt: new Date().toISOString()
      };
      
      await saveDraftPayroll(formattedPeriod, payrollData);
      await loadPayrollStatus();
      
      toast({
        title: "Draft Saved",
        description: `Payroll draft for ${selectedPeriod} has been saved successfully.`,
      });
    } catch (error) {
      console.error('Error saving draft:', error);
      toast({
        title: "Save Failed",
        description: "Failed to save payroll draft. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleFinalize = async () => {
    setIsFinalizing(true);
    try {
      const formattedPeriod = formatPeriodForAPI(selectedPeriod);
      await finalizePayroll(formattedPeriod, 'current-user'); // Replace with actual user ID
      await loadPayrollStatus();
      setShowFinalizeDialog(false);
      
      toast({
        title: "Payroll Finalized",
        description: `Payroll for ${selectedPeriod} has been finalized and locked.`,
      });
    } catch (error) {
      console.error('Error finalizing payroll:', error);
      toast({
        title: "Finalization Failed",
        description: "Failed to finalize payroll. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsFinalizing(false);
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

  const getFuturePeriods = () => {
    const future: string[] = [];
    for (let year = currentYear; year <= currentYear + 1; year++) {
      const startMonth = year === currentYear ? currentMonth + 1 : 0;
      for (let month = startMonth; month < 12; month++) {
        future.push(`${months[month]} ${year}`);
      }
    }
    return future.slice(0, 6); // Limit to next 6 months
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
            
            {payrollStatus && (
              <Badge 
                variant={payrollStatus.status === 'finalized' ? "default" : "secondary"}
                className={payrollStatus.status === 'finalized' ? "bg-green-600" : "bg-yellow-600"}
              >
                <Lock className="w-3 h-3 mr-1" />
                {payrollStatus.status === 'finalized' ? 'Finalized' : 'Draft'}
              </Badge>
            )}
            
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

        {/* Save Draft and Finalize Buttons */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveDraft}
              disabled={isSaving || isLoading || payrollStatus?.status === 'finalized'}
              className="flex items-center"
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Draft'}
            </Button>
            
            <Button
              variant="default"
              size="sm"
              onClick={() => setShowFinalizeDialog(true)}
              disabled={isFinalizing || isLoading || payrollStatus?.status === 'finalized'}
              className="flex items-center bg-green-600 hover:bg-green-700"
            >
              <Lock className="w-4 h-4 mr-2" />
              {isFinalizing ? 'Finalizing...' : 'Finalize'}
            </Button>
          </div>
          
          {payrollStatus?.status === 'finalized' && payrollStatus.finalizedBy && (
            <div className="text-xs text-gray-500">
              Finalized by {payrollStatus.finalizedBy}
            </div>
          )}
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

        {/* Quick Period Access */}
        <div className="border-t pt-3">
          <div className="text-xs text-gray-500 mb-2">Quick Access:</div>
          <div className="flex flex-wrap gap-2">
            {/* Current and past periods with data */}
            {availablePeriods.slice(0, 3).map((period) => (
              <Button
                key={period}
                variant={period === selectedPeriod ? "default" : "ghost"}
                size="sm"
                onClick={() => onPeriodChange(period)}
                className="h-8 text-xs"
              >
                {period}
              </Button>
            ))}
            
            {/* Future periods */}
            {getFuturePeriods().slice(0, 2).map((period) => (
              <Button
                key={period}
                variant={period === selectedPeriod ? "default" : "outline"}
                size="sm"
                onClick={() => onPeriodChange(period)}
                className="h-8 text-xs border-dashed"
              >
                {period}
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
      
      {/* Finalize Confirmation Dialog */}
      <AlertDialog open={showFinalizeDialog} onOpenChange={setShowFinalizeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finalize Payroll Period</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to finalize the payroll for {selectedPeriod}? 
              This action cannot be undone and will lock this period from further edits.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleFinalize}
              disabled={isFinalizing}
              className="bg-green-600 hover:bg-green-700"
            >
              {isFinalizing ? 'Finalizing...' : 'Finalize Payroll'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default PayrollPeriodSelector;
