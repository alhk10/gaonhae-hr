
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Edit } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { EmployeeAllowance } from '@/types/employee';
import { supabase } from '@/integrations/supabase/client';

interface SystemAllowance {
  id: number;
  name: string;
  default_amount: number;
  description: string;
}

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
  const [systemAllowances, setSystemAllowances] = useState<SystemAllowance[]>([]);
  const [selectedSystemAllowance, setSelectedSystemAllowance] = useState<string>('');
  const [customAllowance, setCustomAllowance] = useState({ name: '', amount: 0 });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadSystemAllowances();
      setEditingAllowances(allowances);
    }
  }, [isOpen, allowances]);

  const loadSystemAllowances = async () => {
    try {
      const { data, error } = await supabase
        .from('system_allowances')
        .select('*')
        .order('name');

      if (error) throw error;
      setSystemAllowances(data || []);
    } catch (error) {
      console.error('Error loading system allowances:', error);
      toast.error('Failed to load system allowances');
    }
  };

  const handleAddSystemAllowance = () => {
    if (!selectedSystemAllowance) {
      toast.error('Please select an allowance');
      return;
    }

    const systemAllowance = systemAllowances.find(a => a.id.toString() === selectedSystemAllowance);
    if (!systemAllowance) return;

    // Check if this allowance already exists
    if (editingAllowances.some(a => a.name === systemAllowance.name)) {
      toast.error('This allowance is already added');
      return;
    }

    const newAllowance: EmployeeAllowance = {
      id: Date.now().toString(),
      name: systemAllowance.name,
      amount: systemAllowance.default_amount,
      type: 'Fixed'
    };

    setEditingAllowances([...editingAllowances, newAllowance]);
    setSelectedSystemAllowance('');
    toast.success(`Added ${systemAllowance.name}`);
  };

  const handleAddCustomAllowance = () => {
    if (!customAllowance.name.trim() || customAllowance.amount <= 0) {
      toast.error('Please enter valid allowance name and amount');
      return;
    }

    // Check if this allowance already exists
    if (editingAllowances.some(a => a.name === customAllowance.name)) {
      toast.error('This allowance is already added');
      return;
    }

    const newAllowance: EmployeeAllowance = {
      id: Date.now().toString(),
      name: customAllowance.name,
      amount: customAllowance.amount,
      type: 'Manual'
    };

    setEditingAllowances([...editingAllowances, newAllowance]);
    setCustomAllowance({ name: '', amount: 0 });
    toast.success(`Added ${customAllowance.name}`);
  };

  const handleRemoveAllowance = (id: string) => {
    setEditingAllowances(editingAllowances.filter(a => a.id !== id));
    toast.success('Allowance removed');
  };

  const handleEditAllowance = (id: string, newAmount: number) => {
    if (newAmount <= 0) {
      toast.error('Amount must be greater than 0');
      return;
    }

    setEditingAllowances(editingAllowances.map(a => 
      a.id === id ? { ...a, amount: newAmount } : a
    ));
    setEditingId(null);
    toast.success('Amount updated');
  };

  const handleSave = () => {
    onSave(editingAllowances);
    toast.success(`Updated allowances for ${employeeName}`);
    onClose();
  };

  const totalAllowances = editingAllowances.reduce((sum, a) => sum + a.amount, 0);

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'Fixed':
        return 'Fixed Allowance';
      case 'Manual':
        return 'Custom';
      default:
        return type;
    }
  };

  const getTypeBadgeVariant = (type: string) => {
    switch (type) {
      case 'Fixed':
        return 'default';
      case 'Manual':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Edit Allowances - {employeeName}</DialogTitle>
          <DialogDescription>
            Add system-defined allowances or create custom ones for this employee
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Add System Allowance */}
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
            <h4 className="font-medium mb-3 text-blue-900">Add System Allowance</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <Label htmlFor="system-allowance">Select Allowance</Label>
                <Select value={selectedSystemAllowance} onValueChange={setSelectedSystemAllowance}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose from predefined allowances" />
                  </SelectTrigger>
                  <SelectContent>
                    {systemAllowances.map((allowance) => (
                      <SelectItem key={allowance.id} value={allowance.id.toString()}>
                        <div className="flex flex-col">
                          <span>{allowance.name}</span>
                          <span className="text-sm text-gray-500">
                            Default: S${allowance.default_amount} - {allowance.description}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button onClick={handleAddSystemAllowance} className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Add System Allowance
                </Button>
              </div>
            </div>
          </div>

          {/* Add Custom Allowance */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium mb-3">Add Custom Allowance</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label htmlFor="custom-allowance-name">Name</Label>
                <Input
                  id="custom-allowance-name"
                  value={customAllowance.name}
                  onChange={(e) => setCustomAllowance({...customAllowance, name: e.target.value})}
                  placeholder="e.g., Special Bonus"
                />
              </div>
              <div>
                <Label htmlFor="custom-allowance-amount">Amount (S$)</Label>
                <Input
                  id="custom-allowance-amount"
                  type="number"
                  value={customAllowance.amount}
                  onChange={(e) => setCustomAllowance({...customAllowance, amount: Number(e.target.value)})}
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="flex items-end">
                <Button onClick={handleAddCustomAllowance} variant="secondary" className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Custom
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
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead className="w-20">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {editingAllowances.map((allowance) => (
                    <TableRow key={allowance.id}>
                      <TableCell className="font-medium">{allowance.name}</TableCell>
                      <TableCell>
                        <Badge variant={getTypeBadgeVariant(allowance.type)}>
                          {getTypeLabel(allowance.type)}
                        </Badge>
                      </TableCell>
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
