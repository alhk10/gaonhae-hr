import { lazy, Suspense, ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import type { AdminAccessPermissions, EmployeePageAccessPermissions } from './types/employee';
import { AuthProvider } from './contexts/AuthContext';
import { PayrollProvider } from './contexts/PayrollContext';
import { ScreenLockProvider } from './contexts/ScreenLockContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from "@/components/ui/sonner";
import AuthGuard from './components/auth/AuthGuard';
import AuthQueryCacheBridge from './components/auth/AuthQueryCacheBridge';
import PageAccessGuard from './components/auth/PageAccessGuard';
import ErrorBoundary from './components/ErrorBoundary';
import { QUERY_CONFIG } from './config/constants';
import { FinanceBasisProvider } from './contexts/FinanceBasisContext';
import './App.css';

// Lazy load all page components for better performance
const Index = lazy(() => import('./pages/Index'));
const Employees = lazy(() => import('./pages/Employees'));
const EmployeeDetails = lazy(() => import('./pages/EmployeeDetails'));
const PartyManagement = lazy(() => import('./pages/PartyManagement'));
const StudentDetails = lazy(() => import('./pages/parties/StudentDetails'));
const TrialDetails = lazy(() => import('./pages/parties/TrialDetails'));
const FulltimeEmployeeDetails = lazy(() => import('./pages/parties/FulltimeEmployeeDetails'));
const CasualEmployeeDetails = lazy(() => import('./pages/parties/CasualEmployeeDetails'));
const PayrollProcessing = lazy(() => import('./pages/PayrollProcessing'));
const PaymentSummary = lazy(() => import('./pages/PaymentSummary'));
const IncrementPlanning = lazy(() => import('./pages/IncrementPlanning'));
const LeaveManagement = lazy(() => import('./pages/LeaveManagement'));
const ApplyLeave = lazy(() => import('./pages/ApplyLeave'));
const Claims = lazy(() => import('./pages/Claims'));
const SubmitClaim = lazy(() => import('./pages/SubmitClaim'));
const Attendance = lazy(() => import('./pages/Attendance'));
const MyAttendance = lazy(() => import('./pages/MyAttendance'));
const CasualEmployees = lazy(() => import('./pages/CasualEmployees'));
const AdminSlotBooking = lazy(() => import('./pages/AdminSlotBooking'));
const SlotBooking = lazy(() => import('./pages/SlotBooking'));
const Payslips = lazy(() => import('./pages/Payslips'));
const PayslipManagement = lazy(() => import('./pages/PayslipManagement'));
const Profile = lazy(() => import('./pages/Profile'));
const Settings = lazy(() => import('./pages/Settings'));
const NotFound = lazy(() => import('./pages/NotFound'));
const BranchProfitLoss = lazy(() => import('./pages/BranchProfitLoss'));
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword'));
const Miscellaneous = lazy(() => import('./pages/Miscellaneous'));
const BranchDashboardPage = lazy(() => import('./pages/BranchDashboardPage'));
const CctvMonitoring = lazy(() => import('./pages/CctvMonitoring'));
const DocumentLibrary = lazy(() => import('./pages/DocumentLibrary'));

// Finance / Accounting module
const FinanceDashboard = lazy(() => import('./pages/finance/FinanceDashboard'));
const ChartOfAccounts = lazy(() => import('./pages/finance/ChartOfAccounts'));
const Journals = lazy(() => import('./pages/finance/Journals'));
const NewJournal = lazy(() => import('./pages/finance/NewJournal'));
const JournalDetail = lazy(() => import('./pages/finance/JournalDetail'));
const GeneralLedger = lazy(() => import('./pages/finance/GeneralLedger'));
const BackfillRunner = lazy(() => import('./pages/finance/BackfillRunner'));
const BranchPnlLive = lazy(() => import('./pages/finance/BranchPnlLive'));
const TaxCentre = lazy(() => import('./pages/finance/TaxCentre'));
const TrialBalance = lazy(() => import('./pages/finance/TrialBalance'));
const BalanceSheet = lazy(() => import('./pages/finance/BalanceSheet'));


// Position-based access guard
const PositionAccessGuard = lazy(() => import('./components/auth/PositionAccessGuard'));

// Sales module (lazy loaded)
const SalesAccessGuard = lazy(() => import('./components/sales/SalesAccessGuard'));
const SalesDashboard = lazy(() => import('./pages/sales/SalesDashboard'));
const SalesSettings = lazy(() => import('./pages/sales/SalesSettings'));
const StudentProfile = lazy(() => import('./pages/sales/StudentProfile'));
const ProductManagement = lazy(() => import('./pages/sales/ProductManagement'));
const InvoiceManagement = lazy(() => import('./pages/sales/InvoiceManagement'));
const PaymentManagement = lazy(() => import('./pages/sales/PaymentManagement'));
const SalesAnalytics = lazy(() => import('./pages/sales/SalesAnalytics'));
const GradingManagement = lazy(() => import('./pages/sales/GradingManagement'));
const CreditManagement = lazy(() => import('./pages/sales/CreditManagement'));
const StudentRegistration = lazy(() => import('./pages/StudentRegistration'));

// Public grading payment module
const PublicGradingPayment = lazy(() => import('./pages/public/PublicGradingPayment'));
const PublicGradingList = lazy(() => import('./pages/public/PublicGradingList'));
const PublicCompetitionPayment = lazy(() => import('./pages/public/PublicCompetitionPayment'));
const PublicHelloChat = lazy(() => import('./pages/public/PublicHelloChat'));
const PublicGuardsPurchase = lazy(() => import('./pages/public/PublicGuardsPurchase'));
const PublicGuardsPurchaseList = lazy(() => import('./pages/public/PublicGuardsPurchaseList'));
const Unsubscribe = lazy(() => import('./pages/Unsubscribe'));

// Social Media module
const SocialRoute = lazy(() => import('./components/auth/SocialRoute'));
const SocialDashboard = lazy(() => import('./pages/social/SocialDashboard'));
const SocialBrandSettings = lazy(() => import('./pages/social/BrandSettings'));
const SocialCreatePost = lazy(() => import('./pages/social/CreatePost'));
const SocialScheduledPosts = lazy(() => import('./pages/social/ScheduledPosts'));
const SocialContentCalendar = lazy(() => import('./pages/social/ContentCalendar'));
const SocialAnalytics = lazy(() => import('./pages/social/Analytics'));
const SocialSuggestions = lazy(() => import('./pages/social/Suggestions'));
const SocialCaricatureLibrary = lazy(() => import('./pages/social/CaricatureLibrary'));

// Configure QueryClient with optimized settings
const queryClient = new QueryClient(QUERY_CONFIG);

// Loading fallback component
const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
      <p className="text-muted-foreground">Loading...</p>
    </div>
  </div>
);

// Reusable route wrapper to reduce AuthGuard + PageAccessGuard boilerplate
const ProtectedRoute = ({ permission, children }: { permission?: keyof AdminAccessPermissions | keyof EmployeePageAccessPermissions; children: ReactNode }) => (
  <AuthGuard>
    {permission ? <PageAccessGuard requiredPermission={permission}>{children}</PageAccessGuard> : children}
  </AuthGuard>
);

const SalesRoute = ({ children }: { children: ReactNode }) => (
  <AuthGuard>
    <SalesAccessGuard>{children}</SalesAccessGuard>
  </AuthGuard>
);

// Wrap payroll routes with PayrollProvider so it only loads on payroll pages
const PayrollRoute = ({ permission, children }: { permission?: keyof AdminAccessPermissions | keyof EmployeePageAccessPermissions; children: ReactNode }) => (
  <ProtectedRoute permission={permission}>
    <PayrollProvider>{children}</PayrollProvider>
  </ProtectedRoute>
);

// Hostname-aware root: payment.* → /pay, gradinglist.* → /grading-list
const HostnameRouter = () => {
  const host = typeof window !== 'undefined' ? window.location.hostname : '';
  if (host.startsWith('payment.')) return <PublicGradingPayment />;
  if (host.startsWith('gradinglist.')) return <PublicGradingList />;
  return <Index />;
};

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <Router>
          <AuthProvider>
            <AuthQueryCacheBridge />
            <ScreenLockProvider>
                <div className="min-h-screen bg-background">
                <Suspense fallback={<LoadingFallback />}>
                  <Routes>
                    {/* Public routes */}
                    <Route path="/" element={<HostnameRouter />} />
                    <Route path="/register" element={<StudentRegistration />} />
                    <Route path="/pay" element={<PublicGradingPayment />} />
                    <Route path="/comps" element={<PublicCompetitionPayment />} />
                    <Route path="/grading-list" element={<PublicGradingList />} />
                    <Route path="/hello" element={<PublicHelloChat />} />
                    <Route path="/guards" element={<PublicGuardsPurchase />} />
                    <Route path="/guardspurchase-list" element={<Navigate to="/grading-list" replace />} />
                    <Route path="/auth/reset-password" element={<ResetPassword />} />
                    <Route path="/unsubscribe" element={<Unsubscribe />} />
                    
                    {/* Protected Employee Routes */}
                    <Route path="/profile" element={<ProtectedRoute permission="profile"><Profile /></ProtectedRoute>} />
                    <Route path="/apply-leave" element={<ProtectedRoute permission="applyLeave"><ApplyLeave /></ProtectedRoute>} />
                    <Route path="/submit-claim" element={<ProtectedRoute permission="submitClaim"><SubmitClaim /></ProtectedRoute>} />
                    <Route path="/payslips" element={<ProtectedRoute permission="payslips"><Payslips /></ProtectedRoute>} />
                    <Route path="/my-attendance" element={<ProtectedRoute permission="myAttendance"><MyAttendance /></ProtectedRoute>} />
                    <Route path="/slot-booking" element={<ProtectedRoute permission="slotBookingEmployee"><SlotBooking /></ProtectedRoute>} />
                    <Route path="/cctv" element={<ProtectedRoute permission="cctvMonitoring"><CctvMonitoring /></ProtectedRoute>} />

                    {/* Protected Admin/Manager Routes */}
                    <Route path="/employees" element={<ProtectedRoute permission="employees"><Employees /></ProtectedRoute>} />
                    <Route path="/employees/:id" element={<ProtectedRoute permission="employees"><EmployeeDetails /></ProtectedRoute>} />
                    
                    {/* Party Management Routes */}
                    <Route path="/parties" element={<ProtectedRoute><PartyManagement /></ProtectedRoute>} />
                    <Route path="/parties/student/:id" element={<SalesRoute><StudentDetails /></SalesRoute>} />
                    <Route path="/parties/trial/:id" element={<SalesRoute><TrialDetails /></SalesRoute>} />
                    <Route path="/parties/fulltime/:id" element={<ProtectedRoute permission="employees"><FulltimeEmployeeDetails /></ProtectedRoute>} />
                    <Route path="/parties/casual/:id" element={<ProtectedRoute permission="employees"><CasualEmployeeDetails /></ProtectedRoute>} />
                    
                    {/* Payroll Routes (PayrollProvider scoped here) */}
                    <Route path="/payroll" element={<PayrollRoute permission="payroll"><PayrollProcessing /></PayrollRoute>} />
                    <Route path="/payment-summary" element={<PayrollRoute permission="payroll"><PaymentSummary /></PayrollRoute>} />
                    <Route path="/increment-planning" element={<PayrollRoute permission="payroll"><IncrementPlanning /></PayrollRoute>} />
                    <Route path="/payslip-management" element={<PayrollRoute><PayslipManagement /></PayrollRoute>} />

                    {/* Other Admin Routes */}
                    <Route path="/leave-management" element={<ProtectedRoute permission="leaveManagement"><LeaveManagement /></ProtectedRoute>} />
                    <Route path="/claims" element={<ProtectedRoute permission="claims"><Claims /></ProtectedRoute>} />
                    <Route path="/attendance" element={<ProtectedRoute permission="attendance"><Attendance /></ProtectedRoute>} />
                    <Route path="/admin-slot-booking" element={<ProtectedRoute permission="slotBooking"><AdminSlotBooking /></ProtectedRoute>} />
                    <Route path="/casual-employees" element={<ProtectedRoute permission="employees"><CasualEmployees /></ProtectedRoute>} />
                    <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                    <Route path="/documents" element={<ProtectedRoute><DocumentLibrary /></ProtectedRoute>} />
                    
                    {/* Branch Dashboard Route */}
                    <Route path="/branch-dashboard" element={<ProtectedRoute><BranchDashboardPage /></ProtectedRoute>} />
                    
                    {/* Partner-only Routes */}
                    <Route path="/branch-profit-loss" element={
                      <AuthGuard>
                        <PositionAccessGuard allowedPositions={['Partner', 'Senior Partner']}>
                          <BranchProfitLoss />
                        </PositionAccessGuard>
                      </AuthGuard>
                    } />
                    <Route path="/miscellaneous" element={
                      <AuthGuard>
                        <PositionAccessGuard allowedPositions={['Partner', 'Senior Partner']}>
                          <Miscellaneous />
                        </PositionAccessGuard>
                      </AuthGuard>
                    } />
                    
                    {/* Finance / Accounting Routes (superadmin) */}
                    <Route path="/finance" element={<ProtectedRoute><FinanceBasisProvider><FinanceDashboard /></FinanceBasisProvider></ProtectedRoute>} />
                    <Route path="/finance/chart-of-accounts" element={<ProtectedRoute><FinanceBasisProvider><ChartOfAccounts /></FinanceBasisProvider></ProtectedRoute>} />
                    <Route path="/finance/journals" element={<ProtectedRoute><FinanceBasisProvider><Journals /></FinanceBasisProvider></ProtectedRoute>} />
                    <Route path="/finance/journals/new" element={<ProtectedRoute><FinanceBasisProvider><NewJournal /></FinanceBasisProvider></ProtectedRoute>} />
                    <Route path="/finance/journals/:id" element={<ProtectedRoute><FinanceBasisProvider><JournalDetail /></FinanceBasisProvider></ProtectedRoute>} />
                    <Route path="/finance/general-ledger" element={<ProtectedRoute><FinanceBasisProvider><GeneralLedger /></FinanceBasisProvider></ProtectedRoute>} />
                    <Route path="/finance/backfill" element={<ProtectedRoute><FinanceBasisProvider><BackfillRunner /></FinanceBasisProvider></ProtectedRoute>} />
                    <Route path="/finance/branch-pl-live" element={<ProtectedRoute><FinanceBasisProvider><BranchPnlLive /></FinanceBasisProvider></ProtectedRoute>} />
                    <Route path="/finance/tax" element={<ProtectedRoute><FinanceBasisProvider><TaxCentre /></FinanceBasisProvider></ProtectedRoute>} />
                    <Route path="/finance/reports/trial-balance" element={<ProtectedRoute><FinanceBasisProvider><TrialBalance /></FinanceBasisProvider></ProtectedRoute>} />
                    <Route path="/finance/reports/balance-sheet" element={<ProtectedRoute><FinanceBasisProvider><BalanceSheet /></FinanceBasisProvider></ProtectedRoute>} />

                    {/* Sales Module Routes */}
                    <Route path="/sales" element={<SalesRoute><SalesDashboard /></SalesRoute>} />
                    <Route path="/sales/dashboard" element={<SalesRoute><SalesDashboard /></SalesRoute>} />
                    <Route path="/sales/settings" element={<SalesRoute><SalesSettings /></SalesRoute>} />
                    <Route path="/sales/student/:studentId" element={<SalesRoute><StudentProfile /></SalesRoute>} />
                    <Route path="/sales/products" element={<SalesRoute><ProductManagement /></SalesRoute>} />
                    <Route path="/sales/invoices" element={<SalesRoute><InvoiceManagement /></SalesRoute>} />
                    <Route path="/sales/payments" element={<SalesRoute><PaymentManagement /></SalesRoute>} />
                    <Route path="/sales/analytics" element={<SalesRoute><SalesAnalytics /></SalesRoute>} />
                    <Route path="/sales/reports" element={<SalesRoute><SalesAnalytics /></SalesRoute>} />
                    <Route path="/sales/grading" element={<SalesRoute><GradingManagement /></SalesRoute>} />
                    <Route path="/sales/credits" element={<SalesRoute><CreditManagement /></SalesRoute>} />

                    {/* Social Media Module Routes (superadmin) */}
                    <Route path="/social" element={<SocialRoute><SocialDashboard /></SocialRoute>} />
                    <Route path="/social/dashboard" element={<SocialRoute><SocialDashboard /></SocialRoute>} />
                    <Route path="/social/create" element={<SocialRoute><SocialCreatePost /></SocialRoute>} />
                    <Route path="/social/scheduled" element={<SocialRoute><SocialScheduledPosts /></SocialRoute>} />
                    <Route path="/social/calendar" element={<SocialRoute><SocialContentCalendar /></SocialRoute>} />
                    <Route path="/social/brand" element={<SocialRoute><SocialBrandSettings /></SocialRoute>} />
                    <Route path="/social/analytics" element={<SocialRoute><SocialAnalytics /></SocialRoute>} />
                    <Route path="/social/suggestions" element={<SocialRoute><SocialSuggestions /></SocialRoute>} />
                    <Route path="/social/caricatures" element={<SocialRoute><SocialCaricatureLibrary /></SocialRoute>} />

                    {/* 404 Route */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
                <Toaster />
              </div>
            </ScreenLockProvider>
          </AuthProvider>
        </Router>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
