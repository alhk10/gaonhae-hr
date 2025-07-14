
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { PayrollProvider } from './contexts/PayrollContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from "@/components/ui/sonner";
import { useState, useEffect } from 'react';
import AuthenticationInitializer from './components/auth/AuthenticationInitializer';
import Index from './pages/Index';
import Employees from './pages/Employees';
import EmployeeDetails from './pages/EmployeeDetails';
import Payroll from './pages/Payroll';
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

// Create a separate component for the main app content
const AppContent = () => {
  const [authInitialized, setAuthInitialized] = useState(false);

  // Check if auth initialization has been completed before
  useEffect(() => {
    const initialized = localStorage.getItem('auth_initialized');
    if (initialized === 'true') {
      setAuthInitialized(true);
    }
  }, []);

  const handleAuthInitializationComplete = () => {
    localStorage.setItem('auth_initialized', 'true');
    setAuthInitialized(true);
  };

  // Show initialization screen only on first load
  if (!authInitialized) {
    return (
      <div>
        <AuthenticationInitializer onComplete={handleAuthInitializationComplete} />
        <Toaster />
      </div>
    );
  }

  return (
    <PayrollProvider>
      <Router>
        <div className="min-h-screen bg-background">
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/employees" element={<Employees />} />
            <Route path="/employees/:id" element={<EmployeeDetails />} />
            <Route path="/payroll" element={<Payroll />} />
            <Route path="/payroll-processing" element={<PayrollProcessing />} />
            <Route path="/payment-summary" element={<PaymentSummary />} />
            <Route path="/increment-planning" element={<IncrementPlanning />} />
            <Route path="/leave-management" element={<LeaveManagement />} />
            <Route path="/apply-leave" element={<ApplyLeave />} />
            <Route path="/claims" element={<Claims />} />
            <Route path="/submit-claim" element={<SubmitClaim />} />
            <Route path="/attendance" element={<Attendance />} />
            <Route path="/my-attendance" element={<MyAttendance />} />
            <Route path="/casual-employees" element={<CasualEmployees />} />
            <Route path="/admin-slot-booking" element={<AdminSlotBooking />} />
            <Route path="/slot-booking" element={<SlotBooking />} />
            <Route path="/payslips" element={<Payslips />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <Toaster />
        </div>
      </Router>
    </PayrollProvider>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
