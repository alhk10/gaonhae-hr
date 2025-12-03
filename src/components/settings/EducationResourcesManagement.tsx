/**
 * Education & References Management Component
 * Allows superadmins to manage educational resources for employees
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Link, FileText, Upload, X, ExternalLink } from 'lucide-react';
import {
  EducationResource,
  getEducationResources,
  createEducationResource,
  updateEducationResource,
  deleteEducationResource,
  uploadEducationFile,
  deleteEducationFile
} from '@/services/educationResourcesService';
import { useAuth } from '@/contexts/AuthContext';

interface LinkItem {
  url: string;
  label: string;
}

interface FileItem {
  url: string;
  name: string;
}

const EducationResourcesManagement: React.FC = () => {
  const { user } = useAuth();
  const [resources, setResources] = useState<EducationResource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedResource, setSelectedResource] = useState<EducationResource | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkLabel, setNewLinkLabel] = useState('');

  useEffect(() => {
    fetchResources();
  }, []);

  const fetchResources = async () => {
    try {
      setIsLoading(true);
      const data = await getEducationResources();
      setResources(data);
    } catch (error) {
      console.error('Error fetching resources:', error);
      toast.error('Failed to load education resources');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setLinks([]);
    setFiles([]);
    setNewLinkUrl('');
    setNewLinkLabel('');
    setSelectedResource(null);
  };

  const handleOpenDialog = (resource?: EducationResource) => {
    if (resource) {
      setSelectedResource(resource);
      setTitle(resource.title);
      setDescription(resource.description || '');
      setLinks(resource.links || []);
      setFiles(resource.file_urls || []);
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    resetForm();
  };

  const handleAddLink = () => {
    if (!newLinkUrl.trim()) {
      toast.error('Please enter a URL');
      return;
    }
    
    let url = newLinkUrl.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    setLinks([...links, { url, label: newLinkLabel.trim() || url }]);
    setNewLinkUrl('');
    setNewLinkLabel('');
  };

  const handleRemoveLink = (index: number) => {
    setLinks(links.filter((_, i) => i !== index));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = e.target.files;
    if (!uploadedFiles?.length) return;

    try {
      for (const file of Array.from(uploadedFiles)) {
        const result = await uploadEducationFile(file);
        setFiles(prev => [...prev, result]);
      }
      toast.success('File uploaded successfully');
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Failed to upload file');
    }

    e.target.value = '';
  };

  const handleRemoveFile = async (index: number) => {
    const file = files[index];
    try {
      await deleteEducationFile(file.url);
      setFiles(files.filter((_, i) => i !== index));
    } catch (error) {
      console.error('Error removing file:', error);
      setFiles(files.filter((_, i) => i !== index));
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('Please enter a title');
      return;
    }

    setIsSaving(true);
    try {
      if (selectedResource) {
        await updateEducationResource(selectedResource.id, {
          title: title.trim(),
          description: description.trim() || undefined,
          links,
          file_urls: files
        });
        toast.success('Resource updated successfully');
      } else {
        await createEducationResource({
          title: title.trim(),
          description: description.trim() || undefined,
          links,
          file_urls: files
        }, user?.email);
        toast.success('Resource created successfully');
      }
      
      handleCloseDialog();
      fetchResources();
    } catch (error) {
      console.error('Error saving resource:', error);
      toast.error('Failed to save resource');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (resource: EducationResource) => {
    try {
      await updateEducationResource(resource.id, { is_active: !resource.is_active });
      toast.success(`Resource ${resource.is_active ? 'deactivated' : 'activated'}`);
      fetchResources();
    } catch (error) {
      console.error('Error toggling resource:', error);
      toast.error('Failed to update resource');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedResource) return;

    try {
      // Delete associated files
      for (const file of selectedResource.file_urls) {
        await deleteEducationFile(file.url);
      }
      
      await deleteEducationResource(selectedResource.id);
      toast.success('Resource deleted successfully');
      setIsDeleteDialogOpen(false);
      setSelectedResource(null);
      fetchResources();
    } catch (error) {
      console.error('Error deleting resource:', error);
      toast.error('Failed to delete resource');
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">Loading resources...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Education & References</CardTitle>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Resource
          </Button>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Manage educational resources and references for employees to use when planning lessons.
          </p>

          {resources.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No resources added yet. Click "Add Resource" to create one.
            </div>
          ) : (
            <div className="space-y-4">
              {resources.map((resource) => (
                <Card key={resource.id} className={!resource.is_active ? 'opacity-60' : ''}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold truncate">{resource.title}</h3>
                          {!resource.is_active && (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                        </div>
                        
                        {resource.description && (
                          <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                            {resource.description}
                          </p>
                        )}

                        <div className="flex flex-wrap gap-2 mt-2">
                          {resource.links.map((link, i) => (
                            <a
                              key={i}
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-1 rounded hover:bg-primary/20 transition-colors"
                            >
                              <Link className="h-3 w-3" />
                              {link.label}
                            </a>
                          ))}
                          {resource.file_urls.map((file, i) => (
                            <a
                              key={i}
                              href={file.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded hover:bg-secondary/80 transition-colors"
                            >
                              <FileText className="h-3 w-3" />
                              {file.name}
                            </a>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Switch
                          checked={resource.is_active}
                          onCheckedChange={() => handleToggleActive(resource)}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(resource)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedResource(resource);
                            setIsDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedResource ? 'Edit Resource' : 'Add New Resource'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Lesson Planning Guidelines"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of this resource..."
                rows={3}
              />
            </div>

            {/* Links Section */}
            <div className="space-y-2">
              <Label>Links</Label>
              <div className="flex gap-2">
                <Input
                  value={newLinkUrl}
                  onChange={(e) => setNewLinkUrl(e.target.value)}
                  placeholder="URL"
                  className="flex-1"
                />
                <Input
                  value={newLinkLabel}
                  onChange={(e) => setNewLinkLabel(e.target.value)}
                  placeholder="Label (optional)"
                  className="w-40"
                />
                <Button type="button" variant="secondary" onClick={handleAddLink}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              {links.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {links.map((link, index) => (
                    <div
                      key={index}
                      className="inline-flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded text-sm"
                    >
                      <Link className="h-3 w-3" />
                      <span className="max-w-[200px] truncate">{link.label}</span>
                      <button
                        onClick={() => handleRemoveLink(index)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Files Section */}
            <div className="space-y-2">
              <Label>Files</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  onChange={handleFileUpload}
                  multiple
                  className="flex-1"
                />
                <Button type="button" variant="secondary" asChild>
                  <label className="cursor-pointer">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload
                    <input
                      type="file"
                      onChange={handleFileUpload}
                      multiple
                      className="hidden"
                    />
                  </label>
                </Button>
              </div>

              {files.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {files.map((file, index) => (
                    <div
                      key={index}
                      className="inline-flex items-center gap-1 bg-secondary text-secondary-foreground px-2 py-1 rounded text-sm"
                    >
                      <FileText className="h-3 w-3" />
                      <span className="max-w-[200px] truncate">{file.name}</span>
                      <a
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-primary"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                      <button
                        onClick={() => handleRemoveFile(index)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : selectedResource ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Resource</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedResource?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default EducationResourcesManagement;
