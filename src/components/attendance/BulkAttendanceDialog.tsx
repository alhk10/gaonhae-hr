
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/sonner';
import { Calendar, Users, Clock, Search, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { addAttendanceRecord } from '@/services/attendanceService';
import { getEmployees } from '@/services/employeeService';
import { getBranches } from '@/services/settingsService';

interface BulkAttendanceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  employees: any[];
  selectedDate: Date;
  onSuccess: () => void;
}

interface EmployeeData {
  id: string;
  name: string;
  type: string;
  department?: string;
  position?: string;
}

const BulkAttendanceDialog: React.FC<BulkAttendanceDialogProps> = ({
  isOpen,
  onClose,
  employees: propEmployees,
  selectedDate,
  onSuccess
}) => {
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [checkInTime, setCheckInTime] = useState('09:00');
  const [checkOutTime, setCheckOutTime] = useState('18:00');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<EmployeeData[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [employeeTypeFilter, setEmployeeTypeFilter] = useState<string>('all');
  const [branches, setBranches] = useState<any[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadAllEmployees();
      loadBranches();
    }
  }, [isOpen]);

  const loadBranches = async () => {
    try {
      setLoadingBranches(true);
      console.log('BulkAttendanceDialog: Loading branches from settings service...');
      const branchData = getBranches();
      console.log('BulkAttendanceDialog: Loaded branches:', branchData);
      setBranches(branchData);
      
      // Set first branch as default if available
      if (branchData.length > 0) {
        setSelectedBranch(branchData[0].name);
      }
    } catch (error) {
      console.error('BulkAttendanceDialog: Error loading branches:', error);
      toast('Error loading branches');
    } finally {
      setLoadingBranches(false);
    }
  };

  const loadAllEmployees = async () => {
    try {
      setLoadingEmployees(true);
      console.log('BulkAttendanceDialog: Loading all employees from Supabase...');
      
      // Load employees directly from the service to ensure we get all employees
      const employeeData = await getEmployees();
      console.log('BulkAttendanceDialog: Loaded employees from service:', employeeData.length, 'employees');
      
      // Filter out partners from attendance
      const filteredEmployees = employeeData.filter(emp => emp.type?.toLowerCase() !== 'partner');
      console.log('BulkAttendanceDialog: Filtered out partners, remaining employees:', filteredEmployees.length);
      console.log('BulkAttendanceDialog: Employee names:', filteredEmployees.map(emp => emp.name));
      
      // Check if "Ng Kai Rui Jovious" is in the data
      const ngKaiRui = filteredEmployees.find(emp => 
        emp.name.toLowerCase().includes('ng kai rui') || 
        emp.name.toLowerCase().includes('jovious')
      );
      console.log('BulkAttendanceDialog: Found Ng Kai Rui Jovious:', ngKaiRui);
      
      setEmployees(filteredEmployees);
    } catch (error) {
      console.error('BulkAttendanceDialog: Error loading employees:', error);
      toast('Error loading employees');
      // Fallback to prop employees if service fails, also filter out partners
      const fallbackEmployees = (propEmployees || []).filter(emp => emp.type?.toLowerCase() !== 'partner');
      console.log('BulkAttendanceDialog: Falling back to prop employees (filtered):', fallbackEmployees.length);
      setEmployees(fallbackEmployees);
    } finally {
      setLoadingEmployees(false);
    }
  };

  // Filter employees based on search term and type (excluding partners)
  const filteredEmployees = employees.filter(employee => {
    const matchesSearch = searchTerm === '' || 
      employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = employeeTypeFilter === 'all' || 
      employee.type?.toLowerCase() === employeeTypeFilter.toLowerCase();
    
    // Always exclude partners
    const isNotPartner = employee.type?.toLowerCase() !== 'partner';
    
    return matchesSearch && matchesType && isNotPartner;
  });

  console.log('BulkAttendanceDialog: Filtered employees count:', filteredEmployees.length);
  console.log('BulkAttendanceDialog: Search term:', searchTerm);
  console.log('BulkAttendanceDialog: Type filter:', employeeTypeFilter);

  const handleEmployeeToggle = (employeeId: string) => {
    setSelectedEmployees(prev => 
      prev.includes(employeeId)
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const handleSelectAll = () => {
    if (selectedEmployees.length === filteredEmployees.length) {
      setSelectedEmployees([]);
    } else {
      setSelectedEmployees(filteredEmployees.map(emp => emp.id));
    }
  };

  const calculateHours = (checkIn: string, checkOut: string) => {
    if (!checkIn || !checkOut) return 0;
    
    const checkInTime = new Date(`2000-01-01T${checkIn}`);
    const checkOutTime = new Date(`2000-01-01T${checkOut}`);
    const totalMinutes = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60);
    
    return Math.max(0, totalMinutes / 60);
  };

  const handleSubmit = async () => {
    if (selectedEmployees.length === 0) {
      toast('Please select at least one employee');
      return;
    }

    if (!selectedBranch) {
      toast('Please select a branch');
      return;
    }

    try {
      setLoading(true);
      console.log('BulkAttendanceDialog: Creating attendance records for', selectedEmployees.length, 'employees');

      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const hoursWorked = calculateHours(checkInTime, checkOutTime);

      const attendancePromises = selectedEmployees.map(employeeId => {
        const employee = employees.find(emp => emp.id === employeeId);
        return addAttendanceRecord({
          employeeId,
          date: dateStr,
          checkIn: checkInTime,
          checkOut: checkOutTime,
          status: 'Present',
          hoursWorked,
          location: selectedBranch
        });
      });

      await Promise.all(attendancePromises);

      toast(`Successfully added attendance records for ${selectedEmployees.length} employees`);
      onSuccess();
      onClose();
      setSelectedEmployees([]);
    } catch (error) {
      console.error('BulkAttendanceDialog: Error adding attendance records:', error);
      toast('Error adding attendance records');
    } finally {
      setLoading(false);
    }
  };

  // Get unique employee types for filter (excluding partners)
  const employeeTypes = [...new Set(employees.map(emp => emp.type).filter(type => type && type.toLowerCase() !== 'partner'))];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Calendar className="w-5 h-5" />
            <span>Add Bulk Attendance</span>
          </DialogTitle>
          <DialogDescription>
            Add attendance records for multiple employees at once for {format(selectedDate, 'PPP')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-3 overflow-auto">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                value={format(selectedDate, 'dd/MM/yyyy')}
                disabled
                className="bg-gray-50"
              />
            </div>
            <div>
              <Label htmlFor="branch">Branch</Label>
              <Select value={selectedBranch} onValueChange={setSelectedBranch} disabled={loadingBranches}>
                <SelectTrigger>
                  <SelectValue placeholder={loadingBranches ? "Loading branches..." : "Select branch"} />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.name}>
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span>{branch.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="checkIn">Check In Time</Label>
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <Input
                  id="checkIn"
                  type="time"
                  value={checkInTime}
                  onChange={(e) => setCheckInTime(e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="checkOut">Check Out Time</Label>
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <Input
                  id="checkOut"
                  type="time"
                  value={checkOutTime}
                  onChange={(e) => setCheckOutTime(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Select Employees ({selectedEmployees.length} selected)</Label>
              <div className="flex items-center space-x-2">
                <Badge variant="outline">
                  {filteredEmployees.length} employees
                </Badge>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                  disabled={loadingEmployees}
                >
                  {selectedEmployees.length === filteredEmployees.length ? 'Deselect All' : 'Select All'}
                </Button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 mb-2">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search employees by name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={employeeTypeFilter} onValueChange={setEmployeeTypeFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {employeeTypes.map(type => (
                    <SelectItem key={type} value={type.toLowerCase()}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {loadingEmployees ? (
              <div className="text-center py-6">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-sm text-gray-600 mt-2">Loading employees...</p>
              </div>
            ) : (
              <ScrollArea className="h-64 border rounded-lg">
                <div className="p-2">
                  {filteredEmployees.length > 0 ? (
                    <div className="space-y-1">
                      {filteredEmployees.map((employee) => (
                        <div key={employee.id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg border">
                          <Checkbox
                            id={employee.id}
                            checked={selectedEmployees.includes(employee.id)}
                            onCheckedChange={() => handleEmployeeToggle(employee.id)}
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-sm">{employee.name}</p>
                              </div>
                              <div className="text-right">
                                <Badge variant="secondary" className="text-xs">
                                  {employee.type}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-gray-500">
                      <Users className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      <p>No employees found</p>
                      {searchTerm && (
                        <p className="text-sm">Try adjusting your search terms</p>
                      )}
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-3 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={loading || selectedEmployees.length === 0 || !selectedBranch}
          >
            {loading ? 'Adding...' : `Add Attendance (${selectedEmployees.length})`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BulkAttendanceDialog;
