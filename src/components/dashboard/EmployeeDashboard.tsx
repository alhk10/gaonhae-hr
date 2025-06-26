
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, FileText, Clock, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { getEmployeeClaims } from '@/services/claimsService';
import { getEmployeeAttendanceRecords } from '@/services/attendanceService';
import { getEmployeeById } from '@/services/employeeService';
import { useAuth } from '@/contexts/AuthContext';
import { EmployeeProfile } from '@/types/employee';
import { getEmployeeById as getLocalEmployeeById } from '@/data/employeeData';
import { updateClockInOut, getClockInOutStatus } from '@/data/attendanceData';

const EmployeeDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [clockTime, setClockTime] = useState<string | null>(null);
  const [employeeData, setEmployeeData] = useState<EmployeeProfile | null>(null);

  // Try to fetch employee data from Supabase first, then fallback to local data
  const { data: supabaseEmployee, error: supabaseError } = useQuery({
    queryKey: ['current-employee', user?.id],
    queryFn: () => getEmployeeById(user?.id || ''),
    enabled: !!user?.id,
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });

  // Update employee data when query resolves or falls back to local data
  useEffect(() => {
    console.log('EmployeeDashboard: Loading employee data for user:', user);
    
    if (supabaseEmployee) {
      console.log('EmployeeDashboard: Using Supabase employee data:', supabaseEmployee);
      setEmployeeData(supabaseEmployee);
    } else if (supabaseError) {
      console.log('EmployeeDashboard: Supabase error, falling back to local data for:', user?.id);
      const localEmployee = getLocalEmployeeById(user?.id || '');
      if (localEmployee) {
        console.log('EmployeeDashboard: Using local employee data:', localEmployee);
        setEmployeeData(localEmployee);
      } else {
        console.log('EmployeeDashboard: No employee data found in local or Supabase');
        setEmployeeData(null);
      }
    }
  }, [supabaseEmployee, supabaseError, user?.id]);

  // Check clock-in status on load
  useEffect(() => {
    if (user?.id) {
      const clockStatus = getClockInOutStatus(user.id);
      if (clockStatus) {
        setIsClockedIn(clockStatus.status === 'clocked-in');
        setClockTime(clockStatus.clockIn || null);
      }
    }
  }, [user?.id]);

  // Fetch employee-specific data
  const { data: employeeClaims = [], error: claimsError } = useQuery({
    queryKey: ['employee-claims', user?.id],
    queryFn: () => getEmployeeClaims(user?.id || ''),
    enabled: !!user?.id,
    retry: 3,
    staleTime: 5 * 60 * 1000,
  });

  const { data: attendanceRecords = [], error: attendanceError } = useQuery({
    queryKey: ['employee-attendance', user?.id],
    queryFn: () => getEmployeeAttendanceRecords(user?.id || ''),
    enabled: !!user?.id,
    retry: 3,
    staleTime: 5 * 60 * 1000,
  });

  // Calculate real stats
  const pendingClaims = employeeClaims.filter(claim => claim.status === 'Pending').length;
  const hoursThisMonth = attendanceRecords.reduce((total, record) => total + (record.hours || 0), 0);
  
  const personalStats = [
    { title: 'Leave Balance', value: '18 days', icon: Calendar, color: 'bg-blue-500' },
    { title: 'Pending Claims', value: pendingClaims.toString(), icon: FileText, color: 'bg-orange-500' },
    { title: 'Hours This Month', value: `${hoursThisMonth}h`, icon: Clock, color: 'bg-green-500' },
    { title: 'Next Payroll', value: '3 days', icon: DollarSign, color: 'bg-purple-500' },
  ];

  const handleClockInOut = () => {
    if (!user?.id) {
      toast.error('User not authenticated');
      return;
    }

    const currentTime = new Date().toLocaleTimeString('en-SG', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit'
    });
    
    try {
      if (isClockedIn) {
        // Clock out
        updateClockInOut(user.id, 'out');
        setIsClockedIn(false);
        setClockTime(null);
        toast.success(`Clocked out at ${currentTime}`);
      } else {
        // Clock in
        updateClockInOut(user.id, 'in');
        setIsClockedIn(true);
        setClockTime(currentTime);
        toast.success(`Clocked in at ${currentTime}`);
      }
    } catch (error) {
      console.error('Clock in/out error:', error);
      toast.error('Failed to update clock status');
    }
  };

  const handleApplyLeave = () => {
    console.log('Navigating to apply leave page');
    navigate('/apply-leave');
  };

  const handleSubmitClaim = () => {
    console.log('Navigating to submit claim page');
    navigate('/submit-claim');
  };

  const handleViewPayslip = () => {
    console.log('Navigating to payslips page');
    navigate('/payslips');
  };

  const displayName = employeeData?.name || user?.name || 'Employee';
  const displayDepartment = employeeData?.branch || user?.department || 'Not specified';
  const displayEmployeeId = employeeData?.id || user?.id || user?.employeeId || 'Not specified';

  // Debug logging
  console.log('EmployeeDashboard: Current state:', {
    user,
    employeeData,
    employeeClaims: employeeClaims.length,
    attendanceRecords: attendanceRecords.length,
    pendingClaims,
    hoursThisMonth,
    isClockedIn,
    clockTime
  });

  if (claimsError) {
    console.error('EmployeeDashboard: Error loading claims:', claimsError);
  }
  if (attendanceError) {
    console.error('EmployeeDashboard: Error loading attendance:', attendanceError);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Welcome back, {displayName}</h2>
        <p className="text-gray-600">Employee ID: {displayEmployeeId} • {displayDepartment}</p>
        {employeeData?.position && (
          <p className="text-gray-600">Position: {employeeData.position}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {personalStats.map((stat) => (
          <Card key={stat.title} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common HR tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3">
              <Button 
                className={`justify-start h-auto p-4 ${isClockedIn ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
                onClick={handleClockInOut}
              >
                <Clock className="w-5 h-5 mr-3" />
                <div className="text-left">
                  <p className="font-medium text-white">
                    {isClockedIn ? 'Clock Out' : 'Clock In'}
                  </p>
                  <p className="text-sm text-white/80">
                    {isClockedIn && clockTime ? `Clocked in at ${clockTime}` : 'Start your work day'}
                  </p>
                </div>
              </Button>
              
              <Button 
                className="justify-start h-auto p-4" 
                variant="outline"
                onClick={handleApplyLeave}
              >
                <Calendar className="w-5 h-5 mr-3" />
                <div className="text-left">
                  <p className="font-medium">Apply for Leave</p>
                  <p className="text-sm text-gray-500">Submit new leave request</p>
                </div>
              </Button>
              
              <Button 
                className="justify-start h-auto p-4" 
                variant="outline"
                onClick={handleSubmitClaim}
              >
                <FileText className="w-5 h-5 mr-3" />
                <div className="text-left">
                  <p className="font-medium">Submit Claim</p>
                  <p className="text-sm text-gray-500">Medical, transport, or other claims</p>
                </div>
              </Button>
              
              <Button 
                className="justify-start h-auto p-4" 
                variant="outline"
                onClick={handleViewPayslip}
              >
                <Clock className="w-5 h-5 mr-3" />
                <div className="text-left">
                  <p className="font-medium">View Payslip</p>
                  <p className="text-sm text-gray-500">Download latest payslip</p>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Your latest HR transactions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {employeeClaims.slice(0, 3).map((claim) => (
                <div key={claim.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{claim.type}</p>
                    <p className="text-sm text-gray-600">S${claim.amount} • {claim.date}</p>
                  </div>
                  <Badge variant={
                    claim.status === 'Approved' ? 'default' : 
                    claim.status === 'Pending' ? 'secondary' : 'outline'
                  }>
                    {claim.status}
                  </Badge>
                </div>
              ))}
              {employeeClaims.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">No recent activity</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Employee Profile Summary */}
      {employeeData && (
        <Card>
          <CardHeader>
            <CardTitle>Profile Summary</CardTitle>
            <CardDescription>Your employment details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-600">Employment Type</p>
                <p className="text-lg text-gray-900">{employeeData.type}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Payment Type</p>
                <p className="text-lg text-gray-900">{employeeData.paymentType || 'Not specified'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Bank</p>
                <p className="text-lg text-gray-900">{employeeData.bankName || 'Not specified'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EmployeeDashboard;
