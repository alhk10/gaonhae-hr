
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { supabase } from '@/integrations/supabase/client';
import { systemAllowances, systemDeductions } from '@/data/employeeData';

interface AllowanceDeduction {
  id: number;
  name: string;
  type?: string;
  amount?: number;
}

interface AllowanceDeductionManagerProps {
  employeeId: string;
  allowances: AllowanceDeduction[];
  deductions: AllowanceDeduction[];
  onUpdate: () => void;
}

const AllowanceDeductionManager: React.FC<AllowanceDeductionManagerProps> = ({
  employeeId,
  allowances,
  deductions,
  onUpdate
}) => {
  const [showAddAllowance, setShowAddAllowance] = useState(false);
  const [showAddDeduction, setShowAddDeduction] = useState(false);
  const [availableAllowances, setAvailableAllowances] = useState(systemAllowances);
  const [availableDeductions, setAvailableDeductions] = useState(systemDeductions);

  useEffect(() => {
    // Filter out already assigned allowances/deductions
    const assignedAllowanceNames = allowances.map(a => a.name);
    const assignedDeductionNames = deductions.map(d => d.name);
    
    setAvailableAllowances(systemAllowances.filter(a => !assignedAllowanceNames.includes(a.name)));
    setAvailableDeductions(systemDeductions.filter(d => !assignedDeductionNames.includes(d.name)));
  }, [allowances, deductions]);

  const handleAddAllowance = async (allowanceName: string) => {
    const systemAllowance = systemAllowances.find(a => a.name === allowanceName);
    if (!systemAllowance) return;

    try {
      const { error } = await supabase
        .from('allowances')
        .insert({
          employee_id: employeeId,
          name: systemAllowance.name,
          type: systemAllowance.type,
          amount: systemAllowance.amount
        });

      if (error) {
        console.error('Error adding allowance:', error);
        toast('Error adding allowance');
      } else {
        toast('Allowance added successfully');
        setShowAddAllowance(false);
        onUpdate();
      }
    } catch (error) {
      console.error('Error adding allowance:', error);
      toast('Error adding allowance');
    }
  };

  const handleAddDeduction = async (deductionName: string) => {
    const systemDeduction = systemDeductions.find(d => d.name === deductionName);
    if (!systemDeduction) return;

    try {
      const { error } = await supabase
        .from('deductions')
        .insert({
          employee_id: employeeId,
          name: systemDeduction.name,
          type: systemDeduction.type,
          amount: systemDeduction.amount
        });

      if (error) {
        console.error('Error adding deduction:', error);
        toast('Error adding deduction');
      } else {
        toast('Deduction added successfully');
        setShowAddDeduction(false);
        onUpdate();
      }
    } catch (error) {
      console.error('Error adding deduction:', error);
      toast('Error adding deduction');
    }
  };

  const handleRemoveAllowance = async (allowanceId: number) => {
    try {
      const { error } = await supabase
        .from('allowances')
        .delete()
        .eq('id', allowanceId);

      if (error) {
        console.error('Error removing allowance:', error);
        toast('Error removing allowance');
      } else {
        toast('Allowance removed successfully');
        onUpdate();
      }
    } catch (error) {
      console.error('Error removing allowance:', error);
      toast('Error removing allowance');
    }
  };

  const handleRemoveDeduction = async (deductionId: number) => {
    try {
      const { error } = await supabase
        .from('deductions')
        .delete()
        .eq('id', deductionId);

      if (error) {
        console.error('Error removing deduction:', error);
        toast('Error removing deduction');
      } else {
        toast('Deduction removed successfully');
        onUpdate();
      }
    } catch (error) {
      console.error('Error removing deduction:', error);
      toast('Error removing deduction');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Allowances</CardTitle>
            <Dialog open={showAddAllowance} onOpenChange={setShowAddAllowance}>
              <DialogTrigger asChild>
                <Button size="sm" disabled={availableAllowances.length === 0}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Allowance</DialogTitle>
                  <DialogDescription>Select an allowance to add to this employee.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="allowance">Allowance</Label>
                    <Select onValueChange={handleAddAllowance}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select allowance" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableAllowances.map((allowance) => (
                          <SelectItem key={allowance.id} value={allowance.name}>
                            {allowance.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {allowances.map((allowance) => (
              <div key={allowance.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="font-medium">{allowance.name}</div>
                </div>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleRemoveAllowance(allowance.id)}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            ))}
            {allowances.length === 0 && (
              <div className="text-center text-gray-500 py-4">
                No allowances configured
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Deductions</CardTitle>
            <Dialog open={showAddDeduction} onOpenChange={setShowAddDeduction}>
              <DialogTrigger asChild>
                <Button size="sm" disabled={availableDeductions.length === 0}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Deduction</DialogTitle>
                  <DialogDescription>Select a deduction to add to this employee.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="deduction">Deduction</Label>
                    <Select onValueChange={handleAddDeduction}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select deduction" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableDeductions.map((deduction) => (
                          <SelectItem key={deduction.id} value={deduction.name}>
                            {deduction.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {deductions.map((deduction) => (
              <div key={deduction.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="font-medium">{deduction.name}</div>
                </div>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleRemoveDeduction(deduction.id)}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            ))}
            {deductions.length === 0 && (
              <div className="text-center text-gray-500 py-4">
                No deductions configured
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AllowanceDeductionManager;
