import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { toast } from "@/components/ui/sonner"
import { ArrowLeft, Save, Plus, Trash2, Edit, X, User, Phone, Mail, MapPin, CreditCard, Briefcase, Calendar, Shield, Eye, Settings } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"

import { 
  getEmployeeById, 
  updateEmployee, 
  updateEmployeeResignDate, 
  updateEmployeeAdminAccess,
  updateEmployeePageAccess,
  deleteEmployee
} from '@/services/employeeService';
import { systemAllowances, systemDeductions } from '@/data/employeeData';
import type { EmployeeProfile, AllowanceDeduction, AdminAccessPermissions, EmployeePageAccessPermissions } from '@/types/employee';
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-lg">{title}</h4>
        <Button variant="outline" size="sm" onClick={() => setIsAdding(true)} className="bg-blue-50 hover:bg-blue-100 text-blue-600 border-blue-200">
          <Plus className="w-4 h-4 mr-2" />
          Add {title === 'Allowances' ? 'Allowance' : 'Deduction'}
        </Button>
      </div>
      <div className="bg-gray-50 rounded-lg p-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-medium">Name</TableHead>
              <TableHead className="font-medium">Amount</TableHead>
              <TableHead className="text-right font-medium">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id} className="hover:bg-white/50">
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell className="text-green-600 font-semibold">S${item.amount}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end space-x-1">
                    <Button variant="ghost" size="sm" onClick={() => onEdit(item)} className="hover:bg-blue-50 text-blue-600">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => onRemove(item)} className="hover:bg-red-50 text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

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

const RESIDENCY_STATUS_OPTIONS = [
  'Singapore Citizen',
  'Permanent Resident Year 1',
  'Permanent Resident Year 2', 
  'Permanent Resident Year 3+',
  'Work Permit',
  'S Pass',
  'Employment Pass'
];

const BANK_OPTIONS = [
  'POSB/DBS',
  'OCBC',
  'UOB', 
  'SCB',
  'Trustbank',
  'Maybank',
  'Citibank'
];

const EmployeeDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState<EmployeeProfile | null>(null);
  const [isResigned, setIsResigned] = useState(false);
  const [resignDate, setResignDate] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [adminAccess, setAdminAccess] = useState<AdminAccessPermissions>({
    employees: false,
    payroll: false,
    leaveManagement: false,
    claims: false,
    attendance: false,
    slotBooking: false,
    reports: false
  });
  const [pageAccess, setPageAccess] = useState<EmployeePageAccessPermissions>({
    profile: true,
    applyLeave: true,
    submitClaim: true,
    payslips: true,
    myAttendance: true,
    slotBookingEmployee: true
  });

  useEffect(() => {
    const fetchEmployee = async () => {
      console.log('Fetching employee with ID:', id);
      if (id && id !== ':id') {
        try {
          const employeeData = await getEmployeeById(id);
          console.log('Fetched employee data:', employeeData);
          
          if (employeeData) {
            setEmployee(employeeData);
            setIsResigned(!!employeeData.resignDate);
            setResignDate(employeeData.resignDate || '');
            setAdminAccess(employeeData.adminAccess);
            setPageAccess(employeeData.pageAccess);
          } else {
            console.error('No employee found with ID:', id);
            toast.error('Employee not found');
            navigate('/employees');
          }
        } catch (error) {
          console.error('Error fetching employee:', error);
          toast.error('Failed to load employee details');
          navigate('/employees');
        }
      } else {
        console.error('Invalid employee ID:', id);
        toast.error('Invalid employee ID');
        navigate('/employees');
      }
    };

    fetchEmployee();
  }, [id, navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    if (!employee) return;
    
    const value = e.target.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value;
    setEmployee(prev => prev ? { ...prev, [field]: value } : null);
  };

  const handleSelectChange = (value: string, field: string) => {
    if (!employee) return;
    setEmployee(prev => prev ? { ...prev, [field]: value } : null);
  };

  const handleAdminAccessChange = (field: keyof AdminAccessPermissions, value: boolean) => {
    setAdminAccess(prev => ({ ...prev, [field]: value }));
  };

  const handlePageAccessChange = (field: keyof EmployeePageAccessPermissions, value: boolean) => {
    setPageAccess(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!employee || !id) return;

    setIsSaving(true);
    try {
      console.log('Saving employee data:', employee);
      
      // Update employee details
      const updatedEmployeeData = {
        ...employee,
        baseSalary: employee.type === 'Full-Time' ? employee.baseSalary : undefined,
        hourlyRate: employee.type === 'Casual' && employee.paymentType === 'Hourly' ? employee.hourlyRate : undefined,
        dailyWeekdayRate: employee.type === 'Casual' && employee.paymentType === 'Daily' ? employee.dailyWeekdayRate : undefined,
        dailyWeekendRate: employee.type === 'Casual' && employee.paymentType === 'Daily' ? employee.dailyWeekendRate : undefined,
      };

      await updateEmployee(id, updatedEmployeeData);

      // Update resign date
      if (isResigned && resignDate) {
        await updateEmployeeResignDate(id, resignDate);
      } else if (!isResigned) {
        await updateEmployeeResignDate(id, '');
      }

      // Update admin access
      await updateEmployeeAdminAccess(id, adminAccess);

      // Update page access
      await updateEmployeePageAccess(id, pageAccess);

      toast.success("Employee details saved successfully");
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating employee:", error);
      toast.error("Failed to save employee details");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;

    setIsDeleting(true);
    try {
      await deleteEmployee(id);
      toast.success("Employee deleted successfully");
      navigate('/employees');
    } catch (error) {
      console.error("Error deleting employee:", error);
      toast.error("Failed to delete employee");
    } finally {
      setIsDeleting(false);
    }
  };

  if (!employee) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex h-[calc(100vh-73px)]">
          <Sidebar />
          <main className="flex-1 p-6 overflow-auto">
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading employee details...</p>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <Navbar />
      <div className="flex h-[calc(100vh-73px)]">
        <Sidebar />
        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Header Section */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Button variant="outline" onClick={() => navigate('/employees')} className="hover:bg-gray-50">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Employees
                  </Button>
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold text-gray-900">{employee.name}</h1>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant={employee.type === 'Full-Time' ? 'default' : 'secondary'} className="text-xs">
                          {employee.type}
                        </Badge>
                        <span className="text-gray-500">•</span>
                        <span className="text-gray-600 text-sm">{employee.position || 'Position not specified'}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setIsEditing(!isEditing)}
                    className={isEditing ? "bg-gray-100" : "hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200"}
                  >
                    {isEditing ? (
                      <>
                        <X className="w-4 h-4 mr-2" />
                        Cancel Edit
                      </>
                    ) : (
                      <>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Details
                      </>
                    )}
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" className="bg-red-500 hover:bg-red-600">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Employee
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Employee</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete {employee.name}? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-red-500 hover:bg-red-600">
                          {isDeleting ? 'Deleting...' : 'Delete'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </div>

            {/* Main Content with Tabs */}
            <Tabs defaultValue="personal" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4 bg-white rounded-lg p-1 shadow-sm">
                <TabsTrigger value="personal" className="flex items-center space-x-2 data-[state=active]:bg-blue-500 data-[state=active]:text-white">
                  <User className="w-4 h-4" />
                  <span>Personal</span>
                </TabsTrigger>
                <TabsTrigger value="employment" className="flex items-center space-x-2 data-[state=active]:bg-blue-500 data-[state=active]:text-white">
                  <Briefcase className="w-4 h-4" />
                  <span>Employment</span>
                </TabsTrigger>
                <TabsTrigger value="payroll" className="flex items-center space-x-2 data-[state=active]:bg-blue-500 data-[state=active]:text-white">
                  <CreditCard className="w-4 h-4" />
                  <span>Payroll</span>
                </TabsTrigger>
                <TabsTrigger value="permissions" className="flex items-center space-x-2 data-[state=active]:bg-blue-500 data-[state=active]:text-white">
                  <Shield className="w-4 h-4" />
                  <span>Permissions</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="personal" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Personal Information Card */}
                  <Card className="shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-lg">
                      <CardTitle className="flex items-center space-x-2 text-blue-700">
                        <User className="w-5 h-5" />
                        <span>Personal Information</span>
                      </CardTitle>
                      <CardDescription>Basic employee details</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 p-6">
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="name" className="text-sm font-medium text-gray-700">Full Name</Label>
                          <Input 
                            id="name" 
                            value={employee.name} 
                            onChange={(e) => handleInputChange(e, 'name')} 
                            disabled={!isEditing}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="nric" className="text-sm font-medium text-gray-700">NRIC</Label>
                          <Input 
                            id="nric" 
                            value={employee.nric || ''} 
                            onChange={(e) => handleInputChange(e, 'nric')} 
                            disabled={!isEditing}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="dateOfBirth" className="text-sm font-medium text-gray-700">Date of Birth</Label>
                          <Input
                            type="date"
                            id="dateOfBirth"
                            value={employee.dateOfBirth}
                            onChange={(e) => handleInputChange(e, 'dateOfBirth')}
                            disabled={!isEditing}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="residencyStatus" className="text-sm font-medium text-gray-700">Residency Status</Label>
                          <Select 
                            value={employee.residencyStatus} 
                            onValueChange={(value) => handleSelectChange(value, 'residencyStatus')}
                            disabled={!isEditing}
                          >
                            <SelectTrigger className="w-full mt-1">
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                              {RESIDENCY_STATUS_OPTIONS.map((status) => (
                                <SelectItem key={status} value={status}>
                                  {status}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Contact Information Card */}
                  <Card className="shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-t-lg">
                      <CardTitle className="flex items-center space-x-2 text-green-700">
                        <Phone className="w-5 h-5" />
                        <span>Contact Information</span>
                      </CardTitle>
                      <CardDescription>Contact details and address</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 p-6">
                      <div>
                        <Label htmlFor="phone" className="text-sm font-medium text-gray-700">Phone Number</Label>
                        <Input 
                          id="phone" 
                          value={employee.phone || ''} 
                          onChange={(e) => handleInputChange(e, 'phone')} 
                          disabled={!isEditing}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="email" className="text-sm font-medium text-gray-700">Email Address</Label>
                        <Input 
                          id="email" 
                          type="email" 
                          value={employee.email || ''} 
                          onChange={(e) => handleInputChange(e, 'email')} 
                          disabled={!isEditing}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="address" className="text-sm font-medium text-gray-700">Address</Label>
                        <Input 
                          id="address" 
                          value={employee.address || ''} 
                          onChange={(e) => handleInputChange(e, 'address')} 
                          disabled={!isEditing}
                          className="mt-1"
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="employment" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Employment Details Card */}
                  <Card className="shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-t-lg">
                      <CardTitle className="flex items-center space-x-2 text-purple-700">
                        <Briefcase className="w-5 h-5" />
                        <span>Employment Details</span>
                      </CardTitle>
                      <CardDescription>Job information and status</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="type" className="text-sm font-medium text-gray-700">Employee Type</Label>
                          <Select 
                            value={employee.type} 
                            onValueChange={(value) => handleSelectChange(value, 'type')}
                            disabled={!isEditing}
                          >
                            <SelectTrigger className="w-full mt-1">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Full-Time">Full-Time</SelectItem>
                              <SelectItem value="Casual">Casual</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="paymentType" className="text-sm font-medium text-gray-700">Payment Type</Label>
                          <Select 
                            value={employee.paymentType} 
                            onValueChange={(value) => handleSelectChange(value, 'paymentType')}
                            disabled={!isEditing}
                          >
                            <SelectTrigger className="w-full mt-1">
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

                      {/* Conditional Salary/Rate Fields */}
                      <div className="space-y-4">
                        {employee.paymentType === 'Monthly' && (
                          <div>
                            <Label htmlFor="baseSalary" className="text-sm font-medium text-gray-700">Base Salary (S$)</Label>
                            <Input
                              type="number"
                              id="baseSalary"
                              value={employee.baseSalary || ''}
                              onChange={(e) => handleInputChange(e, 'baseSalary')}
                              disabled={!isEditing}
                              className="mt-1"
                            />
                          </div>
                        )}
                        
                        {employee.paymentType === 'Hourly' && (
                          <div>
                            <Label htmlFor="hourlyRate" className="text-sm font-medium text-gray-700">Hourly Rate (S$)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              id="hourlyRate"
                              value={employee.hourlyRate || ''}
                              onChange={(e) => handleInputChange(e, 'hourlyRate')}
                              disabled={!isEditing}
                              className="mt-1"
                            />
                          </div>
                        )}
                        
                        {employee.paymentType === 'Daily' && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="dailyWeekdayRate" className="text-sm font-medium text-gray-700">Daily Weekday Rate (S$)</Label>
                              <Input
                                type="number"
                                step="0.01"
                                id="dailyWeekdayRate"
                                value={employee.dailyWeekdayRate || ''}
                                onChange={(e) => handleInputChange(e, 'dailyWeekdayRate')}
                                disabled={!isEditing}
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <Label htmlFor="dailyWeekendRate" className="text-sm font-medium text-gray-700">Daily Weekend Rate (S$)</Label>
                              <Input
                                type="number"
                                step="0.01"
                                id="dailyWeekendRate"
                                value={employee.dailyWeekendRate || ''}
                                onChange={(e) => handleInputChange(e, 'dailyWeekendRate')}
                                disabled={!isEditing}
                                className="mt-1"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="position" className="text-sm font-medium text-gray-700">Position</Label>
                          <Input 
                            id="position" 
                            value={employee.position || ''} 
                            onChange={(e) => handleInputChange(e, 'position')} 
                            disabled={!isEditing}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="joinDate" className="text-sm font-medium text-gray-700">Join Date</Label>
                          <Input 
                            type="date" 
                            id="joinDate" 
                            value={employee.joinDate || ''} 
                            onChange={(e) => handleInputChange(e, 'joinDate')} 
                            disabled
                            className="mt-1 bg-gray-50"
                          />
                        </div>
                      </div>

                      <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                        <Switch 
                          id="isResigned" 
                          checked={isResigned} 
                          onCheckedChange={setIsResigned} 
                          disabled={!isEditing}
                        />
                        <Label htmlFor="isResigned" className="text-sm font-medium cursor-pointer">Employee has resigned</Label>
                      </div>

                      {isResigned && (
                        <div>
                          <Label htmlFor="resignDate" className="text-sm font-medium text-gray-700">Resign Date</Label>
                          <Input 
                            type="date" 
                            id="resignDate" 
                            value={resignDate} 
                            onChange={(e) => setResignDate(e.target.value)} 
                            disabled={!isEditing}
                            className="mt-1"
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Bank Details Card */}
                  <Card className="shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-t-lg">
                      <CardTitle className="flex items-center space-x-2 text-yellow-700">
                        <CreditCard className="w-5 h-5" />
                        <span>Bank Details</span>
                      </CardTitle>
                      <CardDescription>Banking information for payroll</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 p-6">
                      <div>
                        <Label htmlFor="bankName" className="text-sm font-medium text-gray-700">Bank Name</Label>
                        <Select 
                          value={employee.bankName || ''} 
                          onValueChange={(value) => handleSelectChange(value, 'bankName')}
                          disabled={!isEditing}
                        >
                          <SelectTrigger className="w-full mt-1">
                            <SelectValue placeholder="Select bank" />
                          </SelectTrigger>
                          <SelectContent>
                            {BANK_OPTIONS.map((bank) => (
                              <SelectItem key={bank} value={bank}>
                                {bank}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="bankAccount" className="text-sm font-medium text-gray-700">Bank Account Number</Label>
                        <Input 
                          id="bankAccount" 
                          value={employee.bankAccount || ''} 
                          onChange={(e) => handleInputChange(e, 'bankAccount')} 
                          disabled={!isEditing}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="branch" className="text-sm font-medium text-gray-700">Branch</Label>
                        <Input 
                          id="branch" 
                          value={employee.branch || ''} 
                          onChange={(e) => handleInputChange(e, 'branch')} 
                          disabled={!isEditing}
                          className="mt-1"
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="payroll" className="space-y-6">
                {isEditing ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="shadow-sm">
                      <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-t-lg">
                        <CardTitle className="text-green-700">Allowances</CardTitle>
                        <CardDescription>Manage employee allowances</CardDescription>
                      </CardHeader>
                      <CardContent className="p-6">
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
                            const newAllowances = employee.allowances.filter(a => a.id !== item.id);
                            setEmployee({ ...employee, allowances: newAllowances });
                          }}
                        />
                      </CardContent>
                    </Card>

                    <Card className="shadow-sm">
                      <CardHeader className="bg-gradient-to-r from-red-50 to-pink-50 rounded-t-lg">
                        <CardTitle className="text-red-700">Deductions</CardTitle>
                        <CardDescription>Manage employee deductions</CardDescription>
                      </CardHeader>
                      <CardContent className="p-6">
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
                            const newDeductions = employee.deductions.filter(d => d.id !== item.id);
                            setEmployee({ ...employee, deductions: newDeductions });
                          }}
                        />
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <Card className="shadow-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <CreditCard className="w-5 h-5" />
                        <span>Payroll Information</span>
                      </CardTitle>
                      <CardDescription>Enable editing to manage allowances and deductions</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="text-center py-8">
                        <Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500 mb-4">Click "Edit Details" to manage payroll settings</p>
                        <Button onClick={() => setIsEditing(true)} variant="outline">
                          <Edit className="w-4 h-4 mr-2" />
                          Enable Editing
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="permissions" className="space-y-6">
                {isEditing ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="shadow-sm">
                      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-lg">
                        <CardTitle className="flex items-center space-x-2 text-blue-700">
                          <Shield className="w-5 h-5" />
                          <span>Admin Access</span>
                        </CardTitle>
                        <CardDescription>Administrative permissions</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4 p-6">
                        {Object.entries(adminAccess).map(([key, value]) => (
                          <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <Label htmlFor={key} className="capitalize font-medium cursor-pointer">
                              {key.replace(/([A-Z])/g, ' $1').trim()}
                            </Label>
                            <Switch 
                              id={key} 
                              checked={value} 
                              onCheckedChange={(checked) => handleAdminAccessChange(key as keyof AdminAccessPermissions, checked)} 
                            />
                          </div>
                        ))}
                      </CardContent>
                    </Card>

                    <Card className="shadow-sm">
                      <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-t-lg">
                        <CardTitle className="flex items-center space-x-2 text-purple-700">
                          <Eye className="w-5 h-5" />
                          <span>Page Access</span>
                        </CardTitle>
                        <CardDescription>Employee page visibility</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4 p-6">
                        {Object.entries(pageAccess).map(([key, value]) => (
                          <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <Label htmlFor={`page-${key}`} className="capitalize font-medium cursor-pointer">
                              {key.replace(/([A-Z])/g, ' $1').trim()}
                            </Label>
                            <Switch 
                              id={`page-${key}`} 
                              checked={value} 
                              onCheckedChange={(checked) => handlePageAccessChange(key as keyof EmployeePageAccessPermissions, checked)} 
                            />
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <Card className="shadow-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Shield className="w-5 h-5" />
                        <span>Access Permissions</span>
                      </CardTitle>
                      <CardDescription>Enable editing to manage access permissions</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="text-center py-8">
                        <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500 mb-4">Click "Edit Details" to manage permissions</p>
                        <Button onClick={() => setIsEditing(true)} variant="outline">
                          <Edit className="w-4 h-4 mr-2" />
                          Enable Editing
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>

            {/* Save/Cancel Actions - Fixed at bottom when editing */}
            {isEditing && (
              <div className="sticky bottom-6 bg-white rounded-xl shadow-lg border p-4">
                <div className="flex justify-end space-x-3">
                  <Button variant="outline" onClick={() => setIsEditing(false)} className="min-w-24">
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={isSaving} className="min-w-24 bg-blue-600 hover:bg-blue-700">
                    {isSaving ? (
                      <>
                        <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default EmployeeDetails;
