
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider } from '@/contexts/AuthContext';
import { PayrollProvider } from '@/contexts/PayrollContext';

// Import all pages
import Index from '@/pages/Index';
import Employees from '@/pages/Employees';
import EmployeeDetails from '@/pages/EmployeeDetails';
import CasualEmployees from '@/pages/CasualEmployees';
import CasualEmployeesBooking from '@/pages/CasualEmployeesBooking';
import SlotBooking from '@/pages/SlotBooking';
import Attendance from '@/pages/Attendance';
import Payroll from '@/pages/Payroll';
import PayrollProcessing from '@/pages/PayrollProcessing';
import PaymentSummary from '@/pages/PaymentSummary';
import IncrementPlanning from '@/pages/IncrementPlanning';
import Payslips from '@/pages/Payslips';
import LeaveManagement from '@/pages/LeaveManagement';
import ApplyLeave from '@/pages/ApplyLeave';
import Claims from '@/pages/Claims';
import SubmitClaim from '@/pages/SubmitClaim';
import Profile from '@/pages/Profile';
import Settings from '@/pages/Settings';
import NotFound from '@/pages/NotFound';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <PayrollProvider>
            <Router>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/employees" element={<Employees />} />
                <Route path="/employees/:id" element={<EmployeeDetails />} />
                <Route path="/casual-employees" element={<CasualEmployees />} />
                <Route path="/casual-booking" element={<CasualEmployeesBooking />} />
                <Route path="/slot-booking" element={<SlotBooking />} />
                <Route path="/attendance" element={<Attendance />} />
                <Route path="/payroll" element={<Payroll />} />
                <Route path="/payroll-processing" element={<PayrollProcessing />} />
                <Route path="/payment-summary" element={<PaymentSummary />} />
                <Route path="/increment-planning" element={<IncrementPlanning />} />
                <Route path="/payslips" element={<Payslips />} />
                <Route path="/leave-management" element={<LeaveManagement />} />
                <Route path="/apply-leave" element={<ApplyLeave />} />
                <Route path="/claims" element={<Claims />} />
                <Route path="/submit-claim" element={<SubmitClaim />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Router>
            <Toaster />
          </PayrollProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
