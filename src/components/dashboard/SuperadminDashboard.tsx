import React from 'react';
import { useSessionState } from '@/hooks/useSessionState';
import { useScrollRestoration } from '@/hooks/useScrollRestoration';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getPendingDeletionRequestsCount } from '@/services/paymentDeletionRequestService';
import { getPendingInvoiceDeletionRequestsCount } from '@/services/invoiceDeletionRequestService';
import { getPendingGradingDeletionRequestsCount } from '@/services/gradingDeletionRequestService';
import { getPendingEditRequestsCount } from '@/services/slotBookingEditRequestService';
import { getPendingOrdersCount } from '@/services/inventoryOrderService';
import { getPendingDiscountApprovalsCount } from '@/services/invoiceDiscountApprovalService';
import { getPendingActionRequestsCount } from '@/services/invoiceActionRequestService';
import { getPendingRegistrationsCount } from '@/services/studentRegistrationService';
import { getPendingWithdrawalRequestsCount } from '@/services/studentWithdrawalRequestService';
import { getPendingTransferRequestsCount } from '@/services/inventoryTransferService';
import { getPendingCompetitionSubmissionsCount } from '@/services/competitionPaymentSubmissionService';
import { getPendingSeminarSubmissionsCount } from '@/services/seminarPaymentSubmissionService';
import { getClaims } from '@/services/claimsService';
import { getAllLeaveRequests } from '@/services/leaveService';

import PaymentDeletionApprovals from './PaymentDeletionApprovals';
import InvoiceDeletionApprovals from './InvoiceDeletionApprovals';
import InventoryOrderApprovals from './InventoryOrderApprovals';
import ClaimsApprovals from './ClaimsApprovals';
import LeaveApprovals from './LeaveApprovals';
import SlotBookingApprovals from './SlotBookingApprovals';
import GradingDeletionApprovals from './GradingDeletionApprovals';
import SlotBookingEditApprovals from './SlotBookingEditApprovals';
import PaymentVerificationApprovals from './PaymentVerificationApprovals';
import PublicGradingSubmissionApprovals from './PublicGradingSubmissionApprovals';
import PublicCompetitionSubmissionApprovals from './PublicCompetitionSubmissionApprovals';
import PublicSeminarSubmissionApprovals from './PublicSeminarSubmissionApprovals';
import PublicGuardsPurchaseApprovals from './PublicGuardsPurchaseApprovals';
import PublicHelloCallbackApprovals from './PublicHelloCallbackApprovals';
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

const countQueryOpts = { staleTime: 30 * 1000, refetchInterval: 60 * 1000 };

const SuperadminDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useSessionState('superadmin-dash:tab', 'overview');
  useScrollRestoration();

  const { data: pendingPaymentDeletionsCount = 0 } = useQuery({
    queryKey: ['pending-deletion-count'],
    queryFn: getPendingDeletionRequestsCount,
    ...countQueryOpts,
  });

  const { data: pendingInvoiceDeletionsCount = 0 } = useQuery({
    queryKey: ['pending-invoice-deletion-count'],
    queryFn: getPendingInvoiceDeletionRequestsCount,
    ...countQueryOpts,
  });

  const { data: pendingGradingDeletionsCount = 0 } = useQuery({
    queryKey: ['pending-grading-deletion-count'],
    queryFn: getPendingGradingDeletionRequestsCount,
    ...countQueryOpts,
  });

  const { data: pendingOrdersCount = 0 } = useQuery({
    queryKey: ['pending-orders-count'],
    queryFn: getPendingOrdersCount,
    ...countQueryOpts,
  });

  const { data: pendingEditRequestsCount = 0 } = useQuery({
    queryKey: ['pending-edit-requests-count'],
    queryFn: getPendingEditRequestsCount,
    ...countQueryOpts,
  });

  const { data: pendingClaimsCount = 0 } = useQuery({
    queryKey: ['pending-claims-count'],
    queryFn: async () => {
      const allClaims = await getClaims();
      return allClaims.filter(c => c.status === 'Pending').length;
    },
    ...countQueryOpts,
  });

  const { data: pendingLeaveCount = 0 } = useQuery({
    queryKey: ['pending-leave-count'],
    queryFn: async () => {
      const allLeave = await getAllLeaveRequests();
      return allLeave.filter(l => l.status === 'Pending').length;
    },
    ...countQueryOpts,
  });

  const { data: pendingVerificationCount = 0 } = useQuery({
    queryKey: ['pending-verification-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('payments')
        .select('*', { count: 'exact', head: true })
        .eq('is_verified', false)
        .not('proof_of_payment_url', 'is', null)
        .neq('payment_method', 'cash');
      if (error) return 0;
      return count || 0;
    },
    ...countQueryOpts,
  });

  const { data: pendingDiscountCount = 0 } = useQuery({
    queryKey: ['pending-discount-approvals-count'],
    queryFn: getPendingDiscountApprovalsCount,
    ...countQueryOpts,
  });

  const { data: pendingActionCount = 0 } = useQuery({
    queryKey: ['pending-invoice-action-count'],
    queryFn: getPendingActionRequestsCount,
    ...countQueryOpts,
  });

  const { data: pendingRegistrationCount = 0 } = useQuery({
    queryKey: ['pending-registration-count'],
    queryFn: () => getPendingRegistrationsCount(),
    ...countQueryOpts,
  });

  const { data: pendingWithdrawalCount = 0 } = useQuery({
    queryKey: ['pending-withdrawal-count'],
    queryFn: getPendingWithdrawalRequestsCount,
    ...countQueryOpts,
  });

  const { data: pendingTransferCount = 0 } = useQuery({
    queryKey: ['pending-transfer-count'],
    queryFn: getPendingTransferRequestsCount,
    ...countQueryOpts,
  });

  const { data: pendingCompetitionCount = 0 } = useQuery({
    queryKey: ['pending-competition-submissions-count'],
    queryFn: () => getPendingCompetitionSubmissionsCount(),
    ...countQueryOpts,
  });

  const { data: pendingSeminarCount = 0 } = useQuery({
    queryKey: ['pending-seminar-submissions-count'],
    queryFn: () => getPendingSeminarSubmissionsCount(),
    ...countQueryOpts,
  });

  const totalPendingCount =
    pendingClaimsCount +
    pendingLeaveCount +
    pendingVerificationCount +
    pendingDiscountCount +
    pendingActionCount +
    pendingRegistrationCount +
    pendingWithdrawalCount +
    pendingPaymentDeletionsCount +
    pendingInvoiceDeletionsCount +
    pendingGradingDeletionsCount +
    pendingOrdersCount +
    pendingEditRequestsCount +
    pendingTransferCount +
    pendingCompetitionCount +
    pendingSeminarCount;

  return (
    <>
    <NegativeInventoryAlert />
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-3 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <h2 className="text-lg sm:text-2xl font-bold text-foreground">Superadmin Dashboard</h2>
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="overview" className="text-xs sm:text-sm">
            Overview
            {totalPendingCount > 0 && (
              <Badge variant="destructive" className="ml-1.5 text-[10px] h-5 min-w-5 px-1.5">
                {totalPendingCount}
              </Badge>
            )}
          </TabsTrigger>
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
        <PublicGradingSubmissionApprovals />
        <PublicCompetitionSubmissionApprovals />
        <PublicSeminarSubmissionApprovals />
        <PublicGuardsPurchaseApprovals />
        <PublicHelloCallbackApprovals />
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
