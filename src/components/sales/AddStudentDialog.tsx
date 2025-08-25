/**
 * Add Student Dialog
 * Modal form for creating new students
 */

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { toast } from 'sonner';
import { UserPlus, Calendar, Mail, Phone, MapPin, User, CreditCard } from 'lucide-react';
import { useBranches } from '@/hooks/useBranches';

interface AddStudentDialogProps {
  trigger: React.ReactNode;
  onStudentAdded?: () => void;
}

const AddStudentDialog: React.FC<AddStudentDialogProps> = ({
  trigger,
  onStudentAdded
}) => {
  const [open, setOpen] = useState(false);
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
  const [formData, setFormData] = useState({
    // Personal Information
    first_name: '',
    last_name: '',
    preferred_name: '',
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
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.first_name || !formData.last_name) {
      toast.error('First name and last name are required');
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
      setOpen(false);
      setFormData({
        first_name: '',
        last_name: '',
        preferred_name: '',
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Add New Student
          </DialogTitle>
          <DialogDescription>
            Enter the student's information below. Required fields are marked with an asterisk (*).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Tabs defaultValue="personal" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="personal">Personal</TabsTrigger>
              <TabsTrigger value="contact">Contact</TabsTrigger>
              <TabsTrigger value="training">Training</TabsTrigger>
              <TabsTrigger value="admin">Admin</TabsTrigger>
            </TabsList>

            <TabsContent value="personal" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
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
                      <Label htmlFor="last_name">Last Name *</Label>
                      <Input
                        id="last_name"
                        value={formData.last_name}
                        onChange={(e) => handleInputChange('last_name', e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="preferred_name">Preferred Name</Label>
                    <Input
                      id="preferred_name"
                      value={formData.preferred_name}
                      onChange={(e) => handleInputChange('preferred_name', e.target.value)}
                      placeholder="Name the student prefers to be called"
                    />
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
                      <Select value={formData.gender} onValueChange={(value) => handleInputChange('gender', value)}>
                        <SelectTrigger>
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

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="nationality">Nationality</Label>
                      <SearchableSelect
                        value={formData.nationality}
                        onValueChange={(value) => handleInputChange('nationality', value)}
                        options={commonNationalities}
                        placeholder="Select or type nationality"
                        searchPlaceholder="Search nationalities..."
                        allowAddNew={true}
                      />
                    </div>
                    <div>
                      <Label htmlFor="nric_passport">NRIC/Passport</Label>
                      <Input
                        id="nric_passport"
                        value={formData.nric_passport}
                        onChange={(e) => handleInputChange('nric_passport', e.target.value)}
                        placeholder="NRIC or Passport Number"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="contact" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Contact Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        placeholder="student@example.com"
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        placeholder="+65 9123 4567"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="address">Address</Label>
                    <Textarea
                      id="address"
                      value={formData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      placeholder="Full address"
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="postal_code">Postal Code</Label>
                    <Input
                      id="postal_code"
                      value={formData.postal_code}
                      onChange={(e) => handleInputChange('postal_code', e.target.value)}
                      placeholder="123456"
                    />
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-4">Emergency Contact</h4>
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
                        <Input
                          id="emergency_contact_phone"
                          value={formData.emergency_contact_phone}
                          onChange={(e) => handleInputChange('emergency_contact_phone', e.target.value)}
                          placeholder="+65 9123 4567"
                        />
                      </div>
                    </div>
                    <div className="mt-4">
                      <Label htmlFor="emergency_contact_relationship">Relationship</Label>
                      <Select 
                        value={formData.emergency_contact_relationship} 
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
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="training" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Training Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="current_belt">Current Belt Level</Label>
                    <Select value={formData.current_belt} onValueChange={(value) => handleInputChange('current_belt', value)}>
                      <SelectTrigger>
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

                  <div>
                    <Label htmlFor="previous_experience">Previous Martial Arts Experience</Label>
                    <Textarea
                      id="previous_experience"
                      value={formData.previous_experience}
                      onChange={(e) => handleInputChange('previous_experience', e.target.value)}
                      placeholder="Describe any previous martial arts training"
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="training_goals">Training Goals</Label>
                    <Textarea
                      id="training_goals"
                      value={formData.training_goals}
                      onChange={(e) => handleInputChange('training_goals', e.target.value)}
                      placeholder="What are the student's training goals?"
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="medical_conditions">Medical Conditions</Label>
                    <Textarea
                      id="medical_conditions"
                      value={formData.medical_conditions}
                      onChange={(e) => handleInputChange('medical_conditions', e.target.value)}
                      placeholder="Any medical conditions we should be aware of"
                      rows={2}
                    />
                  </div>

                  <div>
                    <Label htmlFor="dietary_restrictions">Dietary Restrictions</Label>
                    <Textarea
                      id="dietary_restrictions"
                      value={formData.dietary_restrictions}
                      onChange={(e) => handleInputChange('dietary_restrictions', e.target.value)}
                      placeholder="Any dietary restrictions or allergies"
                      rows={2}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="admin" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Administrative Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="branch_id">Primary Branch</Label>
                    <Select 
                      value={formData.branch_id} 
                      onValueChange={(value) => handleInputChange('branch_id', value)}
                      disabled={branchesLoading}
                    >
                      <SelectTrigger>
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

                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
                      <SelectTrigger>
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

                  <div>
                    <Label htmlFor="notes">Additional Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => handleInputChange('notes', e.target.value)}
                      placeholder="Any additional notes about the student"
                      rows={4}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Adding...' : 'Add Student'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddStudentDialog;