 import React, { useState } from 'react';
 import {
   Dialog,
   DialogContent,
   DialogHeader,
   DialogTitle,
 } from '@/components/ui/dialog';
 import { Button } from '@/components/ui/button';
 import { Card, CardContent } from '@/components/ui/card';
 import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';
 import { useQuery } from '@tanstack/react-query';
 import { supabase } from '@/integrations/supabase/client';
 import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
 
 interface AttendanceHistoryDialogProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   employeeId: string;
 }
 
 interface AttendanceRecord {
   id: number;
   date: string;
   check_in: string | null;
   check_out: string | null;
   hours_worked: number | null;
   status: string;
   clock_in_location: string | null;
   clock_out_location: string | null;
 }
 
 const AttendanceHistoryDialog: React.FC<AttendanceHistoryDialogProps> = ({
   open,
   onOpenChange,
   employeeId,
 }) => {
   const [currentMonth, setCurrentMonth] = useState(new Date());
 
   const monthStart = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
   const monthEnd = format(endOfMonth(currentMonth), 'yyyy-MM-dd');
 
   const { data: attendanceRecords = [], isLoading } = useQuery({
     queryKey: ['attendance-history', employeeId, monthStart, monthEnd],
     queryFn: async () => {
       const { data, error } = await supabase
         .from('attendance')
         .select('*')
         .eq('employee_id', employeeId)
         .gte('date', monthStart)
         .lte('date', monthEnd)
         .order('date', { ascending: false });
 
       if (error) throw error;
       return data as AttendanceRecord[];
     },
     enabled: open && !!employeeId,
   });
 
   const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
   const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
 
   const formatTime = (time: string | null) => {
     if (!time) return '-';
     return time;
   };
 
   const formatDuration = (hours: number | null) => {
     if (hours === null || hours === undefined) return '-';
     const h = Math.floor(hours);
     const m = Math.round((hours - h) * 60);
     if (h === 0) return `${m}m`;
     if (m === 0) return `${h}h`;
     return `${h}h ${m}m`;
   };
 
   const totalHours = attendanceRecords.reduce((sum, r) => sum + (r.hours_worked || 0), 0);
 
   return (
     <Dialog open={open} onOpenChange={onOpenChange}>
       <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
         <DialogHeader>
           <DialogTitle className="flex items-center gap-2">
             <Clock className="w-5 h-5" />
             Attendance History
           </DialogTitle>
         </DialogHeader>
 
         {/* Month Selector */}
         <div className="flex items-center justify-between py-2 border-b">
           <Button variant="ghost" size="icon" onClick={handlePrevMonth}>
             <ChevronLeft className="w-4 h-4" />
           </Button>
           <span className="font-semibold text-lg">
             {format(currentMonth, 'MMMM yyyy')}
           </span>
           <Button 
             variant="ghost" 
             size="icon" 
             onClick={handleNextMonth}
             disabled={currentMonth >= new Date()}
           >
             <ChevronRight className="w-4 h-4" />
           </Button>
         </div>
 
         {/* Summary */}
         <div className="flex justify-between items-center py-2 px-1 bg-muted/50 rounded-md">
           <span className="text-sm text-muted-foreground">Total Hours:</span>
           <span className="font-semibold">{formatDuration(totalHours)}</span>
         </div>
 
         {/* Records List */}
         <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
           {isLoading ? (
             <div className="text-center py-8 text-muted-foreground">Loading...</div>
           ) : attendanceRecords.length === 0 ? (
             <div className="text-center py-8 text-muted-foreground">
               No attendance records for this month
             </div>
           ) : (
             attendanceRecords.map((record) => (
               <Card key={record.id} className="border">
                 <CardContent className="p-3">
                   <div className="flex justify-between items-start mb-2">
                     <span className="font-medium">
                       {format(new Date(record.date), 'EEE, dd MMM yyyy')}
                     </span>
                     <span className="text-sm font-semibold text-primary">
                       {formatDuration(record.hours_worked)}
                     </span>
                   </div>
                   <div className="grid grid-cols-2 gap-2 text-sm">
                     <div>
                       <span className="text-muted-foreground">Clock In: </span>
                       <span className="font-medium">{formatTime(record.check_in)}</span>
                     </div>
                     <div>
                       <span className="text-muted-foreground">Clock Out: </span>
                       <span className="font-medium">{formatTime(record.check_out)}</span>
                     </div>
                   </div>
                 </CardContent>
               </Card>
             ))
           )}
         </div>
       </DialogContent>
     </Dialog>
   );
 };
 
 export default AttendanceHistoryDialog;