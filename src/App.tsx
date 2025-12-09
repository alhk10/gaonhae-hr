import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { PayrollProvider } from './contexts/PayrollContext';
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

// Sales module (lazy loaded)
const SalesAccessGuard = lazy(() => import('./components/sales/SalesAccessGuard'));
const SalesDashboard = lazy(() => import('./pages/sales/SalesDashboard'));
const SalesSettings = lazy(() => import('./pages/sales/SalesSettings'));
const StudentProfile = lazy(() => import('./pages/sales/StudentProfile'));
const StudentManagement = lazy(() => import('./pages/sales/StudentManagement'));
const ProductManagement = lazy(() => import('./pages/sales/ProductManagement'));
const InvoiceManagement = lazy(() => import('./pages/sales/InvoiceManagement'));
const PaymentManagement = lazy(() => import('./pages/sales/PaymentManagement'));
const SalesAnalytics = lazy(() => import('./pages/sales/SalesAnalytics'));

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

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <Router>
          <AuthProvider>
            <PayrollProvider>
              <div className="min-h-screen bg-background">
                <Suspense fallback={<LoadingFallback />}>
                  <Routes>
                    {/* Public route - Login page */}
                    <Route path="/" element={<Index />} />
                    
                    {/* Protected Employee Routes */}
                    <Route 
                      path="/profile" 
                      element={
                        <AuthGuard>
                          <PageAccessGuard requiredPermission="profile">
                            <Profile />
                          </PageAccessGuard>
                        </AuthGuard>
                      } 
                    />
                    <Route 
                      path="/apply-leave" 
                      element={
                        <AuthGuard>
                          <PageAccessGuard requiredPermission="applyLeave">
                            <ApplyLeave />
                          </PageAccessGuard>
                        </AuthGuard>
                      } 
                    />
                    <Route 
                      path="/submit-claim" 
                      element={
                        <AuthGuard>
                          <PageAccessGuard requiredPermission="submitClaim">
                            <SubmitClaim />
                          </PageAccessGuard>
                        </AuthGuard>
                      } 
                    />
                    <Route 
                      path="/payslips" 
                      element={
                        <AuthGuard>
                          <PageAccessGuard requiredPermission="payslips">
                            <Payslips />
                          </PageAccessGuard>
                        </AuthGuard>
                      } 
                    />
                    <Route 
                      path="/my-attendance" 
                      element={
                        <AuthGuard>
                          <PageAccessGuard requiredPermission="myAttendance">
                            <MyAttendance />
                          </PageAccessGuard>
                        </AuthGuard>
                      } 
                    />
                    <Route 
                      path="/slot-booking" 
                      element={
                        <AuthGuard>
                          <PageAccessGuard requiredPermission="slotBookingEmployee">
                            <SlotBooking />
                          </PageAccessGuard>
                        </AuthGuard>
                      } 
                    />

                    {/* Protected Admin/Manager Routes */}
                    <Route 
                      path="/employees" 
                      element={
                        <AuthGuard>
                          <PageAccessGuard requiredPermission="employees">
                            <Employees />
                          </PageAccessGuard>
                        </AuthGuard>
                      } 
                    />
                    <Route 
                      path="/employees/:id" 
                      element={
                        <AuthGuard>
                          <PageAccessGuard requiredPermission="employees">
                            <EmployeeDetails />
                          </PageAccessGuard>
                        </AuthGuard>
                      } 
                    />
                    <Route 
                      path="/payroll" 
                      element={
                        <AuthGuard>
                          <PageAccessGuard requiredPermission="payroll">
                            <PayrollProcessing />
                          </PageAccessGuard>
                        </AuthGuard>
                      } 
                    />
                    <Route 
                      path="/payment-summary" 
                      element={
                        <AuthGuard>
                          <PageAccessGuard requiredPermission="payroll">
                            <PaymentSummary />
                          </PageAccessGuard>
                        </AuthGuard>
                      } 
                    />
                    <Route 
                      path="/leave-management" 
                      element={
                        <AuthGuard>
                          <PageAccessGuard requiredPermission="leaveManagement">
                            <LeaveManagement />
                          </PageAccessGuard>
                        </AuthGuard>
                      } 
                    />
                    <Route 
                      path="/claims" 
                      element={
                        <AuthGuard>
                          <PageAccessGuard requiredPermission="claims">
                            <Claims />
                          </PageAccessGuard>
                        </AuthGuard>
                      } 
                    />
                    <Route 
                      path="/attendance" 
                      element={
                        <AuthGuard>
                          <PageAccessGuard requiredPermission="attendance">
                            <Attendance />
                          </PageAccessGuard>
                        </AuthGuard>
                      } 
                    />
                    <Route 
                      path="/admin-slot-booking" 
                      element={
                        <AuthGuard>
                          <PageAccessGuard requiredPermission="slotBooking">
                            <AdminSlotBooking />
                          </PageAccessGuard>
                        </AuthGuard>
                      } 
                    />
                    <Route 
                      path="/admin-slo" 
                      element={
                        <AuthGuard>
                          <PageAccessGuard requiredPermission="slotBooking">
                            <AdminSlotBooking />
                          </PageAccessGuard>
                        </AuthGuard>
                      } 
                    />
                    
                    {/* Protected Routes with Additional Restrictions */}
                    <Route 
                      path="/increment-planning" 
                      element={
                        <AuthGuard>
                          <PageAccessGuard requiredPermission="payroll">
                            <IncrementPlanning />
                          </PageAccessGuard>
                        </AuthGuard>
                      } 
                    />
                    <Route 
                      path="/casual-employees" 
                      element={
                        <AuthGuard>
                          <PageAccessGuard requiredPermission="employees">
                            <CasualEmployees />
                          </PageAccessGuard>
                        </AuthGuard>
                      } 
                    />
                    <Route 
                      path="/payslip-management" 
                      element={
                        <AuthGuard>
                          <PayslipManagement />
                        </AuthGuard>
                      } 
                    />
                    <Route 
                      path="/settings" 
                      element={
                        <AuthGuard>
                          <Settings />
                        </AuthGuard>
                      } 
                    />
                    
                    {/* Protected Sales Module Routes */}
                    <Route 
                      path="/sales" 
                      element={
                        <AuthGuard>
                          <SalesAccessGuard>
                            <SalesDashboard />
                          </SalesAccessGuard>
                        </AuthGuard>
                      } 
                    />
                    <Route 
                      path="/sales/dashboard" 
                      element={
                        <AuthGuard>
                          <SalesAccessGuard>
                            <SalesDashboard />
                          </SalesAccessGuard>
                        </AuthGuard>
                      } 
                    />
                    <Route 
                      path="/sales/settings" 
                      element={
                        <AuthGuard>
                          <SalesAccessGuard>
                            <SalesSettings />
                          </SalesAccessGuard>
                        </AuthGuard>
                      } 
                    />
                    <Route 
                      path="/sales/student/:studentId" 
                      element={
                        <AuthGuard>
                          <SalesAccessGuard>
                            <StudentProfile />
                          </SalesAccessGuard>
                        </AuthGuard>
                      } 
                    />
                    <Route 
                      path="/sales/students" 
                      element={
                        <AuthGuard>
                          <SalesAccessGuard>
                            <StudentManagement />
                          </SalesAccessGuard>
                        </AuthGuard>
                      } 
                    />
                    <Route 
                      path="/sales/products" 
                      element={
                        <AuthGuard>
                          <SalesAccessGuard>
                            <ProductManagement />
                          </SalesAccessGuard>
                        </AuthGuard>
                      } 
                    />
                    <Route 
                      path="/sales/invoices" 
                      element={
                        <AuthGuard>
                          <SalesAccessGuard>
                            <InvoiceManagement />
                          </SalesAccessGuard>
                        </AuthGuard>
                      } 
                    />
                    <Route 
                      path="/sales/payments" 
                      element={
                        <AuthGuard>
                          <SalesAccessGuard>
                            <PaymentManagement />
                          </SalesAccessGuard>
                        </AuthGuard>
                      } 
                    />
                    <Route 
                      path="/sales/analytics" 
                      element={
                        <AuthGuard>
                          <SalesAccessGuard>
                            <SalesAnalytics />
                          </SalesAccessGuard>
                        </AuthGuard>
                      } 
                    />
                    <Route 
                      path="/sales/reports" 
                      element={
                        <AuthGuard>
                          <SalesAccessGuard>
                            <SalesAnalytics />
                          </SalesAccessGuard>
                        </AuthGuard>
                      } 
                    />

                    {/* 404 Route */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
                <Toaster />
              </div>
            </PayrollProvider>
          </AuthProvider>
        </Router>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
