
import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/sonner';
import { Calendar, Users, Search } from 'lucide-react';
import { getEmployees } from '@/services/employeeService';
import { addLeaveRequest } from '@/services/leaveService';
import { format, eachDayOfInterval, differenceInCalendarDays } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { formatDate } from '@/utils/dateFormat';

interface BulkLeaveDialogProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date | null;
  onSuccess: () => void;
}

interface EmployeeData {
  id: string;
  name: string;
  display_name?: string;
  type: string;
}

const BulkLeaveDialog: React.FC<BulkLeaveDialogProps> = ({
  isOpen,
  onClose,
  selectedDate,
  onSuccess
}) => {
  const [employees, setEmployees] = useState<EmployeeData[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [leaveType, setLeaveType] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [fromDate, setFromDate] = useState<Date | undefined>(selectedDate || undefined);
  const [toDate, setToDate] = useState<Date | undefined>(selectedDate || undefined);

  useEffect(() => {
    if (isOpen) {
      loadEmployees();
      setSearchTerm('');
      setFromDate(selectedDate || new Date());
      setToDate(selectedDate || new Date());
    }
  }, [isOpen, selectedDate]);

  const loadEmployees = async () => {
    try {
      setLoadingEmployees(true);
      console.log('BulkLeaveDialog: Loading full-time employees...');
      
      // Fetch all employees and filter for full-time only (casual employees don't have leave benefits)
      const allEmployees = await getEmployees();
      const fullTimeEmployees = allEmployees
        .filter(emp => emp.type === 'Full-Time' && !emp.resignDate)
        .map(emp => ({
          id: emp.id,
          name: emp.name,
          type: emp.type
        }));
      
      console.log('BulkLeaveDialog: Loaded full-time employees:', fullTimeEmployees.length);
      
      setEmployees(fullTimeEmployees);
    } catch (error) {
      console.error('BulkLeaveDialog: Error loading employees:', error);
      toast.error('Error loading employees. Please try again.');
    } finally {
      setLoadingEmployees(false);
    }
  };

  // Filter employees based on search term
  const filteredEmployees = useMemo(() => {
    if (!searchTerm.trim()) return employees;
    const lowerSearch = searchTerm.toLowerCase();
    return employees.filter(emp => 
      emp.name.toLowerCase().includes(lowerSearch)
    );
  }, [employees, searchTerm]);

  const handleEmployeeToggle = (employeeId: string) => {
    setSelectedEmployees(prev => 
      prev.includes(employeeId)
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const handleSelectAll = () => {
    // Select/deselect only filtered employees
    const filteredIds = filteredEmployees.map(emp => emp.id);
    const allFilteredSelected = filteredIds.every(id => selectedEmployees.includes(id));
    
    if (allFilteredSelected) {
      setSelectedEmployees(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
      setSelectedEmployees(prev => [...new Set([...prev, ...filteredIds])]);
    }
  };

  // Calculate number of days
  const daysCount = useMemo(() => {
    if (!fromDate || !toDate) return 0;
    return differenceInCalendarDays(toDate, fromDate) + 1;
  }, [fromDate, toDate]);

  const handleSubmit = async () => {
    if (!fromDate || !toDate || selectedEmployees.length === 0 || !leaveType) {
      toast.error('Please select date range, employees, and leave type');
      return;
    }

    if (toDate < fromDate) {
      toast.error('To Date cannot be before From Date');
      return;
    }

    setLoading(true);
    try {
      const startDateStr = format(fromDate, 'yyyy-MM-dd');
      const endDateStr = format(toDate, 'yyyy-MM-dd');
      
      for (const employeeId of selectedEmployees) {
        const employee = employees.find(emp => emp.id === employeeId);
        await addLeaveRequest({
          employeeId,
          employeeName: employee?.name || 'Unknown',
          type: leaveType,
          startDate: startDateStr,
          endDate: endDateStr,
          days: daysCount,
          status: 'Approved',
          reason: 'Bulk leave entry',
          appliedOn: format(new Date(), 'yyyy-MM-dd')
        });
      }

      toast.success(`Bulk leave added for ${selectedEmployees.length} employees (${daysCount} day${daysCount > 1 ? 's' : ''})`);
      onSuccess();
      onClose();
      setSelectedEmployees([]);
      setLeaveType('');
    } catch (error) {
      console.error('BulkLeaveDialog: Error adding bulk leave:', error);
      toast.error('Error adding bulk leave. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filteredSelectedCount = filteredEmployees.filter(emp => selectedEmployees.includes(emp.id)).length;
  const allFilteredSelected = filteredEmployees.length > 0 && filteredEmployees.every(emp => selectedEmployees.includes(emp.id));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Calendar className="w-5 h-5" />
            <span>Add Bulk Leave</span>
          </DialogTitle>
          <DialogDescription>
            Add leave for multiple full-time employees
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Date Range Selection */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">From Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal mt-1",
                      !fromDate && "text-muted-foreground"
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {fromDate ? formatDate(fromDate) : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={fromDate}
                    onSelect={(date) => {
                      setFromDate(date);
                      if (date && toDate && date > toDate) {
                        setToDate(date);
                      }
                    }}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <label className="text-sm font-medium">To Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal mt-1",
                      !toDate && "text-muted-foreground"
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {toDate ? formatDate(toDate) : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={toDate}
                    onSelect={setToDate}
                    disabled={(date) => fromDate ? date < fromDate : false}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          
          {daysCount > 0 && (
            <p className="text-xs text-muted-foreground">
              {daysCount} day{daysCount > 1 ? 's' : ''} selected
            </p>
          )}

          <div>
            <label className="text-sm font-medium">Leave Type</label>
            <Select value={leaveType} onValueChange={setLeaveType}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select leave type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Annual Leave">Annual Leave</SelectItem>
                <SelectItem value="Sick Leave">Sick Leave</SelectItem>
                <SelectItem value="Personal Leave">Personal Leave</SelectItem>
                <SelectItem value="Emergency Leave">Emergency Leave</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Full-Time Employees</label>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                className="text-xs"
                disabled={loadingEmployees || filteredEmployees.length === 0}
              >
                {allFilteredSelected ? 'Deselect All' : 'Select All'}
              </Button>
            </div>
            
            {/* Search field */}
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search employee..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <div className="max-h-48 overflow-y-auto border rounded-md p-2 space-y-2">
              {loadingEmployees ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mx-auto"></div>
                  <p className="text-xs text-muted-foreground mt-1">Loading employees...</p>
                </div>
              ) : filteredEmployees.length > 0 ? (
                filteredEmployees.map((employee) => (
                  <div key={employee.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={employee.id}
                      checked={selectedEmployees.includes(employee.id)}
                      onCheckedChange={() => handleEmployeeToggle(employee.id)}
                    />
                    <label
                      htmlFor={employee.id}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {employee.display_name || employee.name}
                    </label>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  <Users className="w-6 h-6 mx-auto mb-1 opacity-50" />
                  <p className="text-xs">
                    {searchTerm ? 'No matching employees found' : 'No full-time employees found'}
                  </p>
                </div>
              )}
            </div>
            
            <p className="text-xs text-muted-foreground mt-2">
              {selectedEmployees.length} employee(s) selected
            </p>
          </div>

          <div className="flex space-x-2 pt-4">
            <Button
              onClick={handleSubmit}
              disabled={loading || selectedEmployees.length === 0 || !leaveType || !fromDate || !toDate}
              className="flex-1"
            >
              <Users className="w-4 h-4 mr-2" />
              {loading ? 'Adding...' : `Add Leave (${selectedEmployees.length})`}
            </Button>
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BulkLeaveDialog;
