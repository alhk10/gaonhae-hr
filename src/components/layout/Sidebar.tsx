
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
  CalendarClock
} from 'lucide-react';
import { getEmployees } from '@/services/employeeService';
import { EmployeeProfile } from '@/types/employee';

interface MenuItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  path: string;
}

const Sidebar = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [currentEmployee, setCurrentEmployee] = useState<EmployeeProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadCurrentEmployee = async () => {
      console.log('Loading current employee data for user:', user);
      
      // Only load employee data for actual employees, not superadmin/manager
      if (user?.email && user?.role === 'employee') {
        try {
          setIsLoading(true);
          const employees = await getEmployees();
          console.log('All employees:', employees);
          
          const employee = employees.find(emp => emp.email === user.email);
          console.log('Found employee for current user:', employee);
          
          if (employee) {
            setCurrentEmployee(employee);
            console.log('Current employee loaded with role:', user.role, 'and admin access:', employee.adminAccess);
          } else {
            console.log('Employee not found for email:', user.email);
            setCurrentEmployee(null);
          }
        } catch (error) {
          console.error('Error loading current employee:', error);
          setCurrentEmployee(null);
        } finally {
          setIsLoading(false);
        }
      } else {
        console.log('User is not employee or no email - skipping employee data load');
        setIsLoading(false);
      }
    };

    loadCurrentEmployee();
  }, [user]);

  const getMenuItems = (): MenuItem[] => {
    console.log('Getting menu items for user role:', user?.role);
    
    const baseItems: MenuItem[] = [
      { icon: BarChart3, label: 'Dashboard', path: '/' },
    ];

    // Superadmin gets full access - should not depend on employee data
    if (user?.role === 'superadmin') {
      console.log('Returning superadmin menu items');
      return [
        ...baseItems,
        { icon: Users, label: 'Employees', path: '/employees' },
        { icon: DollarSign, label: 'Payroll', path: '/payroll' },
        { icon: Calendar, label: 'Leave Management', path: '/leave-management' },
        { icon: FileText, label: 'Claims', path: '/claims' },
        { icon: UserCheck, label: 'Attendance', path: '/attendance' },
        { icon: CalendarClock, label: 'Admin Slot Booking', path: '/admin-slot-booking' },
        { icon: Settings, label: 'System Settings', path: '/settings' },
      ];
    }

    // Manager gets manager-specific access - should not depend on employee data
    if (user?.role === 'manager') {
      console.log('Returning manager menu items');
      return [
        ...baseItems,
        { icon: Users, label: 'My Team', path: '/my-team' },
        { icon: Calendar, label: 'Leave Management', path: '/leave-management' },
        { icon: FileText, label: 'Claims', path: '/claims' },
        { icon: Clock, label: 'Attendance', path: '/attendance' },
        { icon: CalendarClock, label: 'Admin Slot Booking', path: '/admin-slot-booking' },
        { icon: BarChart3, label: 'Reports', path: '/reports' },
      ];
    }

    // For employees, start with basic employee items
    console.log('Building employee menu items');
    let employeeItems: MenuItem[] = [
      ...baseItems,
      { icon: Calendar, label: 'Apply Leave', path: '/apply-leave' },
      { icon: FileText, label: 'Submit Claim', path: '/submit-claim' },
      { icon: DollarSign, label: 'Payslips', path: '/payslips' },
      { icon: Clock, label: 'My Attendance', path: '/my-attendance' },
      { icon: CalendarClock, label: 'Slot Booking', path: '/slot-booking' },
      { icon: UserCheck, label: 'Profile', path: '/profile' },
    ];

    // If still loading employee data, return basic items
    if (isLoading) {
      console.log('Still loading employee data, returning basic items');
      return employeeItems;
    }

    // Check if employee has admin access permissions and add admin menu items
    if (currentEmployee?.adminAccess) {
      const adminAccess = currentEmployee.adminAccess;
      const adminItems: MenuItem[] = [];
      
      console.log('Employee has admin access permissions:', adminAccess);
      
      if (adminAccess.employees) {
        adminItems.push({ icon: Users, label: 'Employees', path: '/employees' });
      }
      if (adminAccess.payroll) {
        adminItems.push({ icon: DollarSign, label: 'Payroll', path: '/payroll' });
      }
      if (adminAccess.leaveManagement) {
        adminItems.push({ icon: Calendar, label: 'Leave Management', path: '/leave-management' });
      }
      if (adminAccess.claims) {
        adminItems.push({ icon: FileText, label: 'Claims Management', path: '/claims' });
      }
      if (adminAccess.attendance) {
        adminItems.push({ icon: UserCheck, label: 'Attendance Management', path: '/attendance' });
      }
      if (adminAccess.slotBooking) {
        adminItems.push({ icon: CalendarClock, label: 'Admin Slot Booking', path: '/admin-slot-booking' });
      }
      if (adminAccess.reports) {
        adminItems.push({ icon: BarChart3, label: 'Reports', path: '/reports' });
      }

      // Insert admin items after dashboard but before regular employee items
      if (adminItems.length > 0) {
        console.log('Adding admin items to employee menu:', adminItems);
        employeeItems = [
          baseItems[0], // Dashboard
          ...adminItems,
          ...employeeItems.slice(1) // Rest of employee items
        ];
      }
    }

    console.log('Final menu items:', employeeItems);
    return employeeItems;
  };

  const menuItems = getMenuItems();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  console.log('Rendering sidebar with user:', user, 'and menu items:', menuItems);

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
