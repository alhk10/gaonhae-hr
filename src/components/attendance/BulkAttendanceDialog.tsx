
import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';

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
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}

const BulkAttendanceDialog: React.FC<BulkAttendanceDialogProps> = ({
  isOpen,
  onClose,
  employees,
  onSubmit
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Add Bulk Attendance</DialogTitle>
          <DialogDescription>Add attendance records for multiple employees at once.</DialogDescription>
        </DialogHeader>
        
        <form onSubmit={onSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="date">Date</Label>
              <Input
                name="date"
                type="date"
                required
                defaultValue={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-2">
                <Label htmlFor="checkIn">Check In</Label>
                <Input name="checkIn" type="time" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="checkOut">Check Out</Label>
                <Input name="checkOut" type="time" />
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
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Add Bulk Attendance</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default BulkAttendanceDialog;
