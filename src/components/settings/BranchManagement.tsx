/**
 * Branch Management Component
 * Comprehensive branch management with CRUD operations for System Settings
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { 
  MapPin, 
  Plus, 
  Edit, 
  Trash2, 
  Building,
  Calendar,
  Palette,
  Save,
  X
} from 'lucide-react';
import { getBranches, saveBranch, updateBranch, deleteBranch, type Branch } from '@/services/settingsService';

const BranchManagement: React.FC = () => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    color: 'bg-blue-500'
  });

  const colorOptions = [
    { value: 'bg-blue-500', label: 'Blue', color: '#3b82f6' },
    { value: 'bg-red-500', label: 'Red', color: '#ef4444' },
    { value: 'bg-green-500', label: 'Green', color: '#22c55e' },
    { value: 'bg-yellow-500', label: 'Yellow', color: '#eab308' },
    { value: 'bg-purple-500', label: 'Purple', color: '#8b5cf6' },
    { value: 'bg-pink-500', label: 'Pink', color: '#ec4899' },
    { value: 'bg-indigo-500', label: 'Indigo', color: '#6366f1' },
    { value: 'bg-gray-500', label: 'Gray', color: '#6b7280' },
  ];

  useEffect(() => {
    loadBranches();
  }, []);

  const loadBranches = async () => {
    try {
      setLoading(true);
      const branchData = await getBranches();
      setBranches(branchData);
    } catch (error) {
      console.error('Error loading branches:', error);
      toast.error('Failed to load branches');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      address: '',
      color: 'bg-blue-500'
    });
  };

  const handleAddBranch = async () => {
    if (!formData.name.trim() || !formData.address.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      await saveBranch({
        name: formData.name.trim(),
        address: formData.address.trim(),
        color: formData.color
      });
      
      toast.success('Branch created successfully');
      resetForm();
      setIsAddDialogOpen(false);
      loadBranches();
    } catch (error) {
      console.error('Error creating branch:', error);
      toast.error('Failed to create branch');
    }
  };

  const handleEditBranch = (branch: Branch) => {
    setEditingBranch(branch);
    setFormData({
      name: branch.name,
      address: branch.address,
      color: branch.color || 'bg-blue-500'
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateBranch = async () => {
    if (!editingBranch || !formData.name.trim() || !formData.address.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      await updateBranch({
        ...editingBranch,
        name: formData.name.trim(),
        address: formData.address.trim(),
        color: formData.color
      });
      
      toast.success('Branch updated successfully');
      resetForm();
      setEditingBranch(null);
      setIsEditDialogOpen(false);
      loadBranches();
    } catch (error) {
      console.error('Error updating branch:', error);
      toast.error('Failed to update branch');
    }
  };

  const handleDeleteBranch = async (branchId: string, branchName: string) => {
    try {
      await deleteBranch(branchId);
      toast.success(`Branch "${branchName}" deleted successfully`);
      loadBranches();
    } catch (error) {
      console.error('Error deleting branch:', error);
      toast.error('Failed to delete branch');
    }
  };

  const getColorStyle = (colorClass: string) => {
    const colorOption = colorOptions.find(option => option.value === colorClass);
    return colorOption ? colorOption.color : '#6b7280';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            Loading branch data...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Branch Management
              </CardTitle>
              <CardDescription>
                Manage branch locations, settings, and configurations
              </CardDescription>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Add Branch
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Branch</DialogTitle>
                  <DialogDescription>
                    Create a new branch location with its settings
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="add-name">Branch Name *</Label>
                    <Input
                      id="add-name"
                      placeholder="e.g., Main Branch, North Branch"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="add-address">Address *</Label>
                    <Input
                      id="add-address"
                      placeholder="Enter branch address"
                      value={formData.address}
                      onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="add-color">Branch Color</Label>
                    <Select value={formData.color} onValueChange={(value) => setFormData(prev => ({ ...prev, color: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select color" />
                      </SelectTrigger>
                      <SelectContent>
                        {colorOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-4 h-4 rounded-full"
                                style={{ backgroundColor: option.color }}
                              />
                              {option.label}
                            </div>
                          </SelectItem>
                        ))}
                  </SelectContent>
                </Select>
              </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => {
                    resetForm();
                    setIsAddDialogOpen(false);
                  }}>
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button onClick={handleAddBranch}>
                    <Save className="h-4 w-4 mr-2" />
                    Create Branch
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
      </Card>

      {/* Branch Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Building className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{branches.length}</p>
                <p className="text-sm text-muted-foreground">Total Branches</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Palette className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-2xl font-bold">{new Set(branches.map(b => b.color)).size}</p>
                <p className="text-sm text-muted-foreground">Color Variants</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Branch List */}
      <Card>
        <CardHeader>
          <CardTitle>Branch Directory</CardTitle>
          <CardDescription>
            All branch locations and their configurations
          </CardDescription>
        </CardHeader>
        <CardContent>
          {branches.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No branches configured yet</p>
              <p className="text-sm">Add your first branch to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Branch</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Color</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {branches.map((branch) => (
                    <TableRow key={branch.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{branch.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{branch.address}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-4 h-4 rounded-full border"
                            style={{ backgroundColor: getColorStyle(branch.color || 'bg-gray-500') }}
                          />
                          <Badge variant="outline">
                            {colorOptions.find(c => c.value === branch.color)?.label || 'Gray'}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditBranch(branch)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Branch</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{branch.name}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  onClick={() => handleDeleteBranch(branch.id, branch.name)}
                                >
                                  Delete Branch
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Branch</DialogTitle>
            <DialogDescription>
              Update branch information and settings
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Branch Name *</Label>
              <Input
                id="edit-name"
                placeholder="e.g., Main Branch, North Branch"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="edit-address">Address *</Label>
              <Input
                id="edit-address"
                placeholder="Enter branch address"
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="edit-color">Branch Color</Label>
              <Select value={formData.color} onValueChange={(value) => setFormData(prev => ({ ...prev, color: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select color" />
                </SelectTrigger>
                <SelectContent>
                  {colorOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: option.color }}
                        />
                        {option.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              resetForm();
              setEditingBranch(null);
              setIsEditDialogOpen(false);
            }}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleUpdateBranch}>
              <Save className="h-4 w-4 mr-2" />
              Update Branch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BranchManagement;