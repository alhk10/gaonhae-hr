/**
 * Add Student Dialog
 * Modal form for creating new students
 */

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { toast } from 'sonner';
import { UserPlus, User, Mail, GraduationCap, Settings } from 'lucide-react';
import { useBranches } from '@/hooks/useBranches';

interface AddStudentDialogProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onStudentAdded?: () => void;
}

const AddStudentDialog: React.FC<AddStudentDialogProps> = ({
  trigger,
  open: controlledOpen,
  onOpenChange,
  onStudentAdded
}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  
  // Support both controlled and uncontrolled modes
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setIsOpen = onOpenChange || setInternalOpen;
  const [loading, setLoading] = useState(false);
  const { branches, loading: branchesLoading } = useBranches();
  
  // Common nationalities for the dropdown
  const commonNationalities = [
    'Singapore', 'Malaysia', 'Indonesia', 'Thailand', 'Philippines', 'Vietnam',
    'China', 'India', 'Japan', 'South Korea', 'Myanmar', 'Cambodia', 'Laos',
    'Brunei', 'Australia', 'New Zealand', 'United Kingdom', 'United States',
    'Canada', 'Germany', 'France', 'Italy', 'Spain', 'Netherlands', 'Switzerland'
  ];

  // Belt progression system
  const beltLevels = [
    'Foundation 1', 'Foundation 2', 'Foundation 3',
    'White', 'Yellow Tip', 'Yellow', 'Green Tip', 'Green',
    'Blue Tip', 'Blue', 'Red Tip', 'Red', 'Black Tip',
    'Dan 1', 'Dan 2', 'Dan 3', 'Dan 4', 'Dan 5',
    'Poom 1', 'Poom 2', 'Poom 3', 'Poom 4'
  ];
  
  // Referral source options
  const referralSourceOptions = [
    { value: 'family_friends', label: 'Family & Friends' },
    { value: 'social_media', label: 'Social Media' },
    { value: 'google_search', label: 'Google Search' },
    { value: 'pass_by', label: 'Pass By' },
    { value: 'others', label: 'Others' }
  ];

  const [formData, setFormData] = useState({
    // Personal Information
    first_name: '',
    last_name: '',
    preferred_name: '',
    certificate_name: '',
    display_name: '',
    referral_source: '',
    date_of_birth: '',
    gender: '',
    nationality: '',
    nric_passport: '',
    
    // Contact Information
    email: '',
    phone: '',
    address: '',
    postal_code: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relationship: '',
    
    // Training Information
    current_belt: '',
    previous_experience: '',
    training_goals: '',
    medical_conditions: '',
    dietary_restrictions: '',
    
    // Administrative
    branch_id: '',
    status: 'active',
    notes: ''
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      
      // Auto-update certificate_name and display_name when first/last name changes
      if (field === 'first_name' || field === 'last_name') {
        const firstName = field === 'first_name' ? value : prev.first_name;
        const lastName = field === 'last_name' ? value : prev.last_name;
        const fullName = `${firstName} ${lastName}`.trim();
        
        // Only auto-update if the field hasn't been manually edited (still matches the auto-generated pattern)
        const currentAutoName = `${prev.first_name} ${prev.last_name}`.trim();
        if (!prev.certificate_name || prev.certificate_name === currentAutoName) {
          updated.certificate_name = fullName;
        }
        if (!prev.display_name || prev.display_name === currentAutoName) {
          updated.display_name = fullName;
        }
      }
      
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.first_name || !formData.last_name) {
      toast.error('First name and last name are required');
      return;
    }
    
    if (!formData.certificate_name || !formData.display_name) {
      toast.error('Certificate name and display name are required');
      return;
    }
    
    if (!formData.email && !formData.phone) {
      toast.error('Either email or phone number is required');
      return;
    }

    setLoading(true);
    
    try {
      // Import the createStudent function
      const { createStudent } = await import('@/services/studentService');
      
      await createStudent(formData);
      
      toast.success('Student added successfully');
      setIsOpen(false);
      setFormData({
        first_name: '',
        last_name: '',
        preferred_name: '',
        certificate_name: '',
        display_name: '',
        referral_source: '',
        date_of_birth: '',
        gender: '',
        nationality: '',
        nric_passport: '',
        email: '',
        phone: '',
        address: '',
        postal_code: '',
        emergency_contact_name: '',
        emergency_contact_phone: '',
        emergency_contact_relationship: '',
        current_belt: '',
        previous_experience: '',
        training_goals: '',
        medical_conditions: '',
        dietary_restrictions: '',
        branch_id: '',
        status: 'active',
        notes: ''
      });
      
      if (onStudentAdded) {
        onStudentAdded();
      }
    } catch (error) {
      console.error('Error adding student:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to add student');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {trigger && (
        <DialogTrigger asChild>
          {trigger}
        </DialogTrigger>
      )}
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Add New Student
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Personal Information Section */}
          <section className="rounded-lg bg-muted/50 p-4 space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <User className="w-4 h-4" />
              Personal Information
            </h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="first_name" className="text-xs">First Name *</Label>
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) => handleInputChange('first_name', e.target.value)}
                    required
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="last_name" className="text-xs">Last Name *</Label>
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) => handleInputChange('last_name', e.target.value)}
                    required
                    className="h-9"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="certificate_name" className="text-xs">Certificate Name *</Label>
                  <Input
                    id="certificate_name"
                    value={formData.certificate_name}
                    onChange={(e) => handleInputChange('certificate_name', e.target.value)}
                    placeholder="Name for printing on certificates"
                    required
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="display_name" className="text-xs">Display Name *</Label>
                  <Input
                    id="display_name"
                    value={formData.display_name}
                    onChange={(e) => handleInputChange('display_name', e.target.value)}
                    placeholder="Name shown on UI"
                    required
                    className="h-9"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="preferred_name" className="text-xs">Preferred Name</Label>
                  <Input
                    id="preferred_name"
                    value={formData.preferred_name}
                    onChange={(e) => handleInputChange('preferred_name', e.target.value)}
                    placeholder="Name the student prefers to be called"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="referral_source" className="text-xs">Where did you find out about us?</Label>
                  <Select value={formData.referral_source} onValueChange={(value) => handleInputChange('referral_source', value)}>
                    <SelectTrigger className="h-9">
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
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="date_of_birth" className="text-xs">Date of Birth</Label>
                  <Input
                    id="date_of_birth"
                    type="date"
                    value={formData.date_of_birth}
                    onChange={(e) => handleInputChange('date_of_birth', e.target.value)}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="gender" className="text-xs">Gender</Label>
                  <Select value={formData.gender} onValueChange={(value) => handleInputChange('gender', value)}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                      <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="nationality" className="text-xs">Nationality</Label>
                  <SearchableSelect
                    value={formData.nationality}
                    onValueChange={(value) => handleInputChange('nationality', value)}
                    options={commonNationalities}
                    placeholder="Select or type nationality"
                    searchPlaceholder="Search nationalities..."
                    allowAddNew={true}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="nric_passport" className="text-xs">NRIC/Passport</Label>
                  <Input
                    id="nric_passport"
                    value={formData.nric_passport}
                    onChange={(e) => handleInputChange('nric_passport', e.target.value)}
                    placeholder="NRIC or Passport Number"
                    className="h-9"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Contact Information Section */}
          <section className="rounded-lg bg-accent/30 p-4 space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Mail className="w-4 h-4" />
              Contact Information
            </h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="email" className="text-xs">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="student@example.com"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="phone" className="text-xs">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="+65 9123 4567"
                    className="h-9"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="address" className="text-xs">Address</Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    placeholder="Full address"
                    rows={2}
                    className="min-h-[60px]"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="postal_code" className="text-xs">Postal Code</Label>
                  <Input
                    id="postal_code"
                    value={formData.postal_code}
                    onChange={(e) => handleInputChange('postal_code', e.target.value)}
                    placeholder="123456"
                    className="h-9"
                  />
                </div>
              </div>

              <div className="rounded-md bg-background/50 p-3 space-y-3">
                <h4 className="text-xs font-medium">Emergency Contact</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="emergency_contact_name" className="text-xs">Name</Label>
                    <Input
                      id="emergency_contact_name"
                      value={formData.emergency_contact_name}
                      onChange={(e) => handleInputChange('emergency_contact_name', e.target.value)}
                      placeholder="Emergency contact name"
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="emergency_contact_phone" className="text-xs">Phone</Label>
                    <Input
                      id="emergency_contact_phone"
                      value={formData.emergency_contact_phone}
                      onChange={(e) => handleInputChange('emergency_contact_phone', e.target.value)}
                      placeholder="+65 9123 4567"
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="emergency_contact_relationship" className="text-xs">Relationship</Label>
                    <Select 
                      value={formData.emergency_contact_relationship} 
                      onValueChange={(value) => handleInputChange('emergency_contact_relationship', value)}
                    >
                      <SelectTrigger className="h-9">
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
                </div>
              </div>
            </div>
          </section>

          {/* Training Information Section */}
          <section className="rounded-lg bg-muted/50 p-4 space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <GraduationCap className="w-4 h-4" />
              Training Information
            </h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="current_belt" className="text-xs">Current Belt Level</Label>
                  <Select value={formData.current_belt} onValueChange={(value) => handleInputChange('current_belt', value)}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select belt level" />
                    </SelectTrigger>
                    <SelectContent>
                      {beltLevels.map((belt) => (
                        <SelectItem key={belt} value={belt.toLowerCase().replace(/\s+/g, '-')}>
                          {belt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="previous_experience" className="text-xs">Previous Martial Arts Experience</Label>
                  <Textarea
                    id="previous_experience"
                    value={formData.previous_experience}
                    onChange={(e) => handleInputChange('previous_experience', e.target.value)}
                    placeholder="Describe any previous training"
                    rows={2}
                    className="min-h-[60px]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="training_goals" className="text-xs">Training Goals</Label>
                <Textarea
                  id="training_goals"
                  value={formData.training_goals}
                  onChange={(e) => handleInputChange('training_goals', e.target.value)}
                  placeholder="What are the student's training goals?"
                  rows={2}
                  className="min-h-[60px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="medical_conditions" className="text-xs">Medical Conditions</Label>
                  <Textarea
                    id="medical_conditions"
                    value={formData.medical_conditions}
                    onChange={(e) => handleInputChange('medical_conditions', e.target.value)}
                    placeholder="Any medical conditions"
                    rows={2}
                    className="min-h-[60px]"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="dietary_restrictions" className="text-xs">Dietary Restrictions</Label>
                  <Textarea
                    id="dietary_restrictions"
                    value={formData.dietary_restrictions}
                    onChange={(e) => handleInputChange('dietary_restrictions', e.target.value)}
                    placeholder="Any dietary restrictions or allergies"
                    rows={2}
                    className="min-h-[60px]"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Administrative Section */}
          <section className="rounded-lg bg-accent/30 p-4 space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Settings className="w-4 h-4" />
              Administrative
            </h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="branch_id" className="text-xs">Primary Branch</Label>
                  <Select 
                    value={formData.branch_id} 
                    onValueChange={(value) => handleInputChange('branch_id', value)}
                    disabled={branchesLoading}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder={branchesLoading ? "Loading branches..." : "Select primary branch"} />
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
                <div className="space-y-1">
                  <Label htmlFor="status" className="text-xs">Status</Label>
                  <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="withdrawn">Withdrawn</SelectItem>
                      <SelectItem value="medical-leave">Medical Leave</SelectItem>
                      <SelectItem value="examination-leave">Examination Leave</SelectItem>
                      <SelectItem value="on-holiday">On Holiday</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="notes" className="text-xs">Additional Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Any additional notes about the student"
                  rows={2}
                  className="min-h-[60px]"
                />
              </div>
            </div>
          </section>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={loading}
              size="sm"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} size="sm">
              {loading ? 'Adding...' : 'Add Student'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddStudentDialog;
