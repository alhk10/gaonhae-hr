
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

  useEffect(() => {
    const loadCurrentEmployee = async () => {
      if (user?.email && user.role === 'employee') {
        try {
          const employees = await getEmployees();
          const employee = employees.find(emp => emp.email === user.email);
          if (employee) {
            setCurrentEmployee(employee);
            console.log('Current employee loaded with admin access:', employee.adminAccess);
          }
        } catch (error) {
          console.error('Error loading current employee:', error);
        }
      }
    };

    loadCurrentEmployee();
  }, [user]);

  const getMenuItems = (): MenuItem[] => {
    const baseItems: MenuItem[] = [
      { icon: BarChart3, label: 'Dashboard', path: '/' },
    ];

    if (user?.role === 'superadmin') {
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

    if (user?.role === 'manager') {
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

    // For regular employees, check their admin access permissions
    let employeeItems = [
      ...baseItems,
      { icon: Calendar, label: 'Apply Leave', path: '/apply-leave' },
      { icon: FileText, label: 'Submit Claim', path: '/submit-claim' },
      { icon: DollarSign, label: 'Payslips', path: '/payslips' },
      { icon: Clock, label: 'My Attendance', path: '/my-attendance' },
      { icon: CalendarClock, label: 'Slot Booking', path: '/slot-booking' },
      { icon: UserCheck, label: 'Profile', path: '/profile' },
    ];

    // Check if employee has admin access permissions
    if (currentEmployee?.adminAccess) {
      const adminAccess = currentEmployee.adminAccess;
      const adminItems: MenuItem[] = [];
      
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
      employeeItems = [
        baseItems[0], // Dashboard
        ...adminItems,
        ...employeeItems.slice(1) // Rest of employee items
      ];
    }

    return employeeItems;
  };

  const menuItems = getMenuItems();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

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
