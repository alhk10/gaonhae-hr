
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  DollarSign, 
  Calendar, 
  Users, 
  Settings, 
  Download,
  CheckCircle,
  Clock,
  AlertTriangle
} from 'lucide-react';
import {
  getEmployeesWithUnusedLeave,
  getAllEncashmentRecords,
  bulkProcessEncashment,
  getOrCreateEncashmentConfig,
  updateEncashmentConfig,
  type LeaveEncashmentRecord
} from '@/services/leaveEncashmentService';
import { useAuth } from '@/contexts/AuthContext';

const LeaveEncashmentManager = () => {
  const { user } = useAuth();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [employeesWithUnusedLeave, setEmployeesWithUnusedLeave] = useState<any[]>([]);
  const [encashmentRecords, setEncashmentRecords] = useState<LeaveEncashmentRecord[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadData();
  }, [selectedYear]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [unusedLeaveData, recordsData] = await Promise.all([
        getEmployeesWithUnusedLeave(selectedYear),
        getAllEncashmentRecords(selectedYear)
      ]);
      
      setEmployeesWithUnusedLeave(unusedLeaveData);
      setEncashmentRecords(recordsData);
    } catch (error) {
      console.error('Error loading encashment data:', error);
      toast({
        title: "Error",
        description: "Failed to load encashment data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBulkProcess = async () => {
    if (selectedEmployees.length === 0) {
      toast({
        title: "No Selection",
        description: "Please select employees to process encashment for",
        variant: "destructive",
      });
      return;
    }

    const confirmMessage = `Are you sure you want to process leave encashment for ${selectedEmployees.length} employee(s) for year ${selectedYear}?`;
    if (!confirm(confirmMessage)) return;

    setProcessing(true);
    try {
      const result = await bulkProcessEncashment(selectedEmployees, selectedYear, user?.name);
      
      if (result.success.length > 0) {
        toast({
          title: "Encashment Processed",
          description: `Successfully processed encashment for ${result.success.length} employee(s)`,
        });
      }

      if (result.failed.length > 0) {
        toast({
          title: "Partial Success",
          description: `${result.failed.length} employee(s) failed to process`,
          variant: "destructive",
        });
      }

      setSelectedEmployees([]);
      await loadData();
    } catch (error) {
      console.error('Error processing bulk encashment:', error);
      toast({
        title: "Processing Failed",
        description: "Failed to process leave encashment",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedEmployees(employeesWithUnusedLeave.map(emp => emp.employee_id));
    } else {
      setSelectedEmployees([]);
    }
  };

  const handleEmployeeSelect = (employeeId: string, checked: boolean) => {
    if (checked) {
      setSelectedEmployees(prev => [...prev, employeeId]);
    } else {
      setSelectedEmployees(prev => prev.filter(id => id !== employeeId));
    }
  };

  const totalUnusedDays = employeesWithUnusedLeave.reduce((sum, emp) => sum + emp.unused_leave_days, 0);
  const totalEncashmentAmount = encashmentRecords
    .filter(record => record.status === 'Processed')
    .reduce((sum, record) => sum + record.total_encashment_amount, 0);

  if (!user || user.role !== 'superadmin') {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Access Restricted</h3>
            <p className="text-gray-600">Leave encashment management is only available to superadmin users.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center">
              <Calendar className="w-6 h-6 text-blue-600" />
              <div className="ml-3">
                <p className="text-xs text-blue-600">Selected Year</p>
                <p className="text-xl font-bold text-blue-900">{selectedYear}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center">
              <Users className="w-6 h-6 text-orange-600" />
              <div className="ml-3">
                <p className="text-xs text-orange-600">Employees with Unused Leave</p>
                <p className="text-xl font-bold text-orange-900">{employeesWithUnusedLeave.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center">
              <Clock className="w-6 h-6 text-purple-600" />
              <div className="ml-3">
                <p className="text-xs text-purple-600">Total Unused Days</p>
                <p className="text-xl font-bold text-purple-900">{totalUnusedDays}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center">
              <DollarSign className="w-6 h-6 text-green-600" />
              <div className="ml-3">
                <p className="text-xs text-green-600">Total Encashed Amount</p>
                <p className="text-xl font-bold text-green-900">${totalEncashmentAmount.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Year Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Leave Encashment Management
            <div className="flex items-center space-x-2">
              <Label htmlFor="year-select">Year:</Label>
              <Select 
                value={selectedYear.toString()} 
                onValueChange={(value) => setSelectedYear(parseInt(value))}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      <Tabs defaultValue="unused-leave" className="space-y-4">
        <TabsList>
          <TabsTrigger value="unused-leave">Unused Leave</TabsTrigger>
          <TabsTrigger value="encashment-records">Encashment Records</TabsTrigger>
        </TabsList>

        <TabsContent value="unused-leave">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Employees with Unused Leave ({selectedYear})
                <div className="flex items-center space-x-2">
                  <Button
                    onClick={handleBulkProcess}
                    disabled={selectedEmployees.length === 0 || processing}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {processing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Process Selected ({selectedEmployees.length})
                      </>
                    )}
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-2">Loading unused leave data...</span>
                </div>
              ) : employeesWithUnusedLeave.length === 0 ? (
                <div className="text-center p-8">
                  <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Unused Leave</h3>
                  <p className="text-gray-600">No employees have unused leave for {selectedYear}.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                    <Checkbox
                      id="select-all"
                      checked={selectedEmployees.length === employeesWithUnusedLeave.length}
                      onCheckedChange={handleSelectAll}
                    />
                    <Label htmlFor="select-all" className="font-medium">
                      Select All ({employeesWithUnusedLeave.length})
                    </Label>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12"></TableHead>
                        <TableHead>Employee</TableHead>
                        <TableHead>Total Entitlement</TableHead>
                        <TableHead>Used</TableHead>
                        <TableHead>Unused</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {employeesWithUnusedLeave.map((employee) => {
                        const isProcessed = encashmentRecords.some(
                          record => record.employee_id === employee.employee_id && record.status === 'Processed'
                        );
                        
                        return (
                          <TableRow key={employee.employee_id}>
                            <TableCell>
                              <Checkbox
                                checked={selectedEmployees.includes(employee.employee_id)}
                                onCheckedChange={(checked) => 
                                  handleEmployeeSelect(employee.employee_id, checked as boolean)
                                }
                                disabled={isProcessed}
                              />
                            </TableCell>
                            <TableCell className="font-medium">{employee.employee_name}</TableCell>
                            <TableCell>{employee.total_entitlement} days</TableCell>
                            <TableCell>{employee.total_used} days</TableCell>
                            <TableCell>
                              <Badge variant="secondary">
                                {employee.unused_leave_days} days
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {isProcessed ? (
                                <Badge variant="default" className="bg-green-600">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Processed
                                </Badge>
                              ) : (
                                <Badge variant="outline">
                                  <Clock className="w-3 h-3 mr-1" />
                                  Pending
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="encashment-records">
          <Card>
            <CardHeader>
              <CardTitle>Encashment Records ({selectedYear})</CardTitle>
            </CardHeader>
            <CardContent>
              {encashmentRecords.length === 0 ? (
                <div className="text-center p-8">
                  <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Encashment Records</h3>
                  <p className="text-gray-600">No leave encashment has been processed for {selectedYear}.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Unused Days</TableHead>
                      <TableHead>Encashed Days</TableHead>
                      <TableHead>Rate/Day</TableHead>
                      <TableHead>Total Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Processed Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {encashmentRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">
                          {(record as any).employees?.name || 'Unknown'}
                        </TableCell>
                        <TableCell>{record.unused_leave_days}</TableCell>
                        <TableCell>{record.encashed_days}</TableCell>
                        <TableCell>${record.rate_per_day.toFixed(2)}</TableCell>
                        <TableCell className="font-semibold">
                          ${record.total_encashment_amount.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={record.status === 'Processed' ? 'default' : 'secondary'}
                            className={record.status === 'Processed' ? 'bg-green-600' : ''}
                          >
                            {record.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {record.processed_date 
                            ? new Date(record.processed_date).toLocaleDateString()
                            : '-'
                          }
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LeaveEncashmentManager;
