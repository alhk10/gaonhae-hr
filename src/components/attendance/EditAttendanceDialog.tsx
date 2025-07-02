
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/sonner';
import { updateAttendanceRecord, type AttendanceRecord } from '@/services/attendanceService';
import { getBranches } from '@/services/settingsService';

interface EditAttendanceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  record: AttendanceRecord | null;
  onSuccess: () => Promise<void>;
}

const EditAttendanceDialog: React.FC<EditAttendanceDialogProps> = ({
  isOpen,
  onClose,
  record,
  onSuccess
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [branches, setBranches] = useState<Array<{id: number; name: string; address: string}>>([]);
  const [formData, setFormData] = useState({
    date: '',
    checkIn: '',
    checkOut: '',
    status: 'Present' as AttendanceRecord['status'],
    location: ''
  });

  useEffect(() => {
    if (isOpen) {
      loadBranches();
      if (record) {
        setFormData({
          date: record.date || '',
          checkIn: record.checkIn || '',
          checkOut: record.checkOut || '',
          status: record.status || 'Present',
          location: record.location || ''
        });
      }
    }
  }, [isOpen, record]);

  const loadBranches = async () => {
    try {
      console.log('Loading branches for edit dialog...');
      const branchData = getBranches();
      console.log('Loaded branches:', branchData);
      setBranches(branchData);
    } catch (error) {
      console.error('Error loading branches:', error);
      toast('Error loading branches');
    }
  };

  const calculateHours = (checkIn: string, checkOut: string) => {
    if (!checkIn || !checkOut) return 0;
    
    const checkInTime = new Date(`2000-01-01T${checkIn}`);
    const checkOutTime = new Date(`2000-01-01T${checkOut}`);
    const diffInMs = checkOutTime.getTime() - checkInTime.getTime();
    return Math.max(0, diffInMs / (1000 * 60 * 60));
  };

  const determineStatus = (checkIn: string): AttendanceRecord['status'] => {
    if (!checkIn) return 'Present';
    
    const checkInTime = new Date(`2000-01-01T${checkIn}`);
    const nineAM = new Date(`2000-01-01T09:00`);
    const graceEnd = new Date(`2000-01-01T09:15`); // 15 minutes grace period
    
    return checkInTime > graceEnd ? 'Late' : 'Present';
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!record) {
      toast('No record selected for editing');
      return;
    }

    setIsSubmitting(true);

    try {
      // Calculate hours worked
      const hoursWorked = calculateHours(formData.checkIn, formData.checkOut);
      
      // Determine status if check-in time is provided
      let finalStatus = formData.status;
      if (formData.checkIn && formData.status === 'Present') {
        finalStatus = determineStatus(formData.checkIn);
      }

      const updatedRecord: Partial<AttendanceRecord> = {
        date: formData.date,
        checkIn: formData.checkIn || undefined,
        checkOut: formData.checkOut || undefined,
        status: finalStatus,
        hoursWorked: hoursWorked > 0 ? hoursWorked : undefined,
        location: formData.location
      };

      await updateAttendanceRecord(record.id, updatedRecord);
      
      toast('Attendance record updated successfully');
      await onSuccess();
      onClose();
    } catch (error) {
      console.error('Error updating attendance record:', error);
      toast('Error updating attendance record');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    if (field === 'status') {
      setFormData(prev => ({ ...prev, [field]: value as AttendanceRecord['status'] }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Attendance Record</DialogTitle>
          <DialogDescription>
            Modify the attendance record details below.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => handleInputChange('date', e.target.value)}
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="location">Branch</Label>
            <Select value={formData.location} onValueChange={(value) => handleInputChange('location', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select branch" />
              </SelectTrigger>
              <SelectContent className="bg-white z-50">
                {branches.map((branch) => (
                  <SelectItem key={branch.id} value={branch.name}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <div className="grid gap-2">
              <Label htmlFor="checkIn">Check In</Label>
              <Input
                id="checkIn"
                type="time"
                value={formData.checkIn}
                onChange={(e) => handleInputChange('checkIn', e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="checkOut">Check Out</Label>
              <Input
                id="checkOut"
                type="time"
                value={formData.checkOut}
                onChange={(e) => handleInputChange('checkOut', e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="status">Status</Label>
            <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white z-50">
                <SelectItem value="Present">Present</SelectItem>
                <SelectItem value="Late">Late</SelectItem>
                <SelectItem value="Absent">Absent</SelectItem>
                <SelectItem value="Half Day">Half Day</SelectItem>
                <SelectItem value="Medical Leave">Medical Leave</SelectItem>
                <SelectItem value="Annual Leave">Annual Leave</SelectItem>
                <SelectItem value="On Leave">On Leave</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Updating...' : 'Update Record'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditAttendanceDialog;
