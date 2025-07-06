import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/components/ui/sonner';
import { Calendar, Users, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { 
  getBranches, 
  addAdminSlotBooking,
  getAvailableSlotsForDate, 
  getWeeklySlotConfig,
  type Branch,
  type WeeklySlotConfig
} from '@/services/slotBookingService';
import { getEmployees } from '@/services/employeeService';

interface BulkSlotBookingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date;
  onSuccess?: () => void;
}

interface EmployeeData {
  id: string;
  name: string;
  type: string;
  department?: string;
}

const BulkSlotBookingDialog: React.FC<BulkSlotBookingDialogProps> = ({
  isOpen,
  onClose,
  selectedDate,
  onSuccess
}) => {
  const [selectedBranch, setSelectedBranch] = useState('headquarters');
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [employees, setEmployees] = useState<EmployeeData[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [weeklyConfig, setWeeklyConfig] = useState<{ [branchId: string]: WeeklySlotConfig }>({});
  const [availableSlots, setAvailableSlots] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadInitialData();
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedBranch && isOpen) {
      updateAvailableSlots();
    }
  }, [selectedBranch, selectedDate, isOpen]);

  const loadInitialData = async () => {
    try {
      setLoadingEmployees(true);
      console.log('BulkSlotBookingDialog: Loading initial data...');
      
      const [employeeData, branchesData, configData] = await Promise.all([
        getEmployees(),
        getBranches(),
        getWeeklySlotConfig()
      ]);
      
      console.log('BulkSlotBookingDialog: Loaded employees:', employeeData);
      console.log('BulkSlotBookingDialog: Loaded branches:', branchesData);
      console.log('BulkSlotBookingDialog: Loaded config:', configData);
      
      const casualEmployees = employeeData.filter(emp => 
        emp.type?.toLowerCase() === 'casual'
      );
      console.log('BulkSlotBookingDialog: Filtered casual employees:', casualEmployees);
      
      setEmployees(casualEmployees);
      setBranches(branchesData);
      setWeeklyConfig(configData);
    } catch (error) {
      console.error('BulkSlotBookingDialog: Error loading initial data:', error);
      toast.error('Error loading data');
    } finally {
      setLoadingEmployees(false);
    }
  };

  const updateAvailableSlots = async () => {
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
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

    if (selectedEmployees.length > availableSlots) {
      toast.error(`Only ${availableSlots} slots available for this date at the selected branch`);
      return;
    }

    try {
      setLoading(true);
      console.log('BulkSlotBookingDialog: Creating bulk admin bookings for', selectedEmployees.length, 'employees');

      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const branch = branches.find(b => b.id === selectedBranch);

      // Use addAdminSlotBooking for auto-approved bookings
      const bookingPromises = selectedEmployees.map(employeeId => {
        const employee = employees.find(emp => emp.id === employeeId);
        return addAdminSlotBooking({
          employeeId,
          employeeName: employee?.name || 'Unknown',
          branchId: selectedBranch,
          branchName: branch?.name || 'Unknown Branch',
          date: dateStr,
          notes: 'Bulk booking created by Admin'
        });
      });

      await Promise.all(bookingPromises);

      toast.success(`Successfully created ${selectedEmployees.length} auto-approved slot bookings for ${format(selectedDate, 'PPP')}`);
      
      if (onSuccess) {
        onSuccess();
      }
      
      onClose();
      setSelectedEmployees([]);
    } catch (error) {
      console.error('BulkSlotBookingDialog: Error creating bulk bookings:', error);
      toast.error('Error creating bulk bookings');
    } finally {
      setLoading(false);
    }
  };

  const currentBranch = branches.find(b => b.id === selectedBranch);
  const dayName = selectedDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() as keyof WeeklySlotConfig;
  const totalSlotsForDay = weeklyConfig[selectedBranch]?.[dayName] || 0;

  console.log('BulkSlotBookingDialog: Current state:', {
    branchId: selectedBranch,
    dayName,
    totalSlotsForDay,
    availableSlots,
    selectedEmployeesCount: selectedEmployees.length
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Calendar className="w-5 h-5" />
            <span>Add Bulk Slot Booking (Auto-Approved)</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-auto">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                value={format(selectedDate, 'dd/MM/yyyy')}
                disabled
                className="bg-gray-50"
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
                          style={{ backgroundColor: branch.color }}
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
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
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

          <div>
            <div className="flex items-center justify-between mb-3">
              <Label>Select Casual Employees ({selectedEmployees.length} selected)</Label>
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
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-sm text-gray-600 mt-2">Loading employees...</p>
              </div>
            ) : (
              <ScrollArea className="h-64 border rounded-lg">
                <div className="p-3">
                  {employees.length > 0 ? (
                    <div className="space-y-2">
                      {employees.map((employee) => (
                        <div key={employee.id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded">
                          <Checkbox
                            id={employee.id}
                            checked={selectedEmployees.includes(employee.id)}
                            onCheckedChange={() => handleEmployeeToggle(employee.id)}
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-sm">{employee.name}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-gray-600">{employee.type}</p>
                                {employee.department && (
                                  <p className="text-xs text-gray-500">{employee.department}</p>
                                )}
                              </div>
                            </div>
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

          {selectedEmployees.length > availableSlots && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">
                Warning: You have selected {selectedEmployees.length} employees, but only {availableSlots} slots are available.
              </p>
            </div>
          )}

          {selectedEmployees.length > 0 && selectedEmployees.length <= availableSlots && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700">
                ✓ All {selectedEmployees.length} bookings will be automatically approved as admin bookings.
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={loading || selectedEmployees.length === 0 || selectedEmployees.length > availableSlots}
          >
            {loading ? 'Creating...' : `Create ${selectedEmployees.length} Auto-Approved Bookings`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BulkSlotBookingDialog;
