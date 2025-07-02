
import React from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { User, Menu } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

const Navbar = () => {
  const { user, logout } = useAuth();
  const isMobile = useIsMobile();

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  return (
    <nav className="bg-white border-b border-gray-200 px-3 md:px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden">
            <img 
              src="/lovable-uploads/fbbeccdc-3802-4172-9a2a-8e1b0f83829d.png" 
              alt="Gaonhae Taekwondo Logo"
              className="w-full h-full object-contain"
            />
          </div>
          {!isMobile && (
            <div>
              <h1 className="text-xl font-bold text-gray-900">Gaonhae HR</h1>
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-2 md:space-x-4">
          <div className={`flex items-center space-x-2 text-sm ${isMobile ? 'flex-col items-end space-x-0 space-y-1' : ''}`}>
            <div className="flex items-center space-x-2">
              <User className="w-4 h-4 text-gray-400" />
              <span className={`text-gray-700 ${isMobile ? 'text-xs' : ''}`}>
                {isMobile ? user?.name?.split(' ')[0] : user?.name}
              </span>
            </div>
            <span className={`bg-blue-100 text-blue-800 px-2 py-1 rounded-full capitalize ${isMobile ? 'text-xs px-1.5 py-0.5' : 'text-xs'}`}>
              {user?.role}
            </span>
          </div>
          <Button 
            variant="outline" 
            size={isMobile ? "sm" : "sm"} 
            onClick={handleLogout}
            className={isMobile ? 'text-xs px-2 py-1' : ''}
          >
            {isMobile ? 'Out' : 'Logout'}
          </Button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
