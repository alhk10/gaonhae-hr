import React, { useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Calendar as CalendarIcon, Settings, Check, X, Edit, Filter, UserCheck, UserX, Plus, Users, MapPin, Clock, DollarSign } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { format, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { getCasualEmployees, getEmployeeById } from '@/services/employeeService';
import { EmployeeProfile, EmployeeQualifications } from '@/types/employee';
import SwapEmployeeDialog from '@/components/slot-booking/SwapEmployeeDialog';
import BulkSlotBookingDialog from '@/components/slot-booking/BulkSlotBookingDialog';
import { BookingCardWithPay } from '@/components/slot-booking/BookingCardWithPay';
import AdminSlotBookingActions from '@/components/admin/AdminSlotBookingActions';
import AdminSlotBookingSummary from '@/components/admin/AdminSlotBookingSummary';
import PricingSettingsTab from '@/components/slot-booking/PricingSettingsTab';
import { SlotTimingSettingsTab } from '@/components/slot-booking/SlotTimingSettingsTab';
import { useIsMobile } from '@/hooks/use-mobile';
import { isFromNovember2024, clearPricingCache } from '@/utils/slotPayCalculation';
import { updatePricingConfig, SlotPricingConfig, SlotTimingConfig } from '@/services/slotPricingService';
import { formatDate } from '@/utils/dateFormat';
import {
  getBranches,
  getAllSlotBookings,
  updateSlotBookingStatus,
  getWeeklySlotConfig,
  updateWeeklySlotConfig,
  cancelSlotBooking,
  updateSlotBookingEmployee,
  getEmployeeAttendanceStatus,
  checkForExistingBooking,
  createEmergencyBooking,
  type SlotBooking,
  type Branch,
  type WeeklySlotConfig,
  type EmployeeAttendanceStatus,
  updateSlotBookingBranch
} from '@/services/slotBookingService';
import { supabase } from '@/integrations/supabase/client';
import { convertTailwindColorToHex } from '@/utils/colorUtils';
import { useAuth } from '@/contexts/AuthContext';

const AdminSlotBooking = () => {
  const isMobile = useIsMobile();
  const { userrole } = useAuth();
  const isSuperadmin = userrole === 'superadmin';
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false);
  const [isSwapDialogOpen, setIsSwapDialogOpen] = useState(false);
  const [isBulkBookingDialogOpen, setIsBulkBookingDialogOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [selectedBookingForApproval, setSelectedBookingForApproval] = useState<SlotBooking | null>(null);
  const [selectedBookingForSwap, setSelectedBookingForSwap] = useState<SlotBooking | null>(null);
  const [selectedBookingForCancel, setSelectedBookingForCancel] = useState<SlotBooking | null>(null);
  const [casualEmployees, setCasualEmployees] = useState<EmployeeProfile[]>([]);
  const [allBookings, setAllBookings] = useState<SlotBooking[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [currentWeeklySlots, setCurrentWeeklySlots] = useState<{ [branchId: string]: WeeklySlotConfig }>({});
  const [attendanceStatusMap, setAttendanceStatusMap] = useState<Map<string, EmployeeAttendanceStatus>>(new Map());
  const [loading, setLoading] = useState(true);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [autoRefreshActive, setAutoRefreshActive] = useState(true);
  // Local editing buffer for weekly slots so inputs are controlled and reflect saved values immediately
  const [editingWeeklySlots, setEditingWeeklySlots] = useState<{ [branchId: string]: Partial<WeeklySlotConfig> }>({});

  // New state for swap functionality in approval dialog
  const [swapEmployeeId, setSwapEmployeeId] = useState('');
  const [isSwappingInDialog, setIsSwappingInDialog] = useState(false);
  
  // New state for branch editing functionality
  const [selectedBranchForUpdate, setSelectedBranchForUpdate] = useState('');
  const [isUpdatingBranch, setIsUpdatingBranch] = useState(false);
  const [isPendingApprovalsDialogOpen, setIsPendingApprovalsDialogOpen] = useState(false);
  const [pricingConfig, setPricingConfig] = useState<Partial<SlotPricingConfig> | null>(null);

  // Cache for employee qualifications to avoid repeated API calls
  const [employeeQualificationsCache, setEmployeeQualificationsCache] = useState<Map<string, EmployeeQualifications | null>>(new Map());

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefreshActive) return;

    const interval = setInterval(() => {
      // Only refresh if page is visible
      if (!document.hidden) {
        refreshData();
      }
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [autoRefreshActive]);

  // Pause auto-refresh when page is hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      setAutoRefreshActive(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Load initial data from Supabase with timeout
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        console.log('AdminSlotBooking: Loading initial data from Supabase...');
        
        // Add timeout to prevent infinite loading
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Loading timeout')), 10000);
        });
        
        const dataPromise = Promise.all([
          getBranches(),
          getAllSlotBookings(),
          getWeeklySlotConfig(),
          getCasualEmployees()
        ]);

        const [branchesData, bookingsData, weeklyConfigData, employeesData] = await Promise.race([
          dataPromise,
          timeoutPromise
        ]);

        console.log('AdminSlotBooking: Initial load complete - branches:', branchesData?.length, 'bookings:', bookingsData?.length, 'config keys:', Object.keys(weeklyConfigData || {}).length, 'employees:', employeesData?.length);

        if (branchesData && branchesData.length > 0) {
          setBranches(branchesData);
        } else {
          console.error('AdminSlotBooking: No branches data received');
        }
        
        if (bookingsData) {
          setAllBookings(bookingsData);
        }
        
        if (weeklyConfigData && Object.keys(weeklyConfigData).length > 0) {
          setCurrentWeeklySlots(weeklyConfigData);
        } else {
          console.warn('AdminSlotBooking: No weekly config data received');
        }
        
        if (employeesData) {
          setCasualEmployees(employeesData);
        }

        // Load attendance data for the current month
        if (bookingsData && bookingsData.length > 0) {
          await loadAttendanceData(bookingsData);
        }
      } catch (error) {
        console.error('AdminSlotBooking: Error loading initial data:', error);
        toast.error('Failed to load slot booking data. Please refresh the page.');
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, []);

  // Keep the editing buffer in sync when opening settings
  useEffect(() => {
    if (isSettingsDialogOpen) {
      setEditingWeeklySlots(currentWeeklySlots);
    }
  }, [isSettingsDialogOpen, currentWeeklySlots]);

  const loadAttendanceData = async (bookings: SlotBooking[]) => {
    try {
      // Get unique employee IDs and dates from all bookings, not just current month
      const uniqueEmployeeIds = [...new Set(bookings.map(b => b.employeeId))];
      const uniqueDates = [...new Set(bookings.map(b => b.date))];

      console.log('AdminSlotBooking: Loading attendance for', uniqueEmployeeIds.length, 'employees and', uniqueDates.length, 'dates');

      if (uniqueEmployeeIds.length > 0 && uniqueDates.length > 0) {
        const attendanceData = await getEmployeeAttendanceStatus(uniqueEmployeeIds, uniqueDates);
        
        // Create a map for quick lookup
        const statusMap = new Map<string, EmployeeAttendanceStatus>();
        attendanceData.forEach(status => {
          const key = `${status.employeeId}-${status.date}`;
          statusMap.set(key, status);
          console.log('AdminSlotBooking: Attendance status for', status.employeeId, 'on', status.date, ':', status.hasClockedIn);
        });
        
        setAttendanceStatusMap(statusMap);
        console.log('AdminSlotBooking: Loaded attendance data for', attendanceData.length, 'records');
        console.log('AdminSlotBooking: Attendance status map keys:', Array.from(statusMap.keys()));
      }
    } catch (error) {
      console.error('AdminSlotBooking: Error loading attendance data:', error);
    }
  };

  const refreshData = async () => {
    try {
      console.log('AdminSlotBooking: Starting data refresh...');
      const [bookingsData, weeklyConfigData] = await Promise.all([
        getAllSlotBookings(),
        getWeeklySlotConfig()
      ]);
      
      console.log('AdminSlotBooking: Refresh received - bookings:', bookingsData?.length, 'config keys:', Object.keys(weeklyConfigData || {}).length);
      
      // Only update state if we got valid data
      if (bookingsData) {
        setAllBookings(bookingsData);
        console.log('AdminSlotBooking: Updated bookings state');
      } else {
        console.warn('AdminSlotBooking: Skipping bookings update - no data received');
      }
      
      if (weeklyConfigData && Object.keys(weeklyConfigData).length > 0) {
        setCurrentWeeklySlots(weeklyConfigData);
        console.log('AdminSlotBooking: Updated weekly slot config:', weeklyConfigData);
      } else {
        console.warn('AdminSlotBooking: Skipping weekly config update - empty or null data received');
      }
      
      console.log('AdminSlotBooking: Current branches:', branches.map(b => b.id));
      
      // Refresh attendance data only if we have valid bookings
      if (bookingsData && bookingsData.length > 0) {
        await loadAttendanceData(bookingsData);
      }
      
      console.log('AdminSlotBooking: Data refresh completed successfully');
    } catch (error) {
      console.error('AdminSlotBooking: Error refreshing data:', error);
      toast.error('Failed to refresh data. Retaining previous data.');
    }
  };

  // Function to fetch and cache employee qualifications
  const getEmployeeQualifications = async (employeeId: string): Promise<EmployeeQualifications | null> => {
    // Check cache first
    if (employeeQualificationsCache.has(employeeId)) {
      return employeeQualificationsCache.get(employeeId) || null;
    }

    try {
      const employee = await getEmployeeById(employeeId);
      const qualifications = employee?.qualifications || null;
      
      // Update cache
      setEmployeeQualificationsCache(prev => new Map(prev).set(employeeId, qualifications));
      
      return qualifications;
    } catch (error) {
      console.error('AdminSlotBooking: Error fetching employee qualifications:', error);
      setEmployeeQualificationsCache(prev => new Map(prev).set(employeeId, null));
      return null;
    }
  };

  const getBookingsForDate = (date: Date) => {
    const dateString = format(date, 'yyyy-MM-dd');
    return allBookings.filter(b => 
      b.date === dateString && 
      b.status !== 'rejected' && 
      b.status !== 'cancelled' && // Filter out cancelled slots
      (selectedBranch === 'all' || b.branchId === selectedBranch)
    );
  };

  const hasEmployeeClockedIn = (employeeId: string, date: Date): boolean => {
    const dateString = format(date, 'yyyy-MM-dd');
    const key = `${employeeId}-${dateString}`;
    const attendanceStatus = attendanceStatusMap.get(key);
    const hasClockedIn = attendanceStatusMap.has(key) && attendanceStatus?.hasClockedIn === true;
    
    console.log('AdminSlotBooking: Checking attendance for', employeeId, 'on', dateString, '- Key:', key, '- Has record:', attendanceStatusMap.has(key), '- Has clocked in:', hasClockedIn);
    
    return hasClockedIn;
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setIsBulkBookingDialogOpen(true);
  };

  const handleApprovalClick = (booking: SlotBooking, event: React.MouseEvent) => {
    event.stopPropagation();
    setSelectedBookingForApproval(booking);
    setSwapEmployeeId(''); // Reset swap selection
    setSelectedBranchForUpdate(booking.branchId); // Set current branch as default
    setIsApprovalDialogOpen(true);
  };

  const handleSwapClick = (booking: SlotBooking, event: React.MouseEvent) => {
    event.stopPropagation();
    setSelectedBookingForSwap(booking);
    setIsSwapDialogOpen(true);
  };

  const handleCancelClick = (booking: SlotBooking, event: React.MouseEvent) => {
    event.stopPropagation();
    setSelectedBookingForCancel(booking);
    setIsCancelDialogOpen(true);
  };

  const handleSwapSuccess = async () => {
    await refreshData();
  };

  const handleBulkBookingSuccess = async () => {
    await refreshData();
  };

  // New function to handle branch updates with proper database update
  const handleBranchUpdate = async () => {
    if (!selectedBookingForApproval || !selectedBranchForUpdate || selectedBranchForUpdate === selectedBookingForApproval.branchId) {
      return;
    }

    const targetBranch = branches.find(b => b.id === selectedBranchForUpdate);
    if (!targetBranch) {
      toast.error('Selected branch not found');
      return;
    }

    try {
      setIsUpdatingBranch(true);
      
      // Check if target branch has available slots for the date
      const bookingDate = selectedBookingForApproval.date;
      const dayOfWeek =formatDate( new Date(bookingDate)).toLowerCase() as keyof Omit<WeeklySlotConfig, 'id' | 'branchId'>;
      const totalSlots = currentWeeklySlots[selectedBranchForUpdate]?.[dayOfWeek] || 0;
      const existingBookings = allBookings.filter(b => 
        b.date === bookingDate && 
        b.branchId === selectedBranchForUpdate && 
        b.status !== 'cancelled' && 
        b.status !== 'rejected' &&
        b.id !== selectedBookingForApproval.id // Exclude current booking
      );

      if (existingBookings.length >= totalSlots) {
        toast.error(`Target branch "${targetBranch.name}" is at full capacity for ${formatDate(new Date(bookingDate))}`);
        return;
      }

      // Update the booking record in database with new branch details
      const success = await updateSlotBookingBranch(
        selectedBookingForApproval.id,
        selectedBranchForUpdate,
        targetBranch.name,
        `Branch changed from ${selectedBookingForApproval.branchName} to ${targetBranch.name} by Admin`
      );

      if (success) {
        toast.success(`Successfully moved booking to ${targetBranch.name}`);
        
        // Force refresh the data to ensure calendar displays correctly
        await refreshData();
        
        setIsApprovalDialogOpen(false);
        setSelectedBookingForApproval(null);
        setSelectedBranchForUpdate('');
      } else {
        toast.error('Failed to update branch');
      }
    } catch (error) {
      console.error('AdminSlotBooking: Error updating branch:', error);
      toast.error('Failed to update branch');
    } finally {
      setIsUpdatingBranch(false);
    }
  };

  const getSlotSummary = () => {
    const currentMonth = selectedDate;
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
    
    console.log('AdminSlotBooking: Calculating slot summary for', daysInMonth.length, 'days');
    console.log('AdminSlotBooking: Current weekly slots:', currentWeeklySlots);
    console.log('AdminSlotBooking: Selected branch:', selectedBranch);
    
    let totalSlots = 0;
    let approvedSlots = 0;
    let pendingSlots = 0;

    daysInMonth.forEach(day => {
      const dayBookings = getBookingsForDate(day);
      const dayName = format(day, 'EEEE').toLowerCase() as keyof Omit<WeeklySlotConfig, 'id' | 'branchId'>;
      
      if (selectedBranch === 'all') {
        branches.forEach(branch => {
          const slotCount = Number(currentWeeklySlots[branch.id]?.[dayName] || 0);
          totalSlots += slotCount;
        });
      } else {
        const slotCount = Number(currentWeeklySlots[selectedBranch]?.[dayName] || 0);
        totalSlots += slotCount;
      }
      
      // Only count non-cancelled bookings
      const activeBookings = dayBookings.filter(b => b.status !== 'cancelled');
      approvedSlots += activeBookings.filter(b => b.status === 'approved').length;
      pendingSlots += activeBookings.filter(b => b.status === 'pending').length;
    });

    const bookedSlots = approvedSlots + pendingSlots;
    const availableSlots = Math.max(0, totalSlots - bookedSlots);

    console.log('AdminSlotBooking: Slot summary calculated:', { totalSlots, approvedSlots, pendingSlots, bookedSlots, availableSlots });

    return { totalSlots, bookedSlots: approvedSlots, pendingSlots, approvedSlots, availableSlots };
  };

  const handleApproval = async (bookingId: string, status: 'approved' | 'rejected', approvedBy?: string) => {
    try {
      const success = await updateSlotBookingStatus(bookingId, status, approvedBy || 'Admin');
      if (success) {
        await refreshData();
        setIsApprovalDialogOpen(false);
        setSelectedBookingForApproval(null);
        toast.success(`Booking ${status}`);
      } else {
        toast.error("Failed to update booking status");
      }
    } catch (error) {
      console.error('AdminSlotBooking: Error updating booking status:', error);
      toast.error("Failed to update booking status");
    }
  };

  const handleSwapInDialog = async () => {
    if (!selectedBookingForApproval || !swapEmployeeId) return;
    
    const selectedEmployee = casualEmployees.find(emp => emp.id === swapEmployeeId);
    if (!selectedEmployee) return;

    try {
      setIsSwappingInDialog(true);
      const success = await updateSlotBookingEmployee(
        selectedBookingForApproval.id,
        swapEmployeeId,
        selectedEmployee.name,
        `Swapped from ${selectedBookingForApproval.employeeName} to ${selectedEmployee.name} by Admin`
      );

      if (success) {
        toast.success(`Successfully swapped employee to ${selectedEmployee.name}`);
        await refreshData();
        setIsApprovalDialogOpen(false);
        setSelectedBookingForApproval(null);
        setSwapEmployeeId('');
      } else {
        toast.error('Failed to swap employee');
      }
    } catch (error) {
      console.error('AdminSlotBooking: Error swapping employee:', error);
      toast.error('Failed to swap employee');
    } finally {
      setIsSwappingInDialog(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!selectedBookingForCancel) return;
    
    try {
      const success = await cancelSlotBooking(selectedBookingForCancel.id, 'Admin');
      if (success) {
        await refreshData();
        setIsCancelDialogOpen(false);
        setSelectedBookingForCancel(null);
        toast.success('Booking cancelled successfully');
      } else {
        toast.error('Failed to cancel booking');
      }
    } catch (error) {
      console.error('AdminSlotBooking: Error cancelling booking:', error);
      toast.error('Failed to cancel booking');
    }
  };

  const handleCancelBookingFromApprovalDialog = async () => {
    if (!selectedBookingForApproval) return;
    
    try {
      const success = await cancelSlotBooking(selectedBookingForApproval.id, 'Admin');
      if (success) {
        await refreshData();
        setIsApprovalDialogOpen(false);
        setSelectedBookingForApproval(null);
        toast.success('Booking cancelled successfully');
      } else {
        toast.error('Failed to cancel booking');
      }
    } catch (error) {
      console.error('AdminSlotBooking: Error cancelling booking:', error);
      toast.error('Failed to cancel booking');
    }
  };

  const handleSuperadminOverride = async () => {
    if (!selectedBookingForApproval) return;
    const bookingId = selectedBookingForApproval.id;
    try {
      setIsUpdatingBranch(true);

      // Optional branch change
      if (selectedBranchForUpdate && selectedBranchForUpdate !== selectedBookingForApproval.branchId) {
        const targetBranch = branches.find(b => b.id === selectedBranchForUpdate);
        if (targetBranch) {
          await updateSlotBookingBranch(
            bookingId,
            selectedBranchForUpdate,
            targetBranch.name,
            `Branch overridden from ${selectedBookingForApproval.branchName} to ${targetBranch.name} by Superadmin`
          );
        }
      }

      // Optional employee swap
      if (swapEmployeeId && swapEmployeeId !== selectedBookingForApproval.employeeId) {
        const newEmp = casualEmployees.find(emp => emp.id === swapEmployeeId);
        if (newEmp) {
          await updateSlotBookingEmployee(
            bookingId,
            swapEmployeeId,
            newEmp.name,
            `Employee overridden from ${selectedBookingForApproval.employeeName} to ${newEmp.name} by Superadmin`
          );
        }
      }

      // Force status to approved
      const { error } = await supabase
        .from('slot_bookings_new')
        .update({ status: 'approved', notes: 'Overridden to approved by Superadmin' })
        .eq('id', bookingId);
      if (error) throw error;

      await refreshData();
      toast.success('Booking overridden and approved');
      setIsApprovalDialogOpen(false);
      setSelectedBookingForApproval(null);
      setSwapEmployeeId('');
      setSelectedBranchForUpdate('');
    } catch (error) {
      console.error('AdminSlotBooking: Override failed:', error);
      toast.error('Failed to override booking');
    } finally {
      setIsUpdatingBranch(false);
    }
  };

  const handleSuperadminReject = async () => {
    if (!selectedBookingForApproval) return;
    try {
      const { error } = await supabase
        .from('slot_bookings_new')
        .update({ status: 'rejected', notes: 'Rejected by Superadmin' })
        .eq('id', selectedBookingForApproval.id);
      if (error) throw error;
      await refreshData();
      toast.success('Booking rejected');
      setIsApprovalDialogOpen(false);
      setSelectedBookingForApproval(null);
    } catch (error) {
      console.error('AdminSlotBooking: Reject failed:', error);
      toast.error('Failed to reject booking');
    }
  };

  const handleSettingsSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    console.log('AdminSlotBooking: handleSettingsSave triggered');
    console.log('AdminSlotBooking: Branches count:', branches.length);

    if (branches.length === 0) {
      console.error('AdminSlotBooking: No branches available to save');
      toast.error('No branches available. Please refresh the page.');
      return;
    }

    setIsSavingSettings(true);

    try {
      // Build updates from controlled editing buffer
      if (!editingWeeklySlots || Object.keys(editingWeeklySlots).length === 0) {
        console.warn('AdminSlotBooking: No edited weekly slots found; using currentWeeklySlots');
        setEditingWeeklySlots(currentWeeklySlots);
      }

      const daysOfWeek: Array<keyof Omit<WeeklySlotConfig, 'id' | 'branchId'>> = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];

      const updatePromises = branches.map(async (branch) => {
        const edited = editingWeeklySlots[branch.id] || {};
        const weeklyConfig: Omit<WeeklySlotConfig, 'id' | 'branchId'> = {
          monday: Number(edited.monday ?? 0),
          tuesday: Number(edited.tuesday ?? 0),
          wednesday: Number(edited.wednesday ?? 0),
          thursday: Number(edited.thursday ?? 0),
          friday: Number(edited.friday ?? 0),
          saturday: Number(edited.saturday ?? 0),
          sunday: Number(edited.sunday ?? 0),
        };

        // Clamp negatives
        daysOfWeek.forEach((d) => {
          // Ensure non-negative integers per day
          const current = Number((weeklyConfig as any)[d] ?? 0);
          (weeklyConfig as any)[d] = Math.max(0, current);
        });

        console.log(`AdminSlotBooking: Upserting weekly slots for branch ${branch.id}:`, weeklyConfig);
        return updateWeeklySlotConfig(branch.id, weeklyConfig);
      });

      const results = await Promise.all(updatePromises);
      console.log('AdminSlotBooking: Weekly slot update results:', results);
      const weeklySaveOk = results.every(Boolean);

      // Save pricing config if changed
      let pricingSaveOk = true;
      if (pricingConfig && Object.keys(pricingConfig).length > 0) {
        console.log('AdminSlotBooking: Updating pricing config with:', pricingConfig);
        pricingSaveOk = await updatePricingConfig(pricingConfig as Partial<SlotPricingConfig>);
        if (pricingSaveOk) {
          clearPricingCache();
          console.log('AdminSlotBooking: Pricing cache cleared after update');
        }
      }

      if (weeklySaveOk) {
        console.log('AdminSlotBooking: All weekly slot upserts successful, reloading config...');
        const updatedWeeklyConfig = await getWeeklySlotConfig();
        console.log('AdminSlotBooking: Reloaded weekly config:', updatedWeeklyConfig);
        setCurrentWeeklySlots(updatedWeeklyConfig);
        setEditingWeeklySlots(updatedWeeklyConfig);
      }

      if (weeklySaveOk && pricingSaveOk) {
        toast.success('Settings saved to Supabase');
        setIsSettingsDialogOpen(false);
      } else if (!weeklySaveOk && !pricingSaveOk) {
        toast.error('Failed to save both weekly slots and pricing. Check console.');
      } else if (!weeklySaveOk) {
        toast.error('Weekly slots failed to save for some branches.');
      } else if (!pricingSaveOk) {
        toast.error('Pricing failed to save.');
      }
    } catch (error) {
      console.error('AdminSlotBooking: Error saving settings:', error);
      toast.error('Error saving settings');
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Helper function to determine branch update button state
  const getBranchUpdateButtonState = () => {
    const isSameBranch = !selectedBranchForUpdate || selectedBranchForUpdate === selectedBookingForApproval?.branchId;
    return {
      disabled: isSameBranch,
      text: isSameBranch ? 'Select Different Branch' : 'Update Branch',
      variant: isSameBranch ? 'outline' as const : 'secondary' as const
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex h-[calc(100vh-73px)]">
          <Sidebar />
          <main className="flex-1 p-6">
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const slotSummary = getSlotSummary();

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex h-[calc(100vh-73px)]">
        <Sidebar />
        <main className={`flex-1 ${isMobile ? 'p-4' : 'p-6'} max-w-full`}>
          <div className="space-y-6 max-w-full">
            <div className={`flex items-center ${isMobile ? 'flex-col gap-4' : 'justify-between'}`}>
              <div className={isMobile ? 'text-center' : ''}>
                <h2 className={`font-bold text-gray-900 ${isMobile ? 'text-xl' : 'text-2xl'}`}>Admin Slot Booking</h2>
                {autoRefreshActive && (
                  <p className={`text-gray-600 ${isMobile ? 'text-sm' : ''}`}>
                    Auto-refreshing every 30 seconds
                  </p>
                )}
              </div>
              
              <div className={`flex space-x-2 ${isMobile ? 'w-full' : ''}`}>
                
                <Dialog open={isPendingApprovalsDialogOpen} onOpenChange={setIsPendingApprovalsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className={`${isMobile ? 'flex-1' : ''} relative`}>
                      <Clock className="w-4 h-4 mr-2" />
                      Pending Approvals
                      {allBookings.filter(b => b.status === 'pending').length > 0 && (
                        <Badge className="absolute -top-2 -right-2 bg-red-500 text-white px-2 py-1 text-xs min-w-[20px] h-[20px] flex items-center justify-center">
                          {allBookings.filter(b => b.status === 'pending').length}
                        </Badge>
                      )}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Pending Bookings for Approval</DialogTitle>
                      <DialogDescription>Review and approve or reject slot bookings.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      {allBookings.filter(b => b.status === 'pending').length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                          <p>No pending bookings require approval</p>
                        </div>
                      ) : (
                        <>
                          <div className="flex gap-2 mb-4">
                            <Button 
                              onClick={async () => {
                                const pendingBookings = allBookings.filter(b => b.status === 'pending');
                                for (const booking of pendingBookings) {
                                  await handleApproval(booking.id, 'approved', 'Admin');
                                }
                                setIsPendingApprovalsDialogOpen(false);
                              }}
                              className="flex-1"
                              disabled={allBookings.filter(b => b.status === 'pending').length === 0}
                            >
                              <Check className="w-4 h-4 mr-2" />
                              Approve All
                            </Button>
                            <Button 
                              variant="destructive"
                              onClick={async () => {
                                const pendingBookings = allBookings.filter(b => b.status === 'pending');
                                for (const booking of pendingBookings) {
                                  await handleApproval(booking.id, 'rejected', 'Admin');
                                }
                                setIsPendingApprovalsDialogOpen(false);
                              }}
                              className="flex-1"
                              disabled={allBookings.filter(b => b.status === 'pending').length === 0}
                            >
                              <X className="w-4 h-4 mr-2" />
                              Reject All
                            </Button>
                          </div>
                          <div className="space-y-2 max-h-[400px] overflow-y-auto">
                            {allBookings
                              .filter(b => b.status === 'pending')
                              .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                              .map((booking) => (
                              <div key={booking.id} className="border rounded-lg p-4 bg-white">
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center space-x-3">
                                        <div 
                                          className="w-3 h-3 rounded-full flex-shrink-0" 
                                          style={{ backgroundColor: convertTailwindColorToHex(branches.find(b => b.id === booking.branchId)?.color || '#3B82F6') }}
                                        />
                                      <div>
                                        <p className="font-medium">{booking.employeeName}</p>
                                        <p className="text-sm text-gray-600">
                                          {booking.branchName} • {formatDate(new Date(booking.date))}
                                        </p>
                                        {booking.notes && (
                                          <p className="text-sm text-gray-500 mt-1">{booking.notes}</p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex space-x-2">
                                    <Button 
                                      size="sm" 
                                      onClick={() => handleApproval(booking.id, 'approved', 'Admin')}
                                      className="bg-green-600 hover:bg-green-700"
                                    >
                                      <Check className="w-4 h-4" />
                                    </Button>
                                    <Button 
                                      size="sm" 
                                      variant="destructive"
                                      onClick={() => handleApproval(booking.id, 'rejected', 'Admin')}
                                    >
                                      <X className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
                
                <Dialog open={isSettingsDialogOpen} onOpenChange={setIsSettingsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      className={isMobile ? 'flex-1' : ''}
                      disabled={branches.length === 0}
                      onClick={() => {
                        console.log('AdminSlotBooking: Opening settings dialog');
                        console.log('AdminSlotBooking: Current branches:', branches.length);
                        console.log('AdminSlotBooking: Current weekly slots:', currentWeeklySlots);
                      }}
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Settings
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Slot Booking Settings</DialogTitle>
                      <DialogDescription>Configure slot allocations and pricing. All changes will be saved to Supabase.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSettingsSave}>
                      <Tabs defaultValue="slots" className="w-full">
                        <TabsList className="grid w-full grid-cols-3">
                          <TabsTrigger value="slots">Weekly Slots</TabsTrigger>
                          <TabsTrigger value="timing">Slot Timing</TabsTrigger>
                          <TabsTrigger value="pricing">Dynamic Pricing</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="slots" className="space-y-4">
                          <div className="space-y-4">
                            <div>
                              <h3 className="text-lg font-medium">Weekly Slot Configuration</h3>
                              <p className="text-sm text-muted-foreground">Configure the number of available slots for each branch by day of the week.</p>
                            </div>
                            
                            <div className="space-y-6">
                              {branches.map((branch) => {
                                const branchSlots = currentWeeklySlots[branch.id] || {};
                                return (
                                  <div key={branch.id} className="border rounded-lg p-4">
                                    <div className="flex items-center space-x-2 mb-3">
                                      <div 
                                        className="w-3 h-3 rounded-full" 
                                        style={{ backgroundColor: convertTailwindColorToHex(branch.color || '#6b7280') }}
                                      ></div>
                                      <h4 className="font-medium">{branch.name}</h4>
                                    </div>
                                    <div className={`grid gap-2 ${isMobile ? 'grid-cols-4' : 'grid-cols-7'}`}>
                                      {(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const).map((day) => (
                                        <div key={day} className="space-y-1">
                                          <Label className={`font-medium ${isMobile ? 'text-xs' : 'text-xs'}`}>
                                            {isMobile ? day.slice(0, 2) : day.slice(0, 3)}
                                          </Label>
                                          <Input
                                            name={`${branch.id}-${day}`}
                                            type="number"
                                            min="0"
                                            max="50"
                                            value={editingWeeklySlots[branch.id]?.[day] ?? 0}
                                            onChange={(e) => {
                                              const raw = e.target.value;
                                              const parsed = raw === '' ? 0 : parseInt(raw, 10);
                                              const safe = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
                                              setEditingWeeklySlots(prev => ({
                                                ...prev,
                                                [branch.id]: {
                                                  monday: 0,
                                                  tuesday: 0,
                                                  wednesday: 0,
                                                  thursday: 0,
                                                  friday: 0,
                                                  saturday: 0,
                                                  sunday: 0,
                                                  ...(prev[branch.id] || {}),
                                                  [day]: safe,
                                                }
                                              }));
                                            }}
                                            className="text-center"
                                          />
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </TabsContent>

                        <TabsContent value="timing">
                          <SlotTimingSettingsTab 
                            onConfigChange={(config) => setPricingConfig(prev => ({ ...prev, ...config }))}
                          />
                        </TabsContent>
                        
                        <TabsContent value="pricing">
                          <PricingSettingsTab 
                            onConfigChange={(config) => setPricingConfig(config)}
                          />
                        </TabsContent>
                      </Tabs>
                      
                      <DialogFooter className="mt-6">
                        <Button type="button" variant="outline" onClick={() => setIsSettingsDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={isSavingSettings}>
                          {isSavingSettings ? 'Saving...' : 'Save Settings'}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Slot Summary */}
            <div className={`grid gap-4 ${isMobile ? 'grid-cols-2' : 'grid-cols-1 md:grid-cols-5'}`}>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className={`font-medium ${isMobile ? 'text-xs' : 'text-sm'}`}>Total Slots</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`font-bold ${isMobile ? 'text-lg' : 'text-2xl'}`}>{slotSummary.totalSlots}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className={`font-medium ${isMobile ? 'text-xs' : 'text-sm'}`}>Available</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`font-bold text-green-600 ${isMobile ? 'text-lg' : 'text-2xl'}`}>{slotSummary.availableSlots}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className={`font-medium ${isMobile ? 'text-xs' : 'text-sm'}`}>Booked</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`font-bold text-blue-600 ${isMobile ? 'text-lg' : 'text-2xl'}`}>{slotSummary.bookedSlots}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className={`font-medium ${isMobile ? 'text-xs' : 'text-sm'}`}>Pending</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`font-bold text-yellow-600 ${isMobile ? 'text-lg' : 'text-2xl'}`}>{slotSummary.pendingSlots}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className={`font-medium ${isMobile ? 'text-xs' : 'text-sm'}`}>Approved</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`font-bold text-green-600 ${isMobile ? 'text-lg' : 'text-2xl'}`}>{slotSummary.approvedSlots}</div>
                </CardContent>
              </Card>
            </div>

            {/* Branch Filter and Calendar */}
            <Card className="w-full">
              <CardHeader>
                <div className={`flex items-center ${isMobile ? 'flex-col gap-4' : 'justify-between'}`}>
                  <CardTitle className={`flex items-center space-x-2 ${isMobile ? 'text-lg' : ''}`}>
                    <CalendarIcon className="w-5 h-5" />
                    <span>Monthly Calendar</span>
                  </CardTitle>
                  <div className={`flex items-center space-x-2 ${isMobile ? 'w-full' : ''}`}>
                    <Filter className="w-4 h-4" />
                    <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                      <SelectTrigger className={isMobile ? 'flex-1' : 'w-48'}>
                        <SelectValue placeholder="Filter by branch" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Branches</SelectItem>
                        {branches.map((branch) => (
                          <SelectItem key={branch.id} value={branch.id}>
                            <div className="flex items-center space-x-2">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: convertTailwindColorToHex(branch.color || '#6b7280') }}
                              ></div>
                              <span>{branch.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-0 sm:px-2 pb-3 w-full overflow-hidden">
                <div className="w-full max-w-full">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    className="w-full max-w-full border-0 p-0"
                    classNames={{
                      months: "flex flex-col w-full max-w-full",
                      month: "space-y-1 w-full max-w-full",
                      caption: "flex justify-center pt-1 relative items-center",
                      caption_label: isMobile ? "text-sm font-medium" : "text-base font-medium",
                      nav: "space-x-1 flex items-center",
                      table: "w-full max-w-full border-collapse",
                      head_row: "flex w-full",
                      head_cell: `text-muted-foreground font-normal flex-1 min-w-0 text-center ${isMobile ? 'text-[10px] py-1' : 'text-xs py-1'}`,
                      row: "flex w-full",
                      cell: `text-center relative flex-1 min-w-0 focus-within:relative focus-within:z-20 ${isMobile ? 'p-0' : 'p-0'}`,
                      day: `w-full h-full font-normal aria-selected:opacity-100 hover:bg-accent rounded-sm cursor-pointer transition-colors flex flex-col items-start justify-start overflow-hidden p-0.5`,
                      day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                      day_today: "bg-accent text-accent-foreground font-semibold",
                      day_outside: "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
                      day_disabled: "text-muted-foreground opacity-50",
                      day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
                      day_hidden: "invisible",
                    }}
                    components={{
                      Day: ({ date, ...props }) => {
                        const dayBookings = getBookingsForDate(date);
                        const hasBookings = dayBookings.length > 0;
                        const maxVisible = isMobile ? 3 : 4;
                        
                        return (
                          <div className="relative w-full overflow-hidden border-r border-b border-border last:border-r-0" style={{ minHeight: isMobile ? '3.5rem' : '4.5rem' }}>
                            <div
                              className={`w-full h-full hover:bg-accent rounded-sm cursor-pointer transition-colors flex flex-col items-start justify-start overflow-hidden ${
                                isSameDay(date, selectedDate) ? 'bg-primary text-primary-foreground' : ''
                              } ${hasBookings ? 'bg-blue-50' : ''} p-0.5`}
                              onClick={() => handleDateClick(date)}
                            >
                              <div className="w-full h-full flex flex-col overflow-hidden">
                                <span className={`font-medium text-left flex-shrink-0 ${isMobile ? 'text-[10px]' : 'text-xs'}`}>{date.getDate()}</span>
                                {hasBookings && (
                                  <div className="flex flex-col gap-px w-full flex-1 overflow-hidden">
                                    {dayBookings.slice(0, maxVisible).map((booking, idx) => {
                                      const branch = branches.find(b => b.id === booking.branchId);
                                      const hasClockedIn = hasEmployeeClockedIn(booking.employeeId, date);
                                      
                                      return (
                                        <div
                                          key={idx}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleApprovalClick(booking, e);
                                          }}
                                          className={`px-0.5 rounded text-white truncate hover:opacity-80 transition-opacity cursor-pointer flex-shrink-0 ${isMobile ? 'text-[8px] leading-[1.2]' : 'text-[10px] leading-tight'}`}
                                           style={{ 
                                             backgroundColor: convertTailwindColorToHex(branch?.color || '#6b7280'),
                                             ...(booking.status === 'pending' && { border: '1px solid #fbbf24' }),
                                             ...(booking.status === 'approved' && { border: '1px solid #10b981' })
                                           }}
                                           title={`${booking.employeeName} - ${branch?.name} (${booking.status})${hasClockedIn ? ' - Clocked In' : ''} - Click to manage booking`}
                                         >
                                           <span className="truncate">
                                             {isMobile ? 
                                               booking.employeeName.slice(0, 8) : 
                                               booking.employeeName.slice(0, 12)
                                             }
                                             {booking.status === 'pending' && ' ⏳'}
                                             {booking.status === 'approved' && !hasClockedIn && ' ✅'}
                                             {booking.status === 'approved' && hasClockedIn && ' ✅✅'}
                                           </span>
                                        </div>
                                      );
                                    })}
                                    {dayBookings.length > maxVisible && (
                                      <span className={`text-muted-foreground flex-shrink-0 ${isMobile ? 'text-[7px]' : 'text-[9px]'}`}>+{dayBookings.length - maxVisible}</span>
                                    )}
                                  </div>
                                )}
                                {!hasBookings && (
                                  <div className="flex items-center justify-center flex-1">
                                    <Plus className="w-3 h-3 text-muted-foreground/40" />
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      }
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Selected Date Details */}
            <Card>
              <CardHeader>
                <CardTitle className={isMobile ? 'text-lg' : ''}>
                  {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                </CardTitle>
                <CardDescription>
                  {getBookingsForDate(selectedDate).length} booking(s) scheduled
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TooltipProvider>
                  <div className="space-y-3">
                    {getBookingsForDate(selectedDate).map((booking) => {
                      const branch = branches.find(b => b.id === booking.branchId);
                      const hasClockedIn = hasEmployeeClockedIn(booking.employeeId, selectedDate);
                      const showPay = isFromNovember2024(booking.date);
                      
                      return (
                        <BookingCardWithPay
                          key={booking.id}
                          booking={booking}
                          branch={branch}
                          hasClockedIn={hasClockedIn}
                          showPay={showPay}
                          isMobile={isMobile}
                          getEmployeeQualifications={getEmployeeQualifications}
                          handleApproval={handleApproval}
                          handleSwapClick={handleSwapClick}
                          handleCancelClick={handleCancelClick}
                          handleApprovalClick={handleApprovalClick}
                        />
                      );
                    })}

                    {getBookingsForDate(selectedDate).length === 0 && (
                      <p className={`text-gray-500 text-center ${isMobile ? 'py-3 text-sm' : 'py-4 text-sm'}`}>
                        No bookings for this date. Click on a date to add bulk bookings.
                      </p>
                    )}
                  </div>
                </TooltipProvider>
              </CardContent>
            </Card>

            {/* Enhanced Approval Dialog with improved formatting and Branch Edit functionality */}
            <Dialog open={isApprovalDialogOpen} onOpenChange={(open) => {
              setIsApprovalDialogOpen(open);
              if (!open) {
                setSelectedBookingForApproval(null);
                setSwapEmployeeId('');
                setSelectedBranchForUpdate('');
              }
            }}>
              <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center space-x-2">
                    <Users className="w-5 h-5" />
                    <span>Manage Booking</span>
                  </DialogTitle>
                  <DialogDescription>
                    {selectedBookingForApproval && 
                      `Review booking for ${selectedBookingForApproval.employeeName} on ${formatDate(new Date(selectedBookingForApproval.date))}`
                    }
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="font-medium">Employee:</span>
                      <span>{selectedBookingForApproval?.employeeName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Current Branch:</span>
                      <span>{selectedBookingForApproval?.branchName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Date:</span>
                      <span>{selectedBookingForApproval && formatDate(new Date(selectedBookingForApproval.date))}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Status:</span>
                      <Badge variant="secondary">{selectedBookingForApproval?.status}</Badge>
                    </div>
                    {selectedBookingForApproval && hasEmployeeClockedIn(selectedBookingForApproval.employeeId, new Date(selectedBookingForApproval.date)) && (
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Clock-in Status:</span>
                        <span className="text-green-600 text-sm">✅ Clocked In</span>
                      </div>
                    )}
                  </div>

                  {/* Branch Selection Section */}
                  <div className="border-t pt-4 space-y-3">
                    <Label htmlFor="branch-select" className="text-sm font-medium flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      Change Branch
                    </Label>
                    <Select value={selectedBranchForUpdate} onValueChange={setSelectedBranchForUpdate}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select branch to move booking" />
                      </SelectTrigger>
                      <SelectContent>
                        {branches.map((branch) => (
                          <SelectItem 
                            key={branch.id} 
                            value={branch.id}
                          >
                            <div className="flex items-center space-x-2">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: convertTailwindColorToHex(branch.color || '#6b7280') }}
                              ></div>
                              <span>{branch.name}</span>
                              {branch.id === selectedBookingForApproval?.branchId && (
                                <span className="text-gray-500 text-xs">(Current)</span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {!selectedBranchForUpdate || selectedBranchForUpdate === selectedBookingForApproval?.branchId ? (
                      <p className="text-xs text-gray-500">Select a different branch to enable the update button</p>
                    ) : (
                      <p className="text-xs text-blue-600">Ready to move booking to selected branch</p>
                    )}
                  </div>

                  {/* Swap Employee Section */}
                  <div className="border-t pt-4 space-y-3">
                    <Label htmlFor="swap-employee" className="text-sm font-medium">Swap Employee (Optional)</Label>
                    <Select value={swapEmployeeId} onValueChange={setSwapEmployeeId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select new employee to swap" />
                      </SelectTrigger>
                      <SelectContent>
                        {casualEmployees
                          .filter(emp => emp.id !== selectedBookingForApproval?.employeeId)
                          .map((employee) => (
                          <SelectItem key={employee.id} value={employee.id}>
                            {employee.name} ({employee.id})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter className="flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
                  <div className="flex flex-wrap gap-2 justify-start">
                    <Button 
                      type="button" 
                      variant="destructive" 
                      size="sm"
                      onClick={handleCancelBookingFromApprovalDialog}
                    >
                      <UserX className="w-4 h-4 mr-1" />
                      Cancel
                    </Button>
                    {selectedBookingForApproval?.status === 'pending' ? (
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => selectedBookingForApproval && handleApproval(selectedBookingForApproval.id, 'rejected', 'Admin')}
                      >
                        <X className="w-4 h-4 mr-1" />
                        Reject
                      </Button>
                    ) : isSuperadmin && selectedBookingForApproval?.status !== 'rejected' && (
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={handleSuperadminReject}
                      >
                        <X className="w-4 h-4 mr-1" />
                        Reject
                      </Button>
                    )}
                    {isSuperadmin && (
                      <Button
                        type="button"
                        size="sm"
                        className="bg-amber-500 hover:bg-amber-600 text-white"
                        onClick={handleSuperadminOverride}
                        disabled={isUpdatingBranch}
                      >
                        <Check className="w-4 h-4 mr-1" />
                        {isUpdatingBranch ? 'Overriding...' : 'Override'}
                      </Button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 justify-end">
                    <Button type="button" variant="outline" size="sm" onClick={() => {
                      setIsApprovalDialogOpen(false);
                      setSelectedBookingForApproval(null);
                      setSwapEmployeeId('');
                      setSelectedBranchForUpdate('');
                    }}>
                      Close
                    </Button>
                    {(() => {
                      const buttonState = getBranchUpdateButtonState();
                      return (
                        <Button 
                          type="button"
                          variant={buttonState.variant}
                          size="sm"
                          onClick={handleBranchUpdate}
                          disabled={buttonState.disabled || isUpdatingBranch}
                        >
                          <MapPin className="w-4 h-4 mr-1" />
                          {isUpdatingBranch ? 'Updating...' : buttonState.text}
                        </Button>
                      );
                    })()}
                    {swapEmployeeId && (
                      <Button 
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={handleSwapInDialog}
                        disabled={isSwappingInDialog}
                      >
                        {isSwappingInDialog ? 'Swapping...' : 'Swap Employee'}
                      </Button>
                    )}
                    {selectedBookingForApproval?.status === 'pending' && (
                      <Button 
                        type="button"
                        size="sm"
                        onClick={() => selectedBookingForApproval && handleApproval(selectedBookingForApproval.id, 'approved', 'Admin')}
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Approve
                      </Button>
                    )}
                  </div>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Cancel Booking Dialog */}
            <Dialog open={isCancelDialogOpen} onOpenChange={(open) => {
              setIsCancelDialogOpen(open);
              if (!open) setSelectedBookingForCancel(null);
            }}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Cancel Booking</DialogTitle>
                  <DialogDescription>
                    {selectedBookingForCancel && 
                      `Are you sure you want to cancel this booking for ${selectedBookingForCancel.employeeName}?`
                    }
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <div className="space-y-2">
                    <p><strong>Employee:</strong> {selectedBookingForCancel?.employeeName}</p>
                    <p><strong>Branch:</strong> {selectedBookingForCancel?.branchName}</p>
                    <p><strong>Date:</strong> {selectedBookingForCancel && formatDate(new Date(selectedBookingForCancel.date))}</p>
                    <p><strong>Current Status:</strong> <Badge variant="secondary">{selectedBookingForCancel?.status}</Badge></p>
                  </div>
                  <p className="text-sm text-red-600 mt-3">This action cannot be undone.</p>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => {
                    setIsCancelDialogOpen(false);
                    setSelectedBookingForCancel(null);
                  }}>
                    Keep Booking
                  </Button>
                  <Button 
                    type="button" 
                    variant="destructive" 
                    onClick={handleCancelBooking}
                  >
                    <UserX className="w-4 h-4 mr-2" />
                    Cancel Booking
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <SwapEmployeeDialog
            isOpen={isSwapDialogOpen}
            onClose={() => setIsSwapDialogOpen(false)}
            booking={selectedBookingForSwap}
            onSuccess={handleSwapSuccess}
          />

          <BulkSlotBookingDialog
            isOpen={isBulkBookingDialogOpen}
            onClose={() => setIsBulkBookingDialogOpen(false)}
            selectedDate={selectedDate}
            onSuccess={handleBulkBookingSuccess}
          />
        </main>
      </div>
    </div>
  );
};

export default AdminSlotBooking;
