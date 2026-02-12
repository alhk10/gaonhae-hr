import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, Users, MapPin, UserX, Edit, X } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, getDay, isToday } from 'date-fns';
import { toast } from 'sonner';
import { createEditRequest } from '@/services/slotBookingEditRequestService';
import { useAuth } from '@/contexts/AuthContext';

interface BranchCasualScheduleProps {
  branchId: string;
}

interface SlotBookingRow {
  id: string;
  employee_id: string;
  employee_name: string;
  branch_id: string;
  branch_name: string | null;
  date: string;
  status: string;
  notes: string | null;
}

const EMPLOYEE_COLORS = [
  'bg-blue-100 text-blue-800 border-blue-200',
  'bg-green-100 text-green-800 border-green-200',
  'bg-purple-100 text-purple-800 border-purple-200',
  'bg-orange-100 text-orange-800 border-orange-200',
  'bg-pink-100 text-pink-800 border-pink-200',
  'bg-teal-100 text-teal-800 border-teal-200',
  'bg-indigo-100 text-indigo-800 border-indigo-200',
  'bg-yellow-100 text-yellow-800 border-yellow-200',
];

const BranchCasualSchedule: React.FC<BranchCasualScheduleProps> = ({ branchId }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedBooking, setSelectedBooking] = useState<SlotBookingRow | null>(null);
  const [manageDialogOpen, setManageDialogOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [swapEmployeeId, setSwapEmployeeId] = useState('');
  const [selectedBranchForUpdate, setSelectedBranchForUpdate] = useState('');

  const monthStart = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(currentMonth), 'yyyy-MM-dd');

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['branch-casual-schedule', branchId, monthStart, monthEnd],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('slot_bookings_new')
        .select('id, employee_id, employee_name, branch_id, branch_name, date, status, notes')
        .eq('branch_id', branchId)
        .eq('status', 'approved')
        .gte('date', monthStart)
        .lte('date', monthEnd)
        .order('date');
      if (error) throw error;
      return (data || []) as SlotBookingRow[];
    },
    enabled: !!branchId,
  });

  // Fetch casual employees with first_name for display and swap
  const { data: casualEmployees = [] } = useQuery({
    queryKey: ['casual-employees-with-firstname'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('id, name, display_name, first_name')
        .eq('type', 'Casual')
        .is('resign_date', null)
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch branches for branch change dropdown
  const { data: branches = [] } = useQuery({
    queryKey: ['branches-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('branches')
        .select('id, name, color')
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });

  // Build first name map
  const firstNameMap = new Map(casualEmployees.map(e => [e.id, e.first_name || e.name]));

  const submitCancelMutation = useMutation({
    mutationFn: async () => {
      if (!selectedBooking || !user?.employeeId) return;
      await createEditRequest({
        bookingId: selectedBooking.id,
        requestType: 'cancel',
        requestedBy: user.employeeId,
        reason,
      });
    },
    onSuccess: () => {
      toast.success('Cancellation request submitted for approval');
      closeManageDialog();
      queryClient.invalidateQueries({ queryKey: ['pending-edit-requests-count'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const submitSwapMutation = useMutation({
    mutationFn: async () => {
      if (!selectedBooking || !user?.employeeId || !swapEmployeeId) return;
      const emp = casualEmployees.find(e => e.id === swapEmployeeId);
      await createEditRequest({
        bookingId: selectedBooking.id,
        requestType: 'swap',
        requestedBy: user.employeeId,
        reason: reason || 'Employee swap request',
        newEmployeeId: swapEmployeeId,
        newEmployeeName: emp?.display_name || emp?.name || '',
      });
    },
    onSuccess: () => {
      toast.success('Swap request submitted for approval');
      closeManageDialog();
      queryClient.invalidateQueries({ queryKey: ['pending-edit-requests-count'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const closeManageDialog = () => {
    setManageDialogOpen(false);
    setSelectedBooking(null);
    setReason('');
    setSwapEmployeeId('');
    setSelectedBranchForUpdate('');
  };

  const openManageDialog = (booking: SlotBookingRow) => {
    setSelectedBooking(booking);
    setSelectedBranchForUpdate(booking.branch_id);
    setSwapEmployeeId('');
    setReason('');
    setManageDialogOpen(true);
  };

  // Build employee color map
  const employeeColorMap = new Map<string, string>();
  const uniqueEmployees = [...new Set(bookings.map(b => b.employee_id))];
  uniqueEmployees.forEach((empId, i) => {
    employeeColorMap.set(empId, EMPLOYEE_COLORS[i % EMPLOYEE_COLORS.length]);
  });

  // Group bookings by date
  const bookingsByDate = new Map<string, SlotBookingRow[]>();
  bookings.forEach(b => {
    const existing = bookingsByDate.get(b.date) || [];
    existing.push(b);
    bookingsByDate.set(b.date, existing);
  });

  // Calendar days
  const monthStartDate = startOfMonth(currentMonth);
  const monthEndDate = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStartDate, end: monthEndDate });
  const startDayOfWeek = getDay(monthStartDate);

  const isBranchSame = !selectedBranchForUpdate || selectedBranchForUpdate === selectedBooking?.branch_id;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Casual Employee Schedule</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="font-medium min-w-[140px] text-center">{format(currentMonth, 'MMMM yyyy')}</span>
            <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading schedule...</div>
        ) : (
          <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="bg-muted p-2 text-center text-xs font-medium text-muted-foreground">
                {day}
              </div>
            ))}

            {Array.from({ length: startDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="bg-background p-1 min-h-[80px]" />
            ))}

            {days.map(day => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const dayBookings = bookingsByDate.get(dateStr) || [];
              const today = isToday(day);

              return (
                <div
                  key={dateStr}
                  className={`bg-background p-1 min-h-[80px] ${today ? 'ring-2 ring-primary ring-inset' : ''}`}
                >
                  <div className={`text-xs font-medium mb-1 ${today ? 'text-primary' : 'text-muted-foreground'}`}>
                    {format(day, 'd')}
                  </div>
                  <div className="space-y-0.5">
                    {dayBookings.map(booking => (
                      <div
                        key={booking.id}
                        className={`text-[10px] px-1 py-0.5 rounded border cursor-pointer truncate ${employeeColorMap.get(booking.employee_id) || 'bg-muted'}`}
                        onClick={() => openManageDialog(booking)}
                        title={booking.employee_name}
                      >
                        {firstNameMap.get(booking.employee_id) || booking.employee_name?.split(' ')[0] || 'Unknown'}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Legend */}
        {uniqueEmployees.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {uniqueEmployees.map(empId => {
              return (
                <Badge key={empId} variant="outline" className={`text-xs ${employeeColorMap.get(empId)}`}>
                  {firstNameMap.get(empId) || bookings.find(b => b.employee_id === empId)?.employee_name || empId}
                </Badge>
              );
            })}
          </div>
        )}

        {/* Manage Booking Dialog - mirrors SlotBookingManagementContent */}
        <Dialog open={manageDialogOpen} onOpenChange={(open) => { if (!open) closeManageDialog(); }}>
          <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <Users className="w-5 h-5" />
                <span>Manage Booking</span>
              </DialogTitle>
              <DialogDescription>
                {selectedBooking &&
                  `Review booking for ${selectedBooking.employee_name} on ${format(new Date(selectedBooking.date), 'dd/MM/yyyy')}`
                }
              </DialogDescription>
            </DialogHeader>
            {selectedBooking && (
              <div className="py-4 space-y-4">
                {/* Booking Info */}
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="font-medium">Employee:</span>
                    <span>{selectedBooking.employee_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Current Branch:</span>
                    <span>{selectedBooking.branch_name || selectedBooking.branch_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Date:</span>
                    <span>{format(new Date(selectedBooking.date), 'dd/MM/yyyy')}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Status:</span>
                    <Badge variant="secondary">{selectedBooking.status}</Badge>
                  </div>
                </div>

                {/* Change Branch Section */}
                <div className="border-t pt-4 space-y-3">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Change Branch
                  </Label>
                  <Select value={selectedBranchForUpdate} onValueChange={setSelectedBranchForUpdate}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select branch" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map((branch) => (
                        <SelectItem key={branch.id} value={branch.id}>
                          <div className="flex items-center space-x-2">
                            <span>{branch.name}</span>
                            {branch.id === selectedBooking.branch_id && (
                              <span className="text-muted-foreground text-xs">(Current)</span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {isBranchSame ? (
                    <p className="text-xs text-muted-foreground">Select a different branch to request a move</p>
                  ) : (
                    <p className="text-xs text-blue-600">Will submit branch change request for approval</p>
                  )}
                </div>

                {/* Swap Employee Section */}
                <div className="border-t pt-4 space-y-3">
                  <Label className="text-sm font-medium">Swap Employee (Optional)</Label>
                  <Select value={swapEmployeeId} onValueChange={setSwapEmployeeId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select new employee to swap" />
                    </SelectTrigger>
                    <SelectContent>
                      {casualEmployees
                        .filter(emp => emp.id !== selectedBooking.employee_id)
                        .map((employee) => (
                          <SelectItem key={employee.id} value={employee.id}>
                            {employee.display_name || employee.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Reason */}
                <div className="border-t pt-4 space-y-3">
                  <Label className="text-sm font-medium">Reason</Label>
                  <Textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Provide a reason for the change..." />
                </div>
              </div>
            )}
            <DialogFooter className="flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
              <div className="flex flex-wrap gap-2 justify-start">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => submitCancelMutation.mutate()}
                  disabled={!reason.trim() || submitCancelMutation.isPending}
                >
                  <UserX className="w-4 h-4 mr-1" />
                  {submitCancelMutation.isPending ? 'Submitting...' : 'Request Cancel'}
                </Button>
                {swapEmployeeId && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => submitSwapMutation.mutate()}
                    disabled={submitSwapMutation.isPending}
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    {submitSwapMutation.isPending ? 'Submitting...' : 'Request Swap'}
                  </Button>
                )}
                {!isBranchSame && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled
                    title="Branch change requests coming soon"
                  >
                    <MapPin className="w-4 h-4 mr-1" />
                    Request Branch Change
                  </Button>
                )}
                <Button type="button" variant="outline" size="sm" onClick={closeManageDialog}>
                  <X className="w-4 h-4 mr-1" />
                  Close
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default BranchCasualSchedule;
