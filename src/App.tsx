import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Employees from "./pages/Employees";
import EmployeeDetails from "./pages/EmployeeDetails";
import Payroll from "./pages/Payroll";
import PayrollProcessing from "./pages/PayrollProcessing";
import IncrementPlanning from "./pages/IncrementPlanning";
import LeaveManagement from "./pages/LeaveManagement";
import Claims from "./pages/Claims";
import Attendance from "./pages/Attendance";
import Settings from "./pages/Settings";
import SlotBooking from "./pages/SlotBooking";
import CasualEmployees from "./pages/CasualEmployees";
import CasualEmployeesBooking from "./pages/CasualEmployeesBooking";
import ApplyLeave from "./pages/ApplyLeave";
import SubmitClaim from "./pages/SubmitClaim";
import Payslips from "./pages/Payslips";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import PaymentSummary from "./pages/PaymentSummary";
import PayrollManagement from "./pages/PayrollManagement";

const queryClient = new QueryClient();

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/employees" element={<Employees />} />
            <Route path="/employees/:id" element={<EmployeeDetails />} />
            <Route path="/payroll" element={<Payroll />} />
            <Route path="/payroll-processing" element={<PayrollProcessing />} />
            <Route path="/payment-summary" element={<PaymentSummary />} />
            <Route path="/increment-planning" element={<IncrementPlanning />} />
            <Route path="/leave-management" element={<LeaveManagement />} />
            <Route path="/claims" element={<Claims />} />
            <Route path="/attendance" element={<Attendance />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/slot-booking" element={<SlotBooking />} />
            <Route path="/casual-employees" element={<CasualEmployees />} />
            <Route path="/casual-employees-booking" element={<CasualEmployeesBooking />} />
            <Route path="/my-team" element={<Index />} />
            <Route path="/leave-approvals" element={<Index />} />
            <Route path="/claim-approvals" element={<Index />} />
            <Route path="/reports" element={<Index />} />
            <Route path="/apply-leave" element={<ApplyLeave />} />
            <Route path="/submit-claim" element={<SubmitClaim />} />
            <Route path="/payslips" element={<Payslips />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/payroll-management" element={<PayrollManagement />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
