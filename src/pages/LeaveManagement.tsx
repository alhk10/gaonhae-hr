
import React, { useState, useEffect } from 'react';
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
import { Calendar, Users, Plus } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { getAllEmployees } from '@/data/employeeData';
import { getAllLeaveRecords, addLeaveRecord, updateLeaveStatus, LeaveRecord } from '@/data/leaveData';

const LeaveManagement = () => {
  const [leaves, setLeaves] = useState<LeaveRecord[]>([]);
  const [isAddLeaveOpen, setIsAddLeaveOpen] = useState(false);
  const [isBulkLeaveOpen, setIsBulkLeaveOpen] = useState(false);
  const [isLeaveDetailsOpen, setIsLeaveDetailsOpen] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<LeaveRecord | null>(null);

  const employees = getAllEmployees();
  const leaveTypes = ['Annual Leave', 'Medical Leave', 'Emergency Leave', 'Maternity Leave', 'Paternity Leave'];

  useEffect(() => {
    setLeaves(getAllLeaveRecords());
  }, []);

  const handleApprove = (id: string) => {
    const success = updateLeaveStatus(id, 'Approved', 'Current User'); // In real app, get from auth context
    if (success) {
      setLeaves(getAllLeaveRecords()); // Refresh data
      toast("Leave application approved");
    }
  };

  const handleReject = (id: string) => {
    const success = updateLeaveStatus(id, 'Rejected');
    if (success) {
      setLeaves(getAllLeaveRecords()); // Refresh data
      toast("Leave application rejected");
    }
  };

  const handleAddLeave = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    
    const employeeId = formData.get('employee') as string;
    const employee = employees.find(emp => emp.id === employeeId);
    if (!employee) return;

    const startDate = formData.get('startDate') as string;
    const endDate = formData.get('endDate') as string;
    const daysDiff = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 3600 * 24)) + 1;

    const newLeave: Omit<LeaveRecord, 'id'> = {
      employeeId: employee.id,
      employeeName: employee.name,
      type: formData.get('type') as any,
      startDate,
      endDate,
      days: daysDiff,
      status: 'Approved',
      reason: formData.get('reason') as string,
      appliedOn: new Date().toISOString().split('T')[0],
      approvedBy: 'Admin',
      approvedOn: new Date().toISOString().split('T')[0]
    };

    addLeaveRecord(newLeave);
    setLeaves(getAllLeaveRecords()); // Refresh data
    setIsAddLeaveOpen(false);
    toast("Leave added successfully");
  };

  const handleBulkLeave = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const selectedEmployees = formData.getAll('employees') as string[];
    
    const startDate = formData.get('startDate') as string;
    const endDate = formData.get('endDate') as string;
    const daysDiff = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 3600 * 24)) + 1;
    
    selectedEmployees.forEach(employeeId => {
      const employee = employees.find(emp => emp.id === employeeId);
      if (!employee) return;

      const newLeave: Omit<LeaveRecord, 'id'> = {
        employeeId: employee.id,
        employeeName: employee.name,
        type: formData.get('type') as any,
        startDate,
        endDate,
        days: daysDiff,
        status: 'Approved',
        reason: formData.get('reason') as string,
        appliedOn: new Date().toISOString().split('T')[0],
        approvedBy: 'Admin',
        approvedOn: new Date().toISOString().split('T')[0]
      };
      
      addLeaveRecord(newLeave);
    });
    
    setLeaves(getAllLeaveRecords()); // Refresh data
    setIsBulkLeaveOpen(false);
    toast(`Bulk leave added for ${selectedEmployees.length} employees`);
  };

  const showLeaveDetails = (leave: LeaveRecord) => {
    setSelectedLeave(leave);
    setIsLeaveDetailsOpen(true);
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
                                <SelectItem key={employee.id} value={employee.id}>
                                  {employee.name} ({employee.id})
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
                              <label key={employee.id} className="flex items-center space-x-2">
                                <input type="checkbox" name="employees" value={employee.id} />
                                <span>{employee.name} ({employee.id})</span>
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
                        <TableCell className="font-medium">{leave.employeeName}</TableCell>
                        <TableCell>{leave.type}</TableCell>
                        <TableCell>
                          {leave.startDate === leave.endDate 
                            ? leave.startDate 
                            : `${leave.startDate} to ${leave.endDate}`
                          }
                        </TableCell>
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
                      <p>{selectedLeave.employeeName} ({selectedLeave.employeeId})</p>
                    </div>
                    <div>
                      <Label>Leave Type</Label>
                      <p>{selectedLeave.type}</p>
                    </div>
                    <div>
                      <Label>Dates</Label>
                      <p>
                        {selectedLeave.startDate === selectedLeave.endDate 
                          ? selectedLeave.startDate 
                          : `${selectedLeave.startDate} to ${selectedLeave.endDate}`
                        }
                      </p>
                    </div>
                    <div>
                      <Label>Days</Label>
                      <p>{selectedLeave.days}</p>
                    </div>
                    <div>
                      <Label>Reason</Label>
                      <p>{selectedLeave.reason}</p>
                    </div>
                    <div>
                      <Label>Applied On</Label>
                      <p>{selectedLeave.appliedOn}</p>
                    </div>
                    <div>
                      <Label>Status</Label>
                      <Badge variant={selectedLeave.status === 'Approved' ? 'default' : selectedLeave.status === 'Pending' ? 'secondary' : 'destructive'}>
                        {selectedLeave.status}
                      </Badge>
                    </div>
                    {selectedLeave.approvedBy && (
                      <div>
                        <Label>Approved By</Label>
                        <p>{selectedLeave.approvedBy} on {selectedLeave.approvedOn}</p>
                      </div>
                    )}
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
