
import { convertTailwindColorToHex } from '@/utils/colorUtils';
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/sonner';
import { Calendar, Users, MapPin, AlertTriangle, Shield } from 'lucide-react';
import { format } from 'date-fns';
import { 
  getBranches, 
  addAdminSlotBooking,
  getAvailableSlotsForDate, 
  getWeeklySlotConfig,
  checkForExistingBooking,
  type Branch,
  type WeeklySlotConfig
} from '@/services/slotBookingService';
import { getCachedCasualEmployeesForBooking } from '@/services/employeeOptimizationService';
import { useAuth } from '@/contexts/AuthContext';

interface BulkSlotBookingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date;
  onSuccess?: () => void;
}

interface EmployeeData {
  id: string;
  name: string;
  display_name: string | null;
  type: string;
}

const BulkSlotBookingDialog: React.FC<BulkSlotBookingDialogProps> = ({
  isOpen,
  onClose,
  selectedDate,
  onSuccess
}) => {
  const { userrole, adminAccess } = useAuth();
  const [selectedBranch, setSelectedBranch] = useState('headquarters');
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [employees, setEmployees] = useState<EmployeeData[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [weeklyConfig, setWeeklyConfig] = useState<{ [branchId: string]: WeeklySlotConfig }>({});
  const [availableSlots, setAvailableSlots] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [overrideSlotLimit, setOverrideSlotLimit] = useState(false);
  const [editableDate, setEditableDate] = useState<Date>(selectedDate);

  // Check if user can override slot limits
  const canOverrideSlots = userrole === 'superadmin' || 
                          (userrole === 'admin' && adminAccess?.slot_booking);

  useEffect(() => {
    if (isOpen) {
      loadInitialData();
      setEditableDate(selectedDate);
    }
  }, [isOpen, selectedDate]);

  useEffect(() => {
    if (selectedBranch && isOpen) {
      updateAvailableSlots();
    }
  }, [selectedBranch, editableDate, isOpen]);

  const loadInitialData = async () => {
    try {
      setLoadingEmployees(true);
      console.log('BulkSlotBookingDialog: Loading initial data...');
      
      const [branchesData, configData] = await Promise.all([
        getBranches(),
        getWeeklySlotConfig()
      ]);
      
      console.log('BulkSlotBookingDialog: Loaded branches:', branchesData);
      console.log('BulkSlotBookingDialog: Loaded config:', configData);
      
      setBranches(branchesData);
      setWeeklyConfig(configData);

      // Load employees with optimized service
      console.log('BulkSlotBookingDialog: Loading casual employees...');
      const employeeData = await getCachedCasualEmployeesForBooking();
      console.log('BulkSlotBookingDialog: Loaded employees:', employeeData);
      
      setEmployees(employeeData);
    } catch (error) {
      console.error('BulkSlotBookingDialog: Error loading initial data:', error);
      toast.error('Error loading data. Please try again.');
    } finally {
      setLoadingEmployees(false);
    }
  };

  const updateAvailableSlots = async () => {
    try {
      const dateStr = format(editableDate, 'yyyy-MM-dd');
      const available = await getAvailableSlotsForDate(dateStr, selectedBranch);
      setAvailableSlots(available);
      console.log('BulkSlotBookingDialog: Updated available slots:', available);
    } catch (error) {
      console.error('BulkSlotBookingDialog: Error updating available slots:', error);
      setAvailableSlots(0);
    }
  };

  const handleEmployeeToggle = (employeeId: string) => {
    setSelectedEmployees(prev => 
      prev.includes(employeeId)
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const handleSelectAll = () => {
    if (selectedEmployees.length === employees.length) {
      setSelectedEmployees([]);
    } else {
      setSelectedEmployees(employees.map(emp => emp.id));
    }
  };

  const handleSubmit = async () => {
    if (selectedEmployees.length === 0) {
      toast.error('Please select at least one employee');
      return;
    }

    // Check slot limits unless override is enabled
    if (!overrideSlotLimit && selectedEmployees.length > availableSlots) {
      toast.error(`Only ${availableSlots} slots available for this date at the selected branch`);
      return;
    }

    // Show warning if overriding slot limits
    if (overrideSlotLimit && selectedEmployees.length > availableSlots) {
      const proceed = window.confirm(
        `You are about to create ${selectedEmployees.length} bookings but only ${availableSlots} slots are available. This will result in overbooking. Do you want to proceed?`
      );
      if (!proceed) return;
    }

    try {
      setLoading(true);
      console.log('BulkSlotBookingDialog: Creating bulk admin bookings for', selectedEmployees.length, 'employees');

      const dateStr = format(editableDate, 'yyyy-MM-dd');
      const branch = branches.find(b => b.id === selectedBranch);

      // Use addAdminSlotBooking for auto-approved bookings with error handling
      let successCount = 0;
      const errors: string[] = [];
      
      for (const employeeId of selectedEmployees) {
        try {
          const employee = employees.find(emp => emp.id === employeeId);
          const notes = overrideSlotLimit
            ? `Bulk booking created by Admin - Override applied`
            : 'Bulk booking created by Admin';
            
          // When override is enabled, allow rebooking (cancel existing and create new)
          // Otherwise, check for existing booking and skip
          if (!overrideSlotLimit) {
            const existingBooking = await checkForExistingBooking(employeeId, dateStr);
            if (existingBooking) {
              errors.push(`${employee?.display_name || employee?.name || 'Unknown'} already has a booking for this date`);
              continue;
            }
          }
          
          await addAdminSlotBooking({
            employeeId,
            employeeName: employee?.display_name || employee?.name || 'Unknown',
            branchId: selectedBranch,
            branchName: branch?.name || 'Unknown Branch',
            date: dateStr,
            notes,
            allowRebook: overrideSlotLimit
          });
          
          successCount++;
          console.log(`Successfully created booking for ${employee?.display_name || employee?.name || employeeId}`);
        } catch (error) {
          const employee = employees.find(emp => emp.id === employeeId);
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`${employee?.display_name || employee?.name || 'Unknown'}: ${errorMsg}`);
          console.error('Error creating booking for', employee?.display_name || employee?.name || employeeId, ':', error);
        }
      }

      // Show results
      if (successCount > 0) {
        const successMessage = overrideSlotLimit && selectedEmployees.length > availableSlots
          ? `Successfully created ${successCount} auto-approved slot bookings for ${format(editableDate, 'PPP')} (slot limit overridden)`
          : `Successfully created ${successCount} auto-approved slot bookings for ${format(editableDate, 'PPP')}`;

        toast.success(successMessage);
        
        if (errors.length > 0) {
          console.warn('Some bookings failed:', errors);
          toast.warning(`${errors.length} bookings failed. Check console for details.`);
        }
        
        if (onSuccess) {
          onSuccess();
        }
        
        onClose();
        setSelectedEmployees([]);
        setOverrideSlotLimit(false);
      } else {
        if (errors.length > 0) {
          toast.error(`Failed to create bookings: ${errors[0]}${errors.length > 1 ? ` and ${errors.length - 1} others` : ''}`);
        } else {
          toast.error('Failed to create any bookings');
        }
      }
    } catch (error) {
      console.error('BulkSlotBookingDialog: Error creating bulk bookings:', error);
      toast.error('Error creating bulk bookings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = new Date(e.target.value);
    if (!isNaN(newDate.getTime())) {
      setEditableDate(newDate);
    }
  };

  const currentBranch = branches.find(b => b.id === selectedBranch);
  const dayName = editableDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() as keyof WeeklySlotConfig;
  const totalSlotsForDay = weeklyConfig[selectedBranch]?.[dayName] || 0;

  const isOverbooking = selectedEmployees.length > availableSlots;
  const canProceed = selectedEmployees.length > 0 && (overrideSlotLimit || !isOverbooking);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Calendar className="w-5 h-5" />
            <span>Add Bulk Slot Booking (Auto-Approved)</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 space-y-6 overflow-auto">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type={overrideSlotLimit && canOverrideSlots ? "date" : "text"}
                value={overrideSlotLimit && canOverrideSlots ? format(editableDate, 'yyyy-MM-dd') : format(editableDate, 'dd/MM/yyyy')}
                onChange={handleDateChange}
                disabled={!overrideSlotLimit || !canOverrideSlots}
                className={!overrideSlotLimit || !canOverrideSlots ? "bg-gray-50" : ""}
              />
            </div>
            <div>
              <Label htmlFor="branch">Branch</Label>
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger>
                  <SelectValue placeholder="Select branch" />
                </SelectTrigger>
                <SelectContent>
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

          {currentBranch && (
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-green-600" />
                <div>
                  <h4 className="font-medium text-green-900">{currentBranch.name}</h4>
                  <p className="text-sm text-green-700">
                    Available slots: {availableSlots} • Bookings will be auto-approved
                  </p>
                </div>
              </div>
            </div>
          )}

          {canOverrideSlots && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Shield className="w-4 h-4 text-blue-600" />
                  <div>
                    <h4 className="font-medium text-blue-900">Admin Override</h4>
                    <p className="text-sm text-blue-700">Allow booking beyond available slots</p>
                  </div>
                </div>
                <Switch
                  checked={overrideSlotLimit}
                  onCheckedChange={setOverrideSlotLimit}
                />
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-4">
              <Label className="text-base font-medium">Select Employees ({selectedEmployees.length} selected)</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                disabled={loadingEmployees}
              >
                {selectedEmployees.length === employees.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>

            {loadingEmployees ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-sm text-gray-600 mt-2">Loading employees...</p>
              </div>
            ) : (
              <ScrollArea className="h-64 border rounded-lg">
                <div className="p-4">
                  {employees.length > 0 ? (
                    <div className="space-y-3">
                      {employees.map((employee) => (
                        <div key={employee.id} className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg">
                          <Checkbox
                            id={employee.id}
                            checked={selectedEmployees.includes(employee.id)}
                            onCheckedChange={() => handleEmployeeToggle(employee.id)}
                          />
                          <div className="flex-1">
                            <p className="font-medium">{employee.display_name || employee.name}</p>
                            <p className="text-sm text-gray-500">ID: {employee.id}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      <p>No casual employees found</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}
          </div>

          {!overrideSlotLimit && isOverbooking && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <p className="text-sm text-red-700">
                  Warning: You have selected {selectedEmployees.length} employees, but only {availableSlots} slots are available.
                  {canOverrideSlots && ' Enable "Admin Override" to proceed anyway.'}
                </p>
              </div>
            </div>
          )}

          {overrideSlotLimit && isOverbooking && (
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-orange-600" />
                <p className="text-sm text-orange-700">
                  ⚠️ Override enabled: Creating {selectedEmployees.length} bookings with only {availableSlots} slots available will result in overbooking.
                </p>
              </div>
            </div>
          )}

          {canProceed && !isOverbooking && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700">
                ✓ All {selectedEmployees.length} bookings will be automatically approved as admin bookings.
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={loading || !canProceed}
            className={overrideSlotLimit && isOverbooking ? "bg-orange-600 hover:bg-orange-700" : ""}
          >
            {loading ? 'Creating...' : 
              overrideSlotLimit && isOverbooking ? 
                `Override & Create ${selectedEmployees.length} Bookings` :
                `Create ${selectedEmployees.length} Auto-Approved Bookings`
            }
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BulkSlotBookingDialog;
