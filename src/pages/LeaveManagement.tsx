import React, { useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, Users, Plus, Upload, X, Settings } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

const LeaveManagement = () => {
  const [leaves, setLeaves] = useState([
    { id: 1, employee: 'John Tan', type: 'Annual Leave', dates: '2024-12-25 to 2024-12-27', days: 3, status: 'Pending', reason: 'Christmas holiday' },
    { id: 2, employee: 'Mary Ng', type: 'Medical Leave', dates: '2024-12-20', days: 1, status: 'Approved', reason: 'Doctor appointment' },
  ]);

  const [isAddLeaveOpen, setIsAddLeaveOpen] = useState(false);
  const [isBulkLeaveOpen, setIsBulkLeaveOpen] = useState(false);
  const [isLeaveDetailsOpen, setIsLeaveDetailsOpen] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [isLeaveSettingsOpen, setIsLeaveSettingsOpen] = useState(false);
  const [leaveSettings, setLeaveSettings] = useState({
    annualLeaveEntitlement: 14,
    medicalLeaveEntitlement: 14,
    maternityLeave: 16,
    paternityLeave: 2
  });

  const employees = ['John Tan', 'Mary Ng', 'David Lim', 'Sarah Loh'];
  const leaveTypes = ['Annual Leave', 'Medical Leave', 'Emergency Leave', 'Maternity Leave', 'Paternity Leave'];

  const handleApprove = (id) => {
    setLeaves(prev => prev.map(leave => 
      leave.id === id ? { ...leave, status: 'Approved' } : leave
    ));
    toast("Leave application approved");
  };

  const handleReject = (id) => {
    setLeaves(prev => prev.map(leave => 
      leave.id === id ? { ...leave, status: 'Rejected' } : leave
    ));
    toast("Leave application rejected");
  };

  const handleAddLeave = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const newLeave = {
      id: Date.now(),
      employee: formData.get('employee') as string,
      type: formData.get('type') as string,
      dates: `${formData.get('startDate')} to ${formData.get('endDate')}`,
      days: 1,
      status: 'Approved',
      reason: formData.get('reason') as string
    };
    setLeaves(prev => [...prev, newLeave]);
    setIsAddLeaveOpen(false);
    toast("Leave added successfully");
  };

  const handleBulkLeave = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const selectedEmployees = formData.getAll('employees') as string[];
    
    selectedEmployees.forEach(employee => {
      const newLeave = {
        id: Date.now() + Math.random(),
        employee,
        type: formData.get('type') as string,
        dates: `${formData.get('startDate')} to ${formData.get('endDate')}`,
        days: 1,
        status: 'Approved',
        reason: formData.get('reason') as string
      };
      setLeaves(prev => [...prev, newLeave]);
    });
    
    setIsBulkLeaveOpen(false);
    toast(`Bulk leave added for ${selectedEmployees.length} employees`);
  };

  const showLeaveDetails = (leave) => {
    setSelectedLeave(leave);
    setIsLeaveDetailsOpen(true);
  };

  const handleLeaveSettings = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    setLeaveSettings({
      annualLeaveEntitlement: parseInt(formData.get('annual') as string),
      medicalLeaveEntitlement: parseInt(formData.get('medical') as string),
      maternityLeave: parseInt(formData.get('maternity') as string),
      paternityLeave: parseInt(formData.get('paternity') as string)
    });
    setIsLeaveSettingsOpen(false);
    toast("Leave settings updated");
  };

  const getUpcomingLeaves = () => {
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    return leaves.filter(leave => {
      const leaveDate = new Date(leave.dates.split(' to ')[0]);
      return leaveDate >= today && leaveDate <= nextWeek && leave.status === 'Approved';
    });
  };

  const getUnusedAnnualLeave = () => {
    // Mock calculation - in real app would calculate based on employee records
    return 156; // Total unused annual leave days across company
  };

  const getPendingApprovals = () => {
    return leaves.filter(leave => leave.status === 'Pending').length;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex h-[calc(100vh-73px)]">
        <Sidebar />
        <main className="flex-1 p-6 overflow-auto">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Leave Management</h2>
                <p className="text-gray-600">Manage employee leave applications</p>
              </div>
              <div className="flex space-x-2">
                <Dialog open={isLeaveSettingsOpen} onOpenChange={setIsLeaveSettingsOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <Settings className="w-4 h-4 mr-2" />
                      Leave Settings
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Leave Settings</DialogTitle>
                      <DialogDescription>Configure leave entitlements and policies.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleLeaveSettings}>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label htmlFor="annual">Annual Leave Entitlement (days)</Label>
                          <Input name="annual" type="number" defaultValue={leaveSettings.annualLeaveEntitlement} required />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="medical">Medical Leave Entitlement (days)</Label>
                          <Input name="medical" type="number" defaultValue={leaveSettings.medicalLeaveEntitlement} required />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="maternity">Maternity Leave (weeks)</Label>
                          <Input name="maternity" type="number" defaultValue={leaveSettings.maternityLeave} required />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="paternity">Paternity Leave (weeks)</Label>
                          <Input name="paternity" type="number" defaultValue={leaveSettings.paternityLeave} required />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsLeaveSettingsOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit">Save Settings</Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>

                <Dialog open={isAddLeaveOpen} onOpenChange={setIsAddLeaveOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Leave
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Add Leave</DialogTitle>
                      <DialogDescription>Add a new leave application for an employee.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAddLeave}>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label htmlFor="employee">Employee</Label>
                          <Select name="employee" required>
                            <SelectTrigger>
                              <SelectValue placeholder="Select employee" />
                            </SelectTrigger>
                            <SelectContent>
                              {employees.map((employee) => (
                                <SelectItem key={employee} value={employee}>
                                  {employee}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="type">Leave Type</Label>
                          <Select name="type" required>
                            <SelectTrigger>
                              <SelectValue placeholder="Select leave type" />
                            </SelectTrigger>
                            <SelectContent>
                              {leaveTypes.map((type) => (
                                <SelectItem key={type} value={type}>
                                  {type}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="grid gap-2">
                            <Label htmlFor="startDate">Start Date</Label>
                            <Input name="startDate" type="date" required />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="endDate">End Date</Label>
                            <Input name="endDate" type="date" required />
                          </div>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="reason">Reason</Label>
                          <Textarea name="reason" placeholder="Enter reason for leave" required />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="medicalCert">Medical Certificate (if applicable)</Label>
                          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                            <Upload className="mx-auto h-8 w-8 text-gray-400" />
                            <p className="text-sm text-gray-600 mt-2">Upload medical certificate</p>
                            <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" id="medical-cert-upload" />
                            <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => document.getElementById('medical-cert-upload')?.click()}>
                              Choose File
                            </Button>
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsAddLeaveOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit">Add Leave</Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>

                <Dialog open={isBulkLeaveOpen} onOpenChange={setIsBulkLeaveOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <Users className="w-4 h-4 mr-2" />
                      Bulk Leave
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Bulk Leave</DialogTitle>
                      <DialogDescription>Add leave for multiple employees at once.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleBulkLeave}>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label>Select Employees</Label>
                          <div className="space-y-2 max-h-32 overflow-y-auto">
                            {employees.map((employee) => (
                              <label key={employee} className="flex items-center space-x-2">
                                <input type="checkbox" name="employees" value={employee} />
                                <span>{employee}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="type">Leave Type</Label>
                          <Select name="type" required>
                            <SelectTrigger>
                              <SelectValue placeholder="Select leave type" />
                            </SelectTrigger>
                            <SelectContent>
                              {leaveTypes.map((type) => (
                                <SelectItem key={type} value={type}>
                                  {type}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="grid gap-2">
                            <Label htmlFor="startDate">Start Date</Label>
                            <Input name="startDate" type="date" required />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="endDate">End Date</Label>
                            <Input name="endDate" type="date" required />
                          </div>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="reason">Reason</Label>
                          <Textarea name="reason" placeholder="Enter reason for leave" required />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsBulkLeaveOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit">Add Bulk Leave</Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Leave Summary</CardTitle>
                <CardDescription>Overview of company leave statistics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Upcoming Leaves</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">{getUpcomingLeaves().length}</p>
                      <p className="text-sm text-gray-600">Next 7 days</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>Unused Annual Leave</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">{getUnusedAnnualLeave()}</p>
                      <p className="text-sm text-gray-600">Days remaining this year</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>Pending Approvals</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">{getPendingApprovals()}</p>
                      <p className="text-sm text-gray-600">Awaiting review</p>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="w-5 h-5" />
                  <span>Leave Applications</span>
                </CardTitle>
                <CardDescription>Review and manage leave requests</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Dates</TableHead>
                      <TableHead>Days</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leaves.map((leave) => (
                      <TableRow key={leave.id}>
                        <TableCell className="font-medium">{leave.employee}</TableCell>
                        <TableCell>{leave.type}</TableCell>
                        <TableCell>{leave.dates}</TableCell>
                        <TableCell>{leave.days}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              leave.status === 'Approved' ? 'default' : 
                              leave.status === 'Pending' ? 'secondary' : 
                              'destructive'
                            }
                          >
                            {leave.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm" onClick={() => showLeaveDetails(leave)}>
                              View
                            </Button>
                            {leave.status === 'Pending' && (
                              <>
                                <Button variant="outline" size="sm" onClick={() => handleApprove(leave.id)}>
                                  Approve
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => handleReject(leave.id)}>
                                  Reject
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Dialog open={isLeaveDetailsOpen} onOpenChange={setIsLeaveDetailsOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Leave Details</DialogTitle>
                </DialogHeader>
                {selectedLeave && (
                  <div className="space-y-4">
                    <div>
                      <Label>Employee</Label>
                      <p>{selectedLeave.employee}</p>
                    </div>
                    <div>
                      <Label>Leave Type</Label>
                      <p>{selectedLeave.type}</p>
                    </div>
                    <div>
                      <Label>Dates</Label>
                      <p>{selectedLeave.dates}</p>
                    </div>
                    <div>
                      <Label>Reason</Label>
                      <p>{selectedLeave.reason}</p>
                    </div>
                    <div>
                      <Label>Status</Label>
                      <Badge variant={selectedLeave.status === 'Approved' ? 'default' : selectedLeave.status === 'Pending' ? 'secondary' : 'destructive'}>
                        {selectedLeave.status}
                      </Badge>
                    </div>
                  </div>
                )}
                <DialogFooter>
                  <Button onClick={() => setIsLeaveDetailsOpen(false)}>Close</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </main>
      </div>
    </div>
  );
};

export default LeaveManagement;
