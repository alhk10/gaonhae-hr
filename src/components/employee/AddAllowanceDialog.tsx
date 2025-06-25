
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getSystemAllowances } from '@/services/settingsService';
import type { SystemAllowance } from '@/services/settingsService';
import { AllowanceDeduction } from '@/types/employee';

interface AddAllowanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (allowance: AllowanceDeduction) => void;
}

const AddAllowanceDialog: React.FC<AddAllowanceDialogProps> = ({ open, onOpenChange, onAdd }) => {
  const [systemAllowances, setSystemAllowances] = useState<SystemAllowance[]>([]);
  const [selectedAllowance, setSelectedAllowance] = useState<string>('');
  const [customName, setCustomName] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [type, setType] = useState<'Fixed' | 'Percentage' | 'Manual'>('Fixed');

  useEffect(() => {
    if (open) {
      const allowances = getSystemAllowances();
      setSystemAllowances(allowances);
      // Reset form
      setSelectedAllowance('');
      setCustomName('');
      setAmount('');
      setType('Fixed');
    }
  }, [open]);

  const handleAdd = () => {
    const name = selectedAllowance === 'custom' ? customName : selectedAllowance;
    if (!name || !amount) return;

    const newAllowance: AllowanceDeduction = {
      id: Date.now(),
      name: name,
      amount: Number(amount),
      type: type
    };

    onAdd(newAllowance);
    onOpenChange(false);
  };

  const isValid = () => {
    if (selectedAllowance === 'custom') {
      return customName.trim() !== '' && amount !== '' && Number(amount) >= 0;
    }
    return selectedAllowance !== '' && amount !== '' && Number(amount) >= 0;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Allowance</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="allowance-select">Allowance Name</Label>
            <Select value={selectedAllowance} onValueChange={setSelectedAllowance}>
              <SelectTrigger>
                <SelectValue placeholder="Select an allowance" />
              </SelectTrigger>
              <SelectContent>
                {systemAllowances.map((allowance) => (
                  <SelectItem key={allowance.id} value={allowance.name}>
                    {allowance.name}
                  </SelectItem>
                ))}
                <SelectItem value="custom">Custom Allowance</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {selectedAllowance === 'custom' && (
            <div>
              <Label htmlFor="custom-name">Custom Allowance Name</Label>
              <Input
                id="custom-name"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Enter allowance name"
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
            Add Allowance
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddAllowanceDialog;
