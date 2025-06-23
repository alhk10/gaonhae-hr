
import React, { useState } from 'react';
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

const Settings = () => {
  const [branches, setBranches] = useState([
    { id: 1, name: 'Headquarters', address: '123 Business District, #12-34, Singapore 068123' },
    { id: 2, name: 'Balmoral', address: '456 Balmoral Road, #05-67, Singapore 259856' },
    { id: 3, name: 'Jurong West', address: '789 Jurong West Central, #08-90, Singapore 640789' },
    { id: 4, name: 'Kembangan', address: '321 Kembangan Road, #03-45, Singapore 419642' },
    { id: 5, name: 'Yishun', address: '654 Yishun Ring Road, #07-12, Singapore 760654' },
    { id: 6, name: 'Bukit Merah', address: '987 Bukit Merah Central, #04-56, Singapore 150987' },
  ]);

  const [allowances, setAllowances] = useState([
    { id: 1, name: 'Transport Allowance', type: 'Fixed', amount: '200' },
    { id: 2, name: 'Meal Allowance', type: 'Fixed', amount: '150' },
    { id: 3, name: 'Performance Bonus', type: 'Percentage', amount: '10' },
  ]);

  const [deductions, setDeductions] = useState([
    { id: 1, name: 'Insurance Premium', type: 'Fixed', amount: '100' },
    { id: 2, name: 'Union Dues', type: 'Percentage', amount: '2' },
  ]);

  const [isAddBranchOpen, setIsAddBranchOpen] = useState(false);
  const [isEditBranchOpen, setIsEditBranchOpen] = useState(false);
  const [isAddAllowanceOpen, setIsAddAllowanceOpen] = useState(false);
  const [isAddDeductionOpen, setIsAddDeductionOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);

  const handleAddBranch = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const newBranch = {
      id: Date.now(),
      name: formData.get('name'),
      address: formData.get('address')
    };
    setBranches(prev => [...prev, newBranch]);
    setIsAddBranchOpen(false);
    toast("Branch added successfully");
  };

  const handleEditBranch = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    setBranches(prev => prev.map(branch => 
      branch.id === editingBranch.id 
        ? { ...branch, name: formData.get('name'), address: formData.get('address') }
        : branch
    ));
    setIsEditBranchOpen(false);
    setEditingBranch(null);
    toast("Branch updated successfully");
  };

  const handleDeleteBranch = (id) => {
    setBranches(prev => prev.filter(branch => branch.id !== id));
    toast("Branch deleted successfully");
  };

  const handleAddAllowance = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const newAllowance = {
      id: Date.now(),
      name: formData.get('name'),
      type: formData.get('type'),
      amount: formData.get('amount') || ''
    };
    setAllowances(prev => [...prev, newAllowance]);
    setIsAddAllowanceOpen(false);
    toast("Allowance added successfully");
  };

  const handleAddDeduction = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const newDeduction = {
      id: Date.now(),
      name: formData.get('name'),
      type: formData.get('type'),
      amount: formData.get('amount') || ''
    };
    setDeductions(prev => [...prev, newDeduction]);
    setIsAddDeductionOpen(false);
    toast("Deduction added successfully");
  };

  const openEditBranch = (branch) => {
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
                            <div className="grid gap-2">
                              <Label htmlFor="type">Type</Label>
                              <select name="type" className="w-full p-2 border border-gray-300 rounded-lg" required>
                                <option value="Fixed">Fixed Amount</option>
                                <option value="Percentage">Percentage</option>
                              </select>
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="amount">Amount (leave blank for manual entry)</Label>
                              <Input name="amount" placeholder="Enter amount or percentage" />
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
                        <TableHead>Type</TableHead>
                        <TableHead>Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allowances.map((allowance) => (
                        <TableRow key={allowance.id}>
                          <TableCell>{allowance.name}</TableCell>
                          <TableCell>{allowance.type}</TableCell>
                          <TableCell>
                            {allowance.amount 
                              ? `${allowance.type === 'Percentage' ? allowance.amount + '%' : 'S$' + allowance.amount}`
                              : 'Manual entry'
                            }
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
                              <Label htmlFor="type">Type</Label>
                              <select name="type" className="w-full p-2 border border-gray-300 rounded-lg" required>
                                <option value="Fixed">Fixed Amount</option>
                                <option value="Percentage">Percentage</option>
                              </select>
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="amount">Amount (leave blank for manual entry)</Label>
                              <Input name="amount" placeholder="Enter amount or percentage" />
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
                        <TableHead>Type</TableHead>
                        <TableHead>Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deductions.map((deduction) => (
                        <TableRow key={deduction.id}>
                          <TableCell>{deduction.name}</TableCell>
                          <TableCell>{deduction.type}</TableCell>
                          <TableCell>
                            {deduction.amount 
                              ? `${deduction.type === 'Percentage' ? deduction.amount + '%' : 'S$' + deduction.amount}`
                              : 'Manual entry'
                            }
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
