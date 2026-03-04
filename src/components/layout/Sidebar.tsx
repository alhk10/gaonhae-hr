import React, { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Link, useLocation } from 'react-router-dom';
import { 
  Users, 
  Calendar, 
  FileText, 
  DollarSign, 
  Settings, 
  BarChart3,
  UserCheck,
  Clock,
  CalendarClock,
  Menu,
  X,
  ShoppingCart,
  Package,
  Receipt,
  TrendingUp,
  Briefcase,
  FileSpreadsheet,
  Award,
  FileCheck,
  Building2
} from 'lucide-react';
import { getEmployees } from '@/services/employeeService';
import { EmployeeProfile } from '@/types/employee';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSalesModuleAccess } from '@/hooks/useSalesModuleAccess';
import { useBranchAccess } from '@/hooks/useBranchAccess';

interface MenuItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  path: string;
}

import { validateSuperadminAccess, logAuthState } from '@/utils/authValidation';
import { systemValidator } from '@/utils/systemTestValidator';

const Sidebar = () => {
  const authData = useAuth();
  const { user, userrole, userType } = authData;
  const location = useLocation();
  const isMobile = useIsMobile();
  const [currentEmployee, setCurrentEmployee] = useState<EmployeeProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { hasAccess: hasSalesAccess } = useSalesModuleAccess();
  const { accessibleBranches, hasAccess: hasBranchAccess } = useBranchAccess();

  // Log auth state for debugging
  logAuthState('Sidebar Component', authData);

  // Run system validation for superadmin users (only once per session)
  useEffect(() => {
    if (userrole === 'superadmin' && user?.email) {
      console.log('🧪 Running system validation for superadmin user...');
      systemValidator.runAllTests(user.email).then(results => {
        console.log('🧪 System validation complete for', user.email);
      });
    }
  }, [userrole, user?.email]);

  useEffect(() => {
    const loadCurrentEmployee = async () => {
      // Skip employee data loading for superadmins - they don't need it
      if (userrole === 'superadmin') {
        setIsLoading(false);
        return;
      }
      
      // Load employee data for non-superadmin users
      if (user?.email) {
        try {
          setIsLoading(true);
          const employees = await getEmployees();
          const employee = employees.find(emp => emp.email === user.email);
          
          if (employee) {
            console.log('Sidebar: Loaded employee admin access:', {
              email: employee.email,
              adminAccess: employee.adminAccess
            });
            setCurrentEmployee(employee);
          } else {
            setCurrentEmployee(null);
          }
        } catch (error) {
          console.error('Sidebar: Error loading current employee:', error);
          setCurrentEmployee(null);
        } finally {
          setIsLoading(false);
        }
      } else {
        setCurrentEmployee(null);
        setIsLoading(false);
      }
    };

    loadCurrentEmployee();
  }, [user, userrole]);

  const getMenuItems = useCallback((): MenuItem[] => {
    console.log('Sidebar: Generating menu for userrole:', userrole, 'user:', user?.email, 'userType:', userType);
    
    // Students don't see the sidebar menu (they have their own portal)
    if (userType === 'student') {
      return [];
    }
    
    // Superladmin gets full admin access with validation
    if (validateSuperadminAccess(userrole, user?.email)) {
      console.log('Sidebar: ✅ SUPERADMIN ACCESS GRANTED - Full menu generated');
      const adminItems = [
        { icon: BarChart3, label: 'Dashboard', path: '/' },
        { icon: Users, label: 'Party Management', path: '/parties' },
        { icon: DollarSign, label: 'Payroll Processing', path: '/payroll' },
        // Employee self-service pages for superadmins (management tabs integrated within)
        { icon: UserCheck, label: 'Profile', path: '/profile' },
        { icon: Calendar, label: 'Apply Leave', path: '/apply-leave' },
        { icon: FileText, label: 'Submit Claim', path: '/submit-claim' },
        { icon: DollarSign, label: 'Payslips', path: '/payslips' },
        { icon: Clock, label: 'My Attendance', path: '/my-attendance' },
        { icon: CalendarClock, label: 'Slot Booking', path: '/slot-booking' },
      ];

      // Add Sales Module items if user has access
      if (hasSalesAccess) {
        console.log('Sidebar: ✅ SALES MODULE ACCESS GRANTED - Adding sales menu items');
        adminItems.push(
          { icon: ShoppingCart, label: 'Sales Dashboard', path: '/sales' },
          { icon: Package, label: 'Products & Inventory', path: '/sales/products' },
          { icon: Receipt, label: 'Invoices & Payments', path: '/sales/invoices' },
          { icon: Award, label: 'Grading', path: '/sales/grading' },
          { icon: TrendingUp, label: 'Sales Reports', path: '/sales/reports' }
        );
      }

      // Partner pages (superadmin can access all)
      adminItems.push(
        { icon: Briefcase, label: 'Partners Claim', path: '/submit-partners-claim' },
        { icon: FileSpreadsheet, label: 'Branch P&L', path: '/branch-profit-loss' },
        { icon: FileCheck, label: 'Miscellaneous', path: '/miscellaneous' }
      );

      adminItems.push({ icon: Settings, label: 'System Settings', path: '/settings' });

      // Add Sales Settings if user has access
      if (hasSalesAccess) {
        adminItems.push({ icon: Settings, label: 'Sales Settings', path: '/sales/settings' });
      }

      console.log('Sidebar: Superladmin menu items:', adminItems.length, 'total items');
      return adminItems;
    }

    // Manager/Admin role access - prioritize authData.adminAccess as it's more reliable
    const adminAccessData = authData.adminAccess || currentEmployee?.adminAccess;
    
    if (userrole === 'admin' && adminAccessData) {
      const menuItems: MenuItem[] = [
        { icon: BarChart3, label: 'Dashboard', path: '/' }
      ];
      const adminAccess = adminAccessData;
      const pageAccess = currentEmployee?.pageAccess || authData.pageAccess;

      // Add admin menu items based on specific permissions
      if (adminAccess.employees) {
        menuItems.push({ icon: Users, label: 'Employees', path: '/employees' });
      }
      if (adminAccess.payroll) {
        menuItems.push({ icon: DollarSign, label: 'Payroll', path: '/payroll' });
      }

      // Add employee page access items
      if (pageAccess?.profile) {
        menuItems.push({ icon: UserCheck, label: 'Profile', path: '/profile' });
      }
      if (pageAccess?.applyLeave) {
        menuItems.push({ icon: Calendar, label: 'Apply Leave', path: '/apply-leave' });
      }
      if (pageAccess?.submitClaim) {
        menuItems.push({ icon: FileText, label: 'Submit Claim', path: '/submit-claim' });
      }
      if (pageAccess?.payslips) {
        menuItems.push({ icon: DollarSign, label: 'Payslips', path: '/payslips' });
      }
      if (pageAccess?.myAttendance) {
        menuItems.push({ icon: Clock, label: 'My Attendance', path: '/my-attendance' });
      }
      if (pageAccess?.slotBookingEmployee) {
        menuItems.push({ icon: CalendarClock, label: 'Slot Booking', path: '/slot-booking' });
      }

      return menuItems;
    }

    // Employee role access - check both page permissions AND admin permissions
    let menuItems: MenuItem[] = [
      { icon: BarChart3, label: 'Dashboard', path: '/' },
    ];

    // Check admin permissions - prioritize authData.adminAccess as it's more reliable  
    const employeeAdminAccess = authData.adminAccess || currentEmployee?.adminAccess;
    
    if (employeeAdminAccess) {
      const adminAccess = employeeAdminAccess;
      console.log('Sidebar: Employee has admin access:', adminAccess);
      
      
      if (adminAccess.employees) {
        menuItems.push({ icon: Users, label: 'Employees', path: '/employees' });
      }
      if (adminAccess.payroll) {
        menuItems.push({ icon: DollarSign, label: 'Payroll', path: '/payroll' });
      }
    }

    // Add Branch Dashboard if employee has branch access
    if (hasBranchAccess) {
      console.log('Sidebar: Employee has branch dashboard access');
      menuItems.push({ icon: Building2, label: 'Branch Dashboard', path: '/branch-dashboard' });
    }

    // Add regular employee page access items - prioritize authData.pageAccess as it's more reliable
    const employeePageAccess = authData.pageAccess || currentEmployee?.pageAccess;
    const employeePosition = currentEmployee?.position?.toLowerCase() || '';
    const isPartnerPosition = employeePosition === 'partner' || employeePosition === 'senior partner';
    
    if (employeePageAccess) {
      const pageAccess = employeePageAccess;
      
      if (pageAccess.profile) {
        menuItems.push({ icon: UserCheck, label: 'Profile', path: '/profile' });
      }
      // Hide Apply Leave for partners
      if (pageAccess.applyLeave && !isPartnerPosition) {
        menuItems.push({ icon: Calendar, label: 'Apply Leave', path: '/apply-leave' });
      }
      // Submit Claim - Partners now go to same page but see different tab
      if (pageAccess.submitClaim) {
        menuItems.push({ 
          icon: isPartnerPosition ? Briefcase : FileText, 
          label: isPartnerPosition ? 'Partners Claim' : 'Submit Claim', 
          path: '/submit-claim' 
        });
      }
      if (pageAccess.payslips) {
        menuItems.push({ icon: DollarSign, label: 'Payslips', path: '/payslips' });
      }
      // Hide My Attendance for partners
      if (pageAccess.myAttendance && !isPartnerPosition) {
        menuItems.push({ icon: Clock, label: 'My Attendance', path: '/my-attendance' });
      }
      // Hide Slot Booking for partners
      if (pageAccess.slotBookingEmployee && !isPartnerPosition) {
        menuItems.push({ icon: CalendarClock, label: 'Slot Booking', path: '/slot-booking' });
      }
    }

    // Add partner-specific pages based on position (Branch P&L and Miscellaneous - Partners Claim is handled above)
    if (isPartnerPosition) {
      menuItems.push(
        { icon: FileSpreadsheet, label: 'Branch P&L', path: '/branch-profit-loss' },
        { icon: FileCheck, label: 'Miscellaneous', path: '/miscellaneous' }
      );
    }

    return menuItems;
  }, [userrole, userType, currentEmployee, hasSalesAccess, hasBranchAccess]);

  const menuItems = getMenuItems();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const handleMenuItemClick = () => {
    if (isMobile) {
      setMobileMenuOpen(false);
    }
  };

  // Show loading state while auth or admin access data is loading
  const isAuthLoading = !user || authData.isLoading;
  const isDataLoading = userrole === 'employee' && isLoading && !currentEmployee && !authData.adminAccess;
  
  if (isAuthLoading || isDataLoading) {
    return null;
  }

  return (
    <>
      {/* Menu Button - visible on all screen sizes */}
      <Button
        variant="ghost"
        size="sm"
        className="fixed top-[18px] left-4 z-[60] bg-white border shadow-sm"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
      >
        {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Sidebar Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[55]">
          <div className="fixed inset-0 bg-black bg-opacity-25" onClick={() => setMobileMenuOpen(false)} />
          <div className="fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 shadow-lg">
            <div className="p-6 pt-16">
              <nav className="space-y-1">
                {menuItems.map((item) => (
                  <Button
                    key={item.label}
                    variant={isActive(item.path) ? "default" : "ghost"}
                    className={`w-full justify-start ${isActive(item.path) ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
                    asChild
                    onClick={handleMenuItemClick}
                  >
                    <Link to={item.path}>
                      <item.icon className="mr-3 h-4 w-4" />
                      {item.label}
                    </Link>
                  </Button>
                ))}
              </nav>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;