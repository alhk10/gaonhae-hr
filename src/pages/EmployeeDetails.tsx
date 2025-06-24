import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Edit, Plus, Trash2, FileText, Calendar, DollarSign, Clock, BookOpen, Award, Settings } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { getEmployeeById } from '@/data/employeeData';
import { getEmployeeClaims } from '@/services/claimsService';
import { getEmployeeLeaveRecords } from '@/data/leaveData';
import { getEmployeeAttendanceRecords } from '@/data/attendanceData';
import { getEmployeeSlotBookings } from '@/data/slotBookingData';
import { AllowanceDeduction } from '@/types/employee';
import AdminAccessManager from '@/components/employee/AdminAccessManager';
import type { Claim } from '@/services/claimsService';

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Approved': return 'default';
    case 'Rejected': return 'destructive';
    default: return 'secondary';
  }
};

const EmployeeDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingAccess, setIsEditingAccess] = useState(false);
  const [employee, setEmployee] = useState(() => getEmployeeById(id || ''));
  const [employeeClaims, setEmployeeClaims] = useState<Claim[]>([]);
  const [isLoadingClaims, setIsLoadingClaims] = useState(true);
  
  // Get leave records for this employee
  const employeeLeaveRecords = getEmployeeLeaveRecords(id || '');

  // Get attendance records for this employee
  const employeeAttendanceRecords = getEmployeeAttendanceRecords(id || '');

  // Get slot booking records for this employee
  const employeeSlotBookings = getEmployeeSlotBookings(id || '');

  // Load claims data asynchronously
  useEffect(() => {
    const loadClaims = async () => {
      if (!id) return;
      
      try {
        setIsLoadingClaims(true);
        const claims = await getEmployeeClaims(id);
        setEmployeeClaims(claims);
      } catch (error) {
        console.error('Error loading employee claims:', error);
      } finally {
        setIsLoadingClaims(false);
      }
    };

    loadClaims();
  }, [id]);

  if (!employee) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex h-[calc(100vh-73px)]">
          <Sidebar />
          <main className="flex-1 p-6 overflow-auto">
            <div className="text-center">
              <p>Employee not found</p>
              <Button onClick={() => navigate('/employees')} className="mt-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Employees
              </Button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const handleEdit = () => {
    if (isEditing) {
      toast("Employee details updated successfully");
    }
    setIsEditing(!isEditing);
  };

  const handleEditAccess = () => {
    if (isEditingAccess) {
      toast("Admin access permissions updated successfully");
    }
    setIsEditingAccess(!isEditingAccess);
  };

  const handleAddAllowance = () => {
    const newAllowance: AllowanceDeduction = {
      id: Date.now(),
      name: 'New Allowance',
      amount: 0,
      type: 'Fixed'
    };
    setEmployee(prev => prev ? {
      ...prev,
      allowances: [...prev.allowances, newAllowance]
    } : null);
    toast("New allowance added");
  };

  const handleAddDeduction = () => {
    const newDeduction: AllowanceDeduction = {
      id: Date.now(),
      name: 'New Deduction',
      amount: 0,
      type: 'Fixed'
    };
    setEmployee(prev => prev ? {
      ...prev,
      deductions: [...prev.deductions, newDeduction]
    } : null);
    toast("New deduction added");
  };

  const handleRemoveAllowance = (id: number) => {
    setEmployee(prev => prev ? {
      ...prev,
      allowances: prev.allowances.filter(item => item.id !== id)
    } : null);
    toast("Allowance removed");
  };

  const handleRemoveDeduction = (id: number) => {
    setEmployee(prev => prev ? {
      ...prev,
      deductions: prev.deductions.filter(item => item.id !== id)
    } : null);
    toast("Deduction removed");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex h-[calc(100vh-73px)]">
        <Sidebar />
        <main className="flex-1 p-6 overflow-auto">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button variant="ghost" onClick={() => navigate('/employees')}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{employee.name}</h1>
                  <p className="text-gray-600">{employee.id} • {employee.department} • {employee.position}</p>
                </div>
              </div>
              <Button onClick={handleEdit} className="flex items-center space-x-2">
                <Edit className="w-4 h-4" />
                <span>{isEditing ? 'Save Changes' : 'Edit Employee'}</span>
              </Button>
            </div>

            <Tabs defaultValue="profile" className="space-y-6">
              <TabsList className="grid w-full grid-cols-7">
                <TabsTrigger value="profile">Profile</TabsTrigger>
                <TabsTrigger value="leave">Leave Records</TabsTrigger>
                <TabsTrigger value="claims">Claims</TabsTrigger>
                <TabsTrigger value="payslips">Payslips</TabsTrigger>
                <TabsTrigger value="attendance">Attendance</TabsTrigger>
                <TabsTrigger value="booking">Slot Booking</TabsTrigger>
                <TabsTrigger value="certificates">Certificates</TabsTrigger>
              </TabsList>

              <TabsContent value="profile">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Personal Information</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableBody>
                          <TableRow>
                            <TableCell className="font-medium">Full Name</TableCell>
                            <TableCell>{employee.name}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">Employee ID</TableCell>
                            <TableCell>{employee.id}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">NRIC/FIN</TableCell>
                            <TableCell>{employee.nric}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">Date of Birth</TableCell>
                            <TableCell>{employee.dateOfBirth}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">Residency Status</TableCell>
                            <TableCell>{employee.residencyStatus}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">Email</TableCell>
                            <TableCell>{employee.email || 'Not specified'}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">Phone</TableCell>
                            <TableCell>{employee.phone || 'Not specified'}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">Address</TableCell>
                            <TableCell>{employee.address || 'Not specified'}</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Work Information</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableBody>
                          <TableRow>
                            <TableCell className="font-medium">Department</TableCell>
                            <TableCell>{employee.department || 'Not specified'}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">Position</TableCell>
                            <TableCell>{employee.position || 'Not specified'}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">Employment Type</TableCell>
                            <TableCell>{employee.type}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">Payment Type</TableCell>
                            <TableCell>{employee.paymentType || 'Not specified'}</TableCell>
                          </TableRow>
                          {employee.baseSalary && (
                            <TableRow>
                              <TableCell className="font-medium">Base Salary</TableCell>
                              <TableCell>S${employee.baseSalary.toLocaleString()}</TableCell>
                            </TableRow>
                          )}
                          {employee.hourlyRate && (
                            <TableRow>
                              <TableCell className="font-medium">Hourly Rate</TableCell>
                              <TableCell>S${employee.hourlyRate}/hour</TableCell>
                            </TableRow>
                          )}
                          {employee.dailyRate && (
                            <TableRow>
                              <TableCell className="font-medium">Daily Rate</TableCell>
                              <TableCell>S${employee.dailyRate}/day</TableCell>
                            </TableRow>
                          )}
                          <TableRow>
                            <TableCell className="font-medium">Bank Name</TableCell>
                            <TableCell>{employee.bankName}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">Bank Account</TableCell>
                            <TableCell>{employee.bankAccount}</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>Allowances</CardTitle>
                        <Button size="sm" onClick={handleAddAllowance}>
                          <Plus className="w-4 h-4 mr-1" />
                          Add
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {employee.allowances.map((allowance) => (
                            <TableRow key={allowance.id}>
                              <TableCell>{allowance.name}</TableCell>
                              <TableCell>{allowance.type || 'Fixed'}</TableCell>
                              <TableCell>S${allowance.amount}</TableCell>
                              <TableCell>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleRemoveAllowance(allowance.id)}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                          {employee.allowances.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center text-gray-500">
                                No allowances configured
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>Deductions</CardTitle>
                        <Button size="sm" onClick={handleAddDeduction}>
                          <Plus className="w-4 h-4 mr-1" />
                          Add
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {employee.deductions.map((deduction) => (
                            <TableRow key={deduction.id}>
                              <TableCell>{deduction.name}</TableCell>
                              <TableCell>{deduction.type || 'Fixed'}</TableCell>
                              <TableCell>S${deduction.amount}</TableCell>
                              <TableCell>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleRemoveDeduction(deduction.id)}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                          {employee.deductions.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center text-gray-500">
                                No deductions configured
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </div>

                {employee.adminAccess && (
                  <div className="mt-6">
                    <Card>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle>Admin Access Permissions</CardTitle>
                          <Button onClick={handleEditAccess} size="sm" className="flex items-center space-x-2">
                            <Settings className="w-4 h-4" />
                            <span>{isEditingAccess ? 'Save Access' : 'Edit Access'}</span>
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <AdminAccessManager
                          adminAccess={employee.adminAccess}
                          onAdminAccessChange={(permissions) => {
                            setEmployee(prev => prev ? { ...prev, adminAccess: permissions } : null);
                          }}
                          isEditing={isEditingAccess}
                        />
                      </CardContent>
                    </Card>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="leave">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Calendar className="w-5 h-5" />
                      <span>Leave Records</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date Applied</TableHead>
                          <TableHead>Leave Type</TableHead>
                          <TableHead>Start Date</TableHead>
                          <TableHead>End Date</TableHead>
                          <TableHead>Days</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Reason</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {employeeLeaveRecords.length > 0 ? (
                          employeeLeaveRecords.map((leave) => (
                            <TableRow key={leave.id}>
                              <TableCell>{leave.appliedOn}</TableCell>
                              <TableCell>{leave.type}</TableCell>
                              <TableCell>{leave.startDate}</TableCell>
                              <TableCell>{leave.endDate}</TableCell>
                              <TableCell>{leave.days}</TableCell>
                              <TableCell>
                                <Badge variant={getStatusColor(leave.status)}>
                                  {leave.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="max-w-xs truncate">{leave.reason}</TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center text-gray-500">
                              No leave records found
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="claims">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <FileText className="w-5 h-5" />
                      <span>Claims Records</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isLoadingClaims ? (
                      <div className="text-center py-4">
                        <p>Loading claims...</p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date Submitted</TableHead>
                            <TableHead>Claim Type</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Description</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {employeeClaims.length > 0 ? (
                            employeeClaims.map((claim) => (
                              <TableRow key={claim.id}>
                                <TableCell>{claim.date}</TableCell>
                                <TableCell>{claim.type}</TableCell>
                                <TableCell>S${claim.amount.toFixed(2)}</TableCell>
                                <TableCell>
                                  <Badge variant={getStatusColor(claim.status)}>
                                    {claim.status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="max-w-xs truncate">{claim.description}</TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center text-gray-500">
                                No claims records found
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="payslips">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <DollarSign className="w-5 h-5" />
                      <span>Payslip Records</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Pay Period</TableHead>
                          <TableHead>Basic Salary</TableHead>
                          <TableHead>Allowances</TableHead>
                          <TableHead>Deductions</TableHead>
                          <TableHead>CPF Employee</TableHead>
                          <TableHead>Net Pay</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-gray-500">
                            No payslip records found
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="attendance">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Clock className="w-5 h-5" />
                      <span>Attendance Records</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Check In</TableHead>
                          <TableHead>Check Out</TableHead>
                          <TableHead>Hours Worked</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Location</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {employeeAttendanceRecords.length > 0 ? (
                          employeeAttendanceRecords.map((record) => (
                            <TableRow key={record.id}>
                              <TableCell>{record.date}</TableCell>
                              <TableCell>{record.clockIn || '-'}</TableCell>
                              <TableCell>{record.clockOut || '-'}</TableCell>
                              <TableCell>{record.hours}h</TableCell>
                              <TableCell>
                                <Badge variant={record.status === 'Present' ? 'default' : 'secondary'}>
                                  {record.status}
                                </Badge>
                              </TableCell>
                              <TableCell>{record.location || '-'}</TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center text-gray-500">
                              No attendance records found
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="booking">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <BookOpen className="w-5 h-5" />
                      <span>Slot Booking Records</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Branch</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Booked On</TableHead>
                          <TableHead>Approved By</TableHead>
                          <TableHead>Approved On</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {employeeSlotBookings.length > 0 ? (
                          employeeSlotBookings.map((booking) => (
                            <TableRow key={booking.id}>
                              <TableCell>{booking.date}</TableCell>
                              <TableCell>{booking.branchName}</TableCell>
                              <TableCell>
                                <Badge variant={getStatusColor(booking.status)}>
                                  {booking.status}
                                </Badge>
                              </TableCell>
                              <TableCell>{booking.bookedOn}</TableCell>
                              <TableCell>{booking.approvedBy || '-'}</TableCell>
                              <TableCell>{booking.approvedOn || '-'}</TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center text-gray-500">
                              No slot booking records found
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="certificates">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Award className="w-5 h-5" />
                      <span>Certificate Uploads</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Certificate Name</TableHead>
                          <TableHead>File Name</TableHead>
                          <TableHead>Upload Date</TableHead>
                          <TableHead>File Size</TableHead>
                          <TableHead>File Type</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {employee.certificates && employee.certificates.length > 0 ? (
                          employee.certificates.map((cert) => (
                            <TableRow key={cert.id}>
                              <TableCell>{cert.name}</TableCell>
                              <TableCell>{cert.fileName}</TableCell>
                              <TableCell>{cert.uploadDate}</TableCell>
                              <TableCell>{(cert.fileSize / 1024).toFixed(2)} KB</TableCell>
                              <TableCell>{cert.fileType}</TableCell>
                              <TableCell>
                                <Button size="sm" variant="outline">
                                  Download
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center text-gray-500">
                              No certificates uploaded
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
};

export default EmployeeDetails;
