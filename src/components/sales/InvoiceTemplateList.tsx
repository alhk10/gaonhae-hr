/**
 * Invoice Template List Component
 * Manages invoice templates with country and PayNow QR support
 */

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { 
import { formatDate } from '@/utils/dateFormat';
  getInvoiceTemplates, 
  createInvoiceTemplate, 
  updateInvoiceTemplate,
  deleteInvoiceTemplate,
  type InvoiceTemplate 
} from '@/services/invoiceTemplateService';
import { Plus, Edit, Trash2, FileText, Loader2, Upload, X, QrCode } from 'lucide-react';

const COUNTRY_OPTIONS = [
  { value: 'SG', label: 'Singapore' },
  { value: 'AU', label: 'Australia' }
];

type UploadType = 'qr';

const InvoiceTemplateList: React.FC = () => {
  const [templates, setTemplates] = useState<InvoiceTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingType, setUploadingType] = useState<UploadType | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<InvoiceTemplate | null>(null);
  const qrFileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    name: '',
    country: 'SG',
    paynow_qr_url: '',
    letterhead_url: '',
    bank_transfer_info: '',
    default_notes: '',
    default_internal_notes: '',
    footer_text: ''
  });

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const data = await getInvoiceTemplates(false);
      setTemplates(data);
    } catch (error) {
      console.error('Error loading templates:', error);
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (template?: InvoiceTemplate) => {
    if (template) {
      setEditingTemplate(template);
      setFormData({
        name: template.name,
        country: template.country || 'SG',
        paynow_qr_url: template.paynow_qr_url || '',
        letterhead_url: template.letterhead_url || '',
        bank_transfer_info: template.bank_transfer_info || '',
        default_notes: template.default_notes || '',
        default_internal_notes: template.default_internal_notes || '',
        footer_text: template.footer_text || ''
      });
    } else {
      setEditingTemplate(null);
      setFormData({
        name: '',
        country: 'SG',
        paynow_qr_url: '',
        letterhead_url: '',
        bank_transfer_info: '',
        default_notes: '',
        default_internal_notes: '',
        footer_text: ''
      });
    }
    setDialogOpen(true);
  };

  const handleUploadImage = async (event: React.ChangeEvent<HTMLInputElement>, type: UploadType) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be less than 2MB');
      return;
    }

    setUploadingType(type);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${type}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('invoice-qr-codes')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('invoice-qr-codes')
        .getPublicUrl(fileName);

      setFormData(prev => ({ ...prev, paynow_qr_url: publicUrl }));
      toast.success('QR code uploaded successfully');
    } catch (error) {
      console.error(`Error uploading ${type}:`, error);
      toast.error(`Failed to upload ${type}`);
    } finally {
      setUploadingType(null);
      if (qrFileInputRef.current) qrFileInputRef.current.value = '';
    }
  };

  const handleRemoveQR = async () => {
    const url = formData.paynow_qr_url;
    if (url) {
      try {
        const urlParts = url.split('/');
        const fileName = urlParts[urlParts.length - 1];
        
        await supabase.storage
          .from('invoice-qr-codes')
          .remove([fileName]);
      } catch (error) {
        console.error('Error deleting QR:', error);
      }
    }
    setFormData(prev => ({ ...prev, paynow_qr_url: '' }));
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Template name is required');
      return;
    }

    setSaving(true);
    try {
      if (editingTemplate) {
        await updateInvoiceTemplate(editingTemplate.id, {
          name: formData.name,
          country: formData.country,
          paynow_qr_url: formData.paynow_qr_url || undefined,
          letterhead_url: formData.letterhead_url || undefined,
          bank_transfer_info: formData.bank_transfer_info || undefined,
          default_notes: formData.default_notes,
          default_internal_notes: formData.default_internal_notes,
          footer_text: formData.footer_text
        });
        toast.success('Template updated successfully');
      } else {
        await createInvoiceTemplate({
          name: formData.name,
          country: formData.country,
          paynow_qr_url: formData.paynow_qr_url || undefined,
          letterhead_url: formData.letterhead_url || undefined,
          bank_transfer_info: formData.bank_transfer_info || undefined,
          default_notes: formData.default_notes,
          default_internal_notes: formData.default_internal_notes,
          footer_text: formData.footer_text
        });
        toast.success('Template created successfully');
      }
      setDialogOpen(false);
      loadTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (template: InvoiceTemplate) => {
    if (!confirm(`Are you sure you want to delete the template "${template.name}"?`)) return;

    try {
      await deleteInvoiceTemplate(template.id);
      toast.success('Template deleted');
      loadTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Failed to delete template');
    }
  };

  const formatDate = (dateString: string) => {formatDate(
    return new Date(dateString));
  };

  const getCountryLabel = (code?: string) => {
    return COUNTRY_OPTIONS.find(c => c.value === code)?.label || code || '-';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Invoice Templates</h2>
          <p className="text-muted-foreground">
            Create and manage reusable invoice templates
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="w-4 h-4 mr-2" />
          Create Template
        </Button>
      </div>

      {/* Templates Table */}
      <Card>
        <CardHeader>
          <CardTitle>Templates</CardTitle>
          <CardDescription>
            {templates.length} template(s) available
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-12 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No templates found</h3>
              <p className="text-muted-foreground mb-4">
                Create your first invoice template to streamline invoice creation
              </p>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="w-4 h-4 mr-2" />
                Create First Template
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {template.name}
                        {template.paynow_qr_url && (
                          <span title="Has PayNow QR">
                            <QrCode className="h-4 w-4 text-muted-foreground" />
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getCountryLabel(template.country)}</TableCell>
                    <TableCell>
                      <Badge variant={template.is_active ? 'default' : 'secondary'}>
                        {template.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(template.created_at)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="Edit Template"
                          onClick={() => handleOpenDialog(template)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          title="Delete Template"
                          onClick={() => handleDelete(template)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? 'Edit Template' : 'Create Template'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Template Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Standard Monthly Invoice"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Select
                value={formData.country}
                onValueChange={(value) => setFormData(prev => ({ ...prev, country: value }))}
              >
                <SelectTrigger id="country">
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Country Letterhead */}
            <div className="space-y-2">
              <Label htmlFor="letterhead_url">Country Letterhead</Label>
              <Textarea
                id="letterhead_url"
                value={formData.letterhead_url}
                onChange={(e) => setFormData(prev => ({ ...prev, letterhead_url: e.target.value }))}
                placeholder={`COMPANY NAME | UEN\nAddress Line\nWebsite | Email`}
                rows={3}
              />
              {formData.country === 'SG' && !formData.letterhead_url && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setFormData(prev => ({
                    ...prev,
                    letterhead_url: 'GAONHAE TAEKWONDO | T18LL1687K\n271 Bukit Timah Road #02-08 Singapore 259708\nwww.gaonhaetaekwondo.com | gaonhaetaekwondo@gmail.com'
                  }))}
                >
                  Use Singapore Default
                </Button>
              )}
            </div>

            {/* Bank Transfer Information */}
            <div className="space-y-2">
              <Label htmlFor="bank_transfer_info">Bank Transfer Information</Label>
              <Textarea
                id="bank_transfer_info"
                value={formData.bank_transfer_info}
                onChange={(e) => setFormData(prev => ({ ...prev, bank_transfer_info: e.target.value }))}
                placeholder={`Bank: DBS Bank\nAccount Name: Company Name\nAccount Number: 123-456789-0\nSwift Code: DBSSSGSG`}
                rows={4}
              />
            </div>

            {/* PayNow QR Code Upload */}
            <div className="space-y-2">
              <Label>PayNow QR Code</Label>
              <input
                ref={qrFileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleUploadImage(e, 'qr')}
              />
              {formData.paynow_qr_url ? (
                <div className="flex items-center gap-4 p-3 border rounded-md">
                  <img
                    src={formData.paynow_qr_url}
                    alt="PayNow QR Code"
                    className="w-20 h-20 object-contain border rounded"
                  />
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">QR code uploaded</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handleRemoveQR}
                    className="text-destructive hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => qrFileInputRef.current?.click()}
                  disabled={uploadingType === 'qr'}
                >
                  {uploadingType === 'qr' ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload QR Code
                    </>
                  )}
                </Button>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Default Notes (visible to customer)</Label>
              <Textarea
                id="notes"
                value={formData.default_notes}
                onChange={(e) => setFormData(prev => ({ ...prev, default_notes: e.target.value }))}
                placeholder="Default notes to include on invoices"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="internal_notes">Default Internal Notes</Label>
              <Textarea
                id="internal_notes"
                value={formData.default_internal_notes}
                onChange={(e) => setFormData(prev => ({ ...prev, default_internal_notes: e.target.value }))}
                placeholder="Internal notes (not visible to customers)"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="footer_text">Footer</Label>
              <Textarea
                id="footer_text"
                value={formData.footer_text}
                onChange={(e) => setFormData(prev => ({ ...prev, footer_text: e.target.value }))}
                placeholder="Footer text to display at the bottom of invoices"
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingTemplate ? 'Update Template' : 'Create Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InvoiceTemplateList;
