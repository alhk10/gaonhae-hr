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
  Building2,
  Video,
  BookOpen,
  Share2,
  ChevronRight,
  Image as ImageIcon,
  MessageSquare,
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

interface MenuGroup {
  type: 'group';
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  basePath: string;
  storageKey: string;
  children: MenuItem[];
}

type MenuEntry = MenuItem | MenuGroup;
const isGroup = (e: MenuEntry): e is MenuGroup => (e as MenuGroup).type === 'group';

const SOCIAL_MEDIA_GROUP: MenuGroup = {
  type: 'group',
  icon: Share2,
  label: 'Social Media',
  basePath: '/social',
  storageKey: 'sidebar.socialMedia.open',
  children: [
    { icon: BarChart3, label: 'Dashboard', path: '/social/dashboard' },
    { icon: FileText, label: 'Create Post', path: '/social/create' },
    { icon: CalendarClock, label: 'Posting Queue', path: '/social/scheduled' },
    { icon: Calendar, label: 'Content Calendar', path: '/social/calendar' },
    { icon: ImageIcon, label: 'Caricatures', path: '/social/caricatures' },
    { icon: Settings, label: 'Brand Settings', path: '/social/brand' },
    { icon: BarChart3, label: 'Analytics', path: '/social/analytics' },
    { icon: Award, label: 'AI Suggestions', path: '/social/suggestions' },
  ],
};

import { validateSuperadminAccess, logAuthState } from '@/utils/authValidation';
import { systemValidator } from '@/utils/systemTestValidator';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const Sidebar = ({ isOpen, onClose }: SidebarProps = {}) => {
  const authData = useAuth();
  const { user, userrole, userType } = authData;
  const location = useLocation();
  const isMobile = useIsMobile();
  const [currentEmployee, setCurrentEmployee] = useState<EmployeeProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [internalOpen, setInternalOpen] = useState(false);
  const { hasAccess: hasSalesAccess } = useSalesModuleAccess();
  const { accessibleBranches, hasAccess: hasBranchAccess } = useBranchAccess();

  // Log auth state for debugging
  logAuthState('Sidebar Component', authData);

  // Run system validation for superadmin users (only once per session)
  useEffect(() => {
    if (userrole === 'superadmin' && user?.email) {
      systemValidator.runAllTests(user.email).then(results => {
        // Validation complete
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

  const getMenuItems = useCallback((): MenuEntry[] => {
    // Generate menu based on role
    
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
        { icon: Video, label: 'CCTV Monitoring', path: '/cctv' },
      ];

      // Add Sales Module items if user has access
      if (hasSalesAccess) {
        console.log('Sidebar: ✅ SALES MODULE ACCESS GRANTED - Adding sales menu items');
        adminItems.push(
          { icon: ShoppingCart, label: 'Sales Dashboard', path: '/sales' },
          { icon: Package, label: 'Products & Inventory', path: '/sales/products' },
          { icon: Receipt, label: 'Invoices & Payments', path: '/sales/invoices' },
          { icon: DollarSign, label: 'Student Credits', path: '/sales/credits' },
          { icon: Award, label: 'Grading', path: '/sales/grading' },
          { icon: TrendingUp, label: 'Sales Reports', path: '/sales/reports' }
        );
      }

      // Partner pages (superadmin can access all)
      adminItems.push(
        { icon: Briefcase, label: 'Partners Claim', path: '/submit-partners-claim' },
        { icon: FileSpreadsheet, label: 'Branch P&L', path: '/branch-profit-loss' },
        { icon: BookOpen, label: 'Finance', path: '/finance' },
        { icon: FileCheck, label: 'Miscellaneous', path: '/miscellaneous' }
      );

      adminItems.push({ icon: FileText, label: 'Documents', path: '/documents' });
      adminItems.push({ icon: MessageSquare, label: 'SMS Bridge', path: '/sms' });
      adminItems.push({ icon: Settings, label: 'System Settings', path: '/settings' });

      // Add Sales Settings if user has access
      if (hasSalesAccess) {
        adminItems.push({ icon: Settings, label: 'Sales Settings', path: '/sales/settings' });
      }

      const entries: MenuEntry[] = [...adminItems, SOCIAL_MEDIA_GROUP];
      console.log('Sidebar: Superladmin menu items:', entries.length, 'total entries');
      return entries;
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
      menuItems.push({ icon: FileText, label: 'Documents', path: '/documents' });
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
      if (pageAccess.cctvMonitoring) {
        menuItems.push({ icon: Video, label: 'CCTV Monitoring', path: '/cctv' });
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

  // Use props if provided, otherwise use internal state
  const sidebarOpen = isOpen !== undefined ? isOpen : internalOpen;
  const closeSidebar = onClose || (() => setInternalOpen(false));
  const toggleSidebar = () => {
    if (onClose) {
      // controlled mode - parent handles toggle
    } else {
      setInternalOpen(!internalOpen);
    }
  };

  const handleMenuItemClick = () => {
    closeSidebar();
  };

  // Show loading state while auth or admin access data is loading
  const isAuthLoading = !user || authData.isLoading;
  const isDataLoading = userrole === 'employee' && isLoading && !currentEmployee && !authData.adminAccess;

  // When used standalone (no isOpen prop), render hamburger button
  const showStandaloneHamburger = isOpen === undefined;
  
  if (isAuthLoading || isDataLoading) {
    return showStandaloneHamburger ? (
      <Button variant="outline" size="sm" className="fixed top-[18px] left-4 z-[60]" onClick={toggleSidebar}>
        <Menu className="h-5 w-5" />
      </Button>
    ) : null;
  }

  return (
    <>
      {showStandaloneHamburger && (
        <Button variant="outline" size="sm" className="fixed top-[18px] left-4 z-[60]" onClick={() => setInternalOpen(!internalOpen)}>
          {internalOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      )}
      {sidebarOpen && (
        <div className="fixed inset-0 z-[55]">
          <div className="fixed inset-0 bg-black bg-opacity-25" onClick={closeSidebar} />
          <div className="fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 shadow-lg flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto overscroll-contain p-6 pt-20">
              <nav className="space-y-1">
                {menuItems.map((entry) => {
                  if (isGroup(entry)) {
                    return (
                      <SidebarGroup
                        key={entry.label}
                        group={entry}
                        currentPath={location.pathname}
                        onNavigate={handleMenuItemClick}
                      />
                    );
                  }
                  return (
                    <Button
                      key={entry.label}
                      variant={isActive(entry.path) ? 'default' : 'ghost'}
                      className={`w-full justify-start ${isActive(entry.path) ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
                      asChild
                      onClick={handleMenuItemClick}
                    >
                      <Link to={entry.path}>
                        <entry.icon className="mr-3 h-4 w-4" />
                        {entry.label}
                      </Link>
                    </Button>
                  );
                })}
              </nav>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

interface SidebarGroupProps {
  group: MenuGroup;
  currentPath: string;
  onNavigate: () => void;
}

const SidebarGroup = ({ group, currentPath, onNavigate }: SidebarGroupProps) => {
  const containsActive = currentPath.startsWith(group.basePath);
  const [open, setOpen] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(group.storageKey);
      if (stored !== null) return stored === 'true';
    } catch { /* ignore */ }
    return containsActive;
  });

  useEffect(() => {
    if (containsActive) setOpen(true);
  }, [containsActive]);

  const toggle = () => {
    setOpen((o) => {
      const next = !o;
      try { localStorage.setItem(group.storageKey, String(next)); } catch { /* ignore */ }
      return next;
    });
  };

  return (
    <div>
      <Button
        variant={containsActive ? 'default' : 'ghost'}
        className={`w-full justify-start ${containsActive ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
        onClick={toggle}
      >
        <group.icon className="mr-3 h-4 w-4" />
        <span className="flex-1 text-left">{group.label}</span>
        <ChevronRight className={`h-4 w-4 transition-transform duration-200 ${open ? 'rotate-90' : ''}`} />
      </Button>
      <div
        className={`overflow-hidden transition-all duration-200 ease-out ${open ? 'max-h-[500px] mt-1' : 'max-h-0'}`}
      >
        <div className="ml-3 pl-3 border-l border-gray-200 space-y-1">
          {group.children.map((child) => {
            const active = currentPath === child.path;
            return (
              <Button
                key={child.path}
                variant={active ? 'default' : 'ghost'}
                className={`w-full justify-start h-8 text-sm ${active ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
                asChild
                onClick={onNavigate}
              >
                <Link to={child.path}>
                  <child.icon className="mr-2 h-3.5 w-3.5" />
                  {child.label}
                </Link>
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;