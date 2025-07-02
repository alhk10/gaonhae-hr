
import React from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

interface ResponsiveLayoutProps {
  children: React.ReactNode;
}

const ResponsiveLayout: React.FC<ResponsiveLayoutProps> = ({ children }) => {
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className={`flex-1 overflow-auto ${isMobile ? 'p-2' : 'p-3 md:p-6'}`}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default ResponsiveLayout;
