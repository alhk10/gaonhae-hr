
import React, { useEffect, useState } from 'react';
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
  X
} from 'lucide-react';
import { getEmployees } from '@/services/employeeService';
import { EmployeeProfile } from '@/types/employee';
import { useIsMobile } from '@/hooks/use-mobile';

interface MenuItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  path: string;
}

const Sidebar = () => {
  const { user, userRole } = useAuth();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [currentEmployee, setCurrentEmployee] = useState<EmployeeProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Debug current user state
  useEffect(() => {
    console.log('Sidebar: User state updated:', user);
    console.log('Sidebar: UserRole from context:', userRole);
    if (user) {
      console.log('Sidebar: User role (from user object):', user.role);
      console.log('Sidebar: User email:', user.email);
    }
  }, [user, userRole]);

  useEffect(() => {
    const loadCurrentEmployee = async () => {
      console.log('Sidebar: Loading current employee data for user:', user);
      console.log('Sidebar: UserRole check before loading employee data:', userRole, user?.role);
      
      // Skip employee data loading for superadmins - they don't need it
      if (userRole === 'superadmin' || user?.role === 'superadmin') {
        console.log('Sidebar: Superadmin detected - skipping employee data load');
        setCurrentEmployee(null);
        setIsLoading(false);
        return;
      }
      
      // Load employee data for non-superadmin users
      if (user?.email) {
        try {
          setIsLoading(true);
          const employees = await getEmployees();
          console.log('Sidebar: All employees:', employees);
          
          const employee = employees.find(emp => emp.email === user.email);
          console.log('Sidebar: Found employee for current user:', employee);
          
          if (employee) {
            setCurrentEmployee(employee);
            console.log('Sidebar: Current employee loaded with admin access:', employee.adminAccess);
            console.log('Sidebar: Current employee loaded with page access:', employee.pageAccess);
          } else {
            console.log('Sidebar: Employee not found for email:', user.email);
            setCurrentEmployee(null);
          }
        } catch (error) {
          console.error('Sidebar: Error loading current employee:', error);
          setCurrentEmployee(null);
        } finally {
          setIsLoading(false);
        }
      } else {
        console.log('Sidebar: No user email - skipping employee data load');
        setCurrentEmployee(null);
        setIsLoading(false);
      }
    };

    loadCurrentEmployee();
  }, [user, userRole]);

  const getMenuItems = (): MenuItem[] => {
    console.log('Sidebar: Getting menu items for user:', user);
    console.log('Sidebar: UserRole from context:', userRole);
    console.log('Sidebar: User role from user object:', user?.role);
    
    const baseItems: MenuItem[] = [
      { icon: BarChart3, label: 'Dashboard', path: '/' },
    ];

    // Superadmin gets admin-only access - check both userRole and user.role for safety
    if (userRole === 'superadmin' || user?.role === 'superadmin') {
      console.log('Sidebar: Returning superadmin menu items - detected via userRole:', userRole, 'or user.role:', user?.role);
      const adminItems = [
        ...baseItems,
        { icon: Users, label: 'Employee Management', path: '/employees' },
        { icon: DollarSign, label: 'Payroll Management', path: '/payroll' },
        { icon: Calendar, label: 'Leave Management', path: '/leave-management' },
        { icon: FileText, label: 'Claims Management', path: '/claims' },
        { icon: UserCheck, label: 'Attendance Management', path: '/attendance' },
        { icon: CalendarClock, label: 'Slot Booking Management', path: '/admin-slot-booking' },
        { icon: Settings, label: 'System Settings', path: '/settings' },
      ];
      console.log('Sidebar: Superadmin menu items created:', adminItems);
      return adminItems;
    }

    // For managers and employees, build menu based on specific permissions
    console.log('Sidebar: Building menu items based on specific permissions');
    let menuItems: MenuItem[] = [
      ...baseItems,
    ];

    // If still loading employee data, return basic items
    if (isLoading) {
      console.log('Sidebar: Still loading employee data, returning basic items');
      return menuItems;
    }

    // Check page access permissions and add allowed personal items first
    if (currentEmployee?.pageAccess) {
      const pageAccess = currentEmployee.pageAccess;
      console.log('Sidebar: Employee page access permissions:', pageAccess);
      
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
    } else {
      console.log('Sidebar: No page access permissions found for employee');
    }

    // Check individual admin access permissions and add allowed admin items
    if (currentEmployee?.adminAccess) {
      const adminAccess = currentEmployee.adminAccess;
      console.log('Sidebar: Employee has admin access permissions:', adminAccess);
      
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

      console.log('Sidebar: Added admin items based on specific permissions');
    }

    console.log('Sidebar: Final menu items:', menuItems);
    return menuItems;
  };

  const menuItems = getMenuItems();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const handleMenuItemClick = () => {
    if (isMobile) {
      setMobileMenuOpen(false);
    }
  };

  console.log('Sidebar: Rendering sidebar with user:', user, 'and menu items:', menuItems);

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
