
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { getAllLeaveRequests } from '@/services/leaveService';
import { getEmployees } from '@/services/employeeService';
import { calculateLeaveBalance } from '@/utils/leaveCalculations';

const LeaveSummaryPanel = () => {
  const { data: allLeaveRequests = [] } = useQuery({
    queryKey: ['leave-requests'],
    queryFn: getAllLeaveRequests,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: getEmployees,
  });

  // Calculate real leave statistics using new calculation method
  const today = new Date();
  const next30Days = new Date();
  next30Days.setDate(today.getDate() + 30);
  
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  
  const currentYear = new Date().getFullYear();

  // Filter full-time employees excluding Senior Partners
  const eligibleEmployees = employees.filter(emp => 
    emp.type === 'Full-Time' && emp.position !== 'Senior Partner'
  );

  // Upcoming leave (next 30 days)
  const upcomingLeave = allLeaveRequests.filter(leave => {
    if (leave.status !== 'Approved') return false;
    const startDate = new Date(leave.startDate || leave.start_date);
    return startDate >= today && startDate <= next30Days;
  }).length;

  // Calculate total annual leave remaining using async calculation
  const [totalAnnualLeaveRemaining, setTotalAnnualLeaveRemaining] = React.useState(0);

  React.useEffect(() => {
    const calculateTotalRemaining = async () => {
      let total = 0;
      for (const employee of eligibleEmployees) {
        if (employee.joinDate || employee.join_date) {
          try {
            const leaveBalance = await calculateLeaveBalance(
              employee.id, 
              employee.joinDate || employee.join_date, 
              allLeaveRequests
            );
            total += leaveBalance.annualLeave.remaining;
          } catch (error) {
            console.error(`Error calculating leave balance for ${employee.id}:`, error);
          }
        }
      }
      setTotalAnnualLeaveRemaining(total);
    };

    if (eligibleEmployees.length > 0 && allLeaveRequests.length > 0) {
      calculateTotalRemaining();
    }
  }, [eligibleEmployees, allLeaveRequests]);

  // Approved leave this month
  const approvedLeaveThisMonth = allLeaveRequests.filter(leave => {
    if (leave.status !== 'Approved') return false;
    const startDate = new Date(leave.startDate || leave.start_date);
    return startDate >= startOfMonth && startDate <= endOfMonth;
  }).length;

  // Pending approval
  const pendingApproval = allLeaveRequests.filter(leave => leave.status === 'Pending').length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Upcoming Leave</p>
              <p className="text-2xl font-bold text-gray-900">{upcomingLeave}</p>
              <p className="text-xs text-gray-500">Next 30 days</p>
            </div>
            <Calendar className="w-8 h-8 text-blue-500" />
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Annual Leave Remaining</p>
              <p className="text-2xl font-bold text-gray-900">{Math.max(0, totalAnnualLeaveRemaining)}</p>
              <p className="text-xs text-gray-500">Eligible employees only</p>
            </div>
            <Clock className="w-8 h-8 text-green-500" />
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Approved Leave</p>
              <p className="text-2xl font-bold text-gray-900">{approvedLeaveThisMonth}</p>
              <p className="text-xs text-gray-500">This month</p>
            </div>
            <CheckCircle className="w-8 h-8 text-purple-500" />
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Approval</p>
              <p className="text-2xl font-bold text-gray-900">{pendingApproval}</p>
              <p className="text-xs text-gray-500">Awaiting review</p>
            </div>
            <AlertCircle className="w-8 h-8 text-orange-500" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LeaveSummaryPanel;
