import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Briefcase, GraduationCap } from 'lucide-react';
import { UserType } from '@/types/auth';

interface RoleChooserProps {
  name?: string;
  onSelect: (type: UserType) => void;
}

const RoleChooser: React.FC<RoleChooserProps> = ({ name, onSelect }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Welcome{name ? `, ${name}` : ''}</CardTitle>
          <CardDescription>You have access to both portals. How would you like to continue?</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <Button
            variant="outline"
            className="h-16 justify-start gap-3"
            onClick={() => onSelect('employee')}
          >
            <Briefcase className="w-5 h-5" />
            <span className="flex flex-col items-start">
              <span className="font-medium">Continue as Employee</span>
              <span className="text-xs text-muted-foreground">Payroll, attendance, branch tools</span>
            </span>
          </Button>
          <Button
            variant="outline"
            className="h-16 justify-start gap-3"
            onClick={() => onSelect('student')}
          >
            <GraduationCap className="w-5 h-5" />
            <span className="flex flex-col items-start">
              <span className="font-medium">Continue as Student</span>
              <span className="text-xs text-muted-foreground">Classes, invoices, grading</span>
            </span>
          </Button>
          <p className="text-xs text-muted-foreground text-center pt-1">
            You can switch anytime from the toggle at the top of the dashboard.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default RoleChooser;
