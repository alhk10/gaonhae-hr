import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Edit, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  Shield,
  Heart,
  GraduationCap,
  FileText,
  Receipt,
  ClipboardList,
  Eye
} from 'lucide-react';
import { format } from 'date-fns';
import { Student } from '@/services/studentService';
import EditStudentDialog from '@/components/sales/EditStudentDialog';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/utils/currencyUtils';

interface StudentDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: Student | null;
  branchId?: string;
  onStudentUpdated?: () => void;
  onViewInvoice?: (invoiceId: string) => void;
}

const StudentDetailsDialog: React.FC<StudentDetailsDialogProps> = ({
  open,
  onOpenChange,
  student,
  branchId,
  onStudentUpdated,
  onViewInvoice,
}) => {
  // Fetch invoices for this student
  const { data: invoices = [], isLoading: invoicesLoading } = useQuery({
    queryKey: ['student-invoices-dialog', student?.id, branchId],
    queryFn: async () => {
      let query = supabase
        .from('invoices')
        .select('id, invoice_number, issue_date, total_amount, balance_due, status')
        .eq('student_id', student!.id)
        .order('issue_date', { ascending: false });
      if (branchId) {
        query = query.eq('branch_id', branchId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: open && !!student?.id,
  });

  // Fetch class attendance for this student
  const { data: attendance = [], isLoading: attendanceLoading } = useQuery({
    queryKey: ['student-attendance-dialog', student?.id, branchId],
    queryFn: async () => {
      let query = supabase
        .from('class_attendance')
        .select('id, class_date, status, timetable_id, branch_timetables(class_type, start_time, end_time)')
        .eq('student_id', student!.id)
        .order('class_date', { ascending: false })
        .limit(50);
      if (branchId) {
        query = query.eq('branch_id', branchId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: open && !!student?.id,
  });

  if (!student) return null;

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Not set';
    try {
      return format(new Date(dateStr), 'dd MMM yyyy');
    } catch {
      return dateStr;
    }
  };

  const calculateAge = (dob?: string) => {
    if (!dob) return null;
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const age = calculateAge(student.date_of_birth);

  const presentCount = attendance.filter(a => a.status === 'present').length;
  const absentCount = attendance.filter(a => a.status === 'absent').length;

  const InfoRow = ({ label, value }: { label: string; value?: string | null }) => (
    <div className="flex justify-between py-0.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right max-w-[60%] break-words">
        {value || '-'}
      </span>
    </div>
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'default';
      case 'unpaid': case 'overdue': return 'destructive';
      case 'partial': case 'partially_paid': return 'secondary';
      default: return 'outline';
    }
  };

  const getAttendanceColor = (status: string) => {
    switch (status) {
      case 'present': return 'default';
      case 'absent': return 'destructive';
      case 'late': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-xl">
                {student.first_name} {student.last_name}
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                #{student.student_number}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={student.status === 'Active' ? 'default' : 'secondary'}>
                {student.status}
              </Badge>
              {student.current_belt && (
                <Badge variant="outline">{student.current_belt}</Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 px-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 180px)' }}>
          <div className="space-y-4 pb-6">
            {/* Personal Information */}
            <section>
              <h3 className="flex items-center gap-2 text-sm font-semibold mb-2">
                <User className="w-4 h-4" />
                Personal Information
              </h3>
              <div className="bg-muted/50 rounded-lg p-2 space-y-0">
                <InfoRow label="Display Name" value={student.display_name} />
                <InfoRow label="Preferred Name" value={student.preferred_name} />
                <InfoRow label="Certificate Name" value={student.certificate_name} />
                <InfoRow label="Date of Birth" value={`${formatDate(student.date_of_birth)}${age !== null ? ` (${age} years)` : ''}`} />
                <InfoRow label="Gender" value={student.gender} />
                <InfoRow label="NRIC/Passport" value={student.nric_passport} />
                {Array.isArray(student.nationality) && student.nationality.length > 0 && (
                  <InfoRow label="Nationality" value={student.nationality.join(', ')} />
                )}
              </div>
            </section>

            {/* Contact Information */}
            <section>
              <h3 className="flex items-center gap-2 text-sm font-semibold mb-2">
                <Phone className="w-4 h-4" />
                Contact Information
              </h3>
              <div className="bg-muted/50 rounded-lg p-2 space-y-0">
                <InfoRow label="Phone" value={student.phone} />
                <InfoRow label="WhatsApp" value={student.whatsapp} />
                <InfoRow label="Email" value={student.email} />
                <InfoRow label="Address" value={student.address} />
                <InfoRow label="Postal Code" value={student.postal_code} />
              </div>
            </section>

            {/* Emergency Contact */}
            {(student.emergency_contact_name || student.emergency_contact_phone) && (
              <section>
                <h3 className="flex items-center gap-2 text-sm font-semibold mb-2">
                  <Shield className="w-4 h-4" />
                  Emergency Contact
                </h3>
                <div className="bg-muted/50 rounded-lg p-2 space-y-0">
                  <InfoRow label="Name" value={student.emergency_contact_name} />
                  <InfoRow label="Phone" value={student.emergency_contact_phone} />
                  <InfoRow label="Relationship" value={student.emergency_contact_relationship} />
                </div>
              </section>
            )}

            {/* Training Information */}
            <section>
              <h3 className="flex items-center gap-2 text-sm font-semibold mb-2">
                <GraduationCap className="w-4 h-4" />
                Training Information
              </h3>
              <div className="bg-muted/50 rounded-lg p-2 space-y-0">
                <InfoRow label="Current Belt" value={student.current_belt} />
                <InfoRow label="Class Type" value={student.class_type} />
                <InfoRow label="Enrollment Date" value={formatDate(student.enrollment_date)} />
                <InfoRow label="Previous Experience" value={student.previous_experience} />
                <InfoRow label="Training Goals" value={student.training_goals} />
              </div>
            </section>

            {/* Invoices */}
            <section>
              <h3 className="flex items-center gap-2 text-sm font-semibold mb-2">
                <Receipt className="w-4 h-4" />
                Invoices
              </h3>
              <div className="bg-muted/50 rounded-lg p-2">
                {invoicesLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                ) : invoices.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-2">No invoices found</p>
                ) : (
                  <div className="space-y-1">
                    {invoices.map((inv) => (
                      <div key={inv.id} className="flex items-center justify-between py-1.5 px-1 rounded hover:bg-muted/80">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{inv.invoice_number}</span>
                            <Badge variant={getStatusColor(inv.status || 'unpaid')} className="text-[10px] px-1.5 py-0">
                              {inv.status}
                            </Badge>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(inv.issue_date)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">
                            {formatCurrency(inv.total_amount)}
                          </span>
                          {onViewInvoice && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => onViewInvoice(inv.id)}
                              title="View invoice details"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* Class Attendance */}
            <section>
              <h3 className="flex items-center gap-2 text-sm font-semibold mb-2">
                <ClipboardList className="w-4 h-4" />
                Class Attendance
                {!attendanceLoading && attendance.length > 0 && (
                  <span className="ml-auto flex items-center gap-1.5 text-xs font-normal text-muted-foreground">
                    <Badge variant="default" className="text-[10px] px-1.5 py-0">{presentCount}</Badge>
                    <span>present</span>
                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0">{absentCount}</Badge>
                    <span>absent</span>
                  </span>
                )}
              </h3>
              <div className="bg-muted/50 rounded-lg p-2">
                {attendanceLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                ) : attendance.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-2">No attendance records found</p>
                ) : (
                  <div className="space-y-1">
                    {attendance.map((record: any) => (
                      <div key={record.id} className="flex items-center justify-between py-1 px-1 rounded hover:bg-muted/80">
                        <div className="flex-1 min-w-0">
                          <span className="text-sm">{formatDate(record.class_date)}</span>
                          {record.branch_timetables && (
                            <span className="text-xs text-muted-foreground ml-2">
                              {record.branch_timetables.class_type}
                              {record.branch_timetables.start_time && ` • ${record.branch_timetables.start_time.slice(0, 5)}-${record.branch_timetables.end_time?.slice(0, 5)}`}
                            </span>
                          )}
                        </div>
                        <Badge variant={getAttendanceColor(record.status)} className="text-[10px] px-1.5 py-0 capitalize">
                          {record.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* Health Information */}
            {(student.medical_conditions || student.dietary_restrictions) && (
              <section>
                <h3 className="flex items-center gap-2 text-sm font-semibold mb-2">
                  <Heart className="w-4 h-4" />
                  Health Information
                </h3>
                <div className="bg-muted/50 rounded-lg p-2 space-y-0">
                  <InfoRow label="Medical Conditions" value={student.medical_conditions} />
                  <InfoRow label="Dietary Restrictions" value={student.dietary_restrictions} />
                </div>
              </section>
            )}

            {/* Notes */}
            {student.notes && (
              <section>
                <h3 className="flex items-center gap-2 text-sm font-semibold mb-2">
                  <FileText className="w-4 h-4" />
                  Notes
                </h3>
                <div className="bg-muted/50 rounded-lg p-2">
                  <p className="text-sm whitespace-pre-wrap">{student.notes}</p>
                </div>
              </section>
            )}
          </div>
        </div>

        <Separator />
        
        <div className="p-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <EditStudentDialog
            trigger={
              <Button>
                <Edit className="w-4 h-4 mr-2" />
                Edit Student
              </Button>
            }
            student={student}
            onStudentUpdated={() => {
              onStudentUpdated?.();
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StudentDetailsDialog;