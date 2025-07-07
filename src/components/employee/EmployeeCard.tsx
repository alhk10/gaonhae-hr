
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Mail, 
  Phone, 
  Calendar, 
  MapPin, 
  Eye, 
  Edit, 
  Trash2, 
  KeyRound,
  User,
  Building
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
}

const EmployeeCard: React.FC<EmployeeCardProps> = ({
  employee,
  onView,
  onEdit,
  onDelete,
  onResetPassword,
  showActions = true,
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

  const isActive = !employee.resignDate;

  return (
    <Card className={`transition-all duration-200 hover:shadow-md ${!isActive ? 'opacity-75 bg-gray-50' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start space-x-4">
          {/* Avatar */}
          <Avatar className="h-12 w-12 flex-shrink-0">
            <AvatarFallback className={`text-sm font-medium ${employee.type === 'Full-Time' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
              {getInitials(employee.name)}
            </AvatarFallback>
          </Avatar>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="font-semibold text-gray-900 truncate">{employee.name}</h3>
                <p className="text-sm text-gray-600 truncate">{employee.position || 'Not specified'}</p>
              </div>
              <div className="flex items-center space-x-2 flex-shrink-0">
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
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600 mb-3">
              {employee.email && (
                <div className="flex items-center space-x-2 min-w-0">
                  <Mail className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{employee.email}</span>
                </div>
              )}
              {employee.phone && (
                <div className="flex items-center space-x-2 min-w-0">
                  <Phone className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{employee.phone}</span>
                </div>
              )}
              {employee.joinDate && (
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 flex-shrink-0" />
                  <span>Joined: {new Date(employee.joinDate).toLocaleDateString()}</span>
                </div>
              )}
              {employee.branch && (
                <div className="flex items-center space-x-2 min-w-0">
                  <MapPin className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{employee.branch}</span>
                </div>
              )}
              {employee.department && (
                <div className="flex items-center space-x-2 min-w-0">
                  <Building className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{employee.department}</span>
                </div>
              )}
              <div className="flex items-center space-x-2">
                <User className="w-4 h-4 flex-shrink-0" />
                <span>ID: {employee.id}</span>
              </div>
            </div>

            {/* Actions */}
            {showActions && (
              <div className="flex flex-wrap gap-2 pt-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onView(employee.id)}
                  className="text-xs"
                >
                  <Eye className="w-3 h-3 mr-1" />
                  View
                </Button>
                
                {onEdit && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(employee.id)}
                    className="text-xs"
                  >
                    <Edit className="w-3 h-3 mr-1" />
                    Edit
                  </Button>
                )}

                {isSuperAdmin && employee.email && onResetPassword && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onResetPassword(employee.name, employee.email)}
                    className="text-xs text-blue-600 hover:text-blue-700"
                    title="Reset password"
                  >
                    <KeyRound className="w-3 h-3 mr-1" />
                    Reset
                  </Button>
                )}

                {isSuperAdmin && onDelete && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onDelete(employee.id, employee.name)}
                    className="text-xs text-red-600 hover:text-red-700"
                    title="Remove employee"
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    Remove
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default EmployeeCard;
