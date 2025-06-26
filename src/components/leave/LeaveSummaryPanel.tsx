
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { getAllLeaveRequests } from '@/services/leaveService';

const LeaveSummaryPanel = () => {
  const { data: allLeaveRequests = [] } = useQuery({
    queryKey: ['leave-requests'],
    queryFn: getAllLeaveRequests,
  });

  // Calculate real leave statistics
  const today = new Date();
  const next30Days = new Date();
  next30Days.setDate(today.getDate() + 30);
  
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  
  const currentYear = new Date().getFullYear();

  // Upcoming leave (next 30 days)
  const upcomingLeave = allLeaveRequests.filter(leave => {
    if (leave.status !== 'Approved') return false;
    const startDate = new Date(leave.startDate);
    return startDate >= today && startDate <= next30Days;
  }).length;

  // Total annual leave remaining (company-wide)
  const approvedAnnualLeave = allLeaveRequests.filter(leave => 
    leave.type === 'Annual Leave' && 
    leave.status === 'Approved' &&
    new Date(leave.startDate).getFullYear() === currentYear
  ).reduce((total, leave) => total + leave.days, 0);
  
  // Assuming each employee has 21 days annually and get unique employee count
  const uniqueEmployees = [...new Set(allLeaveRequests.map(leave => leave.employeeId))];
  const totalAnnualEntitlement = uniqueEmployees.length * 21;
  const totalAnnualLeaveRemaining = totalAnnualEntitlement - approvedAnnualLeave;

  // Approved leave this month
  const approvedLeaveThisMonth = allLeaveRequests.filter(leave => {
    if (leave.status !== 'Approved') return false;
    const startDate = new Date(leave.startDate);
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
              <p className="text-xs text-gray-500">Company-wide</p>
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
