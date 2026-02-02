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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { 
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

const InvoiceTemplateList: React.FC = () => {
  const [templates, setTemplates] = useState<InvoiceTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<InvoiceTemplate | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    country: 'SG',
    paynow_qr_url: '',
    default_notes: '',
    default_internal_notes: ''
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
        description: template.description || '',
        country: template.country || 'SG',
        paynow_qr_url: template.paynow_qr_url || '',
        default_notes: template.default_notes || '',
        default_internal_notes: template.default_internal_notes || ''
      });
    } else {
      setEditingTemplate(null);
      setFormData({
        name: '',
        description: '',
        country: 'SG',
        paynow_qr_url: '',
        default_notes: '',
        default_internal_notes: ''
      });
    }
    setDialogOpen(true);
  };

  const handleUploadQR = async (event: React.ChangeEvent<HTMLInputElement>) => {
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

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `qr-${Date.now()}.${fileExt}`;

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
      console.error('Error uploading QR code:', error);
      toast.error('Failed to upload QR code');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveQR = async () => {
    if (formData.paynow_qr_url) {
      // Extract filename from URL and delete from storage
      try {
        const urlParts = formData.paynow_qr_url.split('/');
        const fileName = urlParts[urlParts.length - 1];
        
        await supabase.storage
          .from('invoice-qr-codes')
          .remove([fileName]);
      } catch (error) {
        console.error('Error deleting QR code:', error);
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
          description: formData.description,
          country: formData.country,
          paynow_qr_url: formData.paynow_qr_url || undefined,
          default_notes: formData.default_notes,
          default_internal_notes: formData.default_internal_notes
        });
        toast.success('Template updated successfully');
      } else {
        await createInvoiceTemplate({
          name: formData.name,
          description: formData.description,
          country: formData.country,
          paynow_qr_url: formData.paynow_qr_url || undefined,
          default_notes: formData.default_notes,
          default_internal_notes: formData.default_internal_notes
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-SG');
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
                  <TableHead>Description</TableHead>
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
                    <TableCell className="text-muted-foreground">
                      {template.description || '-'}
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? 'Edit Template' : 'Create Template'}
            </DialogTitle>
            <DialogDescription>
              {editingTemplate 
                ? 'Update the template details below' 
                : 'Create a new invoice template with default settings'
              }
            </DialogDescription>
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
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Optional description for this template"
                rows={2}
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

            <div className="space-y-2">
              <Label>PayNow QR Code</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleUploadQR}
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
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
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
