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
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">Superadmin Dashboard</h2>
        </div>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="notices">Notices</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="overview" className="space-y-4 sm:space-y-6 mt-0">
        {/* Student Registration Approvals */}
        <StudentRegistrationApprovals showAll />

        {/* Student Withdrawal Approvals */}
        <StudentWithdrawalApprovals />

        {/* Claims Approvals */}
        <ClaimsApprovals />

        {/* Leave Approvals */}
        <LeaveApprovals />

        {/* Invoice Discount Approvals */}
        <InvoiceDiscountApprovals />

        {/* Invoice Action Approvals (Adjustments & Cancellations) */}
        <InvoiceActionApprovals />

        {/* Payment Verification Approvals */}
        <PaymentVerificationApprovals />

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

        {/* Stock Transfer Approvals */}
        <StockTransferApprovals />

        {/* Slot Booking Edit Approvals (includes branch changes) */}
        <SlotBookingEditApprovals />

        {/* Low Stock Warnings */}
        <LowStockWarnings />

        {/* Invoices Created */}
        <InvoicesCreatedSection />

        {/* Slot Booking Management Calendar */}
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
