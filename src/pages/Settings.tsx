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
import { Settings as SettingsIcon, MapPin, Plus, Edit, Trash2, Calendar, Clock, Users2 } from 'lucide-react';
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

  const [leaveTypes, setLeaveTypes] = useState([
    { id: 1, name: 'Annual Leave', days: 14, carryOver: true },
    { id: 2, name: 'Sick Leave', days: 14, carryOver: false },
    { id: 3, name: 'Maternity Leave', days: 84, carryOver: false },
    { id: 4, name: 'Paternity Leave', days: 7, carryOver: false },
    { id: 5, name: 'Compassionate Leave', days: 3, carryOver: false },
  ]);

  const [attendanceRules, setAttendanceRules] = useState([
    { id: 1, name: 'Core Working Hours', startTime: '09:00', endTime: '18:00', flexTime: 60 },
    { id: 2, name: 'Lunch Break', startTime: '12:00', endTime: '13:00', flexTime: 30 },
    { id: 3, name: 'Late Arrival Grace Period', startTime: '09:00', endTime: '09:15', flexTime: 0 },
  ]);

  const [isAddBranchOpen, setIsAddBranchOpen] = useState(false);
  const [isEditBranchOpen, setIsEditBranchOpen] = useState(false);
  const [isAddAllowanceOpen, setIsAddAllowanceOpen] = useState(false);
  const [isAddDeductionOpen, setIsAddDeductionOpen] = useState(false);
  const [isAddLeaveTypeOpen, setIsAddLeaveTypeOpen] = useState(false);
  const [isAddAttendanceRuleOpen, setIsAddAttendanceRuleOpen] = useState(false);
  const [isEditLeaveTypeOpen, setIsEditLeaveTypeOpen] = useState(false);
  const [isEditAttendanceRuleOpen, setIsEditAttendanceRuleOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [editingLeaveType, setEditingLeaveType] = useState(null);
  const [editingAttendanceRule, setEditingAttendanceRule] = useState(null);

  const handleAddBranch = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const newBranch = {
      id: Date.now(),
      name: formData.get('name') as string,
      address: formData.get('address') as string
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
        ? { ...branch, name: formData.get('name') as string, address: formData.get('address') as string }
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
      name: formData.get('name') as string,
      type: formData.get('type') as string,
      amount: formData.get('amount') as string || ''
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
      name: formData.get('name') as string,
      type: formData.get('type') as string,
      amount: formData.get('amount') as string || ''
    };
    setDeductions(prev => [...prev, newDeduction]);
    setIsAddDeductionOpen(false);
    toast("Deduction added successfully");
  };

  const handleAddLeaveType = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const newLeaveType = {
      id: Date.now(),
      name: formData.get('name') as string,
      days: parseInt(formData.get('days') as string),
      carryOver: formData.get('carryOver') === 'true'
    };
    setLeaveTypes(prev => [...prev, newLeaveType]);
    setIsAddLeaveTypeOpen(false);
    toast("Leave type added successfully");
  };

  const handleEditLeaveType = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    setLeaveTypes(prev => prev.map(type => 
      type.id === editingLeaveType.id 
        ? { 
            ...type, 
            name: formData.get('name') as string,
            days: parseInt(formData.get('days') as string),
            carryOver: formData.get('carryOver') === 'true'
          }
        : type
    ));
    setIsEditLeaveTypeOpen(false);
    setEditingLeaveType(null);
    toast("Leave type updated successfully");
  };

  const handleDeleteLeaveType = (id) => {
    setLeaveTypes(prev => prev.filter(type => type.id !== id));
    toast("Leave type deleted successfully");
  };

  const handleAddAttendanceRule = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const newRule = {
      id: Date.now(),
      name: formData.get('name') as string,
      startTime: formData.get('startTime') as string,
      endTime: formData.get('endTime') as string,
      flexTime: parseInt(formData.get('flexTime') as string) || 0
    };
    setAttendanceRules(prev => [...prev, newRule]);
    setIsAddAttendanceRuleOpen(false);
    toast("Attendance rule added successfully");
  };

  const handleEditAttendanceRule = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    setAttendanceRules(prev => prev.map(rule => 
      rule.id === editingAttendanceRule.id 
        ? { 
            ...rule, 
            name: formData.get('name') as string,
            startTime: formData.get('startTime') as string,
            endTime: formData.get('endTime') as string,
            flexTime: parseInt(formData.get('flexTime') as string) || 0
          }
        : rule
    ));
    setIsEditAttendanceRuleOpen(false);
    setEditingAttendanceRule(null);
    toast("Attendance rule updated successfully");
  };

  const handleDeleteAttendanceRule = (id) => {
    setAttendanceRules(prev => prev.filter(rule => rule.id !== id));
    toast("Attendance rule deleted successfully");
  };

  const openEditBranch = (branch) => {
    setEditingBranch(branch);
    setIsEditBranchOpen(true);
  };

  const openEditLeaveType = (leaveType) => {
    setEditingLeaveType(leaveType);
    setIsEditLeaveTypeOpen(true);
  };

  const openEditAttendanceRule = (rule) => {
    setEditingAttendanceRule(rule);
    setIsEditAttendanceRuleOpen(true);
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

            {/* Leave Settings */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center space-x-2">
                      <Calendar className="w-5 h-5" />
                      <span>Leave Settings</span>
                    </CardTitle>
                    <CardDescription>Manage leave types and entitlements</CardDescription>
                  </div>
                  <Dialog open={isAddLeaveTypeOpen} onOpenChange={setIsAddLeaveTypeOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Leave Type
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Add Leave Type</DialogTitle>
                        <DialogDescription>Add a new leave type with entitlement.</DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleAddLeaveType}>
                        <div className="grid gap-4 py-4">
                          <div className="grid gap-2">
                            <Label htmlFor="name">Leave Type Name</Label>
                            <Input name="name" placeholder="e.g., Annual Leave" required />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="days">Annual Entitlement (Days)</Label>
                            <Input name="days" type="number" min="0" placeholder="14" required />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="carryOver">Allow Carry Over</Label>
                            <select name="carryOver" className="w-full p-2 border border-gray-300 rounded-lg" required>
                              <option value="true">Yes</option>
                              <option value="false">No</option>
                            </select>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button type="button" variant="outline" onClick={() => setIsAddLeaveTypeOpen(false)}>
                            Cancel
                          </Button>
                          <Button type="submit">Add Leave Type</Button>
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
                      <TableHead>Leave Type</TableHead>
                      <TableHead>Annual Days</TableHead>
                      <TableHead>Carry Over</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leaveTypes.map((leaveType) => (
                      <TableRow key={leaveType.id}>
                        <TableCell className="font-medium">{leaveType.name}</TableCell>
                        <TableCell>{leaveType.days}</TableCell>
                        <TableCell>{leaveType.carryOver ? 'Yes' : 'No'}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm" onClick={() => openEditLeaveType(leaveType)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleDeleteLeaveType(leaveType.id)}>
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

            {/* Attendance Settings */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center space-x-2">
                      <Clock className="w-5 h-5" />
                      <span>Attendance Settings</span>
                    </CardTitle>
                    <CardDescription>Manage attendance rules and working hours</CardDescription>
                  </div>
                  <Dialog open={isAddAttendanceRuleOpen} onOpenChange={setIsAddAttendanceRuleOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Rule
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Add Attendance Rule</DialogTitle>
                        <DialogDescription>Add a new attendance rule.</DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleAddAttendanceRule}>
                        <div className="grid gap-4 py-4">
                          <div className="grid gap-2">
                            <Label htmlFor="name">Rule Name</Label>
                            <Input name="name" placeholder="e.g., Core Working Hours" required />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="startTime">Start Time</Label>
                            <Input name="startTime" type="time" required />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="endTime">End Time</Label>
                            <Input name="endTime" type="time" required />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="flexTime">Flex Time (minutes)</Label>
                            <Input name="flexTime" type="number" min="0" placeholder="0" />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button type="button" variant="outline" onClick={() => setIsAddAttendanceRuleOpen(false)}>
                            Cancel
                          </Button>
                          <Button type="submit">Add Rule</Button>
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
                      <TableHead>Rule Name</TableHead>
                      <TableHead>Start Time</TableHead>
                      <TableHead>End Time</TableHead>
                      <TableHead>Flex Time</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendanceRules.map((rule) => (
                      <TableRow key={rule.id}>
                        <TableCell className="font-medium">{rule.name}</TableCell>
                        <TableCell>{rule.startTime}</TableCell>
                        <TableCell>{rule.endTime}</TableCell>
                        <TableCell>{rule.flexTime} min</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm" onClick={() => openEditAttendanceRule(rule)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleDeleteAttendanceRule(rule.id)}>
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

            {/* Edit Leave Type Dialog */}
            <Dialog open={isEditLeaveTypeOpen} onOpenChange={setIsEditLeaveTypeOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Edit Leave Type</DialogTitle>
                  <DialogDescription>Update leave type information.</DialogDescription>
                </DialogHeader>
                {editingLeaveType && (
                  <form onSubmit={handleEditLeaveType}>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="name">Leave Type Name</Label>
                        <Input name="name" defaultValue={editingLeaveType.name} required />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="days">Annual Entitlement (Days)</Label>
                        <Input name="days" type="number" min="0" defaultValue={editingLeaveType.days} required />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="carryOver">Allow Carry Over</Label>
                        <select name="carryOver" defaultValue={editingLeaveType.carryOver.toString()} className="w-full p-2 border border-gray-300 rounded-lg" required>
                          <option value="true">Yes</option>
                          <option value="false">No</option>
                        </select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setIsEditLeaveTypeOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit">Save Changes</Button>
                    </DialogFooter>
                  </form>
                )}
              </DialogContent>
            </Dialog>

            {/* Edit Attendance Rule Dialog */}
            <Dialog open={isEditAttendanceRuleOpen} onOpenChange={setIsEditAttendanceRuleOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Edit Attendance Rule</DialogTitle>
                  <DialogDescription>Update attendance rule information.</DialogDescription>
                </DialogHeader>
                {editingAttendanceRule && (
                  <form onSubmit={handleEditAttendanceRule}>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="name">Rule Name</Label>
                        <Input name="name" defaultValue={editingAttendanceRule.name} required />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="startTime">Start Time</Label>
                        <Input name="startTime" type="time" defaultValue={editingAttendanceRule.startTime} required />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="endTime">End Time</Label>
                        <Input name="endTime" type="time" defaultValue={editingAttendanceRule.endTime} required />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="flexTime">Flex Time (minutes)</Label>
                        <Input name="flexTime" type="number" min="0" defaultValue={editingAttendanceRule.flexTime} />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setIsEditAttendanceRuleOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit">Save Changes</Button>
                    </DialogFooter>
                  </form>
                )}
              </DialogContent>
            </Dialog>

            {/* Edit Branch Dialog */}
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
