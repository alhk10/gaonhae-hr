
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { supabase } from '@/integrations/supabase/client';
import AddAllowanceDialog from './AddAllowanceDialog';
import AddDeductionDialog from './AddDeductionDialog';
import { AllowanceDeduction } from '@/types/employee';

interface AllowanceDeductionManagerProps {
  employeeId: string;
  onUpdate: () => void;
}

const AllowanceDeductionManager: React.FC<AllowanceDeductionManagerProps> = ({ employeeId, onUpdate }) => {
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

  const handleAddAllowance = async (allowance: AllowanceDeduction) => {
    try {
      console.log('Adding allowance:', allowance);
      
      const insertData = {
        employee_id: employeeId,
        name: allowance.name,
        amount: allowance.amount,
        type: allowance.type || 'Fixed'
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
    } catch (error) {
      console.error('Error adding allowance:', error);
      toast("Error adding allowance");
    }
  };

  const handleAddDeduction = async (deduction: AllowanceDeduction) => {
    try {
      console.log('Adding deduction:', deduction);
      
      const insertData = {
        employee_id: employeeId,
        name: deduction.name,
        amount: deduction.amount,
        type: deduction.type || 'Fixed'
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
            <Button onClick={() => setIsAddAllowanceOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Allowance
            </Button>
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
              <CardDescription>Manage employee deductions</CardDescription>
            </div>
            <Button onClick={() => setIsAddDeductionOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Deduction
            </Button>
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

      <AddAllowanceDialog
        open={isAddAllowanceOpen}
        onOpenChange={setIsAddAllowanceOpen}
        onAdd={handleAddAllowance}
      />

      <AddDeductionDialog
        open={isAddDeductionOpen}
        onOpenChange={setIsAddDeductionOpen}
        onAdd={handleAddDeduction}
      />
    </div>
  );
};

export default AllowanceDeductionManager;
