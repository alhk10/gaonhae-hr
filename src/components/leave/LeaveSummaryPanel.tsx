
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { 
  getUpcomingLeaveCount, 
  getTotalAnnualLeaveRemaining, 
  getApprovedLeaveThisMonth, 
  getPendingLeaveCount 
} from '@/data/leaveData';

const LeaveSummaryPanel = () => {
  const upcomingLeave = getUpcomingLeaveCount();
  const totalAnnualLeaveRemaining = getTotalAnnualLeaveRemaining();
  const approvedLeaveThisMonth = getApprovedLeaveThisMonth();
  const pendingApproval = getPendingLeaveCount();

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
              <p className="text-2xl font-bold text-gray-900">{totalAnnualLeaveRemaining}</p>
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
