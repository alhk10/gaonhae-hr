
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Plus, Clock, AlertCircle, Info } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { getEmployeeById } from '@/services/employeeService';
import { getAllLeaveRequests, addLeaveRequest, LeaveRequest } from '@/services/leaveService';
import MedicalCertificateUpload from '@/components/leave/MedicalCertificateUpload';
import { calculateLeaveBalance, getLeaveEntitlementSummary } from '@/utils/leaveCalculations';

const ApplyLeave = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [selectedLeaveType, setSelectedLeaveType] = useState('');
  const [medicalCertificate, setMedicalCertificate] = useState<File | null>(null);
  
  // Get current employee data from Supabase
  const { data: currentEmployee, isLoading: employeeLoading, error: employeeError } = useQuery({
    queryKey: ['employee', user?.id],
    queryFn: () => getEmployeeById(user?.id || ''),
    enabled: !!user?.id,
  });

  // Get all leave requests to filter for current employee
  const { data: allLeaveRequests = [], isLoading: leavesLoading } = useQuery({
    queryKey: ['leave-requests'],
    queryFn: getAllLeaveRequests,
  });

  // Filter leave history for current employee
  const leaveHistory = allLeaveRequests.filter(leave => leave.employeeId === user?.id);

  // Calculate leave balance using new calculation method
  const leaveBalance = currentEmployee?.join_date 
    ? calculateLeaveBalance(currentEmployee.id, currentEmployee.join_date, allLeaveRequests)
    : { annualLeave: { total: 0, used: 0, remaining: 0 }, medicalLeave: { total: 14, used: 0, remaining: 14 } };

  // Mutation for adding leave request
  const addLeaveMutation = useMutation({
    mutationFn: addLeaveRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
      toast("Leave application submitted successfully");
      setShowApplyForm(false);
      setMedicalCertificate(null);
      setSelectedLeaveType('');
    },
    onError: (error) => {
      console.error('Error submitting leave:', error);
      toast("Error submitting leave application. Please try again.");
    }
  });

  if (employeeLoading || leavesLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex h-[calc(100vh-73px)]">
          <Sidebar />
          <main className="flex-1 p-6 overflow-auto">
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading employee data...</p>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (employeeError || !currentEmployee) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex h-[calc(100vh-73px)]">
          <Sidebar />
          <main className="flex-1 p-6 overflow-auto">
            <div className="text-center">
              <p>Employee data not found. Please contact HR.</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // Check if employee is casual - casual employees are not entitled to leaves
  if (currentEmployee.type === 'Casual') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex h-[calc(100vh-73px)]">
          <Sidebar />
          <main className="flex-1 p-6 overflow-auto">
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Leave Management</h2>
                <p className="text-gray-600">Employee leave information</p>
                <p className="text-sm text-gray-500 mt-1">
                  Employee: {currentEmployee.name} ({currentEmployee.id})
                </p>
              </div>

              <Card>
                <CardContent className="p-8">
                  <div className="text-center">
                    <AlertCircle className="w-16 h-16 text-orange-500 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      Leave Not Applicable
                    </h3>
                    <p className="text-gray-600 mb-4">
                      As a casual employee, you are not entitled to annual leave or medical leave benefits.
                    </p>
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-left">
                      <h4 className="font-medium text-orange-800 mb-2">Casual Employee Policy:</h4>
                      <ul className="text-sm text-orange-700 space-y-1">
                        <li>• No annual leave entitlement</li>
                        <li>• No medical leave entitlement</li>
                        <li>• Pay is based on actual hours/days worked</li>
                        <li>• Contact HR for any work-related inquiries</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const currentLeaveStatus = [
    { 
      type: 'Annual Leave', 
      total: leaveBalance.annualLeave.total, 
      used: leaveBalance.annualLeave.used, 
      remaining: leaveBalance.annualLeave.remaining 
    },
    { 
      type: 'Medical Leave', 
      total: leaveBalance.medicalLeave.total, 
      used: leaveBalance.medicalLeave.used, 
      remaining: leaveBalance.medicalLeave.remaining 
    },
  ];

  const handleSubmitLeave = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    
    const leaveType = formData.get('leaveType') as string;
    const leaveDate = formData.get('leaveDate') as string;
    const reason = formData.get('reason') as string;
    
    if (!leaveType || !leaveDate || !reason) {
      toast("Please fill in all required fields");
      return;
    }

    // Check if medical certificate is required for Medical Leave
    if (leaveType === 'Medical Leave' && !medicalCertificate) {
      toast("Medical certificate is required for Medical Leave");
      return;
    }

    // Check if employee has remaining leave days
    const selectedLeaveBalance = currentLeaveStatus.find(leave => leave.type === leaveType);
    if (selectedLeaveBalance && selectedLeaveBalance.remaining <= 0) {
      toast(`No remaining ${leaveType.toLowerCase()} days available`);
      return;
    }

    const newLeave: Omit<LeaveRequest, 'id'> = {
      employeeId: currentEmployee.id,
      employeeName: currentEmployee.name,
      type: leaveType,
      startDate: leaveDate,
      endDate: leaveDate, // Single day leave
      days: 1,
      status: 'Pending',
      reason,
      appliedOn: new Date().toISOString().split('T')[0],
      medicalCertificate: medicalCertificate ? medicalCertificate.name : undefined
    };

    addLeaveMutation.mutate(newLeave);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Approved':
        return 'bg-green-100 text-green-800';
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'Rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (showApplyForm) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex h-[calc(100vh-73px)]">
          <Sidebar />
          <main className="flex-1 p-6 overflow-auto">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Apply for Leave</h2>
                  <p className="text-gray-600">Submit your leave application</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Employee: {currentEmployee.name} ({currentEmployee.id})
                  </p>
                </div>
                <Button variant="outline" onClick={() => setShowApplyForm(false)}>
                  Back to Leave Summary
                </Button>
              </div>

              {/* Leave Entitlement Information */}
              {currentEmployee.join_date && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <h3 className="font-medium text-blue-900">Your Annual Leave Entitlement</h3>
                      <p className="text-sm text-blue-700 mt-1">
                        {getLeaveEntitlementSummary(currentEmployee.join_date)}
                      </p>
                      <p className="text-xs text-blue-600 mt-1">
                        Based on join date: {new Date(currentEmployee.join_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {currentLeaveStatus.map((leave) => (
                  <Card key={leave.type}>
                    <CardContent className="p-6">
                      <div className="text-center">
                        <p className="text-sm font-medium text-gray-600">{leave.type}</p>
                        <p className="text-2xl font-bold text-gray-900">{leave.remaining}</p>
                        <p className="text-sm text-gray-500">remaining</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Leave Application Form</CardTitle>
                  <CardDescription>Fill out the details for your leave request (All leaves are 1 day)</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmitLeave} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Leave Type</label>
                        <select 
                          name="leaveType" 
                          className="w-full p-2 border border-gray-300 rounded-lg" 
                          required
                          value={selectedLeaveType}
                          onChange={(e) => setSelectedLeaveType(e.target.value)}
                        >
                          <option value="">Select leave type</option>
                          <option value="Annual Leave">Annual Leave</option>
                          <option value="Medical Leave">Medical Leave</option>
                          <option value="Emergency Leave">Emergency Leave</option>
                          <option value="Maternity Leave">Maternity Leave</option>
                          <option value="Paternity Leave">Paternity Leave</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Leave Date</label>
                        <input name="leaveDate" type="date" className="w-full p-2 border border-gray-300 rounded-lg" required />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Reason</label>
                      <textarea 
                        name="reason"
                        rows={3} 
                        className="w-full p-2 border border-gray-300 rounded-lg"
                        placeholder="Please provide a reason for your leave..."
                        required
                      ></textarea>
                    </div>
                    
                    {selectedLeaveType === 'Medical Leave' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Medical Certificate <span className="text-red-500">*</span>
                        </label>
                        <MedicalCertificateUpload 
                          onFileUpload={setMedicalCertificate}
                          uploadedFile={medicalCertificate}
                        />
                        <p className="text-sm text-red-600 mt-1">Medical certificate is required for Medical Leave</p>
                      </div>
                    )}
                    
                    {selectedLeaveType && selectedLeaveType !== 'Medical Leave' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Supporting Documents (if any)</label>
                        <input 
                          type="file" 
                          className="w-full p-2 border border-gray-300 rounded-lg"
                          accept=".pdf,.jpg,.jpeg,.png"
                        />
                      </div>
                    )}
                    
                    <Button 
                      type="submit" 
                      className="w-full"
                      disabled={addLeaveMutation.isPending || (selectedLeaveType === 'Medical Leave' && !medicalCertificate)}
                    >
                      {addLeaveMutation.isPending ? 'Submitting...' : 'Submit Leave Application'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
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
        <Sidebar />
        <main className="flex-1 p-6 overflow-auto">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Leave Summary</h2>
                <p className="text-gray-600">Your leave balance and history</p>
                <p className="text-sm text-gray-500 mt-1">
                  Employee: {currentEmployee.name} ({currentEmployee.id})
                </p>
              </div>
              <Button onClick={() => setShowApplyForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Apply for Leave
              </Button>
            </div>

            {/* Leave Entitlement Information */}
            {currentEmployee.join_date && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-blue-900">Your Annual Leave Entitlement</h3>
                    <p className="text-sm text-blue-700 mt-1">
                      {getLeaveEntitlementSummary(currentEmployee.join_date)}
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      Based on join date: {new Date(currentEmployee.join_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Leave Balance Widget */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {currentLeaveStatus.map((leave) => (
                <Card key={leave.type} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="text-center">
                      <h3 className="font-medium text-gray-900 mb-2">{leave.type}</h3>
                      <div className="space-y-2">
                        <div className="text-3xl font-bold text-blue-600">{leave.remaining}</div>
                        <div className="text-sm text-gray-500">days remaining</div>
                        <div className="text-xs text-gray-400">
                          {leave.used} of {leave.total} used
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${leave.total > 0 ? (leave.used / leave.total) * 100 : 0}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Leave History Panel */}
            <Card>
              <CardHeader>
                <CardTitle>Leave History</CardTitle>
                <CardDescription>Your recent leave applications and their status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {leaveHistory.length > 0 ? (
                    leaveHistory.map((leave) => (
                      <div key={leave.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-4">
                          <Calendar className="w-5 h-5 text-gray-400" />
                          <div>
                            <p className="font-medium text-gray-900">{leave.startDate}</p>
                            <p className="text-sm text-gray-600">{leave.type}</p>
                            <p className="text-sm text-gray-500">{leave.reason}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge className={getStatusColor(leave.status)}>
                            {leave.status}
                          </Badge>
                          <p className="text-xs text-gray-500 mt-1">
                            <Clock className="w-3 h-3 inline mr-1" />
                            Applied: {leave.appliedOn}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-gray-500 py-8">
                      No leave history found
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ApplyLeave;
