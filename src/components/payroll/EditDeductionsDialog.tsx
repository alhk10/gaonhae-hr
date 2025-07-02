
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
import { EmployeeDeduction } from '@/types/employee';
import { supabase } from '@/integrations/supabase/client';

interface SystemDeduction {
  id: number;
  name: string;
  default_amount: number;
  description: string;
}

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
  const [systemDeductions, setSystemDeductions] = useState<SystemDeduction[]>([]);
  const [selectedSystemDeduction, setSelectedSystemDeduction] = useState<string>('');
  const [customDeduction, setCustomDeduction] = useState({ name: '', amount: 0 });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadSystemDeductions();
      setEditingDeductions(deductions);
    }
  }, [isOpen, deductions]);

  const loadSystemDeductions = async () => {
    try {
      const { data, error } = await supabase
        .from('system_deductions')
        .select('*')
        .order('name');

      if (error) throw error;
      setSystemDeductions(data || []);
    } catch (error) {
      console.error('Error loading system deductions:', error);
      toast.error('Failed to load system deductions');
    }
  };

  const handleAddSystemDeduction = () => {
    if (!selectedSystemDeduction) {
      toast.error('Please select a deduction');
      return;
    }

    const systemDeduction = systemDeductions.find(d => d.id.toString() === selectedSystemDeduction);
    if (!systemDeduction) return;

    // Check if this deduction already exists
    if (editingDeductions.some(d => d.name === systemDeduction.name)) {
      toast.error('This deduction is already added');
      return;
    }

    const newDeduction: EmployeeDeduction = {
      id: Date.now().toString(),
      name: systemDeduction.name,
      amount: systemDeduction.default_amount,
      type: 'Fixed'
    };

    setEditingDeductions([...editingDeductions, newDeduction]);
    setSelectedSystemDeduction('');
    toast.success(`Added ${systemDeduction.name}`);
  };

  const handleAddCustomDeduction = () => {
    if (!customDeduction.name.trim() || customDeduction.amount <= 0) {
      toast.error('Please enter valid deduction name and amount');
      return;
    }

    // Check if this deduction already exists
    if (editingDeductions.some(d => d.name === customDeduction.name)) {
      toast.error('This deduction is already added');
      return;
    }

    const newDeduction: EmployeeDeduction = {
      id: Date.now().toString(),
      name: customDeduction.name,
      amount: customDeduction.amount,
      type: 'Manual'
    };

    setEditingDeductions([...editingDeductions, newDeduction]);
    setCustomDeduction({ name: '', amount: 0 });
    toast.success(`Added ${customDeduction.name}`);
  };

  const handleRemoveDeduction = (id: string) => {
    setEditingDeductions(editingDeductions.filter(d => d.id !== id));
    toast.success('Deduction removed');
  };

  const handleEditDeduction = (id: string, newAmount: number) => {
    if (newAmount < 0) {
      toast.error('Amount cannot be negative');
      return;
    }

    setEditingDeductions(editingDeductions.map(d => 
      d.id === id ? { ...d, amount: newAmount } : d
    ));
    setEditingId(null);
    toast.success('Amount updated');
  };

  const handleSave = () => {
    onSave(editingDeductions);
    toast.success(`Updated deductions for ${employeeName}`);
    onClose();
  };

  const totalDeductions = editingDeductions.reduce((sum, d) => sum + d.amount, 0);

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'Fixed':
        return 'Fixed Deduction';
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
          <DialogTitle>Edit Deductions - {employeeName}</DialogTitle>
          <DialogDescription>
            Add system-defined deductions or create custom ones for this employee
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Add System Deduction */}
          <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
            <h4 className="font-medium mb-3 text-red-900">Add System Deduction</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <Label htmlFor="system-deduction">Select Deduction</Label>
                <Select value={selectedSystemDeduction} onValueChange={setSelectedSystemDeduction}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose from predefined deductions" />
                  </SelectTrigger>
                  <SelectContent>
                    {systemDeductions.map((deduction) => (
                      <SelectItem key={deduction.id} value={deduction.id.toString()}>
                        <div className="flex flex-col">
                          <span>{deduction.name}</span>
                          <span className="text-sm text-gray-500">
                            Default: S${deduction.default_amount} - {deduction.description}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button onClick={handleAddSystemDeduction} variant="destructive" className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Add System Deduction
                </Button>
              </div>
            </div>
          </div>

          {/* Add Custom Deduction */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium mb-3">Add Custom Deduction</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label htmlFor="custom-deduction-name">Name</Label>
                <Input
                  id="custom-deduction-name"
                  value={customDeduction.name}
                  onChange={(e) => setCustomDeduction({...customDeduction, name: e.target.value})}
                  placeholder="e.g., Special Penalty"
                />
              </div>
              <div>
                <Label htmlFor="custom-deduction-amount">Amount (S$)</Label>
                <Input
                  id="custom-deduction-amount"
                  type="number"
                  value={customDeduction.amount}
                  onChange={(e) => setCustomDeduction({...customDeduction, amount: Number(e.target.value)})}
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="flex items-end">
                <Button onClick={handleAddCustomDeduction} variant="secondary" className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Custom
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
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead className="w-20">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {editingDeductions.map((deduction) => (
                    <TableRow key={deduction.id}>
                      <TableCell className="font-medium">{deduction.name}</TableCell>
                      <TableCell>
                        <Badge variant={getTypeBadgeVariant(deduction.type)}>
                          {getTypeLabel(deduction.type)}
                        </Badge>
                      </TableCell>
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
