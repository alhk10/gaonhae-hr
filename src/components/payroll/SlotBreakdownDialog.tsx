import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, Clock, DollarSign, Pencil, Check, X, Award, Plus } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { updateAttendanceRecord, addAttendanceRecord } from "@/services/attendanceService";
import { toast } from "sonner";
import { formatDate } from '@/utils/dateFormat';

export interface SlotBreakdownItem {
  date: string;
  branchName: string;
  pay: number;
  hasAttendance: boolean;
  checkIn?: string | null;
  checkOut?: string | null;
  hoursWorked?: number | null;
  attendanceId?: number | null;
  expectedHours?: number | null;
  fullSlotRate?: number | null;
}

const formatTime = (time: string | null | undefined): string => {
  if (!time) return '-';
  // Time is in HH:MM:SS format
  const parts = time.split(':');
  if (parts.length >= 2) {
    const hours = parseInt(parts[0], 10);
    const minutes = parts[1];
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes} ${ampm}`;
  }
  return time;
};

const formatDuration = (hours: number | null | undefined): string => {
  if (hours === null || hours === undefined) return '-';
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
};

// Convert 12-hour time input to 24-hour format for storage
const convertTo24Hour = (time: string): string => {
  if (!time) return '';
  // If already in HH:MM format, return as-is
  if (/^\d{2}:\d{2}(:\d{2})?$/.test(time)) {
    return time.length === 5 ? `${time}:00` : time;
  }
  return time;
};

// Calculate hours worked from check-in and check-out times
const calculateHoursWorked = (checkIn: string | null, checkOut: string | null): number | null => {
  if (!checkIn || !checkOut) return null;
  
  const parseTime = (time: string): number => {
    const parts = time.split(':');
    return parseInt(parts[0]) * 60 + parseInt(parts[1]);
  };
  
  const inMinutes = parseTime(checkIn);
  const outMinutes = parseTime(checkOut);
  
  if (outMinutes <= inMinutes) return null;
  
  return (outMinutes - inMinutes) / 60;
};

interface SlotBreakdownDialogProps {
  isOpen: boolean;
  onClose: () => void;
  employeeName: string;
  employeeId: string;
  breakdown: SlotBreakdownItem[];
  totalPay: number;
  totalSlots: number;
  fullSlotRate?: number;
  rateBreakdown?: Array<{ item: string; amount: number }>;
  milestoneBonus?: number;
  milestoneBonusThreshold?: number;
  onUpdate?: () => void;
}

export function SlotBreakdownDialog({
  isOpen,
  onClose,
  employeeName,
  employeeId,
  breakdown,
  totalPay,
  totalSlots,
  fullSlotRate,
  rateBreakdown,
  milestoneBonus,
  milestoneBonusThreshold,
  onUpdate,
}: SlotBreakdownDialogProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editCheckIn, setEditCheckIn] = useState('');
  const [editCheckOut, setEditCheckOut] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleStartEdit = (index: number, item: SlotBreakdownItem) => {
    setEditingIndex(index);
    // Convert time to HH:MM format for input
    const formatForInput = (time: string | null | undefined): string => {
      if (!time) return '';
      const parts = time.split(':');
      if (parts.length >= 2) {
        return `${parts[0].padStart(2, '0')}:${parts[1]}`;
      }
      return '';
    };
    setEditCheckIn(formatForInput(item.checkIn));
    setEditCheckOut(formatForInput(item.checkOut));
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditCheckIn('');
    setEditCheckOut('');
  };

  const handleSaveEdit = async (item: SlotBreakdownItem) => {
    setIsSaving(true);
    try {
      const checkInTime = editCheckIn ? convertTo24Hour(editCheckIn) : null;
      const checkOutTime = editCheckOut ? convertTo24Hour(editCheckOut) : null;
      const hoursWorked = calculateHoursWorked(checkInTime, checkOutTime);

      if (item.attendanceId) {
        // Update existing attendance
        await updateAttendanceRecord(item.attendanceId, {
          checkIn: checkInTime,
          checkOut: checkOutTime,
          hoursWorked: hoursWorked,
        });
        toast.success('Attendance times updated successfully');
      } else {
        // Add new attendance record
        await addAttendanceRecord({
          employeeId: employeeId,
          date: item.date,
          checkIn: checkInTime,
          checkOut: checkOutTime,
          status: 'Present',
          hoursWorked: hoursWorked,
        });
        toast.success('Attendance record added successfully');
      }

      setEditingIndex(null);
      setEditCheckIn('');
      setEditCheckOut('');
      
      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error('Error saving attendance:', error);
      toast.error('Failed to save attendance record');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Slot Booking Breakdown - {employeeName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">Total Slots</span>
              </div>
              <p className="text-2xl font-bold text-blue-900">{totalSlots}</p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-900">Total Pay</span>
                {milestoneBonus !== undefined && milestoneBonus > 0 && (
                  <span className="text-xs text-green-700">(inc. bonus)</span>
                )}
              </div>
              <p className="text-2xl font-bold text-green-900">
                S${((totalPay) + (milestoneBonus || 0)).toFixed(2)}
              </p>
            </div>
          </div>

          {/* Milestone Bonus Display */}
          {milestoneBonus !== undefined && milestoneBonus > 0 && (
            <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-4 border border-amber-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-600" />
                  <div>
                    <span className="text-sm font-medium text-amber-900">
                      Milestone Bonus Earned
                    </span>
                    <p className="text-xs text-amber-700">
                      Achieved {milestoneBonusThreshold}+ slots milestone
                    </p>
                  </div>
                </div>
                <Badge className="bg-amber-500 text-white text-lg px-3 py-1">
                  +S${milestoneBonus.toFixed(2)}
                </Badge>
              </div>
            </div>
          )}

          {/* Breakdown Table */}
          {breakdown.length > 0 ? (
            <div className="border rounded-lg overflow-hidden overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">Date</TableHead>
                    <TableHead className="font-semibold">Branch</TableHead>
                    <TableHead className="font-semibold">Clock In</TableHead>
                    <TableHead className="font-semibold">Clock Out</TableHead>
                    <TableHead className="font-semibold">Duration</TableHead>
                    <TableHead className="font-semibold text-right">Pay Amount</TableHead>
                    <TableHead className="font-semibold w-20">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {breakdown.map((item, index) => (
                    <TableRow key={index} className={item.hasAttendance ? "hover:bg-muted/30" : "bg-muted/20 border-dashed hover:bg-muted/40"}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          {formatDate(new Date(item.date))}
                          {!item.hasAttendance && editingIndex !== index && (
                            <Badge variant="outline" className="text-xs border-dashed text-muted-foreground">No attendance</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-primary/30 text-primary">
                          {item.branchName}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {editingIndex === index ? (
                          <Input
                            type="time"
                            value={editCheckIn}
                            onChange={(e) => setEditCheckIn(e.target.value)}
                            className="w-28 h-8 text-sm"
                          />
                        ) : (
                          <div className={`flex items-center gap-1 text-sm ${!item.hasAttendance ? 'text-muted-foreground' : ''}`}>
                            <Clock className="w-3 h-3 text-muted-foreground" />
                            {item.hasAttendance ? formatTime(item.checkIn) : '--'}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingIndex === index ? (
                          <Input
                            type="time"
                            value={editCheckOut}
                            onChange={(e) => setEditCheckOut(e.target.value)}
                            className="w-28 h-8 text-sm"
                          />
                        ) : (
                          <div className={`flex items-center gap-1 text-sm ${!item.hasAttendance ? 'text-muted-foreground' : ''}`}>
                            <Clock className="w-3 h-3 text-muted-foreground" />
                            {item.hasAttendance ? formatTime(item.checkOut) : '--'}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className={`text-sm font-medium ${!item.hasAttendance && editingIndex !== index ? 'text-muted-foreground' : ''}`}>
                          {editingIndex === index 
                            ? formatDuration(calculateHoursWorked(
                                editCheckIn ? convertTo24Hour(editCheckIn) : null,
                                editCheckOut ? convertTo24Hour(editCheckOut) : null
                              ))
                            : item.hasAttendance ? formatDuration(item.hoursWorked) : '--'
                          }
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={item.hasAttendance ? "font-semibold text-green-600" : "text-muted-foreground"}>
                          {item.hasAttendance ? `S$${item.pay.toFixed(2)}` : 'S$0.00'}
                        </span>
                      </TableCell>
                      <TableCell>
                        {editingIndex === index ? (
                          <div className="flex items-center gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
                              onClick={() => handleSaveEdit(item)}
                              disabled={isSaving}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={handleCancelEdit}
                              disabled={isSaving}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : item.hasAttendance ? (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-muted-foreground hover:text-primary"
                            onClick={() => handleStartEdit(index, item)}
                            disabled={!item.attendanceId}
                            title="Edit times"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                        ) : (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-primary hover:text-primary/80 hover:bg-primary/10"
                            onClick={() => handleStartEdit(index, item)}
                            title="Add attendance"
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>No slot bookings found</p>
            </div>
          )}

          {/* Pay Rate Info */}
          {breakdown.length > 0 && (
            <div className="bg-muted/30 rounded-lg p-3 text-sm space-y-3">
              {rateBreakdown && rateBreakdown.length > 0 ? (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Full Slot Rate Breakdown</p>
                  <div className="space-y-0.5">
                    {rateBreakdown.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{item.item}</span>
                        <span className="font-medium">S${item.amount.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  {fullSlotRate && (
                    <div className="flex justify-between text-sm font-bold border-t border-border pt-1.5 mt-1.5">
                      <span>Total Rate</span>
                      <span className="text-primary">S${fullSlotRate.toFixed(2)}</span>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground italic">Pay is prorated based on hours worked</p>
                </div>
              ) : fullSlotRate ? (
                <p className="text-muted-foreground">
                  Full slot rate (inc. bonuses): <span className="font-semibold text-primary">S${fullSlotRate.toFixed(2)}</span>
                  <span className="text-xs ml-1">(prorated based on hours worked)</span>
                </p>
              ) : null}
              <div className="flex flex-wrap gap-x-6 gap-y-1">
                {totalSlots > 0 && (
                  <p className="text-muted-foreground">
                    Average pay per slot: <span className="font-semibold text-foreground">S${(totalPay / totalSlots).toFixed(2)}</span>
                  </p>
                )}
                <p className="text-muted-foreground">
                  Average pay per hour: <span className="font-semibold text-foreground">S${(() => {
                    const totalHours = breakdown.filter(i => i.hasAttendance).reduce((sum, item) => sum + (item.hoursWorked || 0), 0);
                    return totalHours > 0 ? (totalPay / totalHours).toFixed(2) : '0.00';
                  })()}</span>
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
