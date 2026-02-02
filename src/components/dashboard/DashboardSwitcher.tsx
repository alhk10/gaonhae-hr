import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Users, DollarSign, FileText, Eye, Building2, GraduationCap, User } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBranches } from '@/hooks/useBranches';
import SuperadminDashboard from './SuperadminDashboard';
import BranchDashboard from './BranchDashboard';
import EmployeeDashboard from './EmployeeDashboard';
import StudentDashboard from './StudentDashboard';

interface DashboardSwitcherProps {
  defaultView?: 'overview' | 'branch' | 'employee' | 'student';
}

const DashboardSwitcher: React.FC<DashboardSwitcherProps> = ({ defaultView = 'overview' }) => {
  const [activeView, setActiveView] = useState(defaultView);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  
  const { branches, loading: branchesLoading } = useBranches();

  // Fetch employees for employee view
  const { data: employees = [] } = useQuery({
    queryKey: ['employees-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('id, name, email, type, position')
        .is('resign_date', null)
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: activeView === 'employee',
  });

  // Fetch students for student view
  const { data: students = [] } = useQuery({
    queryKey: ['students-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('id, first_name, last_name, email, status')
        .eq('status', 'Active')
        .order('first_name');
      if (error) throw error;
      return data || [];
    },
    enabled: activeView === 'student',
  });

  const renderActiveView = () => {
    switch (activeView) {
      case 'overview':
        return <SuperadminDashboard />;
      
      case 'branch':
        if (!selectedBranch) {
          return (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Select a branch to view its dashboard</p>
              </CardContent>
            </Card>
          );
        }
        return <BranchDashboard branchId={selectedBranch} />;
      
      case 'employee':
        if (!selectedEmployee) {
          return (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Select an employee to view their dashboard</p>
              </CardContent>
            </Card>
          );
        }
        return <EmployeeDashboard simulatedEmployeeId={selectedEmployee} />;
      
      case 'student':
        if (!selectedStudent) {
          return (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <GraduationCap className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Select a student to view their portal</p>
              </CardContent>
            </Card>
          );
        }
        return <StudentDashboard studentId={selectedStudent} isSimulated />;
      
      default:
        return <SuperadminDashboard />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Dashboard Selector */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <Tabs value={activeView} onValueChange={(v) => setActiveView(v as any)}>
              <TabsList>
                <TabsTrigger value="overview" className="flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="branch" className="flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Branch
                </TabsTrigger>
                <TabsTrigger value="employee" className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Employee
                </TabsTrigger>
                <TabsTrigger value="student" className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4" />
                  Student
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Contextual selectors */}
            {activeView === 'branch' && (
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select branch..." />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {activeView === 'employee' && (
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger className="w-[250px]">
                  <SelectValue placeholder="Select employee..." />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.name} ({emp.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {activeView === 'student' && (
              <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                <SelectTrigger className="w-[250px]">
                  <SelectValue placeholder="Select student..." />
                </SelectTrigger>
                <SelectContent>
                  {students.map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.first_name} {student.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {activeView !== 'overview' && (
              <Badge variant="outline" className="ml-auto">
                Viewing as Superadmin
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Active Dashboard View */}
      {renderActiveView()}
    </div>
  );
};

export default DashboardSwitcher;
