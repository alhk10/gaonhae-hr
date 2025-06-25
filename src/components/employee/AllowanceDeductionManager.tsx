
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { supabase } from '@/integrations/supabase/client';
import { AllowanceDeduction } from '@/types/employee';

interface AllowanceDeductionManagerProps {
  employeeId: string;
  onUpdate: () => void;
}

const AllowanceDeductionManager: React.FC<AllowanceDeductionManagerProps> = ({ employeeId, onUpdate }) => {
  const [employeeAllowances, setEmployeeAllowances] = useState<any[]>([]);
  const [employeeDeductions, setEmployeeDeductions] = useState<any[]>([]);
  const [systemAllowances, setSystemAllowances] = useState<any[]>([]);
  const [systemDeductions, setSystemDeductions] = useState<any[]>([]);
  const [showAddAllowance, setShowAddAllowance] = useState(false);
  const [showAddDeduction, setShowAddDeduction] = useState(false);
  const [selectedAllowance, setSelectedAllowance] = useState('');
  const [selectedDeduction, setSelectedDeduction] = useState('');
  const [allowanceAmount, setAllowanceAmount] = useState('');
  const [deductionAmount, setDeductionAmount] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [employeeId]);

  const loadData = async () => {
    try {
      setLoading(true);
      console.log('Loading allowance/deduction data for employee:', employeeId);

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

      // Load system allowances - use type assertion to handle the missing table type
      try {
        const { data: sysAllowances, error: sysAllowancesError } = await (supabase as any)
          .from('system_allowances')
          .select('*');

        if (sysAllowancesError) {
          console.error('Error loading system allowances:', sysAllowancesError);
          // Use hardcoded data as fallback
          setSystemAllowances([
            { id: 1, name: 'Transport Allowance' },
            { id: 2, name: 'Meal Allowance' },
            { id: 3, name: 'Mobile Allowance' },
            { id: 4, name: 'Overtime Allowance' },
            { id: 5, name: 'Performance Bonus' }
          ]);
        } else {
          console.log('Loaded system allowances:', sysAllowances);
          setSystemAllowances(sysAllowances || []);
        }
      } catch (error) {
        console.error('Error loading system allowances:', error);
        setSystemAllowances([
          { id: 1, name: 'Transport Allowance' },
          { id: 2, name: 'Meal Allowance' },
          { id: 3, name: 'Mobile Allowance' },
          { id: 4, name: 'Overtime Allowance' },
          { id: 5, name: 'Performance Bonus' }
        ]);
      }

      // Load system deductions - use type assertion to handle the missing table type
      try {
        const { data: sysDeductions, error: sysDeductionsError } = await (supabase as any)
          .from('system_deductions')
          .select('*');

        if (sysDeductionsError) {
          console.error('Error loading system deductions:', sysDeductionsError);
          // Use hardcoded data as fallback
          setSystemDeductions([
            { id: 1, name: 'Late Deduction' },
            { id: 2, name: 'Absent Deduction' },
            { id: 3, name: 'Uniform Deduction' },
            { id: 4, name: 'Equipment Damage' },
            { id: 5, name: 'Other Deduction' }
          ]);
        } else {
          console.log('Loaded system deductions:', sysDeductions);
          setSystemDeductions(sysDeductions || []);
        }
      } catch (error) {
        console.error('Error loading system deductions:', error);
        setSystemDeductions([
          { id: 1, name: 'Late Deduction' },
          { id: 2, name: 'Absent Deduction' },
          { id: 3, name: 'Uniform Deduction' },
          { id: 4, name: 'Equipment Damage' },
          { id: 5, name: 'Other Deduction' }
        ]);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast("Error loading data");
    } finally {
      setLoading(false);
    }
  };

  const handleAddAllowance = async () => {
    if (!selectedAllowance || !allowanceAmount) {
      toast("Please select an allowance and enter amount");
      return;
    }

    try {
      console.log('Adding allowance:', selectedAllowance, allowanceAmount);
      
      const insertData = {
        employee_id: employeeId,
        name: selectedAllowance,
        amount: parseFloat(allowanceAmount)
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
      setShowAddAllowance(false);
      setSelectedAllowance('');
      setAllowanceAmount('');
      loadData();
      onUpdate();
    } catch (error) {
      console.error('Error adding allowance:', error);
      toast("Error adding allowance");
    }
  };

  const handleAddDeduction = async () => {
    if (!selectedDeduction || !deductionAmount) {
      toast("Please select a deduction and enter amount");
      return;
    }

    try {
      console.log('Adding deduction:', selectedDeduction, deductionAmount);
      
      const insertData = {
        employee_id: employeeId,
        name: selectedDeduction,
        amount: parseFloat(deductionAmount)
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
      setShowAddDeduction(false);
      setSelectedDeduction('');
      setDeductionAmount('');
      loadData();
      onUpdate();
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
              <CardDescription>Manage employee allowances from system settings</CardDescription>
            </div>
            <Button onClick={() => setShowAddAllowance(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Allowance
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showAddAllowance && (
            <div className="mb-4 p-4 border rounded-lg bg-gray-50">
              <h4 className="font-medium mb-3">Add New Allowance</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Allowance Type</label>
                  <select 
                    value={selectedAllowance}
                    onChange={(e) => setSelectedAllowance(e.target.value)}
                    className="w-full p-2 border rounded"
                  >
                    <option value="">Select allowance</option>
                    {systemAllowances.map((allowance) => (
                      <option key={allowance.id} value={allowance.name}>
                        {allowance.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Amount</label>
                  <input
                    type="number"
                    value={allowanceAmount}
                    onChange={(e) => setAllowanceAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <Button onClick={handleAddAllowance} size="sm">Add</Button>
                  <Button onClick={() => setShowAddAllowance(false)} variant="outline" size="sm">Cancel</Button>
                </div>
              </div>
            </div>
          )}
          
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
                        <Badge variant="secondary">Fixed</Badge>
                        <span className="text-sm text-gray-600">S${allowance.amount}</span>
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
              <CardDescription>Manage employee deductions from system settings</CardDescription>
            </div>
            <Button onClick={() => setShowAddDeduction(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Deduction
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showAddDeduction && (
            <div className="mb-4 p-4 border rounded-lg bg-gray-50">
              <h4 className="font-medium mb-3">Add New Deduction</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Deduction Type</label>
                  <select 
                    value={selectedDeduction}
                    onChange={(e) => setSelectedDeduction(e.target.value)}
                    className="w-full p-2 border rounded"
                  >
                    <option value="">Select deduction</option>
                    {systemDeductions.map((deduction) => (
                      <option key={deduction.id} value={deduction.name}>
                        {deduction.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Amount</label>
                  <input
                    type="number"
                    value={deductionAmount}
                    onChange={(e) => setDeductionAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <Button onClick={handleAddDeduction} size="sm">Add</Button>
                  <Button onClick={() => setShowAddDeduction(false)} variant="outline" size="sm">Cancel</Button>
                </div>
              </div>
            </div>
          )}
          
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
                        <Badge variant="secondary">Fixed</Badge>
                        <span className="text-sm text-gray-600">S${deduction.amount}</span>
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
