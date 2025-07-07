
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronDown, 
  Trash2, 
  Download, 
  Mail, 
  UserCheck, 
  UserX,
  X
} from 'lucide-react';
import { EmployeeProfile } from '@/types/employee';

interface BulkActionsProps {
  employees: EmployeeProfile[];
  selectedEmployees: Set<string>;
  onSelectionChange: (selectedIds: Set<string>) => void;
  onBulkDelete?: (employeeIds: string[]) => void;
  onBulkExport?: (employeeIds: string[]) => void;
  onBulkEmail?: (employeeIds: string[]) => void;
  onBulkStatusChange?: (employeeIds: string[], status: 'active' | 'inactive') => void;
  isSuperAdmin?: boolean;
}

const BulkActions: React.FC<BulkActionsProps> = ({
  employees,
  selectedEmployees,
  onSelectionChange,
  onBulkDelete,
  onBulkExport,
  onBulkEmail,
  onBulkStatusChange,
  isSuperAdmin = false
}) => {
  const [selectAll, setSelectAll] = useState(false);

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      const allIds = new Set(employees.map(emp => emp.id));
      onSelectionChange(allIds);
    } else {
      onSelectionChange(new Set());
    }
  };

  const handleIndividualSelect = (employeeId: string, checked: boolean) => {
    const newSelection = new Set(selectedEmployees);
    if (checked) {
      newSelection.add(employeeId);
    } else {
      newSelection.delete(employeeId);
      setSelectAll(false);
    }
    onSelectionChange(newSelection);
  };

  const clearSelection = () => {
    onSelectionChange(new Set());
    setSelectAll(false);
  };

  const selectedCount = selectedEmployees.size;
  const selectedEmployeesList = Array.from(selectedEmployees);

  if (employees.length === 0) return null;

  return (
    <div className="bg-white border rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="select-all"
              checked={selectAll}
              onCheckedChange={handleSelectAll}
            />
            <label
              htmlFor="select-all"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Select All
            </label>
          </div>

          {selectedCount > 0 && (
            <div className="flex items-center space-x-2">
              <Badge variant="secondary">
                {selectedCount} selected
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSelection}
                className="h-6 w-6 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {selectedCount > 0 && (
          <div className="flex items-center space-x-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  Bulk Actions
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {onBulkExport && (
                  <DropdownMenuItem onClick={() => onBulkExport(selectedEmployeesList)}>
                    <Download className="mr-2 h-4 w-4" />
                    Export Selected
                  </DropdownMenuItem>
                )}

                {onBulkEmail && (
                  <DropdownMenuItem onClick={() => onBulkEmail(selectedEmployeesList)}>
                    <Mail className="mr-2 h-4 w-4" />
                    Send Email
                  </DropdownMenuItem>
                )}

                {isSuperAdmin && onBulkStatusChange && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => onBulkStatusChange(selectedEmployeesList, 'active')}
                      className="text-green-600"
                    >
                      <UserCheck className="mr-2 h-4 w-4" />
                      Set Active
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => onBulkStatusChange(selectedEmployeesList, 'inactive')}
                      className="text-orange-600"
                    >
                      <UserX className="mr-2 h-4 w-4" />
                      Set Inactive
                    </DropdownMenuItem>
                  </>
                )}

                {isSuperAdmin && onBulkDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => onBulkDelete(selectedEmployeesList)}
                      className="text-red-600"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Remove Selected
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {/* Individual Selection Checkboxes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 mt-4">
        {employees.map((employee) => (
          <div key={employee.id} className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded">
            <Checkbox
              id={`employee-${employee.id}`}
              checked={selectedEmployees.has(employee.id)}
              onCheckedChange={(checked) => handleIndividualSelect(employee.id, checked as boolean)}
            />
            <label
              htmlFor={`employee-${employee.id}`}
              className="text-sm truncate cursor-pointer flex-1"
              title={employee.name}
            >
              {employee.name}
            </label>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BulkActions;
