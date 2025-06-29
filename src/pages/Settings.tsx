import React, { useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
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
import { 
  getBranches, 
  saveBranches, 
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
  const [branches, setBranches] = useState<Branch[]>([]);
  const [allowances, setAllowances] = useState<SystemAllowance[]>([]);
  const [deductions, setDeductions] = useState<SystemDeduction[]>([]);

  const [isAddBranchOpen, setIsAddBranchOpen] = useState(false);
  const [isEditBranchOpen, setIsEditBranchOpen] = useState(false);
  const [isAddAllowanceOpen, setIsAddAllowanceOpen] = useState(false);
  const [isAddDeductionOpen, setIsAddDeductionOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setBranches(getBranches());
      
      // Load system allowances from Supabase
      const { data: allowancesData, error: allowancesError } = await supabase
        .from('system_allowances')
        .select('*')
        .order('name');

      if (allowancesError) {
        console.error('Error loading system allowances:', allowancesError);
        toast("Error loading allowances");
      } else {
        setAllowances(allowancesData || []);
      }

      // Load system deductions from Supabase
      const { data: deductionsData, error: deductionsError } = await supabase
        .from('system_deductions')
        .select('*')
        .order('name');

      if (deductionsError) {
        console.error('Error loading system deductions:', deductionsError);
        toast("Error loading deductions");
      } else {
        setDeductions(deductionsData || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast("Error loading data");
    } finally {
      setLoading(false);
    }
  };

  const handleAddBranch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const newBranch: Branch = {
      id: Date.now(),
      name: formData.get('name') as string,
      address: formData.get('address') as string
    };
    const updatedBranches = [...branches, newBranch];
    setBranches(updatedBranches);
    saveBranches(updatedBranches);
    setIsAddBranchOpen(false);
    toast("Branch added successfully");
  };

  const handleEditBranch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const updatedBranches = branches.map(branch => 
      branch.id === editingBranch?.id 
        ? { ...branch, name: formData.get('name') as string, address: formData.get('address') as string }
        : branch
    );
    setBranches(updatedBranches);
    saveBranches(updatedBranches);
    setIsEditBranchOpen(false);
    setEditingBranch(null);
    toast("Branch updated successfully");
  };

  const handleDeleteBranch = (id: number) => {
    const updatedBranches = branches.filter(branch => branch.id !== id);
    setBranches(updatedBranches);
    saveBranches(updatedBranches);
    toast("Branch deleted successfully");
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

  const openEditBranch = (branch: Branch) => {
    setEditingBranch(branch);
    setIsEditBranchOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex h-[calc(100vh-73px)]">
          <Sidebar />
          <main className="flex-1 p-6 overflow-auto">
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading settings...</p>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex h-[calc(100vh-73px)]">
        <Sidebar />
        <main className="flex-1 p-6 overflow-auto">
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">System Settings</h2>
              <p className="text-gray-600">Manage system configurations and settings</p>
            </div>

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
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleDeleteAllowance(allowance.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
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
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleDeleteDeduction(deduction.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
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
          </div>
        </main>
      </div>
    </div>
  );
};

export default Settings;
