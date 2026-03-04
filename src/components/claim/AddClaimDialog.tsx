
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/sonner';
import { Plus, Calendar, User, DollarSign } from 'lucide-react';
import { createClaim } from '@/services/claimsService';
import { getEmployees } from '@/services/employeeService';
import { getClaimTypes, type ClaimType } from '@/services/claimTypesService';

interface Employee {
  id: string;
  name: string;
  display_name?: string;
  type: string;
}

interface AddClaimDialogProps {
  onClaimAdded: () => void;
}

const AddClaimDialog = ({ onClaimAdded }: AddClaimDialogProps) => {
  const [open, setOpen] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [claimTypes, setClaimTypes] = useState<ClaimType[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    employeeId: '',
    type: '',
    amount: '',
    date: '',
    description: ''
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const [employeesData, claimTypesData] = await Promise.all([
          getEmployees(),
          getClaimTypes()
        ]);
        setEmployees(employeesData);
        setClaimTypes(claimTypesData);
      } catch (error) {
        console.error('Error loading data:', error);
        toast('Error loading employees and claim types');
      }
    };

    if (open) {
      loadData();
    }
  }, [open]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const resetForm = () => {
    setFormData({
      employeeId: '',
      type: '',
      amount: '',
      date: '',
      description: ''
    });
  };

  const handleSubmit = async () => {
    if (!formData.employeeId || !formData.type || !formData.amount || !formData.date || !formData.description) {
      toast('Please fill in all required fields');
      return;
    }

    const selectedEmployee = employees.find(emp => emp.id === formData.employeeId);
    if (!selectedEmployee) {
      toast('Selected employee not found');
      return;
    }

    try {
      setIsSubmitting(true);

      const newClaim = {
        employeeId: formData.employeeId,
        employee: selectedEmployee.name,
        type: formData.type,
        amount: parseFloat(formData.amount),
        date: formData.date,
        status: 'Approved' as const, // Pre-approved claim
        description: formData.description,
        receipt_url: '' // No receipt required for manual claims
      };

      await createClaim(newClaim, false);
      
      toast('Claim added successfully!');
      resetForm();
      setOpen(false);
      onClaimAdded();
    } catch (error) {
      console.error('Error adding claim:', error);
      toast('Error adding claim. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getClaimTypeIcon = (typeName: string) => {
    switch (typeName.toLowerCase()) {
      case 'medical':
        return '🏥';
      case 'transport':
        return '🚗';
      case 'meal':
        return '🍽️';
      case 'equipment':
        return '💻';
      case 'travel':
        return '✈️';
      case 'accommodation':
        return '🏨';
      default:
        return '📋';
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-green-600 hover:bg-green-700">
          <Plus className="w-4 h-4 mr-2" />
          Add Claim
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-green-600" />
            Add New Claim
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="font-semibold text-gray-700 flex items-center gap-2">
              <User className="w-4 h-4" />
              Employee *
            </Label>
            <Select value={formData.employeeId} onValueChange={(value) => handleInputChange('employeeId', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.display_name || employee.name} ({employee.type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="font-semibold text-gray-700">
              Claim Type *
            </Label>
            <Select value={formData.type} onValueChange={(value) => handleInputChange('type', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select claim type" />
              </SelectTrigger>
              <SelectContent>
                {claimTypes.map((claimType) => (
                  <SelectItem key={claimType.id} value={claimType.name}>
                    {getClaimTypeIcon(claimType.name)} {claimType.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="font-semibold text-gray-700 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Amount (S$) *
            </Label>
            <Input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={formData.amount}
              onChange={(e) => handleInputChange('amount', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label className="font-semibold text-gray-700 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Date *
            </Label>
            <Input
              type="date"
              value={formData.date}
              onChange={(e) => handleInputChange('date', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label className="font-semibold text-gray-700">
              Description *
            </Label>
            <Textarea
              rows={3}
              placeholder="Enter claim description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-green-600 hover:bg-green-700"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Adding...
                </>
              ) : (
                'Add Claim'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddClaimDialog;
