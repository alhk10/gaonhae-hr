
import React from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Users, 
  Calendar, 
  FileText, 
  DollarSign, 
  Settings, 
  BarChart3,
  UserCheck,
  Clock
} from 'lucide-react';

const Sidebar = () => {
  const { user } = useAuth();

  const getMenuItems = () => {
    const baseItems = [
      { icon: BarChart3, label: 'Dashboard', href: '#', active: true },
    ];

    if (user?.role === 'superadmin') {
      return [
        ...baseItems,
        { icon: Users, label: 'Employees', href: '#' },
        { icon: DollarSign, label: 'Payroll', href: '#' },
        { icon: Calendar, label: 'Leave Management', href: '#' },
        { icon: FileText, label: 'Claims', href: '#' },
        { icon: UserCheck, label: 'Attendance', href: '#' },
        { icon: Settings, label: 'System Settings', href: '#' },
      ];
    }

    if (user?.role === 'manager') {
      return [
        ...baseItems,
        { icon: Users, label: 'My Team', href: '#' },
        { icon: Calendar, label: 'Leave Approvals', href: '#' },
        { icon: FileText, label: 'Claim Approvals', href: '#' },
        { icon: Clock, label: 'Attendance', href: '#' },
        { icon: BarChart3, label: 'Reports', href: '#' },
      ];
    }

    return [
      ...baseItems,
      { icon: Calendar, label: 'Apply Leave', href: '#' },
      { icon: FileText, label: 'Submit Claim', href: '#' },
      { icon: DollarSign, label: 'Payslips', href: '#' },
      { icon: Clock, label: 'Attendance', href: '#' },
      { icon: UserCheck, label: 'Profile', href: '#' },
    ];
  };

  const menuItems = getMenuItems();

  return (
    <div className="w-64 bg-white border-r border-gray-200 h-full">
      <div className="p-6">
        <nav className="space-y-1">
          {menuItems.map((item) => (
            <Button
              key={item.label}
              variant={item.active ? "default" : "ghost"}
              className={`w-full justify-start ${item.active ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
            >
              <item.icon className="mr-3 h-4 w-4" />
              {item.label}
            </Button>
          ))}
        </nav>
      </div>
    </div>
  );
};

export default Sidebar;
