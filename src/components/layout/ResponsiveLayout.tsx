
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
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className={`flex ${isMobile ? 'h-[calc(100vh-73px)]' : 'h-[calc(100vh-73px)]'}`}>
        <Sidebar />
        <main className={`flex-1 p-3 md:p-6 overflow-auto ${isMobile ? 'px-2' : ''}`}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default ResponsiveLayout;
