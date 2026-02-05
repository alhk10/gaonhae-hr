import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RichTextarea } from '@/components/ui/rich-textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { letterTemplateService, LetterTemplate, CreateLetterTemplateData } from '@/services/letterTemplateService';
import { Upload, X } from 'lucide-react';

interface AddEditTemplateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  template?: LetterTemplate | null;
  onSaved: () => void;
}

const STUDENT_PLACEHOLDERS = [
  { key: '{fullName}', label: 'Full name' },
  { key: '{firstName}', label: 'First name' },
  { key: '{lastName}', label: 'Last name' },
  { key: '{dateOfBirth}', label: 'Date of birth' },
  { key: '{nricPassport}', label: 'NRIC/Passport' },
  { key: '{currentBelt}', label: 'Belt level' },
  { key: '{enrollmentDate}', label: 'Member since' },
];

const EMPLOYEE_PLACEHOLDERS = [
  { key: '{fullName}', label: 'Full name' },
  { key: '{dateOfBirth}', label: 'Date of birth' },
  { key: '{nric}', label: 'NRIC number' },
  { key: '{position}', label: 'Job position' },
  { key: '{salary}', label: 'Monthly salary' },
  { key: '{joinDate}', label: 'Start date' },
  { key: '{address}', label: 'Address' },
  { key: '{phone}', label: 'Contact number' },
];

const DEFAULT_FOOTER_TEXT = 'This letter is computer generated and does not require signature';

const AddEditTemplateDialog: React.FC<AddEditTemplateDialogProps> = ({
  isOpen,
  onClose,
  template,
  onSaved,
}) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<'student' | 'employee'>('student');
  const [title, setTitle] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [bodyText2, setBodyText2] = useState('');
  const [signatoryName, setSignatoryName] = useState('Gaonhae Taekwondo LLP');
  const [signatoryPosition, setSignatoryPosition] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [footerText, setFooterText] = useState(DEFAULT_FOOTER_TEXT);
  const [signatureImageUrl, setSignatureImageUrl] = useState('');
  const [addresseeName, setAddresseeName] = useState('{fullName}');
  const [address, setAddress] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [salutation, setSalutation] = useState('To Whom It May Concern');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const isEditing = !!template;

  useEffect(() => {
    if (isOpen) {
      if (template) {
        setName(template.name);
        setType(template.type);
        setTitle(template.title);
        setBodyText(template.body_text);
        setBodyText2(template.body_text_2 || '');
        setSignatoryName(template.signatory_name || 'Gaonhae Taekwondo LLP');
        setSignatoryPosition(template.signatory_position || '');
        setCompanyName(template.company_name || '');
        setFooterText(template.footer_text ?? '');
        setSignatureImageUrl(template.signature_image_url || '');
        setAddresseeName(template.addressee_name || '{fullName}');
        setAddress(template.address || '');
        setContactNumber(template.contact_number || '');
        setSalutation(template.salutation || 'To Whom It May Concern');
      } else {
        setName('');
        setType('student');
        setTitle('');
        setBodyText('');
        setBodyText2('');
        setSignatoryName('Gaonhae Taekwondo LLP');
        setSignatoryPosition('');
        setCompanyName('');
        setFooterText(DEFAULT_FOOTER_TEXT);
        setSignatureImageUrl('');
        setAddresseeName('{fullName}');
        setAddress('');
        setContactNumber('');
        setSalutation('To Whom It May Concern');
      }
    }
  }, [isOpen, template]);

  const handleSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be less than 2MB');
      return;
    }

    setIsUploading(true);
    try {
      const url = await letterTemplateService.uploadSignatureImage(file);
      setSignatureImageUrl(url);
      toast.success('Signature image uploaded');
    } catch (error) {
      console.error('Error uploading signature:', error);
      toast.error('Failed to upload signature image');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !title.trim() || !bodyText.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditing && template) {
        await letterTemplateService.updateTemplate(template.id, {
          name: name.trim(),
          title: title.trim(),
          body_text: bodyText.trim(),
          body_text_2: bodyText2.trim(),
          signatory_name: signatoryName.trim(),
          signatory_position: signatoryPosition.trim(),
          company_name: companyName.trim(),
          footer_text: footerText.trim(),
          signature_image_url: signatureImageUrl,
          addressee_name: addresseeName.trim(),
          address: address.trim(),
          contact_number: contactNumber.trim(),
          salutation: salutation.trim(),
        });
        toast.success('Template updated successfully');
      } else {
        const data: CreateLetterTemplateData = {
          name: name.trim(),
          type,
          title: title.trim(),
          body_text: bodyText.trim(),
          body_text_2: bodyText2.trim(),
          signatory_name: signatoryName.trim(),
          signatory_position: signatoryPosition.trim(),
          company_name: companyName.trim(),
          footer_text: footerText.trim(),
          signature_image_url: signatureImageUrl,
          addressee_name: addresseeName.trim(),
          address: address.trim(),
          contact_number: contactNumber.trim(),
          salutation: salutation.trim(),
        };
        await letterTemplateService.createTemplate(data);
        toast.success('Template created successfully');
      }
      onSaved();
      onClose();
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('Failed to save template');
    } finally {
      setIsSubmitting(false);
    }
  };

  const placeholders = type === 'student' ? STUDENT_PLACEHOLDERS : EMPLOYEE_PLACEHOLDERS;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Template' : 'Add New Template'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Template Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Promotion Letter"
                disabled={template?.is_default}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select
                value={type}
                onValueChange={(v) => setType(v as 'student' | 'employee')}
                disabled={isEditing}
              >
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="employee">Employee</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
            <p className="font-medium mb-2">Available placeholders:</p>
            <div className="grid grid-cols-2 gap-1 text-xs">
              {placeholders.map((p) => (
                <p key={p.key}>
                  <code className="bg-background px-1 rounded">{p.key}</code> - {p.label}
                </p>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="addresseeName">Addressee Name (Optional)</Label>
            <Input
              id="addresseeName"
              value={addresseeName}
              onChange={(e) => setAddresseeName(e.target.value)}
              placeholder="e.g., {fullName}"
            />
            <p className="text-xs text-muted-foreground">Default: {'{fullName}'} - will be replaced with recipient's name</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address (Optional)</Label>
            <Textarea
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g., {address} or enter a custom address"
              rows={3}
            />
            <p className="text-xs text-muted-foreground">Use {'{address}'} to extract from employee details</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactNumber">Contact Number (Optional)</Label>
            <Input
              id="contactNumber"
              value={contactNumber}
              onChange={(e) => setContactNumber(e.target.value)}
              placeholder="e.g., {phone} or enter a custom number"
            />
            <p className="text-xs text-muted-foreground">Use {'{phone}'} to extract from employee details</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="salutation">Salutation</Label>
            <Input
              id="salutation"
              value={salutation}
              onChange={(e) => setSalutation(e.target.value)}
              placeholder="e.g., To Whom It May Concern"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Letter Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., PROMOTION LETTER"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bodyText">Body Paragraph 1 *</Label>
            <RichTextarea
              id="bodyText"
              value={bodyText}
              onChange={(e) => setBodyText(e.target.value)}
              placeholder="Enter the main body text with placeholders..."
              rows={5}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bodyText2">Body Paragraph 2 (Optional)</Label>
            <RichTextarea
              id="bodyText2"
              value={bodyText2}
              onChange={(e) => setBodyText2(e.target.value)}
              placeholder="Enter additional body text..."
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label>Signature Image (Optional)</Label>
            <div className="flex items-center gap-4">
              {signatureImageUrl ? (
                <div className="relative">
                  <img
                    src={signatureImageUrl}
                    alt="Signature"
                    className="h-16 w-auto border rounded"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full"
                    onClick={() => setSignatureImageUrl('')}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <label className="flex items-center gap-2 px-4 py-2 border rounded-md cursor-pointer hover:bg-muted/50 transition-colors">
                  <Upload className="h-4 w-4" />
                  <span className="text-sm">
                    {isUploading ? 'Uploading...' : 'Upload Signature'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleSignatureUpload}
                    disabled={isUploading}
                  />
                </label>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Upload an image of the signature (max 2MB)
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="signatoryName">Signatory Name</Label>
              <Input
                id="signatoryName"
                value={signatoryName}
                onChange={(e) => setSignatoryName(e.target.value)}
                placeholder="e.g., Gaonhae Taekwondo LLP"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="signatoryPosition">Position</Label>
              <Input
                id="signatoryPosition"
                value={signatoryPosition}
                onChange={(e) => setSignatoryPosition(e.target.value)}
                placeholder="e.g., Director"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="companyName">Company Name</Label>
            <Input
              id="companyName"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g., Gaonhae Taekwondo LLP"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="footerText">Footer Text</Label>
            <Input
              id="footerText"
              value={footerText}
              onChange={(e) => setFooterText(e.target.value)}
              placeholder="e.g., This letter is computer generated..."
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || isUploading}>
              {isSubmitting ? 'Saving...' : isEditing ? 'Update Template' : 'Create Template'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddEditTemplateDialog;
