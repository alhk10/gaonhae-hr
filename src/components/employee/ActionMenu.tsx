
import React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  MoreHorizontal, 
  Eye, 
  Edit, 
  Trash2, 
  KeyRound,
  UserCheck,
  UserX
} from 'lucide-react';

interface ActionMenuProps {
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  isActive: boolean;
  onView: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string, name: string) => void;
  onResetPassword?: (name: string, email: string) => void;
  onToggleStatus?: (id: string, name: string, currentStatus: boolean) => void;
  isSuperAdmin?: boolean;
}

const ActionMenu: React.FC<ActionMenuProps> = ({
  employeeId,
  employeeName,
  employeeEmail,
  isActive,
  onView,
  onEdit,
  onDelete,
  onResetPassword,
  onToggleStatus,
  isSuperAdmin = false
}) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={() => onView(employeeId)}>
          <Eye className="mr-2 h-4 w-4" />
          View Details
        </DropdownMenuItem>
        
        {onEdit && (
          <DropdownMenuItem onClick={() => onEdit(employeeId)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Employee
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        {isSuperAdmin && employeeEmail && onResetPassword && (
          <DropdownMenuItem 
            onClick={() => onResetPassword(employeeName, employeeEmail)}
            className="text-blue-600"
          >
            <KeyRound className="mr-2 h-4 w-4" />
            Reset Password
          </DropdownMenuItem>
        )}

        {isSuperAdmin && onToggleStatus && (
          <DropdownMenuItem 
            onClick={() => onToggleStatus(employeeId, employeeName, isActive)}
            className={isActive ? "text-orange-600" : "text-green-600"}
          >
            {isActive ? (
              <>
                <UserX className="mr-2 h-4 w-4" />
                Set Inactive
              </>
            ) : (
              <>
                <UserCheck className="mr-2 h-4 w-4" />
                Set Active
              </>
            )}
          </DropdownMenuItem>
        )}

        {isSuperAdmin && onDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => onDelete(employeeId, employeeName)}
              className="text-red-600"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Remove Employee
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ActionMenu;
