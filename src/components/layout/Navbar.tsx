
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { User, LogOut, Menu, X, Key, Shield, Lock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import UserPasswordChangeDialog from '@/components/auth/UserPasswordChangeDialog';
import { SetPinDialog } from '@/components/auth/SetPinDialog';
import { useScreenLockContext } from '@/contexts/ScreenLockContext';

interface NavbarProps {
  onToggleSidebar?: () => void;
  sidebarOpen?: boolean;
}

const Navbar = ({ onToggleSidebar, sidebarOpen }: NavbarProps) => {
  const { user, logout, userDetails, userrole } = useAuth();
  const { refreshPinStatus, lock, hasPin } = useScreenLockContext();
  const isMobile = useIsMobile();
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showPinDialog, setShowPinDialog] = useState(false);

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
    setShowPasswordDialog(true);
    setShowMobileMenu(false);
  };

  const handleSetPin = () => {
    setShowPinDialog(true);
    setShowMobileMenu(false);
  };

  const handlePinSet = () => {
    refreshPinStatus();
  };

  const handleLockNow = () => {
    lock();
    setShowMobileMenu(false);
  };

  const toggleMobileMenu = () => {
    setShowMobileMenu(!showMobileMenu);
  };

  if (!user) {
    return null;
  }

  return (
    <>
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo + Sidebar Toggle */}
            <div className="flex items-center">
              {onToggleSidebar && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onToggleSidebar}
                  className="mr-3"
                >
                  {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </Button>
              )}
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
                
                <Button variant="outline" size="sm" onClick={handleSetPin} className="flex items-center space-x-1">
                  <Shield className="w-4 h-4" />
                  <span>Set PIN</span>
                </Button>
                
                {hasPin && (
                  <Button variant="outline" size="sm" onClick={handleLockNow} className="flex items-center space-x-1">
                    <Lock className="w-4 h-4" />
                    <span>Lock Now</span>
                  </Button>
                )}
                
                <Button variant="outline" size="sm" onClick={handlePasswordChange} className="flex items-center space-x-1">
                  <Key className="w-4 h-4" />
                  <span>Change Password</span>
                </Button>
                
                <Button variant="outline" size="sm" onClick={handleLogout} className="flex items-center space-x-1">
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </Button>
              </div>
            )}

            {/* Mobile Menu Button */}
            {isMobile && (
              <Button variant="ghost" size="sm" onClick={toggleMobileMenu} className="p-2">
                {showMobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
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
              
              <Button variant="outline" size="sm" onClick={handleSetPin} className="w-full flex items-center justify-center space-x-2">
                <Shield className="w-4 h-4" />
                <span>Set PIN</span>
              </Button>
              
              {hasPin && (
                <Button variant="outline" size="sm" onClick={handleLockNow} className="w-full flex items-center justify-center space-x-2">
                  <Lock className="w-4 h-4" />
                  <span>Lock Now</span>
                </Button>
              )}
              
              <Button variant="outline" size="sm" onClick={handlePasswordChange} className="w-full flex items-center justify-center space-x-2">
                <Key className="w-4 h-4" />
                <span>Change Password</span>
              </Button>
              
              <Button variant="outline" size="sm" onClick={handleLogout} className="w-full flex items-center justify-center space-x-2">
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </Button>
            </div>
          </div>
        )}
      </nav>

      <UserPasswordChangeDialog 
        open={showPasswordDialog} 
        onOpenChange={setShowPasswordDialog} 
      />

      {userDetails?.id && (
        <SetPinDialog
          open={showPinDialog}
          onOpenChange={setShowPinDialog}
          employeeId={userDetails.id}
          onPinSet={handlePinSet}
        />
      )}
    </>
  );
};

export default Navbar;
