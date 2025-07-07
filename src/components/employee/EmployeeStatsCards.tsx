
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  UserCheck, 
  UserX, 
  Briefcase, 
  DollarSign,
  TrendingUp,
  Calendar,
  Building
} from 'lucide-react';
import { EmployeeProfile } from '@/types/employee';

interface EmployeeStatsCardsProps {
  employees: EmployeeProfile[];
}

const EmployeeStatsCards: React.FC<EmployeeStatsCardsProps> = ({ employees }) => {
  const totalEmployees = employees.length;
  const activeEmployees = employees.filter(emp => !emp.resignDate).length;
  const inactiveEmployees = totalEmployees - activeEmployees;
  const fullTimeEmployees = employees.filter(emp => emp.type === 'Full-Time').length;
  const casualEmployees = employees.filter(emp => emp.type === 'Casual').length;

  // Calculate average salary for Full-Time employees
  const fullTimeWithSalary = employees.filter(emp => 
    emp.type === 'Full-Time' && emp.baseSalary && emp.baseSalary > 0
  );
  const averageSalary = fullTimeWithSalary.length > 0 
    ? Math.round(fullTimeWithSalary.reduce((sum, emp) => sum + (emp.baseSalary || 0), 0) / fullTimeWithSalary.length)
    : 0;

  // Get department breakdown
  const departments = employees.reduce((acc, emp) => {
    const dept = emp.department || emp.branch || 'Unknown';
    acc[dept] = (acc[dept] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topDepartment = Object.entries(departments)
    .sort(([,a], [,b]) => b - a)[0];

  // Recent hires (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentHires = employees.filter(emp => 
    emp.joinDate && new Date(emp.joinDate) >= thirtyDaysAgo
  ).length;

  const stats = [
    {
      title: 'Total Employees',
      value: totalEmployees.toString(),
      description: 'All employees in system',
      icon: Users,
      color: 'bg-blue-500'
    },
    {
      title: 'Active Employees',
      value: activeEmployees.toString(),
      description: `${inactiveEmployees} inactive`,
      icon: UserCheck,
      color: 'bg-green-500'
    },
    {
      title: 'Full-Time Staff',
      value: fullTimeEmployees.toString(),
      description: `${casualEmployees} casual workers`,
      icon: Briefcase,
      color: 'bg-purple-500'
    },
    {
      title: 'Average Salary',
      value: averageSalary > 0 ? `S$${averageSalary.toLocaleString()}` : 'N/A',
      description: 'Monthly for Full-Time',
      icon: DollarSign,
      color: 'bg-orange-500'
    },
    {
      title: 'Top Department',
      value: topDepartment ? topDepartment[0] : 'N/A',
      description: topDepartment ? `${topDepartment[1]} employees` : 'No data',
      icon: Building,
      color: 'bg-indigo-500'
    },
    {
      title: 'Recent Hires',
      value: recentHires.toString(),
      description: 'Last 30 days',
      icon: TrendingUp,
      color: 'bg-teal-500'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
      {stats.map((stat, index) => {
        const IconComponent = stat.icon;
        return (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${stat.color} text-white`}>
                  <IconComponent className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-sm font-medium text-gray-600 truncate">{stat.title}</p>
                  <p className="text-xs text-gray-500 truncate">{stat.description}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default EmployeeStatsCards;
