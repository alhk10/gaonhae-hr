
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getAllEmployees, employeeDatabase, getEmployeeById } from '@/data/employeeData';
import { systemAllowances, systemDeductions } from '@/data/employeeData';
import { EmployeeProfile, AllowanceDeduction } from '@/types/employee';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { toast } from 'sonner';
import AdminAccessManager from '@/components/employee/AdminAccessManager';
import { Plus, Edit, Trash2, FileText, Calendar, DollarSign, Clock, CalendarClock } from 'lucide-react';

const EmployeeDetails = () => {
  const { id } = useParams<{ id: string }>();
  const [employee, setEmployee] = useState<EmployeeProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isAllowanceDialogOpen, setIsAllowanceDialogOpen] = useState(false);
  const [isDeductionDialogOpen, setIsDeductionDialogOpen] = useState(false);
  const [editingAllowance, setEditingAllowance] = useState<AllowanceDeduction | null>(null);
  const [editingDeduction, setEditingDeduction] = useState<AllowanceDeduction | null>(null);

  useEffect(() => {
    if (id) {
      const emp = getEmployeeById(id);
      if (emp) {
        setEmployee(emp);
      } else {
        toast.error('Employee not found');
      }
    }
  }, [id]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEmployee(prev => ({ ...prev, [name]: value }));
  };

  const handleAddAllowance = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const selectedSystemAllowance = systemAllowances.find(a => a.id === parseInt(formData.get('systemAllowance') as string));
    
    const newAllowance: AllowanceDeduction = {
      id: Date.now(),
      name: selectedSystemAllowance ? selectedSystemAllowance.name : formData.get('customName') as string,
      amount: parseFloat(formData.get('amount') as string) || (selectedSystemAllowance ? selectedSystemAllowance.amount : 0),
      type: (formData.get('type') as 'Fixed' | 'Percentage' | 'Manual') || 'Fixed'
    };

    setEmployee(prev => ({
      ...prev,
      allowances: [...(prev?.allowances || []), newAllowance]
    }));
    setIsAllowanceDialogOpen(false);
    toast.success('Allowance added successfully');
  };

  const handleAddDeduction = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const selectedSystemDeduction = systemDeductions.find(d => d.id === parseInt(formData.get('systemDeduction') as string));
    
    const newDeduction: AllowanceDeduction = {
      id: Date.now(),
      name: selectedSystemDeduction ? selectedSystemDeduction.name : formData.get('customName') as string,
      amount: parseFloat(formData.get('amount') as string) || (selectedSystemDeduction ? selectedSystemDeduction.amount : 0),
      type: (formData.get('type') as 'Fixed' | 'Percentage' | 'Manual') || 'Fixed'
    };

    setEmployee(prev => ({
      ...prev,
      deductions: [...(prev?.deductions || []), newDeduction]
    }));
    setIsDeductionDialogOpen(false);
    toast.success('Deduction added successfully');
  };

  const handleEditAllowance = (allowance: AllowanceDeduction) => {
    setEditingAllowance(allowance);
    setIsAllowanceDialogOpen(true);
  };

  const handleEditDeduction = (deduction: AllowanceDeduction) => {
    setEditingDeduction(deduction);
    setIsDeductionDialogOpen(true);
  };

  const handleUpdateAllowance = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    
    const updatedAllowance: AllowanceDeduction = {
      ...editingAllowance!,
      name: formData.get('customName') as string,
      amount: parseFloat(formData.get('amount') as string),
      type: formData.get('type') as 'Fixed' | 'Percentage' | 'Manual'
    };

    setEmployee(prev => ({
      ...prev,
      allowances: prev?.allowances.map(a => a.id === editingAllowance!.id ? updatedAllowance : a) || []
    }));
    setEditingAllowance(null);
    setIsAllowanceDialogOpen(false);
    toast.success('Allowance updated successfully');
  };

  const handleUpdateDeduction = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    
    const updatedDeduction: AllowanceDeduction = {
      ...editingDeduction!,
      name: formData.get('customName') as string,
      amount: parseFloat(formData.get('amount') as string),
      type: formData.get('type') as 'Fixed' | 'Percentage' | 'Manual'
    };

    setEmployee(prev => ({
      ...prev,
      deductions: prev?.deductions.map(d => d.id === editingDeduction!.id ? updatedDeduction : d) || []
    }));
    setEditingDeduction(null);
    setIsDeductionDialogOpen(false);
    toast.success('Deduction updated successfully');
  };

  const handleRemoveAllowance = (id: number) => {
    setEmployee(prev => ({
      ...prev,
      allowances: prev?.allowances.filter(a => a.id !== id) || []
    }));
    toast.success('Allowance removed successfully');
  };

  const handleRemoveDeduction = (id: number) => {
    setEmployee(prev => ({
      ...prev,
      deductions: prev?.deductions.filter(d => d.id !== id) || []
    }));
    toast.success('Deduction removed successfully');
  };

  const handleSave = () => {
    if (employee) {
      employeeDatabase[employee.id] = { ...employee };
      setIsEditing(false);
      toast.success('Employee details updated successfully');
    }
  };

  if (!employee) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex h-[calc(100vh-73px)]">
        <Sidebar />
        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Employee Details</h1>
                <p className="text-gray-600">Manage employee information and settings</p>
              </div>
              <div className="flex gap-2">
                {isEditing ? (
                  <>
                    <Button variant="outline" onClick={() => setIsEditing(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleSave}>
                      Save Changes
                    </Button>
                  </>
                ) : (
                  <Button onClick={() => setIsEditing(true)}>
                    Edit Employee
                  </Button>
                )}
              </div>
            </div>

            {/* Employee Records Quick Access */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Employee Records</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <Button variant="outline" className="flex flex-col items-center p-4 h-auto">
                    <Calendar className="w-6 h-6 mb-2" />
                    <span className="text-sm">Leave Records</span>
                  </Button>
                  <Button variant="outline" className="flex flex-col items-center p-4 h-auto">
                    <FileText className="w-6 h-6 mb-2" />
                    <span className="text-sm">Claims</span>
                  </Button>
                  <Button variant="outline" className="flex flex-col items-center p-4 h-auto">
                    <DollarSign className="w-6 h-6 mb-2" />
                    <span className="text-sm">Payslips</span>
                  </Button>
                  <Button variant="outline" className="flex flex-col items-center p-4 h-auto">
                    <Clock className="w-6 h-6 mb-2" />
                    <span className="text-sm">Attendance</span>
                  </Button>
                  <Button variant="outline" className="flex flex-col items-center p-4 h-auto">
                    <CalendarClock className="w-6 h-6 mb-2" />
                    <span className="text-sm">Slot Booking</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Basic Information Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      type="text"
                      id="name"
                      name="name"
                      value={employee.name}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nric">NRIC</Label>
                    <Input
                      type="text"
                      id="nric"
                      name="nric"
                      value={employee.nric}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dateOfBirth">Date of Birth</Label>
                    <Input
                      type="date"
                      id="dateOfBirth"
                      name="dateOfBirth"
                      value={employee.dateOfBirth}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="residencyStatus">Residency Status</Label>
                    <Input
                      type="text"
                      id="residencyStatus"
                      name="residencyStatus"
                      value={employee.residencyStatus}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Employment Details Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Employment Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="type">Type</Label>
                    <Select disabled={!isEditing} value={employee.type} onValueChange={(value) => setEmployee({ ...employee, type: value as 'Full-Time' | 'Casual' })}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Full-Time">Full-Time</SelectItem>
                        <SelectItem value="Casual">Casual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="department">Department</Label>
                    <Input
                      type="text"
                      id="department"
                      name="department"
                      value={employee.department || ''}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="position">Position</Label>
                    <Input
                      type="text"
                      id="position"
                      name="position"
                      value={employee.position || ''}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Payment Information Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Payment Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="baseSalary">Base Salary</Label>
                    <Input
                      type="number"
                      id="baseSalary"
                      name="baseSalary"
                      value={employee.baseSalary || ''}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="paymentType">Payment Type</Label>
                    <Select disabled={!isEditing} value={employee.paymentType} onValueChange={(value) => setEmployee({ ...employee, paymentType: value as 'Monthly' | 'Hourly' | 'Daily' })}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select payment type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Monthly">Monthly</SelectItem>
                        <SelectItem value="Hourly">Hourly</SelectItem>
                        <SelectItem value="Daily">Daily</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bankAccount">Bank Account</Label>
                    <Input
                      type="text"
                      id="bankAccount"
                      name="bankAccount"
                      value={employee.bankAccount}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bankName">Bank Name</Label>
                    <Input
                      type="text"
                      id="bankName"
                      name="bankName"
                      value={employee.bankName}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Contact Information Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      type="text"
                      id="phone"
                      name="phone"
                      value={employee.phone || ''}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      type="text"
                      id="address"
                      name="address"
                      value={employee.address || ''}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      type="email"
                      id="email"
                      name="email"
                      value={employee.email || ''}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Allowances Card */}
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Allowances</CardTitle>
                    <Dialog open={isAllowanceDialogOpen} onOpenChange={setIsAllowanceDialogOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm" onClick={() => { setEditingAllowance(null); }}>
                          <Plus className="w-4 h-4 mr-2" />
                          Add Allowance
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>{editingAllowance ? 'Edit Allowance' : 'Add Allowance'}</DialogTitle>
                          <DialogDescription>
                            {editingAllowance ? 'Update allowance details' : 'Add a new allowance from system templates or create custom'}
                          </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={editingAllowance ? handleUpdateAllowance : handleAddAllowance}>
                          <div className="grid gap-4 py-4">
                            {!editingAllowance && (
                              <div className="space-y-2">
                                <Label htmlFor="systemAllowance">System Allowance</Label>
                                <Select name="systemAllowance">
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select system allowance (optional)" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {systemAllowances.map((allowance) => (
                                      <SelectItem key={allowance.id} value={allowance.id.toString()}>
                                        {allowance.name} - S${allowance.amount}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                            <div className="space-y-2">
                              <Label htmlFor="customName">Name</Label>
                              <Input
                                name="customName"
                                defaultValue={editingAllowance?.name || ''}
                                placeholder="Enter allowance name"
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="amount">Amount</Label>
                              <Input
                                name="amount"
                                type="number"
                                step="0.01"
                                defaultValue={editingAllowance?.amount || ''}
                                placeholder="Enter amount"
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="type">Type</Label>
                              <Select name="type" defaultValue={editingAllowance?.type || 'Fixed'}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Fixed">Fixed</SelectItem>
                                  <SelectItem value="Percentage">Percentage</SelectItem>
                                  <SelectItem value="Manual">Manual</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsAllowanceDialogOpen(false)}>
                              Cancel
                            </Button>
                            <Button type="submit">
                              {editingAllowance ? 'Update' : 'Add'} Allowance
                            </Button>
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
                        <TableHead>Amount</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {employee.allowances.map((allowance) => (
                        <TableRow key={allowance.id}>
                          <TableCell>{allowance.name}</TableCell>
                          <TableCell>S${allowance.amount}</TableCell>
                          <TableCell>{allowance.type}</TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditAllowance(allowance)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRemoveAllowance(allowance.id)}
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

              {/* Deductions Card */}
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Deductions</CardTitle>
                    <Dialog open={isDeductionDialogOpen} onOpenChange={setIsDeductionDialogOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm" onClick={() => { setEditingDeduction(null); }}>
                          <Plus className="w-4 h-4 mr-2" />
                          Add Deduction
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>{editingDeduction ? 'Edit Deduction' : 'Add Deduction'}</DialogTitle>
                          <DialogDescription>
                            {editingDeduction ? 'Update deduction details' : 'Add a new deduction from system templates or create custom'}
                          </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={editingDeduction ? handleUpdateDeduction : handleAddDeduction}>
                          <div className="grid gap-4 py-4">
                            {!editingDeduction && (
                              <div className="space-y-2">
                                <Label htmlFor="systemDeduction">System Deduction</Label>
                                <Select name="systemDeduction">
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select system deduction (optional)" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {systemDeductions.map((deduction) => (
                                      <SelectItem key={deduction.id} value={deduction.id.toString()}>
                                        {deduction.name} - S${deduction.amount}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                            <div className="space-y-2">
                              <Label htmlFor="customName">Name</Label>
                              <Input
                                name="customName"
                                defaultValue={editingDeduction?.name || ''}
                                placeholder="Enter deduction name"
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="amount">Amount</Label>
                              <Input
                                name="amount"
                                type="number"
                                step="0.01"
                                defaultValue={editingDeduction?.amount || ''}
                                placeholder="Enter amount"
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="type">Type</Label>
                              <Select name="type" defaultValue={editingDeduction?.type || 'Fixed'}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Fixed">Fixed</SelectItem>
                                  <SelectItem value="Percentage">Percentage</SelectItem>
                                  <SelectItem value="Manual">Manual</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsDeductionDialogOpen(false)}>
                              Cancel
                            </Button>
                            <Button type="submit">
                              {editingDeduction ? 'Update' : 'Add'} Deduction
                            </Button>
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
                        <TableHead>Amount</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {employee.deductions.map((deduction) => (
                        <TableRow key={deduction.id}>
                          <TableCell>{deduction.name}</TableCell>
                          <TableCell>S${deduction.amount}</TableCell>
                          <TableCell>{deduction.type}</TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditDeduction(deduction)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRemoveDeduction(deduction.id)}
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

              {/* Admin Access Permissions */}
              <AdminAccessManager
                adminAccess={employee.adminAccess}
                onAdminAccessChange={(permissions) => setEmployee({ ...employee, adminAccess: permissions })}
                isEditing={isEditing}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default EmployeeDetails;
