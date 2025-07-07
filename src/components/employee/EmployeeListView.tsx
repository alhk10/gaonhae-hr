
import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Mail, 
  Phone, 
  Calendar, 
  MapPin, 
  User,
  Building,
  Briefcase,
  CreditCard
} from 'lucide-react';
import { EmployeeProfile } from '@/types/employee';
import ActionMenu from './ActionMenu';

interface EmployeeListViewProps {
  employees: EmployeeProfile[];
  onView: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string, name: string) => void;
  onResetPassword?: (name: string, email: string) => void;
  onToggleStatus?: (id: string, name: string, currentStatus: boolean) => void;
  isSuperAdmin?: boolean;
}

const EmployeeListView: React.FC<EmployeeListViewProps> = ({
  employees,
  onView,
  onEdit,
  onDelete,
  onResetPassword,
  onToggleStatus,
  isSuperAdmin = false
}) => {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getSalaryDisplay = (employee: EmployeeProfile) => {
    if (employee.baseSalary) {
      return `S$${employee.baseSalary.toLocaleString()}/month`;
    } else if (employee.hourlyRate) {
      return `S$${employee.hourlyRate}/hour`;
    } else if (employee.dailyWeekdayRate) {
      return `S$${employee.dailyWeekdayRate}/day`;
    }
    return 'Not set';
  };

  return (
    <div className="space-y-3">
      {employees.map((employee) => {
        const isActive = !employee.resignDate;
        
        return (
          <Card 
            key={employee.id} 
            className={`transition-all duration-200 hover:shadow-md ${
              !isActive ? 'opacity-75 bg-gray-50' : ''
            }`}
          >
            <CardContent className="p-4">
              <div className="flex items-center space-x-4">
                {/* Avatar */}
                <Avatar className="h-12 w-12 flex-shrink-0">
                  <AvatarImage src={employee.profilePhoto} alt={employee.name} />
                  <AvatarFallback className={`text-sm font-bold ${
                    employee.type === 'Full-Time' 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'bg-purple-100 text-purple-700'
                  }`}>
                    {getInitials(employee.name)}
                  </AvatarFallback>
                </Avatar>

                {/* Main Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-3 mb-1">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {employee.name}
                        </h3>
                        <Badge 
                          variant={employee.type === 'Full-Time' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {employee.type}
                        </Badge>
                        {!isActive && (
                          <Badge variant="destructive" className="text-xs">
                            Inactive
                          </Badge>
                        )}
                      </div>
                      
                      {/* Quick Info Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-sm text-gray-600">
                        {employee.position && (
                          <div className="flex items-center space-x-1 min-w-0">
                            <Briefcase className="w-3 h-3 flex-shrink-0 text-gray-400" />
                            <span className="truncate">{employee.position}</span>
                          </div>
                        )}
                        
                        {employee.email && (
                          <div className="flex items-center space-x-1 min-w-0">
                            <Mail className="w-3 h-3 flex-shrink-0 text-gray-400" />
                            <span className="truncate">{employee.email}</span>
                          </div>
                        )}
                        
                        {employee.branch && (
                          <div className="flex items-center space-x-1 min-w-0">
                            <MapPin className="w-3 h-3 flex-shrink-0 text-gray-400" />
                            <span className="truncate">{employee.branch}</span>
                          </div>
                        )}
                        
                        <div className="flex items-center space-x-1">
                          <CreditCard className="w-3 h-3 flex-shrink-0 text-gray-400" />
                          <span className="truncate">{getSalaryDisplay(employee)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Menu */}
                    <div className="flex-shrink-0 ml-4">
                      <ActionMenu
                        employeeId={employee.id}
                        employeeName={employee.name}
                        employeeEmail={employee.email || ''}
                        isActive={isActive}
                        onView={onView}
                        onEdit={onEdit}
                        onResetPassword={onResetPassword}
                        onDelete={onDelete}
                        onToggleStatus={onToggleStatus}
                        isSuperAdmin={isSuperAdmin}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default EmployeeListView;
