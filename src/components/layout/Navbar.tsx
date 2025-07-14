
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { User, LogOut, Menu, X, Key } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import UserPasswordChangeDialog from '@/components/auth/UserPasswordChangeDialog';

const Navbar = () => {
  const { user, logout } = useAuth();
  const isMobile = useIsMobile();
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);

  console.log('Navbar: Rendering with user:', user?.email);

  const handleLogout = async () => {
    console.log('Navbar: Logout button clicked');
    try {
      await logout();
    } catch (error) {
      console.error('Navbar: Error during logout:', error);
    }
    setShowMobileMenu(false);
  };

  const handlePasswordChange = () => {
    console.log('Navbar: Password change button clicked');
    setShowPasswordDialog(true);
    setShowMobileMenu(false);
  };

  const toggleMobileMenu = () => {
    setShowMobileMenu(!showMobileMenu);
  };

  if (!user) {
    console.log('Navbar: No user found, not rendering navbar');
    return null;
  }

  return (
    <>
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <img 
                src="/lovable-uploads/bec86f13-6728-40c7-8387-ff2cf171961b.png" 
                alt="Gaonhae HR" 
                className="h-8 w-auto"
              />
              <span className="ml-2 text-xl font-bold text-gray-900">Gaonhae HR</span>
            </div>

            {/* Desktop User Menu */}
            {!isMobile && (
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4 text-gray-600" />
                  <span className="text-sm text-gray-700">{user.email}</span>
                </div>
                
                {/* Password Change Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePasswordChange}
                  className="flex items-center space-x-1"
                >
                  <Key className="w-4 h-4" />
                  <span>Change Password</span>
                </Button>
                
                {/* Logout Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  className="flex items-center space-x-1"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </Button>
              </div>
            )}

            {/* Mobile Menu Button */}
            {isMobile && (
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleMobileMenu}
                className="p-2"
              >
                {showMobileMenu ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobile && showMobileMenu && (
          <div className="border-t border-gray-200 bg-white">
            <div className="px-4 py-3 space-y-3">
              <div className="flex items-center space-x-2 text-sm text-gray-700">
                <User className="w-4 h-4" />
                <span>{user.email}</span>
              </div>
              
              {/* Mobile Password Change Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={handlePasswordChange}
                className="w-full flex items-center justify-center space-x-2"
              >
                <Key className="w-4 h-4" />
                <span>Change Password</span>
              </Button>
              
              {/* Mobile Logout Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="w-full flex items-center justify-center space-x-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </Button>
            </div>
          </div>
        )}
      </nav>

      {/* Password Change Dialog */}
      <UserPasswordChangeDialog 
        open={showPasswordDialog} 
        onOpenChange={setShowPasswordDialog} 
      />
    </>
  );
};

export default Navbar;
