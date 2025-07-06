import React, { useState, useEffect } from 'react';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Settings as SettingsIcon, MapPin, Plus, Edit, Trash2 } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import SuperadminManager from '@/components/admin/SuperadminManager';
import { 
  getBranches, 
  saveBranch,
  updateBranch,
  deleteBranch,
  Branch
} from '@/services/settingsService';

interface SystemAllowance {
  id: number;
  name: string;
  description?: string;
  default_amount?: number;
}

interface SystemDeduction {
  id: number;
  name: string;
  description?: string;
  default_amount?: number;
}

const Settings = () => {
  const { user } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [allowances, setAllowances] = useState<SystemAllowance[]>([]);
  const [deductions, setDeductions] = useState<SystemDeduction[]>([]);

  const [isAddBranchOpen, setIsAddBranchOpen] = useState(false);
  const [isEditBranchOpen, setIsEditBranchOpen] = useState(false);
  const [isAddAllowanceOpen, setIsAddAllowanceOpen] = useState(false);
  const [isEditAllowanceOpen, setIsEditAllowanceOpen] = useState(false);
  const [isAddDeductionOpen, setIsAddDeductionOpen] = useState(false);
  const [isEditDeductionOpen, setIsEditDeductionOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [editingAllowance, setEditingAllowance] = useState<SystemAllowance | null>(null);
  const [editingDeduction, setEditingDeduction] = useState<SystemDeduction | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      console.log('Settings: Loading all data from Supabase...');
      
      // Load branches from the new service
      const branchData = await getBranches();
      setBranches(branchData);
      
      // Load system allowances from Supabase
      const { data: allowancesData, error: allowancesError } = await supabase
        .from('system_allowances')
        .select('*')
        .order('name');

      if (allowancesError) {
        console.error('Error loading system allowances:', allowancesError);
        toast.error("Error loading allowances");
      } else {
        setAllowances(allowancesData || []);
        console.log('Settings: Loaded allowances:', allowancesData?.length);
      }

      // Load system deductions from Supabase
      const { data: deductionsData, error: deductionsError } = await supabase
        .from('system_deductions')
        .select('*')
        .order('name');

      if (deductionsError) {
        console.error('Error loading system deductions:', deductionsError);
        toast.error("Error loading deductions");
      } else {
        setDeductions(deductionsData || []);
        console.log('Settings: Loaded deductions:', deductionsData?.length);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error("Error loading data");
    } finally {
      setLoading(false);
    }
  };

  const handleAddBranch = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    
    try {
      const newBranchData = {
        name: formData.get('name') as string,
        address: formData.get('address') as string,
        color: 'bg-blue-500',
        total_slots: 10
      };

      const branchId = await saveBranch(newBranchData);
      
      // Refresh the branches list
      const updatedBranches = await getBranches();
      setBranches(updatedBranches);
      
      setIsAddBranchOpen(false);
      toast.success("Branch added successfully");
    } catch (error) {
      console.error('Error adding branch:', error);
      toast.error("Error adding branch");
    }
  };

  const handleEditBranch = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingBranch) return;

    const formData = new FormData(e.target as HTMLFormElement);
    
    try {
      const updatedBranch: Branch = {
        ...editingBranch,
        name: formData.get('name') as string,
        address: formData.get('address') as string
      };

      await updateBranch(updatedBranch);
      
      // Refresh the branches list
      const updatedBranches = await getBranches();
      setBranches(updatedBranches);
      
      setIsEditBranchOpen(false);
      setEditingBranch(null);
      toast.success("Branch updated successfully");
    } catch (error) {
      console.error('Error updating branch:', error);
      toast.error("Error updating branch");
    }
  };

  const handleDeleteBranch = async (branchId: string) => {
    try {
      await deleteBranch(branchId);
      
      // Refresh the branches list
      const updatedBranches = await getBranches();
      setBranches(updatedBranches);
      
      toast.success("Branch deleted successfully");
    } catch (error) {
      console.error('Error deleting branch:', error);
      toast.error("Error deleting branch");
    }
  };

  const openEditBranch = (branch: Branch) => {
    setEditingBranch(branch);
    setIsEditBranchOpen(true);
  };

  const handleAddAllowance = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    
    try {
      const { data, error } = await supabase
        .from('system_allowances')
        .insert([{
          name: formData.get('name') as string,
          description: formData.get('description') as string || null,
          default_amount: 0
        }])
        .select()
        .single();

      if (error) {
        console.error('Error adding allowance:', error);
        toast("Error adding allowance");
        return;
      }

      setAllowances(prev => [...prev, data]);
      setIsAddAllowanceOpen(false);
      toast("Allowance added successfully");
    } catch (error) {
      console.error('Error adding allowance:', error);
      toast("Error adding allowance");
    }
  };

  const handleEditAllowance = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingAllowance) return;

    const formData = new FormData(e.target as HTMLFormElement);
    
    try {
      const { data, error } = await supabase
        .from('system_allowances')
        .update({
          name: formData.get('name') as string,
          description: formData.get('description') as string || null
        })
        .eq('id', editingAllowance.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating allowance:', error);
        toast("Error updating allowance");
        return;
      }

      setAllowances(prev => prev.map(allowance => 
        allowance.id === editingAllowance.id ? data : allowance
      ));
      setIsEditAllowanceOpen(false);
      setEditingAllowance(null);
      toast("Allowance updated successfully");
    } catch (error) {
      console.error('Error updating allowance:', error);
      toast("Error updating allowance");
    }
  };

  const handleDeleteAllowance = async (id: number) => {
    try {
      const { error } = await supabase
        .from('system_allowances')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting allowance:', error);
        toast("Error deleting allowance");
        return;
      }

      setAllowances(prev => prev.filter(allowance => allowance.id !== id));
      toast("Allowance deleted successfully");
    } catch (error) {
      console.error('Error deleting allowance:', error);
      toast("Error deleting allowance");
    }
  };

  const openEditAllowance = (allowance: SystemAllowance) => {
    setEditingAllowance(allowance);
    setIsEditAllowanceOpen(true);
  };

  const handleAddDeduction = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    
    try {
      const { data, error } = await supabase
        .from('system_deductions')
        .insert([{
          name: formData.get('name') as string,
          description: formData.get('description') as string || null,
          default_amount: 0
        }])
        .select()
        .single();

      if (error) {
        console.error('Error adding deduction:', error);
        toast("Error adding deduction");
        return;
      }

      setDeductions(prev => [...prev, data]);
      setIsAddDeductionOpen(false);
      toast("Deduction added successfully");
    } catch (error) {
      console.error('Error adding deduction:', error);
      toast("Error adding deduction");
    }
  };

  const handleEditDeduction = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingDeduction) return;

    const formData = new FormData(e.target as HTMLFormElement);
    
    try {
      const { data, error } = await supabase
        .from('system_deductions')
        .update({
          name: formData.get('name') as string,
          description: formData.get('description') as string || null
        })
        .eq('id', editingDeduction.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating deduction:', error);
        toast("Error updating deduction");
        return;
      }

      setDeductions(prev => prev.map(deduction => 
        deduction.id === editingDeduction.id ? data : deduction
      ));
      setIsEditDeductionOpen(false);
      setEditingDeduction(null);
      toast("Deduction updated successfully");
    } catch (error) {
      console.error('Error updating deduction:', error);
      toast("Error updating deduction");
    }
  };

  const handleDeleteDeduction = async (id: number) => {
    try {
      const { error } = await supabase
        .from('system_deductions')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting deduction:', error);
        toast("Error deleting deduction");
        return;
      }

      setDeductions(prev => prev.filter(deduction => deduction.id !== id));
      toast("Deduction deleted successfully");
    } catch (error) {
      console.error('Error deleting deduction:', error);
      toast("Error deleting deduction");
    }
  };

  const openEditDeduction = (deduction: SystemDeduction) => {
    setEditingDeduction(deduction);
    setIsEditDeductionOpen(true);
  };

  if (loading) {
    return (
      <ResponsiveLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading settings...</p>
          </div>
        </div>
      </ResponsiveLayout>
    );
  }

  return (
    <ResponsiveLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">System Settings</h2>
          <p className="text-gray-600">Manage system configurations and settings</p>
        </div>

        {user?.role === 'superadmin' && (
          <SuperadminManager />
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center space-x-2">
                  <MapPin className="w-5 h-5" />
                  <span>Branch Management</span>
                </CardTitle>
                <CardDescription>Add, edit, or remove company branches</CardDescription>
              </div>
              <Dialog open={isAddBranchOpen} onOpenChange={setIsAddBranchOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Branch
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Add New Branch</DialogTitle>
                    <DialogDescription>Add a new branch location.</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleAddBranch}>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="name">Branch Name</Label>
                        <Input name="name" placeholder="Enter branch name" required />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="address">Address</Label>
                        <Textarea name="address" placeholder="Enter branch address" required />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setIsAddBranchOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit">Add Branch</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Branch Name</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {branches.map((branch) => (
                  <TableRow key={branch.id}>
                    <TableCell className="font-medium">{branch.name}</TableCell>
                    <TableCell>{branch.address}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm" onClick={() => openEditBranch(branch)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDeleteBranch(branch.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Allowances</CardTitle>
                  <CardDescription>Manage system allowances</CardDescription>
                </div>
                <Dialog open={isAddAllowanceOpen} onOpenChange={setIsAddAllowanceOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Add
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Add Allowance</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAddAllowance}>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label htmlFor="name">Name</Label>
                          <Input name="name" required />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="description">Description (Optional)</Label>
                          <Input name="description" />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsAddAllowanceOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit">Add</Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allowances.map((allowance) => (
                    <TableRow key={allowance.id}>
                      <TableCell>{allowance.name}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => openEditAllowance(allowance)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleDeleteAllowance(allowance.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Deductions</CardTitle>
                  <CardDescription>Manage system deductions</CardDescription>
                </div>
                <Dialog open={isAddDeductionOpen} onOpenChange={setIsAddDeductionOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Add
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Add Deduction</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAddDeduction}>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label htmlFor="name">Name</Label>
                          <Input name="name" required />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="description">Description (Optional)</Label>
                          <Input name="description" />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsAddDeductionOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit">Add</Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deductions.map((deduction) => (
                    <TableRow key={deduction.id}>
                      <TableCell>{deduction.name}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => openEditDeduction(deduction)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleDeleteDeduction(deduction.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <Dialog open={isEditBranchOpen} onOpenChange={setIsEditBranchOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Branch</DialogTitle>
              <DialogDescription>Update branch information.</DialogDescription>
            </DialogHeader>
            {editingBranch && (
              <form onSubmit={handleEditBranch}>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Branch Name</Label>
                    <Input name="name" defaultValue={editingBranch.name} required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="address">Address</Label>
                    <Textarea name="address" defaultValue={editingBranch.address} required />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsEditBranchOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Save Changes</Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={isEditAllowanceOpen} onOpenChange={setIsEditAllowanceOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Allowance</DialogTitle>
              <DialogDescription>Update allowance information.</DialogDescription>
            </DialogHeader>
            {editingAllowance && (
              <form onSubmit={handleEditAllowance}>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Name</Label>
                    <Input name="name" defaultValue={editingAllowance.name} required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Input name="description" defaultValue={editingAllowance.description || ''} />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsEditAllowanceOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Save Changes</Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={isEditDeductionOpen} onOpenChange={setIsEditDeductionOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Deduction</DialogTitle>
              <DialogDescription>Update deduction information.</DialogDescription>
            </DialogHeader>
            {editingDeduction && (
              <form onSubmit={handleEditDeduction}>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Name</Label>
                    <Input name="name" defaultValue={editingDeduction.name} required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Input name="description" defaultValue={editingDeduction.description || ''} />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsEditDeductionOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Save Changes</Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </ResponsiveLayout>
  );
};

export default Settings;
