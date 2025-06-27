
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/components/ui/sonner';
import { addAttendanceRecord } from '@/services/attendanceService';
import { format } from 'date-fns';

interface Employee {
  id: string;
  name: string;
  branch?: string;
  position?: string;
}

interface BulkAttendanceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  selectedDate: Date;
  onSuccess: () => Promise<void>;
}

const BulkAttendanceDialog: React.FC<BulkAttendanceDialogProps> = ({
  isOpen,
  onClose,
  employees,
  selectedDate,
  onSuccess
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const formData = new FormData(e.currentTarget);
      const date = formData.get('date') as string;
      const checkIn = formData.get('checkIn') as string;
      const checkOut = formData.get('checkOut') as string;
      
      const selectedEmployees = formData.getAll('employees') as string[];
      
      if (selectedEmployees.length === 0) {
        toast('Please select at least one employee');
        return;
      }

      // Calculate hours worked
      let hoursWorked = 0;
      if (checkIn && checkOut) {
        const checkInTime = new Date(`2000-01-01T${checkIn}`);
        const checkOutTime = new Date(`2000-01-01T${checkOut}`);
        const diffInMs = checkOutTime.getTime() - checkInTime.getTime();
        hoursWorked = Math.max(0, diffInMs / (1000 * 60 * 60));
      }

      // Determine status based on check-in time
      let status: 'Present' | 'Late' = 'Present';
      if (checkIn) {
        const checkInTime = new Date(`2000-01-01T${checkIn}`);
        const nineAM = new Date(`2000-01-01T09:00`);
        status = checkInTime > nineAM ? 'Late' : 'Present';
      }

      // Add attendance records for selected employees
      const promises = selectedEmployees.map(employeeId =>
        addAttendanceRecord({
          employeeId,
          date,
          checkIn,
          checkOut,
          breakStart: null,
          breakEnd: null,
          status,
          hoursWorked,
          location: 'Office'
        })
      );

      await Promise.all(promises);
      
      toast(`Bulk attendance added for ${selectedEmployees.length} employees`);
      await onSuccess();
      onClose();
    } catch (error) {
      console.error('Error adding bulk attendance:', error);
      toast('Error adding bulk attendance');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Add Bulk Attendance</DialogTitle>
          <DialogDescription>Add attendance records for multiple employees at once.</DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="date">Date</Label>
              <Input
                name="date"
                type="date"
                required
                defaultValue={format(selectedDate, 'yyyy-MM-dd')}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-2">
                <Label htmlFor="checkIn">Check In</Label>
                <Input name="checkIn" type="time" defaultValue="09:00" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="checkOut">Check Out</Label>
                <Input name="checkOut" type="time" defaultValue="18:00" />
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
            <Label className="text-sm font-medium">Select Employees</Label>
            <div className="border rounded-md mt-2 overflow-hidden">
              <div className="max-h-80 overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox 
                          onCheckedChange={(checked) => {
                            const checkboxes = document.querySelectorAll('input[name="employees"]') as NodeListOf<HTMLInputElement>;
                            checkboxes.forEach(checkbox => {
                              checkbox.checked = checked as boolean;
                            });
                          }}
                        />
                      </TableHead>
                      <TableHead>Employee ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Branch</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.map((employee) => (
                      <TableRow key={employee.id}>
                        <TableCell>
                          <Checkbox 
                            name="employees"
                            value={employee.id}
                            id={`emp-${employee.id}`}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-sm">{employee.id}</TableCell>
                        <TableCell className="font-medium">{employee.name}</TableCell>
                        <TableCell className="text-sm text-gray-600">{employee.position || 'N/A'}</TableCell>
                        <TableCell className="text-sm text-gray-600">{employee.branch || 'Main Office'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Adding...' : 'Add Bulk Attendance'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default BulkAttendanceDialog;
