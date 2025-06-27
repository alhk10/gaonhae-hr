
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Edit } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { EmployeeAllowance } from '@/types/employee';

interface EditAllowancesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  employeeName: string;
  allowances: EmployeeAllowance[];
  onSave: (allowances: EmployeeAllowance[]) => void;
}

const EditAllowancesDialog = ({ 
  isOpen, 
  onClose, 
  employeeName, 
  allowances, 
  onSave 
}: EditAllowancesDialogProps) => {
  const [editingAllowances, setEditingAllowances] = useState<EmployeeAllowance[]>(allowances);
  const [newAllowance, setNewAllowance] = useState({ name: '', amount: 0 });
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleAddAllowance = () => {
    if (!newAllowance.name.trim() || newAllowance.amount <= 0) {
      toast('Please enter valid allowance name and amount');
      return;
    }

    const allowance: EmployeeAllowance = {
      id: Date.now().toString(),
      name: newAllowance.name,
      amount: newAllowance.amount,
      type: 'Fixed'
    };

    setEditingAllowances([...editingAllowances, allowance]);
    setNewAllowance({ name: '', amount: 0 });
  };

  const handleRemoveAllowance = (id: string) => {
    setEditingAllowances(editingAllowances.filter(a => a.id !== id));
  };

  const handleEditAllowance = (id: string, newAmount: number) => {
    if (newAmount <= 0) {
      toast('Amount must be greater than 0');
      return;
    }

    setEditingAllowances(editingAllowances.map(a => 
      a.id === id ? { ...a, amount: newAmount } : a
    ));
    setEditingId(null);
  };

  const handleSave = () => {
    onSave(editingAllowances);
    toast(`Updated allowances for ${employeeName}`);
    onClose();
  };

  const totalAllowances = editingAllowances.reduce((sum, a) => sum + a.amount, 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Edit Allowances - {employeeName}</DialogTitle>
          <DialogDescription>
            Manage allowances for this employee
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Add New Allowance */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium mb-3">Add New Allowance</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label htmlFor="allowance-name">Name</Label>
                <Input
                  id="allowance-name"
                  value={newAllowance.name}
                  onChange={(e) => setNewAllowance({...newAllowance, name: e.target.value})}
                  placeholder="e.g., Transport Allowance"
                />
              </div>
              <div>
                <Label htmlFor="allowance-amount">Amount (S$)</Label>
                <Input
                  id="allowance-amount"
                  type="number"
                  value={newAllowance.amount}
                  onChange={(e) => setNewAllowance({...newAllowance, amount: Number(e.target.value)})}
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="flex items-end">
                <Button onClick={handleAddAllowance} className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Add
                </Button>
              </div>
            </div>
          </div>

          {/* Current Allowances */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium">Current Allowances</h4>
              <Badge variant="secondary">Total: S${totalAllowances.toFixed(2)}</Badge>
            </div>
            
            {editingAllowances.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead className="w-20">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {editingAllowances.map((allowance) => (
                    <TableRow key={allowance.id}>
                      <TableCell className="font-medium">{allowance.name}</TableCell>
                      <TableCell>
                        {editingId === allowance.id ? (
                          <div className="flex items-center space-x-2">
                            <Input
                              type="number"
                              defaultValue={allowance.amount}
                              onBlur={(e) => handleEditAllowance(allowance.id, Number(e.target.value))}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleEditAllowance(allowance.id, Number(e.currentTarget.value));
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
                            onClick={() => setEditingId(allowance.id)}
                          >
                            S${allowance.amount.toFixed(2)}
                            <Edit className="w-3 h-3 ml-2 text-gray-400" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveAllowance(allowance.id)}
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
                No allowances added yet
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

export default EditAllowancesDialog;
