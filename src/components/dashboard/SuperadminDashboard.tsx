import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { getPendingDeletionRequestsCount } from '@/services/paymentDeletionRequestService';
import { getPendingInvoiceDeletionRequestsCount } from '@/services/invoiceDeletionRequestService';
import { getPendingGradingDeletionRequestsCount } from '@/services/gradingDeletionRequestService';
import { getPendingEditRequestsCount } from '@/services/slotBookingEditRequestService';
import { getPendingOrdersCount } from '@/services/inventoryOrderService';

import PaymentDeletionApprovals from './PaymentDeletionApprovals';
import InvoiceDeletionApprovals from './InvoiceDeletionApprovals';
import InventoryOrderApprovals from './InventoryOrderApprovals';
import ClaimsApprovals from './ClaimsApprovals';
import LeaveApprovals from './LeaveApprovals';
import SlotBookingApprovals from './SlotBookingApprovals';
import GradingDeletionApprovals from './GradingDeletionApprovals';
import SlotBookingEditApprovals from './SlotBookingEditApprovals';
import PaymentVerificationApprovals from './PaymentVerificationApprovals';
import InvoiceDiscountApprovals from './InvoiceDiscountApprovals';
import SlotBookingManagementContent from '@/components/slot-booking/SlotBookingManagementContent';
import NoticeManagementTab from '@/components/notices/NoticeManagementTab';
import StockTransferApprovals from './StockTransferApprovals';
import StudentRegistrationApprovals from './StudentRegistrationApprovals';
import StudentWithdrawalApprovals from './StudentWithdrawalApprovals';
import LowStockWarnings from './LowStockWarnings';
import InvoiceActionApprovals from './InvoiceActionApprovals';

import InvoicesCreatedSection from './InvoicesCreatedSection';
import NegativeInventoryAlert from './NegativeInventoryAlert';
import { useAuth } from '@/contexts/AuthContext';

const SuperadminDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  const { data: pendingPaymentDeletionsCount = 0 } = useQuery({
    queryKey: ['pending-deletion-count'],
    queryFn: getPendingDeletionRequestsCount,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });

  const { data: pendingInvoiceDeletionsCount = 0 } = useQuery({
    queryKey: ['pending-invoice-deletion-count'],
    queryFn: getPendingInvoiceDeletionRequestsCount,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });

  const { data: pendingGradingDeletionsCount = 0 } = useQuery({
    queryKey: ['pending-grading-deletion-count'],
    queryFn: getPendingGradingDeletionRequestsCount,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });

  const { data: pendingOrdersCount = 0 } = useQuery({
    queryKey: ['pending-orders-count'],
    queryFn: getPendingOrdersCount,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });

  const { data: pendingEditRequestsCount = 0 } = useQuery({
    queryKey: ['pending-edit-requests-count'],
    queryFn: getPendingEditRequestsCount,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });

  return (
    <>
    <NegativeInventoryAlert />
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-3 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <h2 className="text-lg sm:text-2xl font-bold text-foreground">Superadmin Dashboard</h2>
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="overview" className="text-xs sm:text-sm">Overview</TabsTrigger>
          <TabsTrigger value="notices" className="text-xs sm:text-sm">Notices</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="overview" className="space-y-3 sm:space-y-6 mt-0">
        <StudentRegistrationApprovals showAll />
        <StudentWithdrawalApprovals />
        <ClaimsApprovals />
        <LeaveApprovals />
        <InvoiceDiscountApprovals />
        <InvoiceActionApprovals />
        <PaymentVerificationApprovals />
        {pendingPaymentDeletionsCount > 0 && <PaymentDeletionApprovals />}
        {pendingInvoiceDeletionsCount > 0 && <InvoiceDeletionApprovals />}
        {pendingGradingDeletionsCount > 0 && <GradingDeletionApprovals />}
        <InventoryOrderApprovals />
        <StockTransferApprovals />
        <SlotBookingEditApprovals />
        <LowStockWarnings />
        <InvoicesCreatedSection />
        <SlotBookingManagementContent />
      </TabsContent>

      <TabsContent value="notices" className="mt-0">
        <NoticeManagementTab role="superadmin" userEmail={user?.email || ''} />
      </TabsContent>
    </Tabs>
    </>
  );
};

export default SuperadminDashboard;
