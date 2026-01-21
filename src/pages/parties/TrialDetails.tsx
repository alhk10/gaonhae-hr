/**
 * Trial Details Page
 * View and manage trial registration details with conversion to student
 */

import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';
import AuthGuard from '@/components/auth/AuthGuard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { ArrowLeft, Save, UserCheck, Calendar, Phone, User, AlertCircle, Building2, Edit2, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useBranches } from '@/hooks/useBranches';
import { getStudentById, updateStudent, convertTrialToStudent, Student } from '@/services/studentService';

const TrialDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { branches } = useBranches();
  
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Student>>({});

  // Fetch trial data
  const { data: trial, isLoading, error } = useQuery({
    queryKey: ['trial', id],
    queryFn: () => getStudentById(id!),
    enabled: !!id,
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: Partial<Student>) => updateStudent(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trial', id] });
      queryClient.invalidateQueries({ queryKey: ['trials'] });
      toast.success('Trial updated successfully');
      setIsEditing(false);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to update trial');
    }
  });

  // Convert to student mutation
  const convertMutation = useMutation({
    mutationFn: () => convertTrialToStudent(id!),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['trials'] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      toast.success('Trial converted to student successfully');
      navigate(`/parties/student/${data.id}?edit=true`);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to convert trial');
    }
  });

  const handleStartEdit = () => {
    if (trial) {
      setFormData({
        first_name: trial.first_name,
        last_name: trial.last_name,
        certificate_name: trial.certificate_name,
        display_name: trial.display_name,
        date_of_birth: trial.date_of_birth,
        phone: trial.phone,
        email: trial.email,
        emergency_contact_name: trial.emergency_contact_name,
        emergency_contact_phone: trial.emergency_contact_phone,
        emergency_contact_relationship: trial.emergency_contact_relationship,
        trial_date: trial.trial_date,
        trial_time: trial.trial_time,
        branch_id: trial.branch_id,
        referral_source: trial.referral_source,
      });
      setIsEditing(true);
    }
  };

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

  const handleConvert = () => {
    if (window.confirm(`Convert "${trial?.display_name || trial?.first_name}" to a registered student?`)) {
      convertMutation.mutate();
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getBranchName = (branchId: string | undefined) => {
    if (!branchId) return 'Not assigned';
    const branch = branches.find(b => b.id === branchId);
    return branch?.name || branchId;
  };

  if (isLoading) {
    return (
      <ResponsiveLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </ResponsiveLayout>
    );
  }

  if (error || !trial) {
    return (
      <ResponsiveLayout>
        <div className="text-center py-12">
          <p className="text-destructive mb-4">Trial not found or an error occurred.</p>
          <Button onClick={() => navigate('/parties')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Parties
          </Button>
        </div>
      </ResponsiveLayout>
    );
  }

  // Redirect if not a trial
  if (trial.status !== 'trial') {
    navigate(`/parties/student/${id}`);
    return null;
  }

  return (
    <AuthGuard>
      <ResponsiveLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/parties')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-foreground">
                    {trial.display_name || `${trial.first_name} ${trial.last_name}`}
                  </h1>
                  <Badge variant="secondary">Trial</Badge>
                </div>
                <p className="text-muted-foreground">Trial Registration</p>
              </div>
            </div>
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <Button variant="outline" onClick={() => setIsEditing(false)} disabled={updateMutation.isPending}>
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Save Changes
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={handleStartEdit}>
                    <Edit2 className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button onClick={handleConvert} disabled={convertMutation.isPending} className="bg-green-600 hover:bg-green-700">
                    {convertMutation.isPending ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2" />
                    ) : (
                      <UserCheck className="h-4 w-4 mr-2" />
                    )}
                    Convert to Student
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Personal Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditing ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>First Name</Label>
                        <Input
                          value={formData.first_name || ''}
                          onChange={(e) => handleInputChange('first_name', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Last Name</Label>
                        <Input
                          value={formData.last_name || ''}
                          onChange={(e) => handleInputChange('last_name', e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Certificate Name</Label>
                        <Input
                          value={formData.certificate_name || ''}
                          onChange={(e) => handleInputChange('certificate_name', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Display Name</Label>
                        <Input
                          value={formData.display_name || ''}
                          onChange={(e) => handleInputChange('display_name', e.target.value)}
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Date of Birth</Label>
                      <Input
                        type="date"
                        value={formData.date_of_birth || ''}
                        onChange={(e) => handleInputChange('date_of_birth', e.target.value)}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">First Name</p>
                        <p className="font-medium">{trial.first_name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Last Name</p>
                        <p className="font-medium">{trial.last_name}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Certificate Name</p>
                        <p className="font-medium">{trial.certificate_name || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Display Name</p>
                        <p className="font-medium">{trial.display_name || 'N/A'}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Date of Birth</p>
                      <p className="font-medium">
                        {trial.date_of_birth ? format(parseISO(trial.date_of_birth), 'dd MMMM yyyy') : 'N/A'}
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Trial Schedule */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Trial Schedule
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditing ? (
                  <>
                    <div>
                      <Label>Branch</Label>
                      <Select
                        value={formData.branch_id || ''}
                        onValueChange={(value) => handleInputChange('branch_id', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select branch" />
                        </SelectTrigger>
                        <SelectContent>
                          {branches.map((branch) => (
                            <SelectItem key={branch.id} value={branch.id}>
                              {branch.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Trial Date</Label>
                        <Input
                          type="date"
                          value={formData.trial_date || ''}
                          onChange={(e) => handleInputChange('trial_date', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Trial Time</Label>
                        <Input
                          type="time"
                          value={formData.trial_time || ''}
                          onChange={(e) => handleInputChange('trial_time', e.target.value)}
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Branch</p>
                        <p className="font-medium">{getBranchName(trial.branch_id)}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Trial Date</p>
                        <p className="font-medium">
                          {trial.trial_date ? format(parseISO(trial.trial_date), 'dd MMMM yyyy') : 'Not scheduled'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Trial Time</p>
                        <p className="font-medium">{trial.trial_time || 'Not set'}</p>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditing ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Phone</Label>
                      <Input
                        value={formData.phone || ''}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={formData.email || ''}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <p className="font-medium">{trial.phone || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium">{trial.email || 'N/A'}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Emergency Contact */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Emergency Contact
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isEditing ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Name</Label>
                        <Input
                          value={formData.emergency_contact_name || ''}
                          onChange={(e) => handleInputChange('emergency_contact_name', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Phone</Label>
                        <Input
                          value={formData.emergency_contact_phone || ''}
                          onChange={(e) => handleInputChange('emergency_contact_phone', e.target.value)}
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Relationship</Label>
                      <Select
                        value={formData.emergency_contact_relationship || ''}
                        onValueChange={(value) => handleInputChange('emergency_contact_relationship', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select relationship" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="parent">Parent</SelectItem>
                          <SelectItem value="guardian">Guardian</SelectItem>
                          <SelectItem value="spouse">Spouse</SelectItem>
                          <SelectItem value="sibling">Sibling</SelectItem>
                          <SelectItem value="friend">Friend</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Name</p>
                        <p className="font-medium">{trial.emergency_contact_name || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Phone</p>
                        <p className="font-medium">{trial.emergency_contact_phone || 'N/A'}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Relationship</p>
                      <p className="font-medium capitalize">{trial.emergency_contact_relationship || 'N/A'}</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </ResponsiveLayout>
    </AuthGuard>
  );
};

export default TrialDetails;
