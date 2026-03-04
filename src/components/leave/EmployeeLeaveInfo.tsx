
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Info, AlertTriangle, CheckCircle } from 'lucide-react';
import { isEligibleForLeave, getEmployeeEligibilityMessage } from '@/utils/employeeEligibility';

interface EmployeeLeaveInfoProps {
  employee: {
    id: string;
    name: string;
    display_name?: string;
    type: string;
    position?: string;
    joinDate?: string;
  };
  showDetailedInfo?: boolean;
}

const EmployeeLeaveInfo: React.FC<EmployeeLeaveInfoProps> = ({ 
  employee, 
  showDetailedInfo = false 
}) => {
  const isEligible = isEligibleForLeave(employee);
  const eligibilityMessage = getEmployeeEligibilityMessage(employee);
  
  const getEmployeeTypeDisplay = () => {
    return `${employee.type}${employee.position ? `, ${employee.position}` : ''}`;
  };

  const getStatusIcon = () => {
    if (isEligible) {
      return <CheckCircle className="w-4 h-4 text-green-600" />;
    } else if (employee.position === 'Senior Partner') {
      return <Info className="w-4 h-4 text-blue-600" />;
    } else {
      return <AlertTriangle className="w-4 h-4 text-orange-600" />;
    }
  };

  const getStatusColor = () => {
    if (isEligible) return 'bg-green-50 border-green-200';
    if (employee.position === 'Senior Partner') return 'bg-blue-50 border-blue-200';
    return 'bg-orange-50 border-orange-200';
  };

  if (!showDetailedInfo) {
    return (
      <div className="flex items-center space-x-2">
        {getStatusIcon()}
        <span className="text-sm font-medium">{employee.display_name || employee.name}</span>
        <Badge variant={isEligible ? "default" : "secondary"} className="text-xs">
          {getEmployeeTypeDisplay()}
        </Badge>
        {!isEligible && (
          <Badge variant="destructive" className="text-xs">
            No Leave Entitlement
          </Badge>
        )}
      </div>
    );
  }

  return (
    <Card className={`${getStatusColor()}`}>
      <CardContent className="p-4">
        <div className="flex items-start space-x-3">
          {getStatusIcon()}
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <h3 className="font-medium text-gray-900">{employee.display_name || employee.name}</h3>
              <Badge variant="outline" className="text-xs">
                {getEmployeeTypeDisplay()}
              </Badge>
            </div>
            
            <p className="text-sm text-gray-700 mb-2">{eligibilityMessage}</p>
            
            {employee.joinDate && isEligible && (
              <div className="text-xs text-gray-500">
                <p>Join Date: {new Date(employee.joinDate).toLocaleDateString()}</p>
                <p>Annual leave is pro-rated based on join date</p>
              </div>
            )}
            
            {!employee.joinDate && isEligible && (
              <div className="text-xs text-amber-600">
                <p>⚠️ No join date on record - using full entitlement</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default EmployeeLeaveInfo;
