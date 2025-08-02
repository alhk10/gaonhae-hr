import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  getSystemAllowances,
  getSystemDeductions,
  addSystemAllowance,
  addSystemDeduction,
  updateSystemAllowance,
  updateSystemDeduction,
  deleteSystemAllowance,
  deleteSystemDeduction,
  SystemAllowance,
  SystemDeduction
} from '@/services/systemAllowanceDeductionService';

interface AllowanceFormData {
  name: string;
  default_amount: number;
  description: string;
}

interface DeductionFormData {
  name: string;
  default_amount: number;
  description: string;
}

const SystemAllowanceDeductionManagement = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [allowanceDialogOpen, setAllowanceDialogOpen] = useState(false);
  const [deductionDialogOpen, setDeductionDialogOpen] = useState(false);
  const [editingAllowance, setEditingAllowance] = useState<SystemAllowance | null>(null);
  const [editingDeduction, setEditingDeduction] = useState<SystemDeduction | null>(null);
  
  const [allowanceForm, setAllowanceForm] = useState<AllowanceFormData>({
    name: '',
    default_amount: 0,
    description: ''
  });
  
  const [deductionForm, setDeductionForm] = useState<DeductionFormData>({
    name: '',
    default_amount: 0,
    description: ''
  });

  // Queries
  const { data: allowances = [], isLoading: allowancesLoading } = useQuery({
    queryKey: ['systemAllowances'],
    queryFn: getSystemAllowances
  });

  const { data: deductions = [], isLoading: deductionsLoading } = useQuery({
    queryKey: ['systemDeductions'],
    queryFn: getSystemDeductions
  });

  // Mutations
  const addAllowanceMutation = useMutation({
    mutationFn: addSystemAllowance,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['systemAllowances'] });
      setAllowanceDialogOpen(false);
      resetAllowanceForm();
      toast({ title: 'Success', description: 'System allowance added successfully' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to add system allowance', variant: 'destructive' });
    }
  });

  const updateAllowanceMutation = useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: Partial<SystemAllowance> }) =>
      updateSystemAllowance(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['systemAllowances'] });
      setAllowanceDialogOpen(false);
      resetAllowanceForm();
      setEditingAllowance(null);
      toast({ title: 'Success', description: 'System allowance updated successfully' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to update system allowance', variant: 'destructive' });
    }
  });

  const deleteAllowanceMutation = useMutation({
    mutationFn: deleteSystemAllowance,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['systemAllowances'] });
      toast({ title: 'Success', description: 'System allowance deleted successfully' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to delete system allowance', variant: 'destructive' });
    }
  });

  const addDeductionMutation = useMutation({
    mutationFn: addSystemDeduction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['systemDeductions'] });
      setDeductionDialogOpen(false);
      resetDeductionForm();
      toast({ title: 'Success', description: 'System deduction added successfully' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to add system deduction', variant: 'destructive' });
    }
  });

  const updateDeductionMutation = useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: Partial<SystemDeduction> }) =>
      updateSystemDeduction(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['systemDeductions'] });
      setDeductionDialogOpen(false);
      resetDeductionForm();
      setEditingDeduction(null);
      toast({ title: 'Success', description: 'System deduction updated successfully' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to update system deduction', variant: 'destructive' });
    }
  });

  const deleteDeductionMutation = useMutation({
    mutationFn: deleteSystemDeduction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['systemDeductions'] });
      toast({ title: 'Success', description: 'System deduction deleted successfully' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to delete system deduction', variant: 'destructive' });
    }
  });

  const resetAllowanceForm = () => {
    setAllowanceForm({ name: '', default_amount: 0, description: '' });
  };

  const resetDeductionForm = () => {
    setDeductionForm({ name: '', default_amount: 0, description: '' });
  };

  const handleAddAllowance = () => {
    setEditingAllowance(null);
    resetAllowanceForm();
    setAllowanceDialogOpen(true);
  };

  const handleEditAllowance = (allowance: SystemAllowance) => {
    setEditingAllowance(allowance);
    setAllowanceForm({
      name: allowance.name,
      default_amount: allowance.default_amount,
      description: allowance.description || ''
    });
    setAllowanceDialogOpen(true);
  };

  const handleAddDeduction = () => {
    setEditingDeduction(null);
    resetDeductionForm();
    setDeductionDialogOpen(true);
  };

  const handleEditDeduction = (deduction: SystemDeduction) => {
    setEditingDeduction(deduction);
    setDeductionForm({
      name: deduction.name,
      default_amount: deduction.default_amount,
      description: deduction.description || ''
    });
    setDeductionDialogOpen(true);
  };

  const handleSubmitAllowance = () => {
    if (editingAllowance) {
      updateAllowanceMutation.mutate({
        id: editingAllowance.id,
        updates: allowanceForm
      });
    } else {
      addAllowanceMutation.mutate(allowanceForm);
    }
  };

  const handleSubmitDeduction = () => {
    if (editingDeduction) {
      updateDeductionMutation.mutate({
        id: editingDeduction.id,
        updates: deductionForm
      });
    } else {
      addDeductionMutation.mutate(deductionForm);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>System Allowances & Deductions</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="allowances" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="allowances">System Allowances</TabsTrigger>
            <TabsTrigger value="deductions">System Deductions</TabsTrigger>
          </TabsList>

          <TabsContent value="allowances" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">System Allowances</h3>
              <Dialog open={allowanceDialogOpen} onOpenChange={setAllowanceDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={handleAddAllowance}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Allowance
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingAllowance ? 'Edit' : 'Add'} System Allowance
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="allowance-name">Name</Label>
                      <Input
                        id="allowance-name"
                        value={allowanceForm.name}
                        onChange={(e) => setAllowanceForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Allowance name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="allowance-amount">Default Amount</Label>
                      <Input
                        id="allowance-amount"
                        type="number"
                        min="0"
                        step="0.01"
                        value={allowanceForm.default_amount}
                        onChange={(e) => setAllowanceForm(prev => ({ ...prev, default_amount: parseFloat(e.target.value) || 0 }))}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <Label htmlFor="allowance-description">Description</Label>
                      <Textarea
                        id="allowance-description"
                        value={allowanceForm.description}
                        onChange={(e) => setAllowanceForm(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Description (optional)"
                      />
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => setAllowanceDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleSubmitAllowance} disabled={!allowanceForm.name}>
                        {editingAllowance ? 'Update' : 'Add'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Default Amount</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allowancesLoading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center">Loading...</TableCell>
                    </TableRow>
                  ) : allowances.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        No system allowances found
                      </TableCell>
                    </TableRow>
                  ) : (
                    allowances.map((allowance) => (
                      <TableRow key={allowance.id}>
                        <TableCell className="font-medium">{allowance.name}</TableCell>
                        <TableCell>${allowance.default_amount.toFixed(2)}</TableCell>
                        <TableCell>{allowance.description || '-'}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditAllowance(allowance)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete System Allowance</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete "{allowance.name}"? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteAllowanceMutation.mutate(allowance.id)}
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="deductions" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">System Deductions</h3>
              <Dialog open={deductionDialogOpen} onOpenChange={setDeductionDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={handleAddDeduction}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Deduction
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingDeduction ? 'Edit' : 'Add'} System Deduction
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="deduction-name">Name</Label>
                      <Input
                        id="deduction-name"
                        value={deductionForm.name}
                        onChange={(e) => setDeductionForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Deduction name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="deduction-amount">Default Amount</Label>
                      <Input
                        id="deduction-amount"
                        type="number"
                        min="0"
                        step="0.01"
                        value={deductionForm.default_amount}
                        onChange={(e) => setDeductionForm(prev => ({ ...prev, default_amount: parseFloat(e.target.value) || 0 }))}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <Label htmlFor="deduction-description">Description</Label>
                      <Textarea
                        id="deduction-description"
                        value={deductionForm.description}
                        onChange={(e) => setDeductionForm(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Description (optional)"
                      />
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => setDeductionDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleSubmitDeduction} disabled={!deductionForm.name}>
                        {editingDeduction ? 'Update' : 'Add'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Default Amount</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deductionsLoading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center">Loading...</TableCell>
                    </TableRow>
                  ) : deductions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        No system deductions found
                      </TableCell>
                    </TableRow>
                  ) : (
                    deductions.map((deduction) => (
                      <TableRow key={deduction.id}>
                        <TableCell className="font-medium">{deduction.name}</TableCell>
                        <TableCell>${deduction.default_amount.toFixed(2)}</TableCell>
                        <TableCell>{deduction.description || '-'}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditDeduction(deduction)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete System Deduction</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete "{deduction.name}"? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteDeductionMutation.mutate(deduction.id)}
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default SystemAllowanceDeductionManagement;