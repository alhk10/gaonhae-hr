import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, FileText, Clock, Calendar, Trash2, Building2, GraduationCap, AlertCircle, ShoppingCart } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getDashboardStats, getRecentActivity } from '@/services/dashboardOptimizationService';
import { getPendingDeletionRequestsCount } from '@/services/paymentDeletionRequestService';
import { getPendingInvoiceDeletionRequestsCount } from '@/services/invoiceDeletionRequestService';
import { getPendingGradingDeletionRequestsCount } from '@/services/gradingDeletionRequestService';
import { getPendingEditRequestsCount } from '@/services/slotBookingEditRequestService';
import { getAllPendingRequests } from '@/services/studentUpdateRequestService';
import { getPendingOrdersCount } from '@/services/inventoryOrderService';

import { getAllLeaveRequests } from '@/services/leaveService';
import { getAllSlotBookings } from '@/services/slotBookingService';
import { Skeleton } from '@/components/ui/skeleton';
import { ClassWeeklyPlanner } from './ClassWeeklyPlanner';
import PaymentDeletionApprovals from './PaymentDeletionApprovals';
import InvoiceDeletionApprovals from './InvoiceDeletionApprovals';
import InventoryOrderApprovals from './InventoryOrderApprovals';
import ClaimsApprovals from './ClaimsApprovals';
import LeaveApprovals from './LeaveApprovals';
import SlotBookingApprovals from './SlotBookingApprovals';
import GradingDeletionApprovals from './GradingDeletionApprovals';
import SlotBookingEditApprovals from './SlotBookingEditApprovals';


const SuperadminDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');

  // Use optimized dashboard stats service
  const { data: dashboardStats, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: getDashboardStats,
    staleTime: 2 * 60 * 1000, // Cache for 2 minutes
    retry: 2,
  });

  // Load recent activity separately for progressive loading
  const { data: recentActivity = [], isLoading: activityLoading } = useQuery({
    queryKey: ['recent-activity'],
    queryFn: () => getRecentActivity(3),
    staleTime: 1 * 60 * 1000, // Cache for 1 minute
    retry: 2,
    enabled: !!dashboardStats, // Only load after stats are loaded
  });

  // Load pending payment deletion requests count
  const { data: pendingPaymentDeletionsCount = 0 } = useQuery({
    queryKey: ['pending-deletion-count'],
    queryFn: getPendingDeletionRequestsCount,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
  });

  // Load pending invoice deletion requests count
  const { data: pendingInvoiceDeletionsCount = 0 } = useQuery({
    queryKey: ['pending-invoice-deletion-count'],
    queryFn: getPendingInvoiceDeletionRequestsCount,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
  });

  // Load pending grading deletion requests count
  const { data: pendingGradingDeletionsCount = 0 } = useQuery({
    queryKey: ['pending-grading-deletion-count'],
    queryFn: getPendingGradingDeletionRequestsCount,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });

  const { data: pendingStudentUpdates } = useQuery({
    queryKey: ['pending-student-updates'],
    queryFn: getAllPendingRequests,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });

  // Load pending inventory orders count
  const { data: pendingOrdersCount = 0 } = useQuery({
    queryKey: ['pending-orders-count'],
    queryFn: getPendingOrdersCount,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });

  // Load pending slot booking edit requests count
  const { data: pendingEditRequestsCount = 0 } = useQuery({
    queryKey: ['pending-edit-requests-count'],
    queryFn: getPendingEditRequestsCount,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });

  // Load pending leave count
  const { data: pendingLeaveCount = 0 } = useQuery({
    queryKey: ['pending-leave-count'],
    queryFn: async () => {
      const allLeave = await getAllLeaveRequests();
      return allLeave.filter(l => l.status === 'Pending').length;
    },
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });

  // Load pending bookings count
  const { data: pendingBookingsCount = 0 } = useQuery({
    queryKey: ['pending-bookings-count'],
    queryFn: async () => {
      const allBookings = await getAllSlotBookings();
      return allBookings.filter(b => b.status === 'pending').length;
    },
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });

  // Total pending deletions (payments + invoices)
  const totalPendingDeletions = pendingPaymentDeletionsCount + pendingInvoiceDeletionsCount + pendingGradingDeletionsCount + pendingEditRequestsCount;
  const pendingStudentUpdatesCount = Array.isArray(pendingStudentUpdates) ? pendingStudentUpdates.length : 0;

  const statsConfig = [
    { 
      title: 'Total Employees', 
      value: statsLoading ? '...' : (dashboardStats?.totalEmployees?.toString() || '0'), 
      icon: Users, 
      color: 'bg-blue-500' 
    },
    { 
      title: 'Pending Claims', 
      value: statsLoading ? '...' : (dashboardStats?.pendingClaims?.toString() || '0'), 
      icon: FileText, 
      color: (dashboardStats?.pendingClaims || 0) > 0 ? 'bg-orange-500' : 'bg-gray-500' 
    },
    { 
      title: 'Pending Leave', 
      value: pendingLeaveCount.toString(), 
      icon: Calendar, 
      color: pendingLeaveCount > 0 ? 'bg-blue-500' : 'bg-gray-500' 
    },
    { 
      title: 'Pending Bookings', 
      value: pendingBookingsCount.toString(), 
      icon: Clock, 
      color: pendingBookingsCount > 0 ? 'bg-purple-500' : 'bg-gray-500' 
    },
    { 
      title: 'Pending Deletions', 
      value: totalPendingDeletions.toString(), 
      icon: Trash2, 
      color: totalPendingDeletions > 0 ? 'bg-red-500' : 'bg-gray-500' 
    },
    { 
      title: 'Student Updates', 
      value: pendingStudentUpdatesCount.toString(), 
      icon: GraduationCap, 
      color: pendingStudentUpdatesCount > 0 ? 'bg-purple-500' : 'bg-gray-500' 
    },
    { 
      title: 'Purchase Orders', 
      value: pendingOrdersCount.toString(), 
      icon: ShoppingCart, 
      color: pendingOrdersCount > 0 ? 'bg-orange-500' : 'bg-gray-500' 
    },
  ];

  // Debug logging
  console.log('SuperadminDashboard: Optimized loading - Stats loading:', statsLoading);
  console.log('SuperadminDashboard: Dashboard stats:', dashboardStats);

  if (statsError) {
    console.error('SuperadminDashboard: Error loading stats:', statsError);
  }

  // Show error state if critical data fails to load
  if (statsError) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Superadmin Dashboard</h2>
          <p className="text-red-600">Error loading dashboard data. Please refresh the page.</p>
        </div>
      </div>
    );
  }

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Superadmin Dashboard</h2>
          <p className="text-gray-600">Complete oversight of HR operations</p>
        </div>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="overview" className="space-y-6 mt-0">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {statsConfig.map((stat) => (
            <Card key={stat.title} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                    {statsLoading ? (
                      <Skeleton className="h-8 w-16 mt-1" />
                    ) : (
                      <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                    )}
                  </div>
                  <div className={`${stat.color} p-3 rounded-lg`}>
                    <stat.icon className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Pending Student Updates Alert */}
        {pendingStudentUpdatesCount > 0 && (
          <Card className="border-purple-200 bg-purple-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-purple-600" />
                <p className="text-purple-800">
                  <strong>{pendingStudentUpdatesCount}</strong> student profile update{pendingStudentUpdatesCount > 1 ? 's' : ''} pending approval. 
                  View in Branch Dashboard.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Claims</CardTitle>
              <CardDescription>Latest submitted claims</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activityLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                        <Skeleton className="h-6 w-16" />
                      </div>
                    ))}
                  </div>
                ) : recentActivity.length > 0 ? (
                  recentActivity.map((claim) => (
                    <div key={claim.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{claim.employee}</p>
                        <p className="text-sm text-gray-600">{claim.type} • S${claim.amount}</p>
                      </div>
                      <Badge variant={claim.status === 'Approved' ? 'default' : 'secondary'}>
                        {claim.status}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">No recent claims</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>System Status</CardTitle>
              <CardDescription>HR system overview</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div>
                    <p className="font-medium text-green-900">System Operational</p>
                    <p className="text-sm text-green-700">All services running</p>
                  </div>
                  <Badge className="bg-green-100 text-green-800">Active</Badge>
                </div>
                <div className="space-y-2 text-sm text-gray-600">
                  <p>• Active employees: {statsLoading ? 'Loading...' : dashboardStats?.totalEmployees || 0}</p>
                  <p>• Pending approvals: {statsLoading ? 'Loading...' : dashboardStats?.pendingClaims || 0}</p>
                  <p>• Data sync: Connected</p>
                  <p>• Last updated: {new Date().toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Claims Approvals */}
        <ClaimsApprovals />

        {/* Leave Approvals */}
        <LeaveApprovals />

        {/* Slot Booking Approvals */}
        <SlotBookingApprovals />

        {/* Payment Deletion Approvals */}
        {pendingPaymentDeletionsCount > 0 && (
          <PaymentDeletionApprovals />
        )}

        {/* Invoice Deletion Approvals */}
        {pendingInvoiceDeletionsCount > 0 && (
          <InvoiceDeletionApprovals />
        )}

        {/* Grading Registration Deletion Approvals */}
        {pendingGradingDeletionsCount > 0 && (
          <GradingDeletionApprovals />
        )}

        {/* Inventory Order Approvals */}
        <InventoryOrderApprovals />

        {/* Slot Booking Edit Approvals */}
        <SlotBookingEditApprovals />

        {/* Class Weekly Planner */}
        <ClassWeeklyPlanner />
      </TabsContent>

    </Tabs>
  );
};

export default SuperadminDashboard;
