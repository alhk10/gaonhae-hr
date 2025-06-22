
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Employees from "./pages/Employees";
import Payroll from "./pages/Payroll";
import LeaveManagement from "./pages/LeaveManagement";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/employees" element={<Employees />} />
            <Route path="/payroll" element={<Payroll />} />
            <Route path="/leave-management" element={<LeaveManagement />} />
            <Route path="/claims" element={<Index />} />
            <Route path="/attendance" element={<Index />} />
            <Route path="/settings" element={<Index />} />
            <Route path="/my-team" element={<Index />} />
            <Route path="/leave-approvals" element={<Index />} />
            <Route path="/claim-approvals" element={<Index />} />
            <Route path="/reports" element={<Index />} />
            <Route path="/apply-leave" element={<Index />} />
            <Route path="/submit-claim" element={<Index />} />
            <Route path="/payslips" element={<Index />} />
            <Route path="/profile" element={<Index />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
