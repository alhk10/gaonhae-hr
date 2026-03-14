import { lazy, Suspense, ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { PayrollProvider } from './contexts/PayrollContext';
import { ScreenLockProvider } from './contexts/ScreenLockContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from "@/components/ui/sonner";
import AuthGuard from './components/auth/AuthGuard';
import PageAccessGuard from './components/auth/PageAccessGuard';
import ErrorBoundary from './components/ErrorBoundary';
import { QUERY_CONFIG } from './config/constants';
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
const ProtectedRoute = ({ permission, children }: { permission?: string; children: ReactNode }) => (
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
const PayrollRoute = ({ permission, children }: { permission?: string; children: ReactNode }) => (
  <ProtectedRoute permission={permission}>
    <PayrollProvider>{children}</PayrollProvider>
  </ProtectedRoute>
);

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <Router>
          <AuthProvider>
            <ScreenLockProvider>
                <div className="min-h-screen bg-background">
                <Suspense fallback={<LoadingFallback />}>
                  <Routes>
                    {/* Public routes */}
                    <Route path="/" element={<Index />} />
                    <Route path="/register" element={<StudentRegistration />} />
                    <Route path="/auth/reset-password" element={<ResetPassword />} />
                    
                    {/* Protected Employee Routes */}
                    <Route path="/profile" element={<ProtectedRoute permission="profile"><Profile /></ProtectedRoute>} />
                    <Route path="/apply-leave" element={<ProtectedRoute permission="applyLeave"><ApplyLeave /></ProtectedRoute>} />
                    <Route path="/submit-claim" element={<ProtectedRoute permission="submitClaim"><SubmitClaim /></ProtectedRoute>} />
                    <Route path="/payslips" element={<ProtectedRoute permission="payslips"><Payslips /></ProtectedRoute>} />
                    <Route path="/my-attendance" element={<ProtectedRoute permission="myAttendance"><MyAttendance /></ProtectedRoute>} />
                    <Route path="/slot-booking" element={<ProtectedRoute permission="slotBookingEmployee"><SlotBooking /></ProtectedRoute>} />

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
