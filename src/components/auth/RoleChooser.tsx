import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Briefcase, GraduationCap, Building2 } from 'lucide-react';
import { UserType } from '@/types/auth';

interface RoleChooserProps {
  name?: string;
  options?: UserType[];
  onSelect: (type: UserType) => void;
}

const OPTION_META: Record<UserType, { icon: React.ComponentType<{ className?: string }>; title: string; description: string }> = {
  employee: {
    icon: Briefcase,
    title: 'Continue as Employee',
    description: 'Payroll, attendance, branch tools',
  },
  student: {
    icon: GraduationCap,
    title: 'Continue as Student',
    description: 'Classes, invoices, grading',
  },
  branch: {
    icon: Building2,
    title: 'Continue to Branch',
    description: 'Branch dashboard, students, schedule',
  },
};

const RoleChooser: React.FC<RoleChooserProps> = ({ name, options = ['employee', 'student'], onSelect }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Welcome{name ? `, ${name}` : ''}</CardTitle>
          <CardDescription>You have access to more than one portal. How would you like to continue?</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          {options.map((opt) => {
            const { icon: Icon, title, description } = OPTION_META[opt];
            return (
              <Button
                key={opt}
                variant="outline"
                className="h-16 justify-start gap-3"
                onClick={() => onSelect(opt)}
              >
                <Icon className="w-5 h-5" />
                <span className="flex flex-col items-start">
                  <span className="font-medium">{title}</span>
                  <span className="text-xs text-muted-foreground">{description}</span>
                </span>
              </Button>
            );
          })}
          <p className="text-xs text-muted-foreground text-center pt-1">
            You can switch anytime from the toggle at the top of the dashboard.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default RoleChooser;
