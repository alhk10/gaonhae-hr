
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/sonner';
import { Users, ArrowRight } from 'lucide-react';
import { getCasualEmployees } from '@/services/employeeService';
import { updateSlotBookingEmployee } from '@/services/slotBookingService';
import { EmployeeProfile } from '@/types/employee';
import { SlotBooking } from '@/services/slotBookingService';

interface SwapEmployeeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  booking: SlotBooking | null;
  onSuccess: () => void;
}

const SwapEmployeeDialog: React.FC<SwapEmployeeDialogProps> = ({
  isOpen,
  onClose,
  booking,
  onSuccess
}) => {
  const [casualEmployees, setCasualEmployees] = useState<EmployeeProfile[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadCasualEmployees();
      setSelectedEmployeeId('');
    }
  }, [isOpen]);

  const loadCasualEmployees = async () => {
    try {
      setLoadingEmployees(true);
      const employees = await getCasualEmployees();
      // Filter out the current employee
      const availableEmployees = employees.filter(emp => emp.id !== booking?.employeeId);
      setCasualEmployees(availableEmployees);
    } catch (error) {
      console.error('Error loading casual employees:', error);
      toast.error('Failed to load employees');
    } finally {
      setLoadingEmployees(false);
    }
  };

  const handleSwap = async () => {
    if (!booking || !selectedEmployeeId) return;

    const selectedEmployee = casualEmployees.find(emp => emp.id === selectedEmployeeId);
    if (!selectedEmployee) return;

    setLoading(true);
    try {
      const success = await updateSlotBookingEmployee(
        booking.id,
        selectedEmployeeId,
        selectedEmployee.display_name || selectedEmployee.name,
        `Swapped from ${booking.employeeName} to ${selectedEmployee.display_name || selectedEmployee.name}`
      );

      if (success) {
        toast.success(`Successfully swapped employee to ${selectedEmployee.display_name || selectedEmployee.name}`);
        onSuccess();
        onClose();
      } else {
        toast.error('Failed to swap employee');
      }
    } catch (error) {
      console.error('Error swapping employee:', error);
      toast.error('Failed to swap employee');
    } finally {
      setLoading(false);
    }
  };

  const selectedEmployee = casualEmployees.find(emp => emp.id === selectedEmployeeId);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Users className="w-5 h-5" />
            <span>Swap Employee</span>
          </DialogTitle>
          <DialogDescription>
            Reassign this booking to a different casual employee
          </DialogDescription>
        </DialogHeader>

        {booking && (
          <div className="space-y-4">
            {/* Current Booking Details */}
            <div className="border rounded-lg p-3 bg-gray-50">
              <h4 className="font-medium text-sm mb-2">Current Booking</h4>
              <div className="space-y-1 text-sm">
                <p><strong>Employee:</strong> {booking.employeeName}</p>
                <p><strong>Branch:</strong> {booking.branchName}</p>
                <p><strong>Date:</strong> {new Date(booking.date).toLocaleDateString()}</p>
                <Badge variant="secondary">{booking.status}</Badge>
              </div>
            </div>

            {/* Employee Selection */}
            <div className="space-y-2">
              <Label htmlFor="employee-select">Select New Employee</Label>
              <Select
                value={selectedEmployeeId}
                onValueChange={setSelectedEmployeeId}
                disabled={loadingEmployees}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingEmployees ? "Loading employees..." : "Choose an employee"} />
                </SelectTrigger>
                <SelectContent>
                  {casualEmployees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.display_name || employee.name} ({employee.id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Swap Preview */}
            {selectedEmployee && (
              <div className="border rounded-lg p-3 bg-blue-50">
                <h4 className="font-medium text-sm mb-2 flex items-center space-x-2">
                  <ArrowRight className="w-4 h-4" />
                  <span>After Swap</span>
                </h4>
                <div className="space-y-1 text-sm">
                  <p><strong>Employee:</strong> {selectedEmployee.display_name || selectedEmployee.name}</p>
                  <p><strong>Branch:</strong> {booking.branchName}</p>
                  <p><strong>Date:</strong> {new Date(booking.date).toLocaleDateString()}</p>
                  <Badge variant="secondary">{booking.status}</Badge>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={handleSwap} 
            disabled={!selectedEmployeeId || loading}
          >
            {loading ? 'Swapping...' : 'Swap Employee'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SwapEmployeeDialog;
