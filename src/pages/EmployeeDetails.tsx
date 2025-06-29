
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Edit, Save, X, User, Briefcase, CreditCard, Plus, Trash2, FileText, Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { getEmployeeById, updateEmployee } from '@/services/employeeService';
import { getBranches } from '@/services/settingsService';
import { EmployeeProfile } from '@/types/employee';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/contexts/AuthContext';

const EmployeeDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const [employee, setEmployee] = useState<EmployeeProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Get branches data
  const branches = getBranches();

  useEffect(() => {
    const loadEmployee = async () => {
      if (!id) return;
      
      try {
        setIsLoading(true);
        const data = await getEmployeeById(id);
        if (data) {
          setEmployee(data);
        } else {
          toast.error("Employee not found");
          navigate('/employees');
        }
      } catch (error) {
        console.error('Error loading employee:', error);
        toast.error("Failed to load employee data");
      } finally {
        setIsLoading(false);
      }
    };

    loadEmployee();
  }, [id, navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    if (!employee) return;
    
    const value = e.target.value;
    setEmployee(prev => prev ? {
      ...prev,
      [field]: value
    } : null);
  };

  const handleSelectChange = (value: string, field: string) => {
    if (!employee) return;
    
    setEmployee(prev => prev ? {
      ...prev,
      [field]: value
    } : null);
  };

  const handleSave = async () => {
    if (!employee || !id) return;

    try {
      setIsSaving(true);
      await updateEmployee(id, employee);
      setIsEditing(false);
      toast.success("Employee updated successfully");
    } catch (error) {
      console.error('Error updating employee:', error);
      toast.error("Failed to update employee");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Reload employee data to reset changes
    if (id) {
      getEmployeeById(id).then(data => {
        if (data) setEmployee(data);
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex h-[calc(100vh-73px)]">
          {!isMobile && <Sidebar />}
          <main className="flex-1 p-3 md:p-6 overflow-auto">
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
                <p className="text-gray-600">Loading employee details...</p>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex h-[calc(100vh-73px)]">
          {!isMobile && <Sidebar />}
          <main className="flex-1 p-3 md:p-6 overflow-auto">
            <div className="text-center">
              <p className="text-red-600">Employee not found</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex h-[calc(100vh-73px)]">
        {!isMobile && <Sidebar />}
        <main className="flex-1 p-3 md:p-6 overflow-auto">
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/employees')}
                  className="flex items-center space-x-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Employees</span>
                </Button>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{employee.name}</h1>
                  <p className="text-gray-600">Employee ID: {employee.id}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {isEditing ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={handleCancel}
                      disabled={isSaving}
                      className="flex items-center space-x-2"
                    >
                      <X className="w-4 h-4" />
                      <span>Cancel</span>
                    </Button>
                    <Button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="flex items-center space-x-2"
                    >
                      {isSaving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center space-x-2"
                  >
                    <Edit className="w-4 h-4" />
                    <span>Edit Employee</span>
                  </Button>
                )}
              </div>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Personal Information */}
              <div className="space-y-6">
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center space-x-2">
                      <User className="w-5 h-5" />
                      <span>Personal Information</span>
                    </CardTitle>
                    <CardDescription>Basic personal details</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 p-6">
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
                      <Label htmlFor="nric" className="text-sm font-medium text-gray-700">NRIC/FIN</Label>
                      <Input 
                        id="nric" 
                        value={employee.nric} 
                        onChange={(e) => handleInputChange(e, 'nric')} 
                        disabled={!isEditing}
                        className="mt-1"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="dateOfBirth" className="text-sm font-medium text-gray-700">Date of Birth</Label>
                      <Input 
                        id="dateOfBirth" 
                        type="date"
                        value={employee.dateOfBirth} 
                        onChange={(e) => handleInputChange(e, 'dateOfBirth')} 
                        disabled={!isEditing}
                        className="mt-1"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="residencyStatus" className="text-sm font-medium text-gray-700">Residency Status</Label>
                      {isEditing ? (
                        <Select value={employee.residencyStatus} onValueChange={(value) => handleSelectChange(value, 'residencyStatus')}>
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Singapore Citizen">Singapore Citizen</SelectItem>
                            <SelectItem value="Permanent Resident Year 1">Permanent Resident Year 1</SelectItem>
                            <SelectItem value="Permanent Resident Year 2">Permanent Resident Year 2</SelectItem>
                            <SelectItem value="Work Permit">Work Permit</SelectItem>
                            <SelectItem value="S Pass">S Pass</SelectItem>
                            <SelectItem value="Employment Pass">Employment Pass</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input 
                          value={employee.residencyStatus} 
                          disabled={true}
                          className="mt-1"
                        />
                      )}
                    </div>

                    <div>
                      <Label htmlFor="email" className="text-sm font-medium text-gray-700">Email</Label>
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
                      <Label htmlFor="phone" className="text-sm font-medium text-gray-700">Phone</Label>
                      <Input 
                        id="phone" 
                        value={employee.phone || ''} 
                        onChange={(e) => handleInputChange(e, 'phone')} 
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

              {/* Employment Information */}
              <div className="space-y-6">
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center space-x-2">
                      <Briefcase className="w-5 h-5" />
                      <span>Employment Details</span>
                    </CardTitle>
                    <CardDescription>Job information and status</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 p-6">
                    <div>
                      <Label htmlFor="branch" className="text-sm font-medium text-gray-700">Branch</Label>
                      {isEditing ? (
                        <Select value={employee.branch || employee.department || ''} onValueChange={(value) => handleSelectChange(value, 'branch')}>
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Select a branch" />
                          </SelectTrigger>
                          <SelectContent>
                            {branches.map((branch) => (
                              <SelectItem key={branch.id} value={branch.name}>
                                {branch.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input 
                          value={employee.branch || employee.department || 'Not specified'} 
                          disabled={true}
                          className="mt-1"
                        />
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="type" className="text-sm font-medium text-gray-700">Employee Type</Label>
                        {isEditing ? (
                          <Select value={employee.type} onValueChange={(value) => handleSelectChange(value, 'type')}>
                            <SelectTrigger className="mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Full-Time">Full-Time</SelectItem>
                              <SelectItem value="Casual">Casual</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input 
                            value={employee.type} 
                            disabled={true}
                            className="mt-1"
                          />
                        )}
                      </div>

                      <div>
                        <Label htmlFor="paymentType" className="text-sm font-medium text-gray-700">Payment Type</Label>
                        {isEditing ? (
                          <Select value={employee.paymentType || 'Monthly'} onValueChange={(value) => handleSelectChange(value, 'paymentType')}>
                            <SelectTrigger className="mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Monthly">Monthly</SelectItem>
                              <SelectItem value="Hourly">Hourly</SelectItem>
                              <SelectItem value="Daily">Daily</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input 
                            value={employee.paymentType || 'Monthly'} 
                            disabled={true}
                            className="mt-1"
                          />
                        )}
                      </div>
                    </div>

                    {/* Show Base Salary for Monthly payment */}
                    {employee.paymentType === 'Monthly' && (
                      <div>
                        <Label htmlFor="baseSalary" className="text-sm font-medium text-gray-700">Base Salary (S$)</Label>
                        <Input 
                          id="baseSalary" 
                          type="number"
                          step="0.01"
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
                          id="hourlyRate" 
                          type="number"
                          step="0.01"
                          value={employee.hourlyRate || ''} 
                          onChange={(e) => handleInputChange(e, 'hourlyRate')} 
                          disabled={!isEditing}
                          className="mt-1"
                        />
                      </div>
                    )}

                    {employee.paymentType === 'Daily' && (
                      <>
                        <div>
                          <Label htmlFor="dailyWeekdayRate" className="text-sm font-medium text-gray-700">Daily Weekday Rate (S$)</Label>
                          <Input 
                            id="dailyWeekdayRate" 
                            type="number"
                            step="0.01"
                            value={employee.dailyWeekdayRate || ''} 
                            onChange={(e) => handleInputChange(e, 'dailyWeekdayRate')} 
                            disabled={!isEditing}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="dailyWeekendRate" className="text-sm font-medium text-gray-700">Daily Weekend Rate (S$)</Label>
                          <Input 
                            id="dailyWeekendRate" 
                            type="number"
                            step="0.01"
                            value={employee.dailyWeekendRate || ''} 
                            onChange={(e) => handleInputChange(e, 'dailyWeekendRate')} 
                            disabled={!isEditing}
                            className="mt-1"
                          />
                        </div>
                      </>
                    )}

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

                    {/* Superadmin can edit join date */}
                    {user?.role === 'superadmin' && (
                      <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
                        <Label htmlFor="joinDate" className="text-blue-800 font-medium">Join Date</Label>
                        <Input 
                          id="joinDate" 
                          type="date"
                          value={employee.joinDate || ''} 
                          onChange={(e) => handleInputChange(e, 'joinDate')} 
                          disabled={!isEditing}
                          className="mt-1 border-blue-300 focus:border-blue-500"
                        />
                        <p className="text-xs text-blue-600 mt-2 font-medium">
                          ⚠️ Join date affects leave entitlement calculations and pro-rating
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Bank Details */}
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center space-x-2">
                      <CreditCard className="w-5 h-5" />
                      <span>Bank Details</span>
                    </CardTitle>
                    <CardDescription>Banking information for salary payments</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 p-6">
                    <div>
                      <Label htmlFor="bankName" className="text-sm font-medium text-gray-700">Bank Name</Label>
                      <Input 
                        id="bankName" 
                        value={employee.bankName} 
                        onChange={(e) => handleInputChange(e, 'bankName')} 
                        disabled={!isEditing}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="bankAccount" className="text-sm font-medium text-gray-700">Bank Account Number</Label>
                      <Input 
                        id="bankAccount" 
                        value={employee.bankAccount} 
                        onChange={(e) => handleInputChange(e, 'bankAccount')} 
                        disabled={!isEditing}
                        className="mt-1"
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Allowances and Deductions */}
            {(employee.allowances?.length > 0 || employee.deductions?.length > 0) && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {employee.allowances?.length > 0 && (
                  <Card>
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center space-x-2">
                        <Plus className="w-5 h-5 text-green-600" />
                        <span>Allowances</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {employee.allowances.map((allowance) => (
                          <div key={allowance.id} className="flex justify-between items-center p-3 bg-green-50 rounded border-l-4 border-green-500">
                            <div>
                              <span className="font-medium text-green-800">{allowance.name}</span>
                              <p className="text-xs text-green-600">{allowance.type}</p>
                            </div>
                            <span className="text-green-700 font-semibold">
                              +S${allowance.amount}
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {employee.deductions?.length > 0 && (
                  <Card>
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center space-x-2">
                        <Trash2 className="w-5 h-5 text-red-600" />
                        <span>Deductions</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {employee.deductions.map((deduction) => (
                          <div key={deduction.id} className="flex justify-between items-center p-3 bg-red-50 rounded border-l-4 border-red-500">
                            <div>
                              <span className="font-medium text-red-800">{deduction.name}</span>
                              <p className="text-xs text-red-600">{deduction.type}</p>
                            </div>
                            <span className="text-red-700 font-semibold">
                              -S${deduction.amount}
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default EmployeeDetails;
