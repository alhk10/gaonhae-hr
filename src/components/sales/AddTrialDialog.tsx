/**
 * Add Trial Dialog
 * Modal form for registering prospective students for trials
 */

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PhoneInput } from '@/components/ui/phone-input';
import { toast } from 'sonner';
import { UserPlus, Calendar, Phone, User, Clock, AlertCircle } from 'lucide-react';
import { useBranches } from '@/hooks/useBranches';
import { BELT_LEVELS } from '@/constants/beltLevels';
import { relationshipOptions } from '@/constants/formOptions';

interface AddTrialDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onTrialAdded?: () => void;
}

const AddTrialDialog: React.FC<AddTrialDialogProps> = ({
  open = false,
  onOpenChange,
  onTrialAdded
}) => {
  const [loading, setLoading] = useState(false);
  const { branches, loading: branchesLoading } = useBranches();
  
  // Referral source options
  const referralSourceOptions = [
    { value: 'family_friends', label: 'Family & Friends' },
    { value: 'facebook', label: 'Facebook' },
    { value: 'instagram', label: 'Instagram' },
    { value: 'google_search', label: 'Google Search' },
    { value: 'pass_by', label: 'Pass By' },
    { value: 'others', label: 'Others' }
  ];

  // Relationship options
  // Relationship options imported from shared constants

  // Belt level options - using shared constants
  // Import is at the top of the file

  // Gender options
  const genderOptions = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' }
  ];

  const [formData, setFormData] = useState({
    // Branch
    branch_id: '',
    
    // Personal Information
    first_name: '',
    last_name: '',
    preferred_name: '',
    certificate_name: '',
    display_name: '',
    date_of_birth: '',
    gender: '',
    current_belt: '',
    
    // Contact Information
    phone: '',
    email: '',
    whatsapp: '',
    
    // Emergency Contact
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relationship: '',
    
    // Trial Scheduling
    trial_date: '',
    trial_time: '',
    
    // Referral
    referral_source: '',
    
    // Status
    status: 'trial'
  });

  // Fields that should auto-uppercase
  const uppercaseFields = ['first_name', 'last_name', 'certificate_name', 'display_name', 'preferred_name', 'emergency_contact_name'];

  const handleInputChange = (field: string, value: string) => {
    // Auto-uppercase specific fields
    const processedValue = uppercaseFields.includes(field) ? value.toUpperCase() : value;
    
    setFormData(prev => {
      const updated = { ...prev, [field]: processedValue };
      
      // Auto-update preferred_name, certificate_name and display_name when first/last name changes
      if (field === 'first_name' || field === 'last_name') {
        const firstName = field === 'first_name' ? processedValue : prev.first_name;
        const lastName = field === 'last_name' ? processedValue : prev.last_name;
        const fullName = `${firstName} ${lastName}`.trim();
        
        const currentAutoName = `${prev.first_name} ${prev.last_name}`.trim();
        if (!prev.preferred_name || prev.preferred_name === currentAutoName) {
          updated.preferred_name = fullName;
        }
        if (!prev.certificate_name || prev.certificate_name === currentAutoName) {
          updated.certificate_name = fullName;
        }
        if (!prev.display_name || prev.display_name === currentAutoName) {
          updated.display_name = fullName;
        }
      }
      
      // Auto-update whatsapp when phone changes
      if (field === 'phone') {
        if (!prev.whatsapp || prev.whatsapp === prev.phone) {
          updated.whatsapp = value;
        }
      }
      
      return updated;
    });
  };

  const resetForm = () => {
    setFormData({
      branch_id: '',
      first_name: '',
      last_name: '',
      preferred_name: '',
      certificate_name: '',
      display_name: '',
      date_of_birth: '',
      gender: '',
      current_belt: '',
      phone: '',
      email: '',
      whatsapp: '',
      emergency_contact_name: '',
      emergency_contact_phone: '',
      emergency_contact_relationship: '',
      trial_date: '',
      trial_time: '',
      referral_source: '',
      status: 'trial'
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.branch_id) {
      toast.error('Please select a branch');
      return;
    }
    
    if (!formData.first_name) {
      toast.error('First name is required');
      return;
    }
    
    if (!formData.phone && !formData.email) {
      toast.error('Either phone or email is required');
      return;
    }
    
    if (!formData.trial_date || !formData.trial_time) {
      toast.error('Trial date and time are required');
      return;
    }

    setLoading(true);
    
    try {
      const { createStudent } = await import('@/services/studentService');
      
      await createStudent(formData);
      
      toast.success('Trial registered successfully');
      onOpenChange?.(false);
      resetForm();
      onTrialAdded?.();
    } catch (error) {
      console.error('Error registering trial:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to register trial');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Register Trial
          </DialogTitle>
          <DialogDescription>
            Register a prospective student for a trial class. Required fields are marked with an asterisk (*).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Branch Selection */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Branch *</CardTitle>
            </CardHeader>
            <CardContent>
              <Select 
                value={formData.branch_id} 
                onValueChange={(value) => handleInputChange('branch_id', value)}
                disabled={branchesLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder={branchesLoading ? "Loading branches..." : "Select branch"} />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Personal Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <User className="w-4 h-4" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="first_name">First Name *</Label>
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) => handleInputChange('first_name', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="last_name">Last Name</Label>
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) => handleInputChange('last_name', e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="preferred_name">Preferred Name</Label>
                <Input
                  id="preferred_name"
                  value={formData.preferred_name}
                  onChange={(e) => handleInputChange('preferred_name', e.target.value)}
                  placeholder="Preferred name"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="certificate_name">Certificate Name *</Label>
                  <Input
                    id="certificate_name"
                    value={formData.certificate_name}
                    onChange={(e) => handleInputChange('certificate_name', e.target.value)}
                    placeholder="Name for certificates"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="display_name">Display Name *</Label>
                  <Input
                    id="display_name"
                    value={formData.display_name}
                    onChange={(e) => handleInputChange('display_name', e.target.value)}
                    placeholder="Name shown on UI"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="date_of_birth">Date of Birth</Label>
                  <Input
                    id="date_of_birth"
                    type="date"
                    value={formData.date_of_birth}
                    onChange={(e) => handleInputChange('date_of_birth', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="gender">Gender</Label>
                  <Select 
                    value={formData.gender} 
                    onValueChange={(value) => handleInputChange('gender', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      {genderOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="current_belt">Current Belt Level</Label>
                <Select 
                  value={formData.current_belt} 
                  onValueChange={(value) => handleInputChange('current_belt', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select belt level" />
                  </SelectTrigger>
                  <SelectContent>
                    {BELT_LEVELS.map((belt) => (
                      <SelectItem key={belt} value={belt}>
                        {belt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <Phone className="w-4 h-4" />
                Contact Information (Phone or Email required)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
               <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <PhoneInput
                    value={formData.phone}
                    onChange={(value) => handleInputChange('phone', value)}
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="email@example.com"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <PhoneInput
                  value={formData.whatsapp}
                  onChange={(value) => handleInputChange('whatsapp', value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Emergency Contact */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <AlertCircle className="w-4 h-4" />
                Emergency Contact (Optional)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="emergency_contact_name">Name</Label>
                  <Input
                    id="emergency_contact_name"
                    value={formData.emergency_contact_name}
                    onChange={(e) => handleInputChange('emergency_contact_name', e.target.value)}
                    placeholder="Emergency contact name"
                  />
                </div>
                <div>
                  <Label htmlFor="emergency_contact_phone">Phone</Label>
                  <PhoneInput
                    value={formData.emergency_contact_phone}
                    onChange={(value) => handleInputChange('emergency_contact_phone', value)}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="emergency_contact_relationship">Relationship</Label>
                <Select 
                  value={formData.emergency_contact_relationship} 
                  onValueChange={(value) => handleInputChange('emergency_contact_relationship', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select relationship" />
                  </SelectTrigger>
                <SelectContent>
                    {relationshipOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Trial Scheduling */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <Calendar className="w-4 h-4" />
                Trial Schedule
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="trial_date">Trial Date *</Label>
                  <Input
                    id="trial_date"
                    type="date"
                    value={formData.trial_date}
                    onChange={(e) => handleInputChange('trial_date', e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="trial_time">Trial Time *</Label>
                  <Input
                    id="trial_time"
                    type="time"
                    value={formData.trial_time}
                    onChange={(e) => handleInputChange('trial_time', e.target.value)}
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Referral Source */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Where did you find out about us?</CardTitle>
            </CardHeader>
            <CardContent>
              <Select 
                value={formData.referral_source} 
                onValueChange={(value) => handleInputChange('referral_source', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an option" />
                </SelectTrigger>
                <SelectContent>
                  {referralSourceOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange?.(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2"></div>
                  Registering...
                </div>
              ) : (
                'Register Trial'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddTrialDialog;
