import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { MultiSelect } from '@/components/ui/multi-select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { UserPlus, User, Mail, GraduationCap, Phone, MapPin, Heart, CheckCircle, Shield, Eraser } from 'lucide-react';
import { useBranches } from '@/hooks/useBranches';
import { BELT_LEVELS } from '@/constants/beltLevels';
import { submitStudentRegistration } from '@/services/studentRegistrationService';
import { supabase } from '@/integrations/supabase/client';
import { commonNationalities, commonLanguages } from '@/constants/studentOptions';

// Nationalities and languages imported from shared constants

const referralSourceOptions = [
  { value: 'family_friends', label: 'Family & Friends' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'google_search', label: 'Google Search' },
  { value: 'pass_by', label: 'Pass By' },
  { value: 'others', label: 'Others' }
];

const uppercaseFields = ['first_name', 'last_name', 'certificate_name', 'display_name', 'preferred_name', 'address', 'emergency_contact_name', 'emergency_contact_2_name'];

const StudentRegistration = () => {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [policyAgreed, setPolicyAgreed] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
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

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    ctx.strokeStyle = 'hsl(var(--foreground))';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  useEffect(() => {
    initCanvas();
    window.addEventListener('resize', initCanvas);
    return () => window.removeEventListener('resize', initCanvas);
  }, [initCanvas]);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    isDrawingRef.current = true;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawingRef.current) return;
    e.preventDefault();
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const endDraw = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    const canvas = canvasRef.current;
    if (canvas) {
      setSignature(canvas.toDataURL('image/png'));
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignature(null);
  };

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
    if (!formData.email) {
      toast.error('Email is required');
      return;
    }
    if (!formData.gender) {
      toast.error('Gender is required');
      return;
    }
    if (!formData.date_of_birth) {
      toast.error('Date of birth is required');
      return;
    }
    if (!formData.branch_id) {
      toast.error('Please select a branch');
      return;
    }
    if (!policyAgreed) {
      toast.error('Please agree to the school policy');
      return;
    }
    if (!signature) {
      toast.error('Please provide your signature');
      return;
    }

    setLoading(true);
    try {
      // Upload signature to Supabase Storage
      let signatureUrl: string | undefined;
      if (signature) {
        const blob = await (await fetch(signature)).blob();
        const fileName = `sig_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.png`;
        const { error: uploadError } = await supabase.storage
          .from('student-signatures')
          .upload(fileName, blob, { contentType: 'image/png' });
        if (uploadError) throw new Error('Failed to upload signature');
        const { data: urlData } = supabase.storage
          .from('student-signatures')
          .getPublicUrl(fileName);
        signatureUrl = urlData.publicUrl;
      }

      await submitStudentRegistration({
        ...formData,
        gender: formData.gender || undefined,
        date_of_birth: formData.date_of_birth || undefined,
        signature_url: signatureUrl,
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
            <Button onClick={() => {
              setSubmitted(false);
              setPolicyAgreed(false);
              setSignature(null);
              setFormData({
                referral_source: '', first_name: '', last_name: '', preferred_name: '', certificate_name: '', display_name: '',
                date_of_birth: '', gender: '', phone: '', whatsapp: '', email: '',
                address: '', postal_code: '', nationality: [], languages_spoken: [],
                emergency_contact_name: '', emergency_contact_phone: '', emergency_contact_relationship: '',
                emergency_contact_2_name: '', emergency_contact_2_phone: '', emergency_contact_2_relationship: '',
                current_belt: '', previous_experience: '', training_goals: '', medical_conditions: '', dietary_restrictions: '',
                branch_id: '', notes: ''
              });
              setTimeout(() => {
                initCanvas();
              }, 100);
            }} variant="outline">
              Submit Another Registration
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-4 px-2 sm:py-8 sm:px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-4 sm:mb-8">
          <img src="/images/company-logo.jpg" alt="Logo" className="h-16 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-foreground">Student Registration</h1>
          <p className="text-muted-foreground mt-2">Fill out the form below to register as a new student</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-6">
          {/* Branch Selection */}
          <Card>
            <CardHeader className="p-3 pb-2 sm:p-6 sm:pb-3">
              <CardTitle className="text-base flex items-center gap-2"><MapPin className="w-4 h-4" /> Branch *</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
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
            <CardHeader className="p-3 pb-2 sm:p-6 sm:pb-3">
              <CardTitle className="text-base flex items-center gap-2"><User className="w-4 h-4" /> How did you hear about us?</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
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
            <CardHeader className="p-3 pb-2 sm:p-6 sm:pb-3">
              <CardTitle className="text-base flex items-center gap-2"><User className="w-4 h-4" /> Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0 space-y-3 sm:space-y-4">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">Gender *</Label>
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
                  <Label className="text-xs">Date of Birth *</Label>
                  <Input type="date" value={formData.date_of_birth} onChange={e => handleInputChange('date_of_birth', e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact */}
          <Card>
            <CardHeader className="p-3 pb-2 sm:p-6 sm:pb-3">
              <CardTitle className="text-base flex items-center gap-2"><Phone className="w-4 h-4" /> Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0 space-y-3 sm:space-y-4">
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
                  <Label className="text-xs">Email *</Label>
                  <Input type="email" value={formData.email} onChange={e => handleInputChange('email', e.target.value)} required />
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
            <CardHeader className="p-3 pb-2 sm:p-6 sm:pb-3">
              <CardTitle className="text-base flex items-center gap-2"><GraduationCap className="w-4 h-4" /> Additional Information</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0 space-y-3 sm:space-y-4">
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
            <CardHeader className="p-3 pb-2 sm:p-6 sm:pb-3">
              <CardTitle className="text-base flex items-center gap-2"><Heart className="w-4 h-4" /> Emergency Contacts</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0 space-y-3 sm:space-y-4">
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
            <CardHeader className="p-3 pb-2 sm:p-6 sm:pb-3">
              <CardTitle className="text-base flex items-center gap-2"><GraduationCap className="w-4 h-4" /> Training Information</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0 space-y-3 sm:space-y-4">
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

          {/* School Policy */}
          <Card>
            <CardHeader className="p-3 pb-2 sm:p-6 sm:pb-3">
              <CardTitle className="text-base flex items-center gap-2"><Shield className="w-4 h-4" /> Our School Policy</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0 space-y-3 sm:space-y-4">
              <div className="max-h-64 overflow-y-auto rounded-md border border-border bg-muted/30 p-3 sm:p-4 text-sm text-foreground space-y-3">
                <p>The school operates on a term-to-term basis. The school will be closed on Public Holidays. We may also be closed for Competitions, Gradings, and other Special Events.</p>
                <p>Class fees are chargeable on a per term or per lesson basis. Class fees are to be paid before the term commencement date. Makeup lessons must be completed within the same term. Any unused lessons beyond this period will be forfeited.</p>
                <p>Annual membership fees, which cover administration, affiliation, and insurance costs, which may be subject to change each year. The updated fee will be communicated to members prior to renewal.</p>
                <p>All fees paid are non-transferable and non-refundable. A school credit may be offered in some cases.</p>
                <p>Uniforms and accessories may be exchanged or returned within 7 days of purchase, provided they are clean and in saleable condition. Refunds for returns will be issued as school credits.</p>
                <p>The school requires students to wear the appropriate guards when practising kyorugi (sparring). Strictly no guards, no kyorugi (sparring).</p>
                <p>Gradings are made on personal ability and progressions. Students are graded according to Gaonhae Taekwondo Syllabus.</p>
                <p>Images and videos captured during training, demonstrations, or competitions are the exclusive property of Gaonhae Taekwondo and may be used for publicity, advertising, or journalism purposes.</p>
                <p>Personal information collected is used solely for purposes such as fulfilling service obligations, verifying identity, processing payments or credit transactions, and providing related requested services.</p>
                <p>Students registered with Gaonhae Taekwondo shall abide by the school rules and the rules of the governing sport authority. Students participate in classes and activities at their own risk and agree to indemnify Gaonhae Taekwondo against any loss, injury, damage, expense, or liability arising from such participation.</p>
                <p>While every effort is made to prevent accidents, students register with Gaonhae Taekwondo at their own risk. Gaonhae Taekwondo and its instructors are not liable for any accidents or injuries that may occur.</p>
              </div>

              <div className="flex items-start space-x-3 pt-2">
                <Checkbox
                  id="policy-agree"
                  checked={policyAgreed}
                  onCheckedChange={(checked) => setPolicyAgreed(checked === true)}
                />
                <label htmlFor="policy-agree" className="text-sm font-medium leading-tight cursor-pointer">
                  <span className="font-semibold">Acknowledgement & Agreement</span>
                  <br />
                  <span className="text-muted-foreground font-normal">I have read and understood the school policy, and I agree to comply with its terms.</span>
                </label>
              </div>

              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Signature *</Label>
                  <Button type="button" variant="ghost" size="sm" onClick={clearSignature} className="h-7 text-xs gap-1">
                    <Eraser className="w-3 h-3" /> Clear
                  </Button>
                </div>
                <div className="border-2 border-dashed border-border rounded-md bg-background">
                  <canvas
                    ref={canvasRef}
                    className="w-full h-32 cursor-crosshair touch-none"
                    onMouseDown={startDraw}
                    onMouseMove={draw}
                    onMouseUp={endDraw}
                    onMouseLeave={endDraw}
                    onTouchStart={startDraw}
                    onTouchMove={draw}
                    onTouchEnd={endDraw}
                  />
                </div>
                <p className="text-xs text-muted-foreground">Draw your signature above</p>
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
