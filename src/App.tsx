
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { PayrollProvider } from './contexts/PayrollContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from "@/components/ui/sonner";
import AuthGuard from './components/auth/AuthGuard';
import PageAccessGuard from './components/auth/PageAccessGuard';
// Initialize booking system fixes
import '@/services/systemInitializationService';
import Index from './pages/Index';
import Employees from './pages/Employees';
import EmployeeDetails from './pages/EmployeeDetails';

import PayrollProcessing from './pages/PayrollProcessing';
import PaymentSummary from './pages/PaymentSummary';
import IncrementPlanning from './pages/IncrementPlanning';
import LeaveManagement from './pages/LeaveManagement';
import ApplyLeave from './pages/ApplyLeave';
import Claims from './pages/Claims';
import SubmitClaim from './pages/SubmitClaim';
import Attendance from './pages/Attendance';
import MyAttendance from './pages/MyAttendance';
import CasualEmployees from './pages/CasualEmployees';
import AdminSlotBooking from './pages/AdminSlotBooking';
import SlotBooking from './pages/SlotBooking';
import Payslips from './pages/Payslips';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';
import './App.css';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AuthProvider>
          <PayrollProvider>
            <div className="min-h-screen bg-background">
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
                {/* Add redirect for legacy URL */}
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
                  path="/settings" 
                  element={
                    <AuthGuard>
                      <Settings />
                    </AuthGuard>
                  } 
                />
                
                {/* 404 Route */}
                <Route path="*" element={<NotFound />} />
              </Routes>
              <Toaster />
            </div>
          </PayrollProvider>
        </AuthProvider>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
