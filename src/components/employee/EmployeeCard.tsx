
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Mail, 
  Phone, 
  Calendar, 
  MapPin, 
  Eye,
  User,
  Building,
  Briefcase,
  CreditCard
} from 'lucide-react';
import { EmployeeProfile } from '@/types/employee';

interface EmployeeCardProps {
  employee: EmployeeProfile;
  onView: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string, name: string) => void;
  onResetPassword?: (name: string, email: string) => void;
  showActions?: boolean;
  isSuperAdmin?: boolean;
  isSelected?: boolean;
  onSelect?: (id: string, selected: boolean) => void;
}

const EmployeeCard: React.FC<EmployeeCardProps> = ({
  employee,
  onView,
  onEdit,
  onDelete,
  onResetPassword,
  showActions = true,
  isSuperAdmin = false,
  isSelected = false,
  onSelect
}) => {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const isActive = !employee.resignDate;

  const getSalaryDisplay = () => {
    if (employee.baseSalary) {
      return `S$${employee.baseSalary.toLocaleString()}/month`;
    } else if (employee.hourlyRate) {
      return `S$${employee.hourlyRate}/hour`;
    }
    return 'Dynamic Pricing';
  };

  return (
    <Card className={`transition-all duration-200 hover:shadow-lg hover:-translate-y-1 ${
      !isActive ? 'opacity-75 bg-gray-50' : 'hover:shadow-md'
    } ${isSelected ? 'ring-2 ring-blue-500' : ''}`}>
      <CardContent className="p-6">
        <div className="flex items-start space-x-4">
          {/* Avatar */}
          <div className="flex-shrink-0">
            <Avatar className="h-16 w-16">
              <AvatarImage src={employee.profilePhoto} alt={employee.name} />
              <AvatarFallback className={`text-lg font-bold ${
                employee.type === 'Full-Time' 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'bg-purple-100 text-purple-700'
              }`}>
                {getInitials(employee.name)}
              </AvatarFallback>
            </Avatar>
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-lg text-gray-900 truncate mb-1">
                  {employee.name}
                </h3>
                <div className="flex items-center space-x-2 mb-2">
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
                {employee.position && (
                  <div className="flex items-center text-sm text-gray-600 mb-2">
                    <Briefcase className="w-4 h-4 mr-2 flex-shrink-0" />
                    <span className="truncate">{employee.position}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Details Grid */}
            <div className="space-y-2 text-sm text-gray-600 mb-4">
              {employee.email && (
                <div className="flex items-center space-x-2 min-w-0">
                  <Mail className="w-4 h-4 flex-shrink-0 text-gray-400" />
                  <span className="truncate">{employee.email}</span>
                </div>
              )}
              
              {employee.phone && (
                <div className="flex items-center space-x-2 min-w-0">
                  <Phone className="w-4 h-4 flex-shrink-0 text-gray-400" />
                  <span className="truncate">{employee.phone}</span>
                </div>
              )}
              
              {employee.branch && (
                <div className="flex items-center space-x-2 min-w-0">
                  <MapPin className="w-4 h-4 flex-shrink-0 text-gray-400" />
                  <span className="truncate">{employee.branch}</span>
                </div>
              )}

              {employee.department && (
                <div className="flex items-center space-x-2 min-w-0">
                  <Building className="w-4 h-4 flex-shrink-0 text-gray-400" />
                  <span className="truncate">{employee.department}</span>
                </div>
              )}

              <div className="flex items-center space-x-2">
                <CreditCard className="w-4 h-4 flex-shrink-0 text-gray-400" />
                <span>{getSalaryDisplay()}</span>
              </div>

              {employee.joinDate && (
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 flex-shrink-0 text-gray-400" />
                  <span>Joined: {new Date(employee.joinDate).toLocaleDateString()}</span>
                </div>
              )}

              <div className="flex items-center space-x-2">
                <User className="w-4 h-4 flex-shrink-0 text-gray-400" />
                <span>ID: {employee.id}</span>
              </div>
            </div>

            {/* Quick Action */}
            {showActions && (
              <div className="pt-3 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onView(employee.id)}
                  className="w-full justify-start text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  View Details
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default EmployeeCard;
