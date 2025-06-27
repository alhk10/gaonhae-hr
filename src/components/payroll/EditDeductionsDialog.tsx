
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Edit } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { EmployeeDeduction } from '@/types/employee';

interface EditDeductionsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  employeeName: string;
  deductions: EmployeeDeduction[];
  onSave: (deductions: EmployeeDeduction[]) => void;
}

const EditDeductionsDialog = ({ 
  isOpen, 
  onClose, 
  employeeName, 
  deductions, 
  onSave 
}: EditDeductionsDialogProps) => {
  const [editingDeductions, setEditingDeductions] = useState<EmployeeDeduction[]>(deductions);
  const [newDeduction, setNewDeduction] = useState({ name: '', amount: 0 });
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleAddDeduction = () => {
    if (!newDeduction.name.trim() || newDeduction.amount <= 0) {
      toast('Please enter valid deduction name and amount');
      return;
    }

    const deduction: EmployeeDeduction = {
      id: Date.now().toString(),
      name: newDeduction.name,
      amount: newDeduction.amount,
      type: 'Fixed'
    };

    setEditingDeductions([...editingDeductions, deduction]);
    setNewDeduction({ name: '', amount: 0 });
  };

  const handleRemoveDeduction = (id: string) => {
    setEditingDeductions(editingDeductions.filter(d => d.id !== id));
  };

  const handleEditDeduction = (id: string, newAmount: number) => {
    if (newAmount < 0) {
      toast('Amount cannot be negative');
      return;
    }

    setEditingDeductions(editingDeductions.map(d => 
      d.id === id ? { ...d, amount: newAmount } : d
    ));
    setEditingId(null);
  };

  const handleSave = () => {
    onSave(editingDeductions);
    toast(`Updated deductions for ${employeeName}`);
    onClose();
  };

  const totalDeductions = editingDeductions.reduce((sum, d) => sum + d.amount, 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Edit Deductions - {employeeName}</DialogTitle>
          <DialogDescription>
            Manage deductions for this employee
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Add New Deduction */}
          <div className="bg-red-50 p-4 rounded-lg border border-red-200">
            <h4 className="font-medium mb-3 text-red-900">Add New Deduction</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label htmlFor="deduction-name">Name</Label>
                <Input
                  id="deduction-name"
                  value={newDeduction.name}
                  onChange={(e) => setNewDeduction({...newDeduction, name: e.target.value})}
                  placeholder="e.g., Late Deduction"
                />
              </div>
              <div>
                <Label htmlFor="deduction-amount">Amount (S$)</Label>
                <Input
                  id="deduction-amount"
                  type="number"
                  value={newDeduction.amount}
                  onChange={(e) => setNewDeduction({...newDeduction, amount: Number(e.target.value)})}
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="flex items-end">
                <Button onClick={handleAddDeduction} variant="destructive" className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Add
                </Button>
              </div>
            </div>
          </div>

          {/* Current Deductions */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium">Current Deductions</h4>
              <Badge variant="destructive">Total: S${totalDeductions.toFixed(2)}</Badge>
            </div>
            
            {editingDeductions.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead className="w-20">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {editingDeductions.map((deduction) => (
                    <TableRow key={deduction.id}>
                      <TableCell className="font-medium">{deduction.name}</TableCell>
                      <TableCell>
                        {editingId === deduction.id ? (
                          <div className="flex items-center space-x-2">
                            <Input
                              type="number"
                              defaultValue={deduction.amount}
                              onBlur={(e) => handleEditDeduction(deduction.id, Number(e.target.value))}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleEditDeduction(deduction.id, Number(e.currentTarget.value));
                                }
                              }}
                              className="w-24"
                              min="0"
                              step="0.01"
                              autoFocus
                            />
                          </div>
                        ) : (
                          <div 
                            className="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded flex items-center"
                            onClick={() => setEditingId(deduction.id)}
                          >
                            S${deduction.amount.toFixed(2)}
                            <Edit className="w-3 h-3 ml-2 text-gray-400" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveDeduction(deduction.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No deductions added yet
              </div>
            )}
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

export default EditDeductionsDialog;
