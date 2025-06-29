
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { AllowanceDeduction } from '@/types/employee';

interface SystemDeduction {
  id: number;
  name: string;
  description?: string;
  default_amount: number;
}

interface AddDeductionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (deduction: AllowanceDeduction) => void;
}

const AddDeductionDialog: React.FC<AddDeductionDialogProps> = ({ open, onOpenChange, onAdd }) => {
  const [systemDeductions, setSystemDeductions] = useState<SystemDeduction[]>([]);
  const [selectedDeduction, setSelectedDeduction] = useState<string>('');
  const [customName, setCustomName] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [type, setType] = useState<'Fixed' | 'Percentage' | 'Manual'>('Fixed');

  useEffect(() => {
    if (open) {
      loadSystemDeductions();
      // Reset form
      setSelectedDeduction('');
      setCustomName('');
      setAmount('');
      setType('Fixed');
    }
  }, [open]);

  const loadSystemDeductions = async () => {
    try {
      console.log('Loading system deductions...');
      const { data, error } = await supabase
        .from('system_deductions')
        .select('*')
        .order('name');

      if (error) {
        console.error('Error loading system deductions:', error);
        return;
      }

      console.log('System deductions loaded:', data);
      setSystemDeductions(data || []);
    } catch (error) {
      console.error('Error loading system deductions:', error);
    }
  };

  const handleAdd = () => {
    const name = selectedDeduction === 'custom' ? customName : selectedDeduction;
    if (!name || !amount) {
      console.log('Missing required fields:', { name, amount });
      return;
    }

    const newDeduction: AllowanceDeduction = {
      id: Date.now().toString(),
      name: name,
      amount: Number(amount),
      type: type
    };

    console.log('Adding deduction:', newDeduction);
    onAdd(newDeduction);
    onOpenChange(false);
  };

  const isValid = () => {
    if (selectedDeduction === 'custom') {
      return customName.trim() !== '' && amount !== '' && Number(amount) >= 0;
    }
    return selectedDeduction !== '' && amount !== '' && Number(amount) >= 0;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Deduction</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="deduction-select">Deduction Name</Label>
            <Select value={selectedDeduction} onValueChange={setSelectedDeduction}>
              <SelectTrigger>
                <SelectValue placeholder="Select a deduction" />
              </SelectTrigger>
              <SelectContent>
                {systemDeductions.map((deduction) => (
                  <SelectItem key={deduction.id} value={deduction.name}>
                    {deduction.name}
                  </SelectItem>
                ))}
                <SelectItem value="custom">Custom Deduction</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {selectedDeduction === 'custom' && (
            <div>
              <Label htmlFor="custom-name">Custom Deduction Name</Label>
              <Input
                id="custom-name"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Enter deduction name"
              />
            </div>
          )}

          <div>
            <Label htmlFor="type">Type</Label>
            <Select value={type} onValueChange={(value) => setType(value as 'Fixed' | 'Percentage' | 'Manual')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Fixed">Fixed Amount</SelectItem>
                <SelectItem value="Percentage">Percentage</SelectItem>
                <SelectItem value="Manual">Manual</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="amount">Amount {type === 'Percentage' ? '(%)' : '(S$)'}</Label>
            <Input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={type === 'Percentage' ? 'Enter percentage' : 'Enter amount'}
              min="0"
              step={type === 'Percentage' ? '0.1' : '0.01'}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={!isValid()}>
            Add Deduction
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddDeductionDialog;
