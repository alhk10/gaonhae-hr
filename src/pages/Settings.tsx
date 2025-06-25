
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
import { 
  getBranches, 
  saveBranches, 
  getSystemAllowances, 
  saveSystemAllowances, 
  getSystemDeductions, 
  saveSystemDeductions,
  Branch,
  SystemAllowance,
  SystemDeduction
} from '@/services/settingsService';

const Settings = () => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [allowances, setAllowances] = useState<SystemAllowance[]>([]);
  const [deductions, setDeductions] = useState<SystemDeduction[]>([]);

  const [isAddBranchOpen, setIsAddBranchOpen] = useState(false);
  const [isEditBranchOpen, setIsEditBranchOpen] = useState(false);
  const [isAddAllowanceOpen, setIsAddAllowanceOpen] = useState(false);
  const [isAddDeductionOpen, setIsAddDeductionOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);

  useEffect(() => {
    setBranches(getBranches());
    setAllowances(getSystemAllowances());
    setDeductions(getSystemDeductions());
  }, []);

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

  const handleAddAllowance = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const newAllowance: SystemAllowance = {
      id: Date.now(),
      name: formData.get('name') as string,
      type: '',
      amount: ''
    };
    const updatedAllowances = [...allowances, newAllowance];
    setAllowances(updatedAllowances);
    saveSystemAllowances(updatedAllowances);
    setIsAddAllowanceOpen(false);
    toast("Allowance added successfully");
  };

  const handleDeleteAllowance = (id: number) => {
    const updatedAllowances = allowances.filter(allowance => allowance.id !== id);
    setAllowances(updatedAllowances);
    saveSystemAllowances(updatedAllowances);
    toast("Allowance deleted successfully");
  };

  const handleAddDeduction = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const newDeduction: SystemDeduction = {
      id: Date.now(),
      name: formData.get('name') as string,
      type: '',
      amount: ''
    };
    const updatedDeductions = [...deductions, newDeduction];
    setDeductions(updatedDeductions);
    saveSystemDeductions(updatedDeductions);
    setIsAddDeductionOpen(false);
    toast("Deduction added successfully");
  };

  const handleDeleteDeduction = (id: number) => {
    const updatedDeductions = deductions.filter(deduction => deduction.id !== id);
    setDeductions(updatedDeductions);
    saveSystemDeductions(updatedDeductions);
    toast("Deduction deleted successfully");
  };

  const openEditBranch = (branch: Branch) => {
    setEditingBranch(branch);
    setIsEditBranchOpen(true);
  };

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
