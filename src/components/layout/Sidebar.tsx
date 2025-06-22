
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

interface MenuItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
  active: boolean;
}

const Sidebar = () => {
  const { user } = useAuth();

  const getMenuItems = (): MenuItem[] => {
    const baseItems: MenuItem[] = [
      { icon: BarChart3, label: 'Dashboard', href: '#', active: true },
    ];

    if (user?.role === 'superadmin') {
      return [
        ...baseItems,
        { icon: Users, label: 'Employees', href: '#', active: false },
        { icon: DollarSign, label: 'Payroll', href: '#', active: false },
        { icon: Calendar, label: 'Leave Management', href: '#', active: false },
        { icon: FileText, label: 'Claims', href: '#', active: false },
        { icon: UserCheck, label: 'Attendance', href: '#', active: false },
        { icon: Settings, label: 'System Settings', href: '#', active: false },
      ];
    }

    if (user?.role === 'manager') {
      return [
        ...baseItems,
        { icon: Users, label: 'My Team', href: '#', active: false },
        { icon: Calendar, label: 'Leave Approvals', href: '#', active: false },
        { icon: FileText, label: 'Claim Approvals', href: '#', active: false },
        { icon: Clock, label: 'Attendance', href: '#', active: false },
        { icon: BarChart3, label: 'Reports', href: '#', active: false },
      ];
    }

    return [
      ...baseItems,
      { icon: Calendar, label: 'Apply Leave', href: '#', active: false },
      { icon: FileText, label: 'Submit Claim', href: '#', active: false },
      { icon: DollarSign, label: 'Payslips', href: '#', active: false },
      { icon: Clock, label: 'Attendance', href: '#', active: false },
      { icon: UserCheck, label: 'Profile', href: '#', active: false },
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
