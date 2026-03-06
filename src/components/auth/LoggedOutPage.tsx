
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LogIn, AlertCircle } from 'lucide-react';

interface LoggedOutPageProps {
  onLoginClick: () => void;
  hasError?: boolean;
}

const LoggedOutPage: React.FC<LoggedOutPageProps> = ({ onLoginClick, hasError = false }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md shadow-lg border-0">
        <CardHeader className="text-center pb-6">
          <div className="mx-auto mb-4 w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            {hasError ? (
              <AlertCircle className="w-8 h-8 text-red-500" />
            ) : (
              <LogIn className="w-8 h-8 text-blue-600" />
            )}
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            {hasError ? 'Session Error' : 'Logged Out'}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-gray-600">
            {hasError 
              ? 'There was an error with your session. Please log in again to continue.'
              : 'You have been successfully logged out of Gaonhae Taekwondo.'
            }
          </p>
          <Button 
            onClick={onLoginClick}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            <LogIn className="w-4 h-4 mr-2" />
            Log In Again
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoggedOutPage;
