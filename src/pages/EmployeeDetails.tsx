import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { toast } from "@/components/ui/sonner"
import { ArrowLeft, Save, Plus, Trash2, Edit } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import { getEmployeeById, updateEmployee, updateEmployeeResignDate, updateEmployeeAdminAccess } from '@/services/employeeService';
import { getEmployees, systemAllowances, systemDeductions } from '@/data/employeeData';
import type { EmployeeProfile, AllowanceDeduction } from '@/types/employee';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';

interface AllowanceDeductionManagerProps {
  title: string;
  items: AllowanceDeduction[];
  systemItems: { id: string; name: string; amount: number; type: 'Fixed' | 'Percentage' | 'Manual' }[];
  onAdd: (item: any) => void;
  onEdit: (item: any) => void;
  onRemove: (item: any) => void;
}

const AllowanceDeductionManager: React.FC<AllowanceDeductionManagerProps> = ({ title, items, systemItems, onAdd, onEdit, onRemove }) => {
  const [newItemName, setNewItemName] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-medium">{title}</h4>
        <Button variant="outline" size="sm" onClick={() => setIsAdding(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add {title === 'Allowances' ? 'Allowance' : 'Deduction'}
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{item.name}</TableCell>
              <TableCell>{item.amount}</TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="sm" onClick={() => onEdit(item)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
                <Button variant="ghost" size="sm" onClick={() => onRemove(item)}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Remove
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={isAdding} onOpenChange={setIsAdding}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add {title === 'Allowances' ? 'Allowance' : 'Deduction'}</DialogTitle>
            <DialogDescription>
              Select a system {title === 'Allowances' ? 'allowance' : 'deduction'} to add.
            </DialogDescription>
          </DialogHeader>
          <Select onValueChange={(value) => setNewItemName(value)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={`Select ${title === 'Allowances' ? 'Allowance' : 'Deduction'}`} />
            </SelectTrigger>
            <SelectContent>
              {systemItems.map((item) => (
                <SelectItem key={item.id} value={item.name}>
                  {item.name} (S${item.amount})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setIsAdding(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => {
              const selectedItem = systemItems.find(item => item.name === newItemName);
              if (selectedItem) {
                onAdd(selectedItem);
                setIsAdding(false);
                setNewItemName('');
              }
            }}>
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const EmployeeDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState<EmployeeProfile | null>(null);
  const [isResigned, setIsResigned] = useState(false);
  const [resignDate, setResignDate] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [adminAccess, setAdminAccess] = useState({
    employees: false,
    payroll: false,
    leaveManagement: false,
    claims: false,
    attendance: false,
    slotBooking: false,
    reports: false
  });

  useEffect(() => {
    const fetchEmployee = async () => {
      if (id) {
        const employeeData = await getEmployeeById(id);
        setEmployee(employeeData);
        setIsResigned(!!employeeData?.resignDate);
        setResignDate(employeeData?.resignDate || '');
        setAdminAccess(employeeData?.adminAccess || {
          employees: false,
          payroll: false,
          leaveManagement: false,
          claims: false,
          attendance: false,
          slotBooking: false,
          reports: false
        });
      }
    };

    fetchEmployee();
  }, [id]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>, field: string) => {
    setEmployee((prev) => {
      if (prev) {
        return { ...prev, [field]: e.target.value };
      }
      return prev;
    });
  };

  const handleAdminAccessChange = (field: string, value: boolean) => {
    setAdminAccess(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!employee) return;

    setIsSaving(true);
    try {
      // Update employee details
      await updateEmployee(employee.id, employee);

      // Update resign date
      if (isResigned) {
        await updateEmployeeResignDate(employee.id, resignDate);
      } else {
        await updateEmployeeResignDate(employee.id, '');
      }

      // Update admin access
      await updateEmployeeAdminAccess(employee.id, adminAccess);

      toast.success("Employee details saved successfully");
      navigate('/employees');
    } catch (error) {
      console.error("Error updating employee:", error);
      toast.error("Failed to save employee details");
    } finally {
      setIsSaving(false);
    }
  };

  if (!employee) {
    return <div>Loading employee details...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex h-[calc(100vh-73px)]">
        <Sidebar />
        <main className="flex-1 p-6 overflow-auto">
          <div className="space-y-6">
            <div className="flex items-center space-x-4">
              <Button variant="outline" onClick={() => navigate('/employees')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Employees
              </Button>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Employee Details</h2>
                <p className="text-gray-600">View and edit employee information</p>
              </div>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>Edit basic employee details</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Name</Label>
                    <Input id="name" value={employee.name} onChange={(e) => handleInputChange(e, 'name')} />
                  </div>
                  <div>
                    <Label htmlFor="nric">NRIC</Label>
                    <Input id="nric" value={employee.nric || ''} onChange={(e) => handleInputChange(e, 'nric')} />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="dateOfBirth">Date of Birth</Label>
                    <Input
                      type="date"
                      id="dateOfBirth"
                      value={employee.dateOfBirth}
                      onChange={(e) => handleInputChange(e, 'dateOfBirth')}
                    />
                  </div>
                  <div>
                    <Label htmlFor="residencyStatus">Residency Status</Label>
                    <Select value={employee.residencyStatus} onValueChange={(value) => setEmployee(prev => ({ ...prev!, residencyStatus: value }))}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Citizen">Citizen</SelectItem>
                        <SelectItem value="PR">Permanent Resident</SelectItem>
                        <SelectItem value="Foreigner">Foreigner</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="type">Employee Type</Label>
                    <Select value={employee.type} onValueChange={(value) => setEmployee(prev => ({ ...prev!, type: value as 'Full-Time' | 'Casual' }))}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Full-Time">Full-Time</SelectItem>
                        <SelectItem value="Casual">Casual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="paymentType">Payment Type</Label>
                    <Select value={employee.paymentType} onValueChange={(value) => setEmployee(prev => ({ ...prev!, paymentType: value as 'Monthly' | 'Hourly' | 'Daily' }))}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select payment type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Monthly">Monthly</SelectItem>
                        <SelectItem value="Hourly">Hourly</SelectItem>
                        <SelectItem value="Daily">Daily</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="baseSalary">Base Salary</Label>
                    <Input
                      type="number"
                      id="baseSalary"
                      value={employee.baseSalary || ''}
                      onChange={(e) => handleInputChange(e, 'baseSalary')}
                    />
                  </div>
                  <div>
                    <Label htmlFor="hourlyRate">Hourly Rate</Label>
                    <Input
                      type="number"
                      id="hourlyRate"
                      value={employee.hourlyRate || ''}
                      onChange={(e) => handleInputChange(e, 'hourlyRate')}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
                <CardDescription>Edit contact details</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" value={employee.phone || ''} onChange={(e) => handleInputChange(e, 'phone')} />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={employee.email || ''} onChange={(e) => handleInputChange(e, 'email')} />
                  </div>
                </div>
                <div>
                  <Label htmlFor="address">Address</Label>
                  <Input id="address" value={employee.address || ''} onChange={(e) => handleInputChange(e, 'address')} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Bank Details</CardTitle>
                <CardDescription>Edit bank account information</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="bankName">Bank Name</Label>
                    <Input id="bankName" value={employee.bankName || ''} onChange={(e) => handleInputChange(e, 'bankName')} />
                  </div>
                  <div>
                    <Label htmlFor="bankAccount">Bank Account</Label>
                    <Input id="bankAccount" value={employee.bankAccount || ''} onChange={(e) => handleInputChange(e, 'bankAccount')} />
                  </div>
                </div>
                <div>
                  <Label htmlFor="branch">Branch</Label>
                  <Input id="branch" value={employee.branch || ''} onChange={(e) => handleInputChange(e, 'branch')} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Employment Details</CardTitle>
                <CardDescription>Edit employment details</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="position">Position</Label>
                    <Input id="position" value={employee.position || ''} onChange={(e) => handleInputChange(e, 'position')} />
                  </div>
                  <div>
                    <Label htmlFor="joinDate">Join Date</Label>
                    <Input type="date" id="joinDate" value={employee.joinDate || ''} onChange={(e) => handleInputChange(e, 'joinDate')} disabled />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Label htmlFor="isResigned">Resigned</Label>
                  <Switch id="isResigned" checked={isResigned} onCheckedChange={setIsResigned} />
                </div>
                {isResigned && (
                  <div>
                    <Label htmlFor="resignDate">Resign Date</Label>
                    <Input type="date" id="resignDate" value={resignDate} onChange={(e) => setResignDate(e.target.value)} />
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payroll Details</CardTitle>
                <CardDescription>Manage allowances and deductions</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <AllowanceDeductionManager
                  title="Allowances"
                  items={employee.allowances.map(a => ({
                    id: a.id,
                    name: a.name,
                    amount: a.amount,
                    type: a.type
                  }))}
                  systemItems={systemAllowances.map(a => ({
                    id: a.id.toString(),
                    name: a.name,
                    amount: a.amount,
                    type: 'Fixed' as const
                  }))}
                  onAdd={(item) => {
                    if (!employee) return;
                    const newAllowances = [...employee.allowances, {
                      id: Date.now().toString(),
                      name: item.name,
                      amount: item.amount,
                      type: 'Fixed' as const
                    }];
                    setEmployee({ ...employee, allowances: newAllowances });
                  }}
                  onEdit={(item) => {
                    // Implement edit logic here
                  }}
                  onRemove={(item) => {
                    if (!employee) return;
                    const newAllowances = employee.allowances.filter(a => a.id !== item.id);
                    setEmployee({ ...employee, allowances: newAllowances });
                  }}
                />

                <AllowanceDeductionManager
                  title="Deductions"
                  items={employee.deductions.map(d => ({
                    id: d.id,
                    name: d.name,
                    amount: d.amount,
                    type: d.type
                  }))}
                  systemItems={systemDeductions.map(d => ({
                    id: d.id.toString(),
                    name: d.name,
                    amount: d.amount,
                    type: 'Fixed' as const
                  }))}
                  onAdd={(item) => {
                    if (!employee) return;
                    const newDeductions = [...employee.deductions, {
                      id: Date.now().toString(),
                      name: item.name,
                      amount: item.amount,
                      type: 'Fixed' as const
                    }];
                    setEmployee({ ...employee, deductions: newDeductions });
                  }}
                  onEdit={(item) => {
                    // Implement edit logic here
                  }}
                  onRemove={(item) => {
                    if (!employee) return;
                    const newDeductions = employee.deductions.filter(d => d.id !== item.id);
                    setEmployee({ ...employee, deductions: newDeductions });
                  }}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Admin Access</CardTitle>
                <CardDescription>Manage employee access permissions</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="flex items-center space-x-2">
                  <Label htmlFor="employees">Employees</Label>
                  <Switch id="employees" checked={adminAccess.employees} onCheckedChange={(value) => handleAdminAccessChange('employees', value)} />
                </div>
                <div className="flex items-center space-x-2">
                  <Label htmlFor="payroll">Payroll</Label>
                  <Switch id="payroll" checked={adminAccess.payroll} onCheckedChange={(value) => handleAdminAccessChange('payroll', value)} />
                </div>
                <div className="flex items-center space-x-2">
                  <Label htmlFor="leaveManagement">Leave Management</Label>
                  <Switch id="leaveManagement" checked={adminAccess.leaveManagement} onCheckedChange={(value) => handleAdminAccessChange('leaveManagement', value)} />
                </div>
                <div className="flex items-center space-x-2">
                  <Label htmlFor="claims">Claims</Label>
                  <Switch id="claims" checked={adminAccess.claims} onCheckedChange={(value) => handleAdminAccessChange('claims', value)} />
                </div>
                <div className="flex items-center space-x-2">
                  <Label htmlFor="attendance">Attendance</Label>
                  <Switch id="attendance" checked={adminAccess.attendance} onCheckedChange={(value) => handleAdminAccessChange('attendance', value)} />
                </div>
                <div className="flex items-center space-x-2">
                  <Label htmlFor="slotBooking">Slot Booking</Label>
                  <Switch id="slotBooking" checked={adminAccess.slotBooking} onCheckedChange={(value) => handleAdminAccessChange('slotBooking', value)} />
                </div>
                <div className="flex items-center space-x-2">
                  <Label htmlFor="reports">Reports</Label>
                  <Switch id="reports" checked={adminAccess.reports} onCheckedChange={(value) => handleAdminAccessChange('reports', value)} />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => navigate('/employees')}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save
                  </>
                )}
              </Button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default EmployeeDetails;
