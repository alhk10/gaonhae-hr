
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getEmployeeById, updateEmployee, deleteEmployee, updateEmployeeResignDate } from '@/services/employeeService';
import { EmployeeProfile } from '@/types/employee';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import LocationExceptionManager from '@/components/employee/LocationExceptionManager';

const EmployeeDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isResigning, setIsResigning] = useState(false);
  const [resignDate, setResignDate] = useState<Date | undefined>(undefined);

  const { data: employee, isLoading, isError } = useQuery({
    queryKey: ['employee', id],
    queryFn: () => getEmployeeById(id!),
    enabled: !!id,
  });

  const [employeeData, setEmployeeData] = useState<Partial<EmployeeProfile>>({
    name: '',
    nric: '',
    dateOfBirth: '',
    residencyStatus: 'Citizen',
    type: 'Full-Time',
    baseSalary: undefined,
    hourlyRate: undefined,
    dailyRate: undefined,
    dailyWeekdayRate: undefined,
    dailyWeekendRate: undefined,
    paymentType: 'Monthly',
    bankName: '',
    bankAccount: '',
    branch: 'Main Office',
    department: '',
    position: '',
    phone: '',
    address: '',
    email: '',
    joinDate: undefined,
    resignDate: undefined,
  });

  useEffect(() => {
    if (employee) {
      setEmployeeData({
        name: employee.name,
        nric: employee.nric,
        dateOfBirth: employee.dateOfBirth,
        residencyStatus: employee.residencyStatus,
        type: employee.type,
        baseSalary: employee.baseSalary,
        hourlyRate: employee.hourlyRate,
        dailyRate: employee.dailyRate,
        dailyWeekdayRate: employee.dailyWeekdayRate,
        dailyWeekendRate: employee.dailyWeekendRate,
        paymentType: employee.paymentType,
        bankName: employee.bankName,
        bankAccount: employee.bankAccount,
        branch: employee.branch,
        department: employee.department,
        position: employee.position,
        phone: employee.phone,
        address: employee.address,
        email: employee.email,
        joinDate: employee.joinDate,
        resignDate: employee.resignDate,
      });
    }
  }, [employee]);

  const updateEmployeeMutation = useMutation({
    mutationFn: (updatedData: EmployeeProfile) => updateEmployee(id!, updatedData),
    onSuccess: () => {
      toast.success('Employee details updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['employee', id] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
    onError: (error: any) => {
      toast.error(`Failed to update employee details: ${error.message}`);
    },
  });

  const deleteEmployeeMutation = useMutation({
    mutationFn: () => deleteEmployee(id!),
    onSuccess: () => {
      toast.success('Employee deleted successfully!');
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      navigate('/employees');
    },
    onError: (error: any) => {
      toast.error(`Failed to delete employee: ${error.message}`);
    },
  });

  const updateResignDateMutation = useMutation({
    mutationFn: (resignDate: string) => updateEmployeeResignDate(id!, resignDate),
    onSuccess: () => {
      toast.success('Employee resign date updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['employee', id] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setIsResigning(false);
    },
    onError: (error: any) => {
      toast.error(`Failed to update resign date: ${error.message}`);
      setIsResigning(false);
    },
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEmployeeData(prevData => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleNumberInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEmployeeData(prevData => ({
      ...prevData,
      [name]: value === '' ? undefined : parseFloat(value),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const employeeProfile: EmployeeProfile = {
      id: id!,
      name: employeeData.name || '',
      nric: employeeData.nric || '',
      dateOfBirth: employeeData.dateOfBirth || '',
      residencyStatus: employeeData.residencyStatus as 'Citizen' | 'Permanent Resident' | 'Foreigner',
      type: employeeData.type as 'Full-Time' | 'Casual',
      baseSalary: employeeData.baseSalary,
      hourlyRate: employeeData.hourlyRate,
      dailyRate: employeeData.dailyRate,
      dailyWeekdayRate: employeeData.dailyWeekdayRate,
      dailyWeekendRate: employeeData.dailyWeekendRate,
      paymentType: employeeData.paymentType as 'Monthly' | 'Hourly' | 'Daily',
      bankName: employeeData.bankName || '',
      bankAccount: employeeData.bankAccount || '',
      branch: employeeData.branch || '',
      department: employeeData.department || '',
      position: employeeData.position || '',
      phone: employeeData.phone || '',
      address: employeeData.address || '',
      email: employeeData.email || '',
      joinDate: employeeData.joinDate,
      resignDate: employeeData.resignDate,
      allowances: employee?.allowances || [],
      deductions: employee?.deductions || [],
      certificates: employee?.certificates || [],
      adminAccess: employee?.adminAccess || {
        employees: false,
        payroll: false,
        leaveManagement: false,
        claims: false,
        attendance: false,
        slotBooking: false,
        reports: false
      },
      pageAccess: employee?.pageAccess || {
        profile: true,
        applyLeave: true,
        submitClaim: true,
        payslips: true,
        myAttendance: true,
        slotBookingEmployee: true
      }
    };

    updateEmployeeMutation.mutate(employeeProfile);
  };

  const handleDelete = () => {
    deleteEmployeeMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading employee details...</p>
        </div>
      </div>
    );
  }

  if (isError || !employee) {
    return (
      <div className="text-center">
        <p className="text-red-600">Error loading employee details.</p>
        <Button onClick={() => navigate('/employees')} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Employees
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Clean Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button 
            variant="outline" 
            onClick={() => navigate('/employees')}
            className="flex items-center"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{employee.name}</h1>
            <p className="text-gray-600">Employee ID: {employee.id}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button 
            type="submit" 
            form="employee-form"
            disabled={updateEmployeeMutation.isPending}
          >
            <Save className="w-4 h-4 mr-2" />
            {updateEmployeeMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Employee</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this employee? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Employee Details Form */}
      <form id="employee-form" onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  name="name"
                  value={employeeData.name || ''}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div>
                <Label htmlFor="nric">NRIC</Label>
                <Input
                  id="nric"
                  name="nric"
                  value={employeeData.nric || ''}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div>
                <Label htmlFor="dateOfBirth">Date of Birth</Label>
                <Input
                  id="dateOfBirth"
                  name="dateOfBirth"
                  type="date"
                  value={employeeData.dateOfBirth || ''}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div>
                <Label htmlFor="joinDate">Join Date</Label>
                <Input
                  id="joinDate"
                  name="joinDate"
                  type="date"
                  value={employeeData.joinDate || ''}
                  onChange={handleInputChange}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Employment Details */}
        <Card>
          <CardHeader>
            <CardTitle>Employment Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="type">Employee Type</Label>
                <Select
                  name="type"
                  value={employeeData.type || 'Full-Time'}
                  onValueChange={(value) => setEmployeeData(prev => ({ ...prev, type: value as 'Full-Time' | 'Casual' }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Full-Time">Full-Time</SelectItem>
                    <SelectItem value="Casual">Casual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="residencyStatus">Residency Status</Label>
                <Select
                  name="residencyStatus"
                  value={employeeData.residencyStatus || 'Citizen'}
                  onValueChange={(value) => setEmployeeData(prev => ({ ...prev, residencyStatus: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Citizen">Citizen</SelectItem>
                    <SelectItem value="Permanent Resident">Permanent Resident</SelectItem>
                    <SelectItem value="Foreigner">Foreigner</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="position">Position</Label>
                <Input
                  id="position"
                  name="position"
                  value={employeeData.position || ''}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <Label htmlFor="branch">Branch</Label>
                <Input
                  id="branch"
                  name="branch"
                  value={employeeData.branch || ''}
                  onChange={handleInputChange}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Compensation */}
        <Card>
          <CardHeader>
            <CardTitle>Compensation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="paymentType">Payment Type</Label>
                <Select
                  name="paymentType"
                  value={employeeData.paymentType || 'Monthly'}
                  onValueChange={(value) => setEmployeeData(prev => ({ ...prev, paymentType: value as 'Monthly' | 'Hourly' | 'Daily' }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Monthly">Monthly</SelectItem>
                    <SelectItem value="Hourly">Hourly</SelectItem>
                    <SelectItem value="Daily">Daily</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {employeeData.paymentType === 'Monthly' && (
                <div>
                  <Label htmlFor="baseSalary">Base Salary (S$)</Label>
                  <Input
                    id="baseSalary"
                    name="baseSalary"
                    type="number"
                    step="0.01"
                    value={employeeData.baseSalary === undefined ? '' : employeeData.baseSalary.toString()}
                    onChange={handleNumberInputChange}
                  />
                </div>
              )}

              {employeeData.paymentType === 'Hourly' && (
                <div>
                  <Label htmlFor="hourlyRate">Hourly Rate (S$)</Label>
                  <Input
                    id="hourlyRate"
                    name="hourlyRate"
                    type="number"
                    step="0.01"
                    value={employeeData.hourlyRate === undefined ? '' : employeeData.hourlyRate.toString()}
                    onChange={handleNumberInputChange}
                  />
                </div>
              )}

              {employeeData.paymentType === 'Daily' && (
                <>
                  <div>
                    <Label htmlFor="dailyWeekdayRate">Daily Weekday Rate (S$)</Label>
                    <Input
                      id="dailyWeekdayRate"
                      name="dailyWeekdayRate"
                      type="number"
                      step="0.01"
                      value={employeeData.dailyWeekdayRate === undefined ? '' : employeeData.dailyWeekdayRate.toString()}
                      onChange={handleNumberInputChange}
                    />
                  </div>
                  <div>
                    <Label htmlFor="dailyWeekendRate">Daily Weekend Rate (S$)</Label>
                    <Input
                      id="dailyWeekendRate"
                      name="dailyWeekendRate"
                      type="number"
                      step="0.01"
                      value={employeeData.dailyWeekendRate === undefined ? '' : employeeData.dailyWeekendRate.toString()}
                      onChange={handleNumberInputChange}
                    />
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Banking Information */}
        <Card>
          <CardHeader>
            <CardTitle>Banking Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="bankName">Bank Name</Label>
                <Input
                  id="bankName"
                  name="bankName"
                  value={employeeData.bankName || ''}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <Label htmlFor="bankAccount">Bank Account</Label>
                <Input
                  id="bankAccount"
                  name="bankAccount"
                  value={employeeData.bankAccount || ''}
                  onChange={handleInputChange}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={employeeData.email || ''}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  name="phone"
                  value={employeeData.phone || ''}
                  onChange={handleInputChange}
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  name="address"
                  value={employeeData.address || ''}
                  onChange={handleInputChange}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </form>

      {/* Location Exception Management */}
      <LocationExceptionManager 
        employeeId={id} 
        employeeName={employee?.name}
      />
    </div>
  );
};

export default EmployeeDetails;
