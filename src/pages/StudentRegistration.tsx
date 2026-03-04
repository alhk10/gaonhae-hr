import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { MultiSelect } from '@/components/ui/multi-select';
import { toast } from 'sonner';
import { UserPlus, User, Mail, GraduationCap, Phone, MapPin, Heart, CheckCircle } from 'lucide-react';
import { useBranches } from '@/hooks/useBranches';
import { BELT_LEVELS } from '@/constants/beltLevels';
import { submitStudentRegistration } from '@/services/studentRegistrationService';

const commonNationalities = [
  'Afghan', 'Albanian', 'Algerian', 'American', 'Andorran', 'Angolan', 'Argentine', 'Armenian', 'Australian', 'Austrian',
  'Azerbaijani', 'Bahamian', 'Bahraini', 'Bangladeshi', 'Barbadian', 'Belarusian', 'Belgian', 'Belizean', 'Beninese', 'Bhutanese',
  'Bolivian', 'Bosnian', 'Botswanan', 'Brazilian', 'British', 'Bruneian', 'Bulgarian', 'Burkinabe', 'Burmese', 'Burundian',
  'Cambodian', 'Cameroonian', 'Canadian', 'Chilean', 'Chinese', 'Colombian', 'Croatian', 'Cuban', 'Czech', 'Danish',
  'Dutch', 'Ecuadorian', 'Egyptian', 'Emirati', 'Estonian', 'Ethiopian', 'Filipino', 'Finnish', 'French', 'Georgian',
  'German', 'Ghanaian', 'Greek', 'Hungarian', 'Icelandic', 'Indian', 'Indonesian', 'Iranian', 'Iraqi', 'Irish',
  'Israeli', 'Italian', 'Jamaican', 'Japanese', 'Jordanian', 'Kazakh', 'Kenyan', 'Korean (South)', 'Kuwaiti', 'Latvian',
  'Lebanese', 'Lithuanian', 'Malaysian', 'Maltese', 'Mexican', 'Mongolian', 'Moroccan', 'Nepalese', 'New Zealander',
  'Nigerian', 'Norwegian', 'Pakistani', 'Palestinian', 'Peruvian', 'Polish', 'Portuguese', 'Qatari', 'Romanian', 'Russian',
  'Saudi', 'Senegalese', 'Serbian', 'Singaporean', 'Slovak', 'Slovenian', 'South African', 'Spanish', 'Sri Lankan',
  'Swedish', 'Swiss', 'Syrian', 'Taiwanese', 'Thai', 'Turkish', 'Ukrainian', 'Uruguayan', 'Venezuelan', 'Vietnamese',
  'Zambian', 'Zimbabwean'
];

const commonLanguages = [
  'English', 'Mandarin', 'Malay', 'Tamil', 'Cantonese', 'Hokkien', 'Teochew',
  'Japanese', 'Korean', 'Thai', 'Vietnamese', 'Indonesian', 'Hindi', 'Bengali',
  'Tagalog', 'French', 'German', 'Spanish', 'Arabic', 'Russian'
];

const referralSourceOptions = [
  { value: 'family_friends', label: 'Family & Friends' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'google_search', label: 'Google Search' },
  { value: 'pass_by', label: 'Pass By' },
  { value: 'others', label: 'Others' }
];

const uppercaseFields = ['first_name', 'last_name', 'certificate_name', 'display_name', 'preferred_name', 'nric_passport', 'passport_no', 'address', 'emergency_contact_name', 'emergency_contact_2_name'];

const StudentRegistration = () => {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { branches } = useBranches();

  const [formData, setFormData] = useState({
    referral_source: '',
    first_name: '',
    last_name: '',
    preferred_name: '',
    certificate_name: '',
    display_name: '',
    date_of_birth: '',
    gender: '',
    nric_passport: '',
    passport_no: '',
    phone: '',
    whatsapp: '',
    email: '',
    address: '',
    postal_code: '',
    nationality: [] as string[],
    languages_spoken: [] as string[],
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relationship: '',
    emergency_contact_2_name: '',
    emergency_contact_2_phone: '',
    emergency_contact_2_relationship: '',
    current_belt: '',
    previous_experience: '',
    training_goals: '',
    medical_conditions: '',
    dietary_restrictions: '',
    branch_id: '',
    notes: ''
  });

  const handleInputChange = (field: string, value: string) => {
    const processedValue = uppercaseFields.includes(field) ? value.toUpperCase() : value;
    setFormData(prev => {
      const updated = { ...prev, [field]: processedValue };
      if (field === 'first_name' || field === 'last_name') {
        const firstName = field === 'first_name' ? processedValue : prev.first_name;
        const lastName = field === 'last_name' ? processedValue : prev.last_name;
        const fullName = `${firstName} ${lastName}`.trim();
        const currentAutoName = `${prev.first_name} ${prev.last_name}`.trim();
        if (!prev.certificate_name || prev.certificate_name === currentAutoName) updated.certificate_name = fullName;
        if (!prev.display_name || prev.display_name === currentAutoName) updated.display_name = fullName;
        if (!prev.preferred_name || prev.preferred_name === currentAutoName) updated.preferred_name = fullName;
      }
      if (field === 'phone' && (!prev.whatsapp || prev.whatsapp === prev.phone)) {
        updated.whatsapp = value;
      }
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.first_name || !formData.last_name) {
      toast.error('First name and last name are required');
      return;
    }
    if (!formData.email && !formData.phone) {
      toast.error('Either email or phone number is required');
      return;
    }
    if (!formData.branch_id) {
      toast.error('Please select a branch');
      return;
    }

    setLoading(true);
    try {
      await submitStudentRegistration({
        ...formData,
        gender: formData.gender || undefined,
        date_of_birth: formData.date_of_birth || undefined,
      });
      setSubmitted(true);
      toast.success('Registration submitted successfully!');
    } catch (error) {
      console.error('Registration error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to submit registration');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <CheckCircle className="w-16 h-16 text-primary mx-auto" />
            <h2 className="text-2xl font-bold text-foreground">Registration Submitted!</h2>
            <p className="text-muted-foreground">
              Thank you for registering. Your application is pending review and you will be contacted once it has been approved.
            </p>
            <Button onClick={() => { setSubmitted(false); setFormData({
              referral_source: '', first_name: '', last_name: '', preferred_name: '', certificate_name: '', display_name: '',
              date_of_birth: '', gender: '', nric_passport: '', passport_no: '', phone: '', whatsapp: '', email: '',
              address: '', postal_code: '', nationality: [], languages_spoken: [],
              emergency_contact_name: '', emergency_contact_phone: '', emergency_contact_relationship: '',
              emergency_contact_2_name: '', emergency_contact_2_phone: '', emergency_contact_2_relationship: '',
              current_belt: '', previous_experience: '', training_goals: '', medical_conditions: '', dietary_restrictions: '',
              branch_id: '', notes: ''
            }); }} variant="outline">
              Submit Another Registration
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <img src="/images/company-logo.jpg" alt="Logo" className="h-16 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-foreground">Student Registration</h1>
          <p className="text-muted-foreground mt-2">Fill out the form below to register as a new student</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Branch Selection */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><MapPin className="w-4 h-4" /> Branch *</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={formData.branch_id} onValueChange={(v) => handleInputChange('branch_id', v)}>
                <SelectTrigger><SelectValue placeholder="Select a branch" /></SelectTrigger>
                <SelectContent>
                  {branches.map(b => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Referral Source */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><User className="w-4 h-4" /> How did you hear about us?</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={formData.referral_source} onValueChange={(v) => handleInputChange('referral_source', v)}>
                <SelectTrigger><SelectValue placeholder="Select an option" /></SelectTrigger>
                <SelectContent>
                  {referralSourceOptions.map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Personal Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><User className="w-4 h-4" /> Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">First Name *</Label>
                  <Input value={formData.first_name} onChange={e => handleInputChange('first_name', e.target.value)} required />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Last Name *</Label>
                  <Input value={formData.last_name} onChange={e => handleInputChange('last_name', e.target.value)} required />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">Certificate Name</Label>
                  <Input value={formData.certificate_name} onChange={e => handleInputChange('certificate_name', e.target.value)} placeholder="Name for certificates" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Preferred Name</Label>
                  <Input value={formData.preferred_name} onChange={e => handleInputChange('preferred_name', e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">Gender</Label>
                  <Select value={formData.gender} onValueChange={v => handleInputChange('gender', v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Date of Birth</Label>
                  <Input type="date" value={formData.date_of_birth} onChange={e => handleInputChange('date_of_birth', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">NRIC/FIN</Label>
                  <Input value={formData.nric_passport} onChange={e => handleInputChange('nric_passport', e.target.value)} />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Passport No.</Label>
                <Input value={formData.passport_no} onChange={e => handleInputChange('passport_no', e.target.value)} />
              </div>
            </CardContent>
          </Card>

          {/* Contact */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><Phone className="w-4 h-4" /> Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">Phone</Label>
                  <Input value={formData.phone} onChange={e => handleInputChange('phone', e.target.value)} placeholder="+65 9123 4567" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">WhatsApp</Label>
                  <Input value={formData.whatsapp} onChange={e => handleInputChange('whatsapp', e.target.value)} placeholder="+65 9123 4567" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Email</Label>
                  <Input type="email" value={formData.email} onChange={e => handleInputChange('email', e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">Address</Label>
                  <Input value={formData.address} onChange={e => handleInputChange('address', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Postal Code</Label>
                  <Input value={formData.postal_code} onChange={e => handleInputChange('postal_code', e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Additional Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><GraduationCap className="w-4 h-4" /> Additional Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label className="text-xs">Nationality</Label>
                <MultiSelect
                  options={commonNationalities}
                  values={formData.nationality}
                  onValuesChange={v => setFormData(prev => ({ ...prev, nationality: v }))}
                  placeholder="Select nationality"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Languages Spoken</Label>
                <MultiSelect
                  options={commonLanguages}
                  values={formData.languages_spoken}
                  onValuesChange={v => setFormData(prev => ({ ...prev, languages_spoken: v }))}
                  placeholder="Select languages"
                />
              </div>
            </CardContent>
          </Card>

          {/* Emergency Contacts */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><Heart className="w-4 h-4" /> Emergency Contacts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground">Primary Contact</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">Name</Label>
                  <Input value={formData.emergency_contact_name} onChange={e => handleInputChange('emergency_contact_name', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Phone</Label>
                  <Input value={formData.emergency_contact_phone} onChange={e => handleInputChange('emergency_contact_phone', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Relationship</Label>
                  <Input value={formData.emergency_contact_relationship} onChange={e => handleInputChange('emergency_contact_relationship', e.target.value)} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Secondary Contact</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">Name</Label>
                  <Input value={formData.emergency_contact_2_name} onChange={e => handleInputChange('emergency_contact_2_name', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Phone</Label>
                  <Input value={formData.emergency_contact_2_phone} onChange={e => handleInputChange('emergency_contact_2_phone', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Relationship</Label>
                  <Input value={formData.emergency_contact_2_relationship} onChange={e => handleInputChange('emergency_contact_2_relationship', e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Training Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><GraduationCap className="w-4 h-4" /> Training Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label className="text-xs">Current Belt Level</Label>
                <Select value={formData.current_belt} onValueChange={v => handleInputChange('current_belt', v)}>
                  <SelectTrigger><SelectValue placeholder="Select belt level" /></SelectTrigger>
                  <SelectContent>
                    {BELT_LEVELS.map(b => (
                      <SelectItem key={b} value={b}>{b}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Previous Experience</Label>
                <Textarea value={formData.previous_experience} onChange={e => handleInputChange('previous_experience', e.target.value)} rows={2} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Training Goals</Label>
                <Textarea value={formData.training_goals} onChange={e => handleInputChange('training_goals', e.target.value)} rows={2} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Medical Conditions</Label>
                <Textarea value={formData.medical_conditions} onChange={e => handleInputChange('medical_conditions', e.target.value)} rows={2} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Dietary Restrictions</Label>
                <Input value={formData.dietary_restrictions} onChange={e => handleInputChange('dietary_restrictions', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Additional Notes</Label>
                <Textarea value={formData.notes} onChange={e => handleInputChange('notes', e.target.value)} rows={2} />
              </div>
            </CardContent>
          </Card>

          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? 'Submitting...' : 'Submit Registration'}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default StudentRegistration;
