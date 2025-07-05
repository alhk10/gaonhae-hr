import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from 'lucide-react';
import { DatePicker } from '@/components/ui/date-picker';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getEmployeeById, updateEmployee } from '@/services/employeeService';
import { EmployeeProfile } from '@/types/employee';
import { Separator } from '@/components/ui/separator';
import { deleteEmployee, updateEmployeeResignDate } from '@/services/employeeService';
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

  const updateEmployeeMutation = useMutation(
    (updatedData: EmployeeProfile) => updateEmployee(id!, updatedData),
    {
      onSuccess: () => {
        toast.success('Employee details updated successfully!');
        queryClient.invalidateQueries({ queryKey: ['employee', id] });
        queryClient.invalidateQueries({ queryKey: ['employees'] });
      },
      onError: (error: any) => {
        toast.error(`Failed to update employee details: ${error.message}`);
      },
    }
  );

  const deleteEmployeeMutation = useMutation(() => deleteEmployee(id!), {
    onSuccess: () => {
      toast.success('Employee deleted successfully!');
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      navigate('/employees');
    },
    onError: (error: any) => {
      toast.error(`Failed to delete employee: ${error.message}`);
    },
  });

  const updateResignDateMutation = useMutation(
    (resignDate: string) => updateEmployeeResignDate(id!, resignDate),
    {
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
    }
  );

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

  const handleDateChange = (date: Date | undefined, name: string) => {
    setEmployeeData(prevData => ({
      ...prevData,
      [name]: date ? format(date, 'yyyy-MM-dd') : undefined,
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

  const handleResign = () => {
    if (resignDate) {
      updateResignDateMutation.mutate(format(resignDate, 'yyyy-MM-dd'));
    }
  };

  if (isLoading) {
    return <div>Loading employee details...</div>;
  }

  if (isError || !employee) {
    return <div>Error loading employee details.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Employee Details</CardTitle>
        </CardHeader>
        <div className="space-x-2">
          <Button variant="outline" onClick={() => navigate('/employees')}>
            Back to Employees
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">Delete Employee</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete this employee from our servers.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>Continue</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  type="text"
                  id="name"
                  name="name"
                  value={employeeData.name || ''}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <Label htmlFor="nric">NRIC</Label>
                <Input
                  type="text"
                  id="nric"
                  name="nric"
                  value={employeeData.nric || ''}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="dateOfBirth">Date of Birth</Label>
                <Input
                  type="date"
                  id="dateOfBirth"
                  name="dateOfBirth"
                  value={employeeData.dateOfBirth || ''}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <Label htmlFor="residencyStatus">Residency Status</Label>
                <Select
                  name="residencyStatus"
                  defaultValue={employeeData.residencyStatus || 'Citizen'}
                  onValueChange={(value) => setEmployeeData(prevData => ({ ...prevData, residencyStatus: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Citizen">Citizen</SelectItem>
                    <SelectItem value="Permanent Resident">Permanent Resident</SelectItem>
                    <SelectItem value="Foreigner">Foreigner</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="type">Employee Type</Label>
                <Select
                  name="type"
                  defaultValue={employeeData.type || 'Full-Time'}
                  onValueChange={(value) => setEmployeeData(prevData => ({ ...prevData, type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Full-Time">Full-Time</SelectItem>
                    <SelectItem value="Casual">Casual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="joinDate">Join Date</Label>
                <Input
                  type="date"
                  id="joinDate"
                  name="joinDate"
                  value={employeeData.joinDate || ''}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <Separator className="my-4" />

            <CardHeader>
              <CardTitle>Salary Information</CardTitle>
            </CardHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="paymentType">Payment Type</Label>
                <Select
                  name="paymentType"
                  defaultValue={employeeData.paymentType || 'Monthly'}
                  onValueChange={(value) => setEmployeeData(prevData => ({ ...prevData, paymentType: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment type" />
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
                  <Label htmlFor="baseSalary">Base Salary</Label>
                  <Input
                    type="number"
                    id="baseSalary"
                    name="baseSalary"
                    value={employeeData.baseSalary === undefined ? '' : employeeData.baseSalary.toString()}
                    onChange={handleNumberInputChange}
                  />
                </div>
              )}

              {employeeData.paymentType === 'Hourly' && (
                <div>
                  <Label htmlFor="hourlyRate">Hourly Rate</Label>
                  <Input
                    type="number"
                    id="hourlyRate"
                    name="hourlyRate"
                    value={employeeData.hourlyRate === undefined ? '' : employeeData.hourlyRate.toString()}
                    onChange={handleNumberInputChange}
                  />
                </div>
              )}

              {employeeData.paymentType === 'Daily' && (
                <>
                  <div>
                    <Label htmlFor="dailyRate">Daily Rate</Label>
                    <Input
                      type="number"
                      id="dailyRate"
                      name="dailyRate"
                      value={employeeData.dailyRate === undefined ? '' : employeeData.dailyRate.toString()}
                      onChange={handleNumberInputChange}
                    />
                  </div>
                  <div>
                    <Label htmlFor="dailyWeekdayRate">Daily Weekday Rate</Label>
                    <Input
                      type="number"
                      id="dailyWeekdayRate"
                      name="dailyWeekdayRate"
                      value={employeeData.dailyWeekdayRate === undefined ? '' : employeeData.dailyWeekdayRate.toString()}
                      onChange={handleNumberInputChange}
                    />
                  </div>
                  <div>
                    <Label htmlFor="dailyWeekendRate">Daily Weekend Rate</Label>
                    <Input
                      type="number"
                      id="dailyWeekendRate"
                      name="dailyWeekendRate"
                      value={employeeData.dailyWeekendRate === undefined ? '' : employeeData.dailyWeekendRate.toString()}
                      onChange={handleNumberInputChange}
                    />
                  </div>
                </>
              )}
            </div>

            <Separator className="my-4" />

            <CardHeader>
              <CardTitle>Bank Information</CardTitle>
            </CardHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="bankName">Bank Name</Label>
                <Input
                  type="text"
                  id="bankName"
                  name="bankName"
                  value={employeeData.bankName || ''}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <Label htmlFor="bankAccount">Bank Account</Label>
                <Input
                  type="text"
                  id="bankAccount"
                  name="bankAccount"
                  value={employeeData.bankAccount || ''}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <Separator className="my-4" />

            <CardHeader>
              <CardTitle>Company Information</CardTitle>
            </CardHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="branch">Branch</Label>
                <Input
                  type="text"
                  id="branch"
                  name="branch"
                  value={employeeData.branch || ''}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <Label htmlFor="department">Department</Label>
                <Input
                  type="text"
                  id="department"
                  name="department"
                  value={employeeData.department || ''}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="position">Position</Label>
                <Input
                  type="text"
                  id="position"
                  name="position"
                  value={employeeData.position || ''}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <Separator className="my-4" />

            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  type="text"
                  id="phone"
                  name="phone"
                  value={employeeData.phone || ''}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <Label htmlFor="address">Address</Label>
                <Input
                  type="text"
                  id="address"
                  name="address"
                  value={employeeData.address || ''}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  type="email"
                  id="email"
                  name="email"
                  value={employeeData.email || ''}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <Separator className="my-4" />

            <CardHeader>
              <CardTitle>Resign Information</CardTitle>
            </CardHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="resignDate">Resign Date</Label>
                <div className="relative">
                  <DatePicker
                    id="resignDate"
                    onSelect={(date) => {
                      setResignDate(date);
                      handleDateChange(date, 'resignDate');
                    }}
                  />
                  {employeeData.resignDate && (
                    <p className="mt-2 text-sm text-gray-500">
                      Current Resign Date: {employeeData.resignDate}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <Button type="submit">Update Employee</Button>
          </form>
        </CardContent>
      </Card>

      {/* Location Exception Management */}
      <LocationExceptionManager 
        employeeId={id} 
        employeeName={employee?.name}
      />

      <Card>
        <CardContent>
          <div className="flex justify-end">
            <Button
              variant="destructive"
              onClick={() => setIsResigning(true)}
              disabled={isResigning}
            >
              {isResigning ? 'Resigning...' : 'Confirm Resignation'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Confirm Resignation Dialog */}
      <AlertDialog open={isResigning} onOpenChange={setIsResigning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Resignation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to confirm the resignation for this employee?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsResigning(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleResign}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default EmployeeDetails;
