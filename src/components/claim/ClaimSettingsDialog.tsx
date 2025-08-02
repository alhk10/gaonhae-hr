import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Settings, Plus, Edit, Trash2 } from 'lucide-react';
import { toast } from "@/components/ui/sonner";
import {
  getAllClaimTypes,
  createClaimType,
  updateClaimType,
  deleteClaimType,
  toggleClaimTypeStatus,
  ClaimType,
} from '@/services/claimTypesService';

interface ClaimSettingsDialogProps {
  onClaimTypesUpdated?: () => void;
}

const ClaimSettingsDialog: React.FC<ClaimSettingsDialogProps> = ({
  onClaimTypesUpdated,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [claimTypes, setClaimTypes] = useState<ClaimType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<ClaimType | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    limit_amount: '',
    co_pay: '0',
  });

  const loadClaimTypes = async () => {
    setIsLoading(true);
    try {
      const types = await getAllClaimTypes();
      setClaimTypes(types);
    } catch (error) {
      console.error('Error loading claim types:', error);
      toast.error('Failed to load claim types');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadClaimTypes();
    }
  }, [isOpen]);

  const handleCreateClaimType = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newClaimType = {
        name: formData.name,
        description: formData.description || null,
        limit_amount: formData.limit_amount ? parseFloat(formData.limit_amount) : null,
        co_pay: parseFloat(formData.co_pay),
        is_active: true,
      };

      await createClaimType(newClaimType);
      toast.success('Claim type created successfully');
      
      setFormData({ name: '', description: '', limit_amount: '', co_pay: '0' });
      setIsAddDialogOpen(false);
      await loadClaimTypes();
      onClaimTypesUpdated?.();
    } catch (error) {
      console.error('Error creating claim type:', error);
      toast.error('Failed to create claim type');
    }
  };

  const handleEditClaimType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingType) return;

    try {
      const updates = {
        name: formData.name,
        description: formData.description || null,
        limit_amount: formData.limit_amount ? parseFloat(formData.limit_amount) : null,
        co_pay: parseFloat(formData.co_pay),
      };

      await updateClaimType(editingType.id, updates);
      toast.success('Claim type updated successfully');
      
      setEditingType(null);
      setFormData({ name: '', description: '', limit_amount: '', co_pay: '0' });
      await loadClaimTypes();
      onClaimTypesUpdated?.();
    } catch (error) {
      console.error('Error updating claim type:', error);
      toast.error('Failed to update claim type');
    }
  };

  const handleToggleStatus = async (claimType: ClaimType) => {
    try {
      await toggleClaimTypeStatus(claimType.id);
      toast.success(`Claim type ${claimType.is_active ? 'deactivated' : 'activated'}`);
      await loadClaimTypes();
      onClaimTypesUpdated?.();
    } catch (error) {
      console.error('Error toggling claim type status:', error);
      toast.error('Failed to update claim type status');
    }
  };

  const handleDeleteClaimType = async (claimType: ClaimType) => {
    try {
      await deleteClaimType(claimType.id);
      toast.success('Claim type deleted successfully');
      await loadClaimTypes();
      onClaimTypesUpdated?.();
    } catch (error) {
      console.error('Error deleting claim type:', error);
      toast.error('Failed to delete claim type');
    }
  };

  const startEdit = (claimType: ClaimType) => {
    setEditingType(claimType);
    setFormData({
      name: claimType.name,
      description: claimType.description || '',
      limit_amount: claimType.limit_amount?.toString() || '',
      co_pay: claimType.co_pay.toString(),
    });
  };

  const resetForm = () => {
    setFormData({ name: '', description: '', limit_amount: '', co_pay: '0' });
    setEditingType(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Settings className="w-4 h-4 mr-2" />
          Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Claims Settings</DialogTitle>
          <DialogDescription>
            Manage claim types and their configurations
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Claim Types</h3>
            <Button
              onClick={() => {
                resetForm();
                setIsAddDialogOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Claim Type
            </Button>
          </div>

          {isLoading ? (
            <p>Loading claim types...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Limit Amount</TableHead>
                  <TableHead>Co-pay</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {claimTypes.map((claimType) => (
                  <TableRow key={claimType.id}>
                    <TableCell className="font-medium">{claimType.name}</TableCell>
                    <TableCell>{claimType.description || '-'}</TableCell>
                    <TableCell>
                      {claimType.limit_amount ? `S$${claimType.limit_amount}` : 'No limit'}
                    </TableCell>
                    <TableCell>S${claimType.co_pay}</TableCell>
                    <TableCell>
                      <Switch
                        checked={claimType.is_active}
                        onCheckedChange={() => handleToggleStatus(claimType)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => startEdit(claimType)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Claim Type</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{claimType.name}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteClaimType(claimType)}
                              >
                                Delete
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
          )}
        </div>

        {/* Add/Edit Dialog */}
        <Dialog open={isAddDialogOpen || !!editingType} onOpenChange={(open) => {
          if (!open) {
            setIsAddDialogOpen(false);
            setEditingType(null);
            resetForm();
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingType ? 'Edit Claim Type' : 'Add Claim Type'}
              </DialogTitle>
              <DialogDescription>
                {editingType 
                  ? 'Update the claim type details below.'
                  : 'Create a new claim type for employee reimbursements.'
                }
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={editingType ? handleEditClaimType : handleCreateClaimType}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Equipment, Medical, Transport"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Optional description of this claim type"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="limit_amount">Limit Amount (SGD)</Label>
                  <Input
                    id="limit_amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.limit_amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, limit_amount: e.target.value }))}
                    placeholder="Leave empty for no limit"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="co_pay">Co-pay (SGD)</Label>
                  <Input
                    id="co_pay"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.co_pay}
                    onChange={(e) => setFormData(prev => ({ ...prev, co_pay: e.target.value }))}
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsAddDialogOpen(false);
                    setEditingType(null);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingType ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
};

export default ClaimSettingsDialog;