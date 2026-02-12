import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, X, ArrowRightLeft } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, getDay, isSameMonth, isToday } from 'date-fns';
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
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editType, setEditType] = useState<'cancel' | 'swap'>('cancel');
  const [reason, setReason] = useState('');
  const [newEmployeeId, setNewEmployeeId] = useState('');
  const [newEmployeeName, setNewEmployeeName] = useState('');

  const monthStart = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(currentMonth), 'yyyy-MM-dd');

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['branch-casual-schedule', branchId, monthStart, monthEnd],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('slot_bookings_new')
        .select('id, employee_id, employee_name, branch_id, date, status, notes')
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

  // Fetch casual employees for swap dropdown
  const { data: casualEmployees = [] } = useQuery({
    queryKey: ['casual-employees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('id, name, display_name')
        .eq('type', 'Casual')
        .is('resign_date', null)
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });

  const submitEditMutation = useMutation({
    mutationFn: async () => {
      if (!selectedBooking || !user?.employeeId) return;
      await createEditRequest({
        bookingId: selectedBooking.id,
        requestType: editType,
        requestedBy: user.employeeId,
        reason,
        newEmployeeId: editType === 'swap' ? newEmployeeId : undefined,
        newEmployeeName: editType === 'swap' ? newEmployeeName : undefined,
      });
    },
    onSuccess: () => {
      toast.success('Change request submitted for superadmin approval');
      setEditDialogOpen(false);
      setSelectedBooking(null);
      setReason('');
      setNewEmployeeId('');
      setNewEmployeeName('');
      queryClient.invalidateQueries({ queryKey: ['pending-edit-requests-count'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

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
  const startDayOfWeek = getDay(monthStartDate); // 0=Sun

  const openEditDialog = (booking: SlotBookingRow, type: 'cancel' | 'swap') => {
    setSelectedBooking(booking);
    setEditType(type);
    setReason('');
    setNewEmployeeId('');
    setNewEmployeeName('');
    setEditDialogOpen(true);
  };

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
            {/* Day headers */}
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="bg-muted p-2 text-center text-xs font-medium text-muted-foreground">
                {day}
              </div>
            ))}

            {/* Empty cells before month starts */}
            {Array.from({ length: startDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="bg-background p-1 min-h-[80px]" />
            ))}

            {/* Day cells */}
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
                        onClick={() => setSelectedBooking(booking)}
                        title={booking.employee_name}
                      >
                        {booking.employee_name?.split(' ').slice(-1)[0] || 'Unknown'}
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
              const emp = bookings.find(b => b.employee_id === empId);
              return (
                <Badge key={empId} variant="outline" className={`text-xs ${employeeColorMap.get(empId)}`}>
                  {emp?.employee_name || empId}
                </Badge>
              );
            })}
          </div>
        )}

        {/* Booking Detail Dialog */}
        <Dialog open={!!selectedBooking && !editDialogOpen} onOpenChange={(open) => !open && setSelectedBooking(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Booking Details</DialogTitle>
            </DialogHeader>
            {selectedBooking && (
              <div className="space-y-3">
                <div><Label className="text-muted-foreground">Employee</Label><p className="font-medium">{selectedBooking.employee_name}</p></div>
                <div><Label className="text-muted-foreground">Date</Label><p className="font-medium">{selectedBooking.date}</p></div>
                <div><Label className="text-muted-foreground">Status</Label><p><Badge>{selectedBooking.status}</Badge></p></div>
                {selectedBooking.notes && <div><Label className="text-muted-foreground">Notes</Label><p className="text-sm">{selectedBooking.notes}</p></div>}
              </div>
            )}
            <DialogFooter className="flex gap-2">
              <Button variant="destructive" size="sm" onClick={() => openEditDialog(selectedBooking!, 'cancel')}>
                <X className="w-4 h-4 mr-1" /> Request Cancel
              </Button>
              <Button variant="outline" size="sm" onClick={() => openEditDialog(selectedBooking!, 'swap')}>
                <ArrowRightLeft className="w-4 h-4 mr-1" /> Request Swap
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Request Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request {editType === 'cancel' ? 'Cancellation' : 'Employee Swap'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Booking</Label>
                <p className="text-sm text-muted-foreground">{selectedBooking?.employee_name} on {selectedBooking?.date}</p>
              </div>
              {editType === 'swap' && (
                <div>
                  <Label>New Employee</Label>
                  <Select
                    value={newEmployeeId}
                    onValueChange={(val) => {
                      setNewEmployeeId(val);
                      const emp = casualEmployees.find(e => e.id === val);
                      setNewEmployeeName(emp?.display_name || emp?.name || '');
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                    <SelectContent>
                      {casualEmployees
                        .filter(e => e.id !== selectedBooking?.employee_id)
                        .map(e => (
                          <SelectItem key={e.id} value={e.id}>{e.display_name || e.name}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label>Reason</Label>
                <Textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Provide a reason..." />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
              <Button
                onClick={() => submitEditMutation.mutate()}
                disabled={!reason.trim() || (editType === 'swap' && !newEmployeeId) || submitEditMutation.isPending}
              >
                Submit Request
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default BranchCasualSchedule;
