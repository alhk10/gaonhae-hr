
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { supabase } from '@/integrations/supabase/client';
import { getSystemAllowances, getSystemDeductions, SystemAllowance, SystemDeduction } from '@/services/settingsService';

interface AllowanceDeductionManagerProps {
  employeeId: string;
  onUpdate: () => void;
}

const AllowanceDeductionManager: React.FC<AllowanceDeductionManagerProps> = ({ employeeId, onUpdate }) => {
  const [systemAllowances, setSystemAllowances] = useState<SystemAllowance[]>([]);
  const [systemDeductions, setSystemDeductions] = useState<SystemDeduction[]>([]);
  const [employeeAllowances, setEmployeeAllowances] = useState<any[]>([]);
  const [employeeDeductions, setEmployeeDeductions] = useState<any[]>([]);
  const [isAddAllowanceOpen, setIsAddAllowanceOpen] = useState(false);
  const [isAddDeductionOpen, setIsAddDeductionOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [employeeId]);

  const loadData = async () => {
    try {
      setLoading(true);
      console.log('Loading allowance/deduction data for employee:', employeeId);

      // Load system settings
      const systemAllowancesList = getSystemAllowances();
      const systemDeductionsList = getSystemDeductions();
      setSystemAllowances(systemAllowancesList);
      setSystemDeductions(systemDeductionsList);

      // Load employee allowances
      const { data: allowances, error: allowancesError } = await supabase
        .from('allowances')
        .select('*')
        .eq('employee_id', employeeId);

      if (allowancesError) {
        console.error('Error loading allowances:', allowancesError);
        toast("Error loading allowances");
      } else {
        console.log('Loaded employee allowances:', allowances);
        setEmployeeAllowances(allowances || []);
      }

      // Load employee deductions
      const { data: deductions, error: deductionsError } = await supabase
        .from('deductions')
        .select('*')
        .eq('employee_id', employeeId);

      if (deductionsError) {
        console.error('Error loading deductions:', deductionsError);
        toast("Error loading deductions");
      } else {
        console.log('Loaded employee deductions:', deductions);
        setEmployeeDeductions(deductions || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast("Error loading data");
    } finally {
      setLoading(false);
    }
  };

  const handleAddAllowance = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const allowanceId = formData.get('allowance') as string;
    
    const selectedAllowance = systemAllowances.find(a => a.id.toString() === allowanceId);
    if (!selectedAllowance) {
      toast("Please select a valid allowance");
      return;
    }

    try {
      console.log('Adding allowance:', selectedAllowance);
      
      const insertData = {
        employee_id: employeeId,
        name: selectedAllowance.name,
        amount: parseFloat(selectedAllowance.amount),
        type: selectedAllowance.type || 'Fixed'
      };

      console.log('Inserting allowance data:', insertData);

      const { error } = await supabase
        .from('allowances')
        .insert([insertData]);

      if (error) {
        console.error('Error adding allowance:', error);
        toast("Error adding allowance: " + error.message);
        return;
      }

      toast("Allowance added successfully");
      loadData();
      onUpdate();
      setIsAddAllowanceOpen(false);
    } catch (error) {
      console.error('Error adding allowance:', error);
      toast("Error adding allowance");
    }
  };

  const handleAddDeduction = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const deductionId = formData.get('deduction') as string;
    
    const selectedDeduction = systemDeductions.find(d => d.id.toString() === deductionId);
    if (!selectedDeduction) {
      toast("Please select a valid deduction");
      return;
    }

    try {
      console.log('Adding deduction:', selectedDeduction);
      
      const insertData = {
        employee_id: employeeId,
        name: selectedDeduction.name,
        amount: parseFloat(selectedDeduction.amount),
        type: selectedDeduction.type || 'Fixed'
      };

      console.log('Inserting deduction data:', insertData);

      const { error } = await supabase
        .from('deductions')
        .insert([insertData]);

      if (error) {
        console.error('Error adding deduction:', error);
        toast("Error adding deduction: " + error.message);
        return;
      }

      toast("Deduction added successfully");
      loadData();
      onUpdate();
      setIsAddDeductionOpen(false);
    } catch (error) {
      console.error('Error adding deduction:', error);
      toast("Error adding deduction");
    }
  };

  const handleRemoveAllowance = async (allowanceId: number) => {
    try {
      console.log('Removing allowance:', allowanceId);
      
      const { error } = await supabase
        .from('allowances')
        .delete()
        .eq('id', allowanceId);

      if (error) {
        console.error('Error removing allowance:', error);
        toast("Error removing allowance");
        return;
      }

      toast("Allowance removed successfully");
      loadData();
      onUpdate();
    } catch (error) {
      console.error('Error removing allowance:', error);
      toast("Error removing allowance");
    }
  };

  const handleRemoveDeduction = async (deductionId: number) => {
    try {
      console.log('Removing deduction:', deductionId);
      
      const { error } = await supabase
        .from('deductions')
        .delete()
        .eq('id', deductionId);

      if (error) {
        console.error('Error removing deduction:', error);
        toast("Error removing deduction");
        return;
      }

      toast("Deduction removed successfully");
      loadData();
      onUpdate();
    } catch (error) {
      console.error('Error removing deduction:', error);
      toast("Error removing deduction");
    }
  };

  if (loading) {
    return <div className="text-center">Loading allowances and deductions...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Allowances Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Allowances</CardTitle>
              <CardDescription>Manage employee allowances</CardDescription>
            </div>
            <Dialog open={isAddAllowanceOpen} onOpenChange={setIsAddAllowanceOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Allowance
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Add Allowance</DialogTitle>
                  <DialogDescription>Select an allowance from the system settings.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddAllowance}>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="allowance">Allowance</Label>
                      <Select name="allowance" required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select allowance" />
                        </SelectTrigger>
                        <SelectContent>
                          {systemAllowances.map((allowance) => (
                            <SelectItem key={allowance.id} value={allowance.id.toString()}>
                              {allowance.name} - {allowance.type} (${allowance.amount})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsAddAllowanceOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">Add Allowance</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {employeeAllowances.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No allowances assigned</p>
            ) : (
              employeeAllowances.map((allowance) => (
                <div key={allowance.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div>
                      <p className="font-medium">{allowance.name}</p>
                      <div className="flex items-center space-x-2">
                        <Badge variant="secondary">{allowance.type || 'Fixed'}</Badge>
                        <span className="text-sm text-gray-600">${allowance.amount}</span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRemoveAllowance(allowance.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Deductions Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Deductions</CardTitle>
              <CardDescription>Manage employee deductions</CardDescription>
            </div>
            <Dialog open={isAddDeductionOpen} onOpenChange={setIsAddDeductionOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Deduction
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Add Deduction</DialogTitle>
                  <DialogDescription>Select a deduction from the system settings.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddDeduction}>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="deduction">Deduction</Label>
                      <Select name="deduction" required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select deduction" />
                        </SelectTrigger>
                        <SelectContent>
                          {systemDeductions.map((deduction) => (
                            <SelectItem key={deduction.id} value={deduction.id.toString()}>
                              {deduction.name} - {deduction.type} (${deduction.amount})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsAddDeductionOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">Add Deduction</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {employeeDeductions.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No deductions assigned</p>
            ) : (
              employeeDeductions.map((deduction) => (
                <div key={deduction.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div>
                      <p className="font-medium">{deduction.name}</p>
                      <div className="flex items-center space-x-2">
                        <Badge variant="secondary">{deduction.type || 'Fixed'}</Badge>
                        <span className="text-sm text-gray-600">${deduction.amount}</span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRemoveDeduction(deduction.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AllowanceDeductionManager;
