import React, { useState } from 'react';
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
  FileText
} from 'lucide-react';
import { format } from 'date-fns';
import { Student } from '@/services/studentService';
import EditStudentDialog from '@/components/sales/EditStudentDialog';

interface StudentDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: Student | null;
  onStudentUpdated?: () => void;
}

const StudentDetailsDialog: React.FC<StudentDetailsDialogProps> = ({
  open,
  onOpenChange,
  student,
  onStudentUpdated,
}) => {
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

  const InfoRow = ({ label, value }: { label: string; value?: string | null }) => (
    <div className="flex justify-between py-1.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right max-w-[60%] break-words">
        {value || '-'}
      </span>
    </div>
  );

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

        <ScrollArea className="flex-1 px-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 180px)' }}>
          <div className="space-y-6 pb-6">
            {/* Personal Information */}
            <section>
              <h3 className="flex items-center gap-2 text-sm font-semibold mb-3">
                <User className="w-4 h-4" />
                Personal Information
              </h3>
              <div className="bg-muted/50 rounded-lg p-3 space-y-1">
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
              <h3 className="flex items-center gap-2 text-sm font-semibold mb-3">
                <Phone className="w-4 h-4" />
                Contact Information
              </h3>
              <div className="bg-muted/50 rounded-lg p-3 space-y-1">
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
                <h3 className="flex items-center gap-2 text-sm font-semibold mb-3">
                  <Shield className="w-4 h-4" />
                  Emergency Contact
                </h3>
                <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                  <InfoRow label="Name" value={student.emergency_contact_name} />
                  <InfoRow label="Phone" value={student.emergency_contact_phone} />
                  <InfoRow label="Relationship" value={student.emergency_contact_relationship} />
                </div>
              </section>
            )}

            {/* Training Information */}
            <section>
              <h3 className="flex items-center gap-2 text-sm font-semibold mb-3">
                <GraduationCap className="w-4 h-4" />
                Training Information
              </h3>
              <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                <InfoRow label="Current Belt" value={student.current_belt} />
                <InfoRow label="Class Type" value={student.class_type} />
                <InfoRow label="Enrollment Date" value={formatDate(student.enrollment_date)} />
                <InfoRow label="Previous Experience" value={student.previous_experience} />
                <InfoRow label="Training Goals" value={student.training_goals} />
              </div>
            </section>

            {/* Health Information */}
            {(student.medical_conditions || student.dietary_restrictions) && (
              <section>
                <h3 className="flex items-center gap-2 text-sm font-semibold mb-3">
                  <Heart className="w-4 h-4" />
                  Health Information
                </h3>
                <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                  <InfoRow label="Medical Conditions" value={student.medical_conditions} />
                  <InfoRow label="Dietary Restrictions" value={student.dietary_restrictions} />
                </div>
              </section>
            )}

            {/* Notes */}
            {student.notes && (
              <section>
                <h3 className="flex items-center gap-2 text-sm font-semibold mb-3">
                  <FileText className="w-4 h-4" />
                  Notes
                </h3>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-sm whitespace-pre-wrap">{student.notes}</p>
                </div>
              </section>
            )}
          </div>
        </ScrollArea>

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
