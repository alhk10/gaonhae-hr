
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/components/ui/sonner';
import { Calendar, Users } from 'lucide-react';
import { getEmployees } from '@/services/employeeService';
import { addLeaveRequest } from '@/services/leaveService';
import { format } from 'date-fns';

interface BulkLeaveDialogProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date | null;
  onSuccess: () => void;
}

const BulkLeaveDialog: React.FC<BulkLeaveDialogProps> = ({
  isOpen,
  onClose,
  selectedDate,
  onSuccess
}) => {
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [leaveType, setLeaveType] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadEmployees();
    }
  }, [isOpen]);

  const loadEmployees = async () => {
    try {
      const employeeData = await getEmployees();
      setEmployees(employeeData);
    } catch (error) {
      console.error('Error loading employees:', error);
      toast('Error loading employees');
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
    if (!selectedDate || selectedEmployees.length === 0 || !leaveType) {
      toast('Please select date, employees, and leave type');
      return;
    }

    setLoading(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      
      for (const employeeId of selectedEmployees) {
        const employee = employees.find(emp => emp.id === employeeId);
        await addLeaveRequest({
          employeeId,
          employeeName: employee?.name || 'Unknown',
          type: leaveType,
          startDate: dateStr,
          endDate: dateStr,
          days: 1,
          status: 'Approved',
          reason: 'Bulk leave entry',
          appliedOn: dateStr
        });
      }

      toast(`Bulk leave added for ${selectedEmployees.length} employees`);
      onSuccess();
      onClose();
      setSelectedEmployees([]);
      setLeaveType('');
    } catch (error) {
      console.error('Error adding bulk leave:', error);
      toast('Error adding bulk leave');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Calendar className="w-5 h-5" />
            <span>Add Bulk Leave</span>
          </DialogTitle>
          <DialogDescription>
            Add leave for multiple employees on {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : 'selected date'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Leave Type</label>
            <Select value={leaveType} onValueChange={setLeaveType}>
              <SelectTrigger>
                <SelectValue placeholder="Select leave type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Annual Leave">Annual Leave</SelectItem>
                <SelectItem value="Sick Leave">Sick Leave</SelectItem>
                <SelectItem value="Personal Leave">Personal Leave</SelectItem>
                <SelectItem value="Emergency Leave">Emergency Leave</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Employees</label>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                className="text-xs"
              >
                {selectedEmployees.length === employees.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>
            
            <div className="max-h-48 overflow-y-auto border rounded-md p-2 space-y-2">
              {employees.map((employee) => (
                <div key={employee.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={employee.id}
                    checked={selectedEmployees.includes(employee.id)}
                    onCheckedChange={() => handleEmployeeToggle(employee.id)}
                  />
                  <label
                    htmlFor={employee.id}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {employee.name}
                  </label>
                </div>
              ))}
            </div>
            
            <p className="text-xs text-gray-500 mt-2">
              {selectedEmployees.length} employee(s) selected
            </p>
          </div>

          <div className="flex space-x-2 pt-4">
            <Button
              onClick={handleSubmit}
              disabled={loading || selectedEmployees.length === 0 || !leaveType}
              className="flex-1"
            >
              <Users className="w-4 h-4 mr-2" />
              {loading ? 'Adding...' : `Add Leave (${selectedEmployees.length})`}
            </Button>
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BulkLeaveDialog;
