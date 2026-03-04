import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Check, X, Eye, UserPlus, Clock } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPendingRegistrations, approveRegistration, rejectRegistration } from '@/services/studentRegistrationService';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';

interface StudentRegistrationApprovalsProps {
  branchId?: string;
  showAll?: boolean;
}

const StudentRegistrationApprovals: React.FC<StudentRegistrationApprovalsProps> = ({ branchId, showAll = false }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedReg, setSelectedReg] = useState<any>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectNotes, setRejectNotes] = useState('');

  const { data: pendingRegistrations = [], isLoading } = useQuery({
    queryKey: ['pending-registrations', branchId, showAll],
    queryFn: () => getPendingRegistrations(showAll ? undefined : branchId),
    enabled: !!branchId || showAll,
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => approveRegistration(id, user?.email || ''),
    onSuccess: () => {
      toast.success('Registration approved and student created');
      queryClient.invalidateQueries({ queryKey: ['pending-registrations'] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      setReviewDialogOpen(false);
      setSelectedReg(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => rejectRegistration(id, user?.email || '', rejectNotes),
    onSuccess: () => {
      toast.success('Registration rejected');
      queryClient.invalidateQueries({ queryKey: ['pending-registrations'] });
      setRejectDialogOpen(false);
      setRejectNotes('');
      setSelectedReg(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading || pendingRegistrations.length === 0) return null;

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                New Student Registrations
              </CardTitle>
              <CardDescription>{pendingRegistrations.length} pending approval</CardDescription>
            </div>
            <Badge variant="secondary">{pendingRegistrations.length}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {pendingRegistrations.map((reg: any) => (
              <div key={reg.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                <div className="space-y-1">
                  <p className="font-medium text-sm">{reg.first_name} {reg.last_name}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {reg.email && <span>{reg.email}</span>}
                    {reg.phone && <span>{reg.phone}</span>}
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {format(new Date(reg.created_at), 'dd MMM yyyy')}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="ghost" onClick={() => { setSelectedReg(reg); setReviewDialogOpen(true); }}>
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="ghost" className="text-primary" onClick={() => { setSelectedReg(reg); approveMutation.mutate(reg.id); }}>
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => { setSelectedReg(reg); setRejectDialogOpen(true); }}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Review Registration</DialogTitle>
            <DialogDescription>Review the student registration details</DialogDescription>
          </DialogHeader>
          {selectedReg && (
            <ScrollArea className="max-h-[50vh]">
              <div className="space-y-3 text-sm pr-4">
                <DetailRow label="Name" value={`${selectedReg.first_name} ${selectedReg.last_name}`} />
                <DetailRow label="Preferred Name" value={selectedReg.preferred_name} />
                <DetailRow label="Certificate Name" value={selectedReg.certificate_name} />
                <DetailRow label="Gender" value={selectedReg.gender} />
                <DetailRow label="Date of Birth" value={selectedReg.date_of_birth} />
                <DetailRow label="NRIC/FIN" value={selectedReg.nric_passport} />
                <DetailRow label="Passport" value={selectedReg.passport_no} />
                <DetailRow label="Phone" value={selectedReg.phone} />
                <DetailRow label="WhatsApp" value={selectedReg.whatsapp} />
                <DetailRow label="Email" value={selectedReg.email} />
                <DetailRow label="Address" value={selectedReg.address} />
                <DetailRow label="Postal Code" value={selectedReg.postal_code} />
                <DetailRow label="Nationality" value={Array.isArray(selectedReg.nationality) ? selectedReg.nationality.join(', ') : ''} />
                <DetailRow label="Languages" value={Array.isArray(selectedReg.languages_spoken) ? selectedReg.languages_spoken.join(', ') : ''} />
                <DetailRow label="Emergency Contact" value={selectedReg.emergency_contact_name ? `${selectedReg.emergency_contact_name} (${selectedReg.emergency_contact_relationship}) - ${selectedReg.emergency_contact_phone}` : ''} />
                <DetailRow label="Current Belt" value={selectedReg.current_belt} />
                <DetailRow label="Previous Experience" value={selectedReg.previous_experience} />
                <DetailRow label="Training Goals" value={selectedReg.training_goals} />
                <DetailRow label="Medical Conditions" value={selectedReg.medical_conditions} />
                <DetailRow label="Notes" value={selectedReg.notes} />
                <DetailRow label="Referral" value={selectedReg.referral_source} />
              </div>
            </ScrollArea>
          )}
          <DialogFooter className="gap-2">
            <Button variant="destructive" onClick={() => { setReviewDialogOpen(false); setRejectDialogOpen(true); }}>Reject</Button>
            <Button onClick={() => selectedReg && approveMutation.mutate(selectedReg.id)} disabled={approveMutation.isPending}>
              {approveMutation.isPending ? 'Approving...' : 'Approve'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Registration</DialogTitle>
            <DialogDescription>Provide a reason for rejection (optional)</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Reason</Label>
            <Textarea value={rejectNotes} onChange={e => setRejectNotes(e.target.value)} rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => selectedReg && rejectMutation.mutate(selectedReg.id)} disabled={rejectMutation.isPending}>
              {rejectMutation.isPending ? 'Rejecting...' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

const DetailRow = ({ label, value }: { label: string; value?: string | null }) => {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground font-medium">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
};

export default StudentRegistrationApprovals;
