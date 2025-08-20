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
  TrendingUp
} from 'lucide-react';
import { getEmployees } from '@/services/employeeService';
import { EmployeeProfile } from '@/types/employee';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSalesModuleAccess } from '@/hooks/useSalesModuleAccess';

interface MenuItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  path: string;
}

import { validateSuperadminAccess, logAuthState } from '@/utils/authValidation';
import { systemValidator } from '@/utils/systemTestValidator';
import '@/utils/forceAuthRefresh';

const Sidebar = () => {
  const authData = useAuth();
  const { user, userrole } = authData;
  const location = useLocation();
  const isMobile = useIsMobile();
  const [currentEmployee, setCurrentEmployee] = useState<EmployeeProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { hasAccess: hasSalesAccess } = useSalesModuleAccess();

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
    console.log('Sidebar: Generating menu for userrole:', userrole, 'user:', user?.email);
    
    // Superladmin gets full admin access with validation
    if (validateSuperadminAccess(userrole, user?.email)) {
      console.log('Sidebar: ✅ SUPERADMIN ACCESS GRANTED - Full menu generated');
      const adminItems = [
        { icon: BarChart3, label: 'Dashboard', path: '/' },
        { icon: Users, label: 'Employee Management', path: '/employees' },
        { icon: DollarSign, label: 'Payroll Processing', path: '/payroll' },
        { icon: Calendar, label: 'Leave Management', path: '/leave-management' },
        { icon: FileText, label: 'Claims Management', path: '/claims' },
        { icon: UserCheck, label: 'Attendance Management', path: '/attendance' },
        { icon: CalendarClock, label: 'Slot Booking Management', path: '/admin-slot-booking' },
      ];

      // Add Sales Module items if user has access
      if (hasSalesAccess) {
        console.log('Sidebar: ✅ SALES MODULE ACCESS GRANTED - Adding sales menu items');
        adminItems.push(
          { icon: ShoppingCart, label: 'Sales Dashboard', path: '/sales' },
          { icon: Users, label: 'Student Management', path: '/sales/students' },
          { icon: Package, label: 'Products & Inventory', path: '/sales/products' },
          { icon: Receipt, label: 'Invoices & Payments', path: '/sales/invoices' },
          { icon: TrendingUp, label: 'Sales Reports', path: '/sales/reports' }
        );
      }

      adminItems.push({ icon: Settings, label: 'System Settings', path: '/settings' });

      // Add Sales Settings if user has access
      if (hasSalesAccess) {
        adminItems.push({ icon: Settings, label: 'Sales Settings', path: '/sales/settings' });
      }

      console.log('Sidebar: Superladmin menu items:', adminItems.length, 'total items');
      return adminItems;
    }

    // Manager/Admin role access - can see items based on admin access
    if (userrole === 'admin' && currentEmployee?.adminAccess) {
      const menuItems: MenuItem[] = [
        { icon: BarChart3, label: 'Dashboard', path: '/' }
      ];
      const { adminAccess, pageAccess } = currentEmployee;

      // Add admin menu items based on specific permissions
      if (adminAccess.employees) {
        menuItems.push({ icon: Users, label: 'Employees', path: '/employees' });
      }
      if (adminAccess.payroll) {
        menuItems.push({ icon: DollarSign, label: 'Payroll', path: '/payroll' });
      }
      if (adminAccess.leaveManagement) {
        menuItems.push({ icon: Calendar, label: 'Leave Management', path: '/leave-management' });
      }
      if (adminAccess.claims) {
        menuItems.push({ icon: FileText, label: 'Claims Management', path: '/claims' });
      }
      if (adminAccess.attendance) {
        menuItems.push({ icon: UserCheck, label: 'Attendance Management', path: '/attendance' });
      }
      if (adminAccess.slotBooking) {
        menuItems.push({ icon: CalendarClock, label: 'Admin Slot Booking', path: '/admin-slot-booking' });
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

    // Employee role access - based on page permissions only
    let menuItems: MenuItem[] = [
      { icon: BarChart3, label: 'Dashboard', path: '/' },
    ];

    if (currentEmployee?.pageAccess) {
      const pageAccess = currentEmployee.pageAccess;
      
      if (pageAccess.profile) {
        menuItems.push({ icon: UserCheck, label: 'Profile', path: '/profile' });
      }
      if (pageAccess.applyLeave) {
        menuItems.push({ icon: Calendar, label: 'Apply Leave', path: '/apply-leave' });
      }
      if (pageAccess.submitClaim) {
        menuItems.push({ icon: FileText, label: 'Submit Claim', path: '/submit-claim' });
      }
      if (pageAccess.payslips) {
        menuItems.push({ icon: DollarSign, label: 'Payslips', path: '/payslips' });
      }
      if (pageAccess.myAttendance) {
        menuItems.push({ icon: Clock, label: 'My Attendance', path: '/my-attendance' });
      }
      if (pageAccess.slotBookingEmployee) {
        menuItems.push({ icon: CalendarClock, label: 'Slot Booking', path: '/slot-booking' });
      }
    }

    return menuItems;
  }, [userrole, currentEmployee, hasSalesAccess]);

  const menuItems = getMenuItems();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const handleMenuItemClick = () => {
    if (isMobile) {
      setMobileMenuOpen(false);
    }
  };

  // Show loading state while auth is loading
  if (!user) {
    return (
      <div className={`${isMobile ? 'hidden' : 'w-64'} bg-white border-r border-gray-200 h-full`}>
        <div className="p-6">
          <div className="text-center text-gray-500">Loading...</div>
        </div>
      </div>
    );
  }

  if (isMobile) {
    return (
      <>
        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="sm"
          className="fixed top-4 left-4 z-50 md:hidden bg-white border shadow-sm"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>

        {/* Mobile Sidebar Overlay */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
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
  }

  return (
    <div className="w-64 bg-white border-r border-gray-200 h-full">
      <div className="p-6">
        <nav className="space-y-1">
          {menuItems.map((item) => (
            <Button
              key={item.label}
              variant={isActive(item.path) ? "default" : "ghost"}
              className={`w-full justify-start ${isActive(item.path) ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
              asChild
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
  );
};

export default Sidebar;