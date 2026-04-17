import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Check, X, Eye, UserPlus, Clock, Pencil } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPendingRegistrations, approveRegistration, rejectRegistration } from '@/services/studentRegistrationService';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { BELT_LEVELS_ARRAY } from '@/constants/beltLevels';
import { supabase } from '@/integrations/supabase/client';

interface StudentRegistrationApprovalsProps {
  branchId?: string;
  showAll?: boolean;
}

const EDITABLE_FIELDS: { key: string; label: string; type?: 'text' | 'select' | 'textarea' }[] = [
  { key: 'first_name', label: 'First Name' },
  { key: 'last_name', label: 'Last Name' },
  { key: 'preferred_name', label: 'Preferred Name' },
  { key: 'certificate_name', label: 'Certificate Name' },
  { key: 'gender', label: 'Gender', type: 'select' },
  { key: 'date_of_birth', label: 'Date of Birth' },
  { key: 'nric_passport', label: 'NRIC/FIN' },
  { key: 'passport_no', label: 'Passport' },
  { key: 'phone', label: 'Phone' },
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'email', label: 'Email' },
  { key: 'address', label: 'Address' },
  { key: 'postal_code', label: 'Postal Code' },
  { key: 'emergency_contact_name', label: 'Emergency Contact Name' },
  { key: 'emergency_contact_phone', label: 'Emergency Contact Phone' },
  { key: 'emergency_contact_relationship', label: 'Emergency Contact Relationship' },
  { key: 'previous_experience', label: 'Martial arts / sporting experience' },
  { key: 'training_goals', label: 'Training Goals' },
  { key: 'medical_conditions', label: 'Medical Conditions' },
  { key: 'notes', label: 'Notes', type: 'textarea' },
];

const StudentRegistrationApprovals: React.FC<StudentRegistrationApprovalsProps> = ({ branchId, showAll = false }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedReg, setSelectedReg] = useState<any>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectNotes, setRejectNotes] = useState('');
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [selectedBelt, setSelectedBelt] = useState<string>('none');

  const { data: pendingRegistrations = [], isLoading } = useQuery({
    queryKey: ['pending-registrations', branchId, showAll],
    queryFn: () => getPendingRegistrations(showAll ? undefined : branchId),
    enabled: !!branchId || showAll,
  });

  // Realtime: refresh list when student_registrations changes
  useEffect(() => {
    const channelName = showAll
      ? 'student-registrations-all'
      : `student-registrations-${branchId || 'none'}`;
    const filter = showAll || !branchId ? undefined : `branch_id=eq.${branchId}`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        filter
          ? { event: '*', schema: 'public', table: 'student_registrations', filter }
          : { event: '*', schema: 'public', table: 'student_registrations' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['pending-registrations', branchId, showAll] });
          queryClient.invalidateQueries({ queryKey: ['pending-registrations-count', branchId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [branchId, showAll, queryClient]);

  // Reset edit state when selecting a registration
  useEffect(() => {
    if (selectedReg) {
      setEditValues({});
      setEditingField(null);
      setSelectedBelt(selectedReg.current_belt || 'none');
    }
  }, [selectedReg]);

  const approveMutation = useMutation({
    mutationFn: ({ id, overrides }: { id: string; overrides: Record<string, any> }) =>
      approveRegistration(id, user?.email || '', overrides),
    onSuccess: () => {
      toast.success('Registration approved and student created');
      queryClient.invalidateQueries({ queryKey: ['pending-registrations'] });
      queryClient.invalidateQueries({ queryKey: ['pending-registration-count'] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['branch-students'] });
      queryClient.invalidateQueries({ queryKey: ['student-management'] });
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
      queryClient.invalidateQueries({ queryKey: ['pending-registration-count'] });
      setRejectDialogOpen(false);
      setRejectNotes('');
      setSelectedReg(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleApprove = () => {
    if (!selectedReg) return;
    const overrides: Record<string, any> = { ...editValues };
    // Handle belt - convert 'none' to null
    overrides.current_belt = selectedBelt === 'none' ? null : selectedBelt;
    approveMutation.mutate({ id: selectedReg.id, overrides });
  };

  const handleQuickApprove = (reg: any) => {
    setSelectedReg(reg);
    setReviewDialogOpen(true);
  };

  const getDisplayValue = (key: string, reg: any) => {
    if (editValues[key] !== undefined) return editValues[key];
    const val = reg[key];
    if (Array.isArray(val)) return val.join(', ');
    return val || '';
  };

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
                  <Button size="sm" variant="ghost" className="text-primary" onClick={() => handleQuickApprove(reg)}>
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

      {/* Review & Edit Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>Review Registration</DialogTitle>
            <DialogDescription>Review and edit details before approving</DialogDescription>
          </DialogHeader>
          {selectedReg && (
            <ScrollArea className="max-h-[55vh]">
              <div className="space-y-3 text-sm pr-4">
                {/* Belt Level - always editable */}
                <div className="flex items-center justify-between gap-4 p-2 rounded-md bg-muted/50 border">
                  <Label className="text-muted-foreground font-medium whitespace-nowrap">Current Belt</Label>
                  <Select value={selectedBelt} onValueChange={setSelectedBelt}>
                    <SelectTrigger className="w-[180px] h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Belt</SelectItem>
                      {BELT_LEVELS_ARRAY.map(belt => (
                        <SelectItem key={belt} value={belt}>{belt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Nationality & Languages (read-only) */}
                <DetailRow label="Nationality" value={Array.isArray(selectedReg.nationality) ? selectedReg.nationality.join(', ') : ''} />
                <DetailRow label="Languages" value={Array.isArray(selectedReg.languages_spoken) ? selectedReg.languages_spoken.join(', ') : ''} />
                <DetailRow label="Referral" value={selectedReg.referral_source} />

                {/* Editable fields */}
                {EDITABLE_FIELDS.map(field => {
                  const displayVal = getDisplayValue(field.key, selectedReg);
                  const isEditing = editingField === field.key;

                  if (!displayVal && !isEditing) return null;

                  return (
                    <div key={field.key} className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground font-medium whitespace-nowrap">{field.label}</span>
                      <div className="flex items-center gap-1">
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            {field.key === 'gender' ? (
                              <Select
                                value={editValues[field.key] ?? selectedReg[field.key] ?? ''}
                                onValueChange={(v) => { setEditValues(prev => ({ ...prev, [field.key]: v })); setEditingField(null); }}
                              >
                                <SelectTrigger className="w-[140px] h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="male">Male</SelectItem>
                                  <SelectItem value="female">Female</SelectItem>
                                  <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : field.type === 'textarea' ? (
                              <Textarea
                                className="w-[200px] h-16 text-sm"
                                defaultValue={editValues[field.key] ?? selectedReg[field.key] ?? ''}
                                onBlur={(e) => { setEditValues(prev => ({ ...prev, [field.key]: e.target.value })); setEditingField(null); }}
                                autoFocus
                              />
                            ) : (
                              <Input
                                className="w-[200px] h-8 text-sm"
                                defaultValue={editValues[field.key] ?? selectedReg[field.key] ?? ''}
                                onBlur={(e) => { setEditValues(prev => ({ ...prev, [field.key]: e.target.value })); setEditingField(null); }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    setEditValues(prev => ({ ...prev, [field.key]: (e.target as HTMLInputElement).value }));
                                    setEditingField(null);
                                  }
                                }}
                                autoFocus
                              />
                            )}
                          </div>
                        ) : (
                          <>
                            <span className="text-right text-sm">{displayVal}</span>
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditingField(field.key)}>
                              <Pencil className="w-3 h-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
          <DialogFooter className="gap-2">
            <Button variant="destructive" onClick={() => { setReviewDialogOpen(false); setRejectDialogOpen(true); }}>Reject</Button>
            <Button onClick={handleApprove} disabled={approveMutation.isPending}>
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
