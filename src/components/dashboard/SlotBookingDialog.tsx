import React, { useState, useEffect } from 'react';
import { formatDate } from '@/utils/dateFormat';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronDown, 
  ChevronUp, 
  CalendarPlus, 
  MapPin, 
  DollarSign, 
  Loader2,
  CheckCircle,
  Clock,
  XCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { convertTailwindColorToHex } from '@/utils/colorUtils';
import { EmployeeQualifications } from '@/types/employee';
import {
  getBranches,
  addSlotBooking,
  getEmployeeSlotBookings,
  checkForExistingBooking,
  getAvailableSlotsForDate,
  getWeeklySlotConfig,
  type Branch,
  type SlotBooking,
  type WeeklySlotConfig
} from '@/services/slotBookingService';
import { calculateSlotPay, getPayBreakdown, isFromNovember2024 } from '@/utils/slotPayCalculation';

interface SlotBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string;
  employeeName: string;
  employeeType: string;
  qualifications: EmployeeQualifications | null;
  joinDate: string | null;
}

const SlotBookingDialog: React.FC<SlotBookingDialogProps> = ({
  open,
  onOpenChange,
  employeeId,
  employeeName,
  employeeType,
  qualifications,
  joinDate,
}) => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [weeklySlotConfig, setWeeklySlotConfig] = useState<{ [branchId: string]: WeeklySlotConfig }>({});
  const [employeeBookings, setEmployeeBookings] = useState<SlotBooking[]>([]);
  const [employeeBookingDates, setEmployeeBookingDates] = useState<Set<string>>(new Set());
  const [approvedBookingDates, setApprovedBookingDates] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [isBooking, setIsBooking] = useState(false);
  const [calculatedPay, setCalculatedPay] = useState<{ date: string; amount: number }[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const currentBranch = branches.find(b => b.id === selectedBranch);

  useEffect(() => {
    if (open) {
      loadInitialData();
      loadEmployeeBookings();
    }
  }, [open, employeeId]);

  useEffect(() => {
    if (selectedBranch && branches.length > 0) {
      loadApprovedBookingDates();
    }
  }, [selectedBranch, branches]);

  useEffect(() => {
    calculatePayForSelectedDates();
  }, [selectedDates, qualifications, joinDate]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [branchesData, weeklyConfig] = await Promise.all([
        getBranches(),
        getWeeklySlotConfig()
      ]);
      
      const filteredBranches = branchesData.filter(branch => {
        const config = weeklyConfig[branch.id];
        if (!config) return false;
        const hasSlots = Object.values(config).some(slots => (slots as number) > 0);
        return hasSlots;
      });
      
      setBranches(filteredBranches);
      setWeeklySlotConfig(weeklyConfig);
      
      if (filteredBranches.length > 0 && !selectedBranch) {
        setSelectedBranch(filteredBranches[0].id);
      }
    } catch (error) {
      console.error('Error loading slot booking data:', error);
      toast.error('Failed to load slot booking data');
    } finally {
      setLoading(false);
    }
  };

  const loadEmployeeBookings = async () => {
    if (!employeeId) return;
    
    try {
      const bookings = await getEmployeeSlotBookings(employeeId);
      setEmployeeBookings(bookings);
      
      const employeeDates = new Set<string>(
        bookings
          .filter(booking => booking.status !== 'cancelled')
          .map(booking => booking.date)
      );
      setEmployeeBookingDates(employeeDates);
    } catch (error) {
      console.error('Error loading employee bookings:', error);
    }
  };

  const loadApprovedBookingDates = async () => {
    if (!selectedBranch) return;
    
    try {
      const { getBranchSlotBookings } = await import('@/services/slotBookingService');
      const branchBookings = await getBranchSlotBookings(selectedBranch);
      
      const approvedDates = new Set<string>(
        branchBookings
          .filter(booking => booking.status === 'approved')
          .map(booking => booking.date)
      );
      
      setApprovedBookingDates(approvedDates);
    } catch (error) {
      console.error('Error loading approved booking dates:', error);
    }
  };

  const calculatePayForSelectedDates = async () => {
    if (selectedDates.length === 0) {
      setCalculatedPay([]);
      return;
    }

    const payData = await Promise.all(
      selectedDates.map(async (date) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        const amount = await calculateSlotPay(dateStr, qualifications || undefined, joinDate || undefined);
        return { date: dateStr, amount };
      })
    );

    setCalculatedPay(payData);
  };

  const totalEstimatedPay = calculatedPay.reduce((sum, item) => sum + item.amount, 0);

  const isDateDisabled = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (date < today) return true;
    
    const dateString = format(date, 'yyyy-MM-dd');
    if (employeeBookingDates.has(dateString)) return true;
    
    const dayName =formatDate( date).toLowerCase() as keyof WeeklySlotConfig;
    const branchConfig = weeklySlotConfig[selectedBranch];
    const totalSlots = branchConfig ? branchConfig[dayName] : 0;
    
    if (totalSlots === 0) return true;
    
    return false;
  };

  const handleDateSelect = async (date: Date | undefined) => {
    if (!date) return;
    
    if (isDateDisabled(date)) {
      const dateString = format(date, 'yyyy-MM-dd');
      if (employeeBookingDates.has(dateString)) {
        toast.error('You already have a booking for this date');
      } else {
        toast.error('This date is not available');
      }
      return;
    }

    const dateString = format(date, 'yyyy-MM-dd');
    
    try {
      const hasExistingBooking = await checkForExistingBooking(employeeId, dateString);
      if (hasExistingBooking) {
        toast.error('You already have a booking on this date');
        return;
      }
    } catch (error) {
      console.error('Error checking existing booking:', error);
      return;
    }
    
    try {
      const availableSlots = await getAvailableSlotsForDate(dateString, selectedBranch);
      if (availableSlots <= 0) {
        toast.error('No slots available for this date at selected branch');
        return;
      }
    } catch (error) {
      console.error('Error checking slot availability:', error);
      return;
    }

    setSelectedDates(prev => {
      const isSelected = prev.some(d => format(d, 'yyyy-MM-dd') === dateString);
      if (isSelected) {
        return prev.filter(d => format(d, 'yyyy-MM-dd') !== dateString);
      } else {
        return [...prev, date];
      }
    });
  };

  const handleBookSlots = async () => {
    if (selectedDates.length === 0) {
      toast.error('Please select at least one date');
      return;
    }

    setIsBooking(true);
    
    try {
      let successCount = 0;
      let failCount = 0;

      for (const date of selectedDates) {
        const dateString = format(date, 'yyyy-MM-dd');
        
        try {
          await addSlotBooking({
            employeeId,
            employeeName,
            branchId: selectedBranch,
            branchName: currentBranch?.name || selectedBranch,
            date: dateString,
            status: 'pending'
          });
          successCount++;
        } catch (error) {
          console.error(`Failed to book ${dateString}:`, error);
          failCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount} slot(s) booked successfully!`);
        setSelectedDates([]);
        await loadEmployeeBookings();
      }
      
      if (failCount > 0) {
        toast.error(`${failCount} slot(s) failed to book`);
      }
    } catch (error) {
      console.error('Error booking slots:', error);
      toast.error('Failed to book slots');
    } finally {
      setIsBooking(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-700 border-green-300"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-700 border-red-300"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const recentBookings = employeeBookings
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10);

  const pendingCount = employeeBookings.filter(b => b.status === 'pending').length;
  const approvedCount = employeeBookings.filter(b => b.status === 'approved').length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="p-4 pb-2 border-b flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <CalendarPlus className="w-5 h-5" />
            Book Slots
          </DialogTitle>
          <DialogDescription className="sr-only">
            Book work slots by selecting dates and branch
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Summary Stats */}
              <div className="flex gap-2">
                <div className="flex-1 p-2 bg-yellow-50 rounded-lg text-center">
                  <p className="text-lg font-semibold text-yellow-700">{pendingCount}</p>
                  <p className="text-xs text-yellow-600">Pending</p>
                </div>
                <div className="flex-1 p-2 bg-green-50 rounded-lg text-center">
                  <p className="text-lg font-semibold text-green-700">{approvedCount}</p>
                  <p className="text-xs text-green-600">Approved</p>
                </div>
              </div>

              {/* Branch Selector */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Select Branch
                </label>
                <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: convertTailwindColorToHex(branch.color) }}
                          />
                          {branch.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Calendar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Select Dates</label>
                  {selectedDates.length > 0 && (
                    <Badge variant="secondary">{selectedDates.length} selected</Badge>
                  )}
                </div>
                
                {/* Compact Legend */}
                <div className="grid grid-cols-2 gap-1 p-2 bg-muted/30 rounded text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-blue-200 border border-blue-400" />
                    <span>Others' bookings</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-red-200 border border-red-400" />
                    <span>Your bookings</span>
                  </div>
                </div>

                <Calendar
                  mode="multiple"
                  selected={selectedDates}
                  onDayClick={handleDateSelect}
                  className="rounded-md border w-full"
                  disabled={isDateDisabled}
                  modifiers={{
                    booked: (date) => approvedBookingDates.has(format(date, 'yyyy-MM-dd')),
                    myBooking: (date) => employeeBookingDates.has(format(date, 'yyyy-MM-dd'))
                  }}
                  modifiersStyles={{
                    booked: { backgroundColor: '#dbeafe', color: '#1d4ed8' },
                    myBooking: { backgroundColor: '#fee2e2', color: '#dc2626', textDecoration: 'line-through' }
                  }}
                />
              </div>

              {/* Selected Dates Summary */}
              {selectedDates.length > 0 && (
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">
                        {selectedDates.length} date(s) selected
                      </span>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setSelectedDates([])}
                        className="h-6 text-xs"
                      >
                        Clear All
                      </Button>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <DollarSign className="w-4 h-4 text-green-600" />
                      <span>Estimated Pay: </span>
                      <span className="font-semibold text-green-600">
                        S${totalEstimatedPay.toFixed(2)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Book Button */}
              <Button 
                onClick={handleBookSlots} 
                disabled={isBooking || selectedDates.length === 0}
                className="w-full"
              >
                {isBooking ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Booking...
                  </>
                ) : (
                  <>
                    <CalendarPlus className="w-4 h-4 mr-2" />
                    Book {selectedDates.length} Slot(s)
                  </>
                )}
              </Button>

              {/* Booking History Collapsible */}
              <Collapsible open={showHistory} onOpenChange={setShowHistory}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between h-10">
                    <span className="text-sm font-medium">Booking History ({recentBookings.length})</span>
                    {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2 pt-2">
                  {recentBookings.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No booking history
                    </p>
                  ) : (
                    recentBookings.map((booking) => (
                      <div 
                        key={booking.id} 
                        className="flex items-center justify-between p-2 bg-muted/50 rounded-lg"
                      >
                        <div>
                          <p className="text-sm font-medium">
                            {format(new Date(booking.date), 'EEE, dd MMM yyyy')}
                          </p>
                          <p className="text-xs text-muted-foreground">{booking.branchName}</p>
                        </div>
                        {getStatusBadge(booking.status)}
                      </div>
                    ))
                  )}
                </CollapsibleContent>
              </Collapsible>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SlotBookingDialog;
