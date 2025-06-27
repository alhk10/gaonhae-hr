
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/sonner';

interface EditSalaryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  employeeName: string;
  currentSalary: number;
  employeeType: 'Full-Time' | 'Casual';
  paymentType: 'Monthly' | 'Hourly' | 'Daily';
  onSave: (newSalary: number) => void;
}

const EditSalaryDialog = ({ 
  isOpen, 
  onClose, 
  employeeName, 
  currentSalary, 
  employeeType,
  paymentType,
  onSave 
}: EditSalaryDialogProps) => {
  const [salary, setSalary] = useState(currentSalary);

  const handleSave = () => {
    if (salary <= 0) {
      toast('Salary must be greater than 0');
      return;
    }
    
    onSave(salary);
    toast(`Updated salary for ${employeeName}`);
    onClose();
  };

  const getSalaryLabel = () => {
    if (employeeType === 'Full-Time') return 'Basic Salary (Monthly)';
    if (paymentType === 'Hourly') return 'Hourly Rate';
    if (paymentType === 'Daily') return 'Daily Rate';
    return 'Monthly Salary';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Salary - {employeeName}</DialogTitle>
          <DialogDescription>
            Update the {getSalaryLabel().toLowerCase()} for this employee
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="salary">{getSalaryLabel()}</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">S$</span>
              <Input
                id="salary"
                type="number"
                value={salary}
                onChange={(e) => setSalary(Number(e.target.value))}
                className="pl-8"
                min="0"
                step="0.01"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditSalaryDialog;
