
import React, { useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/contexts/AuthContext';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

interface ResponsiveLayoutProps {
  children: React.ReactNode;
}

const ResponsiveLayout: React.FC<ResponsiveLayoutProps> = ({ children }) => {
  const isMobile = useIsMobile();
  const { userrole, isLoading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Only show sidebar for superadmins - wait for auth to finish loading
  const showSidebar = !isLoading && userrole === 'superadmin';
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar onToggleSidebar={showSidebar ? () => setSidebarOpen(!sidebarOpen) : undefined} sidebarOpen={sidebarOpen} />
      <div className="flex flex-1 h-[calc(100vh-73px)] overflow-hidden">
        {showSidebar && <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />}
        <main className={`flex-1 overflow-y-auto ${isMobile ? 'px-0.5 py-1' : 'p-3 md:p-6'}`}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default ResponsiveLayout;
