/**
 * Grading Management Page
 * Manage grading examination slots and student registrations
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { getGradingSlots, updateGradingSlot, deleteGradingSlot, type GradingSlot } from '@/services/gradingService';
import GradingSlotDialog from '@/components/sales/AddGradingSlotDialog';
import BulkAddGradingSlotsDialog from '@/components/sales/BulkAddGradingSlotsDialog';
import GradingListTab from '@/components/sales/GradingListTab';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';
import { Plus, Users, Trash2, CheckCircle, XCircle, AlertCircle, Pencil, Copy, ChevronDown, Loader2 } from 'lucide-react';
import { BELT_LEVELS } from '@/constants/beltLevels';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface MassEditState {
  status: string;
  belt_levels: string[];
  available_branch_ids: string[];
  min_age: string;
  max_age: string;
}

const GradingManagement: React.FC = () => {
  const [gradingSlots, setGradingSlots] = useState<GradingSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<Array<{id: string, name: string, country: string | null}>>([]);
  const [deleteSlotId, setDeleteSlotId] = useState<string | null>(null);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [slotToDuplicate, setSlotToDuplicate] = useState<GradingSlot | null>(null);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [massEditOpen, setMassEditOpen] = useState(false);
  const [massEditSaving, setMassEditSaving] = useState(false);
  const [massEdit, setMassEdit] = useState<MassEditState>({
    status: '',
    belt_levels: [],
    available_branch_ids: [],
    min_age: '',
    max_age: '',
  });

  // Filters
  const [filterCountry, setFilterCountry] = useState<string>('all');
  const [filterBranch, setFilterBranch] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, [filterCountry, filterBranch, filterStatus]);

  // Clear selection when slots reload
  useEffect(() => {
    setSelectedIds(new Set());
  }, [gradingSlots.length]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: branchData } = await supabase
        .from('branches')
        .select('id, name, country')
        .order('name');
      setBranches(branchData?.filter(b => !['Competition', 'Headquarters'].includes(b.name)) || []);

      const filters: any = {};
      if (filterBranch !== 'all') {
        filters.branch_id = filterBranch;
      } else if (filterCountry !== 'all') {
        const countryBranches = branchData?.filter(b =>
          !['Competition', 'Headquarters'].includes(b.name) &&
          (b.country?.toLowerCase() === filterCountry.toLowerCase())
        ) || [];
        filters.branch_ids = countryBranches.map(b => b.id);
      }
      if (filterStatus !== 'all') filters.status = filterStatus;

      const slots = await getGradingSlots(filters);
      setGradingSlots(slots);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load grading data');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteSlotId) return;
    try {
      await deleteGradingSlot(deleteSlotId);
      toast.success('Grading slot deleted');
      setDeleteSlotId(null);
      loadData();
    } catch (error) {
      console.error('Error deleting slot:', error);
      toast.error('Failed to delete grading slot');
    }
  };

  const handleDuplicateClick = (slot: GradingSlot) => {
    setSlotToDuplicate(slot);
    setDuplicateDialogOpen(true);
  };

  // Selection helpers
  const allSelected = gradingSlots.length > 0 && selectedIds.size === gradingSlots.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(gradingSlots.map(s => s.id)));
    }
  };

  const toggleOne = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const openMassEdit = () => {
    setMassEdit({ status: '', belt_levels: [], available_branch_ids: [], min_age: '', max_age: '' });
    setMassEditOpen(true);
  };

  const handleMassEditSave = async () => {
    setMassEditSaving(true);
    let saved = 0;
    try {
      const updates: any = {};
      if (massEdit.status) updates.status = massEdit.status;
      if (massEdit.belt_levels.length > 0) updates.belt_levels = massEdit.belt_levels;
      if (massEdit.available_branch_ids.length > 0) updates.available_branch_ids = massEdit.available_branch_ids;
      if (massEdit.min_age !== '') updates.min_age = parseInt(massEdit.min_age);
      if (massEdit.max_age !== '') updates.max_age = parseInt(massEdit.max_age);

      if (Object.keys(updates).length === 0) {
        toast.error('No changes to apply');
        return;
      }

      for (const id of selectedIds) {
        await updateGradingSlot(id, updates);
        saved++;
      }
      toast.success(`Updated ${saved} slot${saved > 1 ? 's' : ''}`);
      setMassEditOpen(false);
      setSelectedIds(new Set());
      loadData();
    } catch (error) {
      console.error('Mass edit error:', error);
      toast.error(`Failed after updating ${saved} slots`);
    } finally {
      setMassEditSaving(false);
    }
  };

  const toggleMassEditBelt = (belt: string) => {
    setMassEdit(prev => ({
      ...prev,
      belt_levels: prev.belt_levels.includes(belt)
        ? prev.belt_levels.filter(b => b !== belt)
        : [...prev.belt_levels, belt],
    }));
  };

  const toggleMassEditBranch = (id: string) => {
    setMassEdit(prev => ({
      ...prev,
      available_branch_ids: prev.available_branch_ids.includes(id)
        ? prev.available_branch_ids.filter(b => b !== id)
        : [...prev.available_branch_ids, id],
    }));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="outline" className="border-green-600 text-green-700"><CheckCircle className="w-3 h-3 mr-1" />Active</Badge>;
      case 'cancelled':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Cancelled</Badge>;
      case 'completed':
        return <Badge variant="secondary"><AlertCircle className="w-3 h-3 mr-1" />Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const upcomingCount = gradingSlots.filter(s => s.status === 'active' && new Date(s.grading_date) >= new Date()).length;
  const totalRegistrations = gradingSlots.reduce((sum, s) => sum + (s.registration_count || 0), 0);
  const completedCount = gradingSlots.filter(s => s.status === 'completed').length;

  const availBranches = branches.filter(b => !['Competition', 'Headquarters'].includes(b.name));

  return (
    <ResponsiveLayout>
      <div className="space-y-3">
        <h1 className="text-xl font-bold">Grading Management</h1>

        <Tabs defaultValue="slots" className="w-full">
          <TabsList>
            <TabsTrigger value="slots">Grading Slots</TabsTrigger>
            <TabsTrigger value="list">Grading List</TabsTrigger>
          </TabsList>

          <TabsContent value="slots" className="space-y-3 mt-3">
            {/* Header row */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex flex-1 flex-wrap gap-2 min-w-0">
                <div className="flex items-center gap-1.5 bg-card border rounded-md px-3 py-2 text-sm">
                  <span className="text-muted-foreground">Upcoming</span>
                  <span className="font-bold">{upcomingCount}</span>
                </div>
                <div className="flex items-center gap-1.5 bg-card border rounded-md px-3 py-2 text-sm">
                  <span className="text-muted-foreground">Registrations</span>
                  <span className="font-bold">{totalRegistrations}</span>
                </div>
                <div className="flex items-center gap-1.5 bg-card border rounded-md px-3 py-2 text-sm">
                  <span className="text-muted-foreground">Completed</span>
                  <span className="font-bold">{completedCount}</span>
                </div>
              </div>
              <BulkAddGradingSlotsDialog
                trigger={
                  <Button size="sm">
                    <Plus className="w-4 h-4 mr-1" />
                    Grading Slot
                  </Button>
                }
                onSlotsSaved={loadData}
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2">
              <Select value={filterCountry} onValueChange={(val) => { setFilterCountry(val); setFilterBranch('all'); }}>
                <SelectTrigger className="h-9 w-36">
                  <SelectValue placeholder="All Countries" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Countries</SelectItem>
                  <SelectItem value="Singapore">🇸🇬 Singapore</SelectItem>
                  <SelectItem value="Australia">🇦🇺 Australia</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterBranch} onValueChange={setFilterBranch}>
                <SelectTrigger className="h-9 w-36">
                  <SelectValue placeholder="All Branches" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>
                  {(filterCountry === 'all'
                    ? branches
                    : branches.filter(b => b.country?.toLowerCase() === filterCountry.toLowerCase())
                  ).map(b => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-9 w-36">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Selection action bar */}
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-3 bg-primary/10 border border-primary/20 rounded-md px-3 py-2 text-sm">
                <span className="font-medium">{selectedIds.size} selected</span>
                <Button size="sm" variant="outline" onClick={openMassEdit}>
                  <Pencil className="w-3.5 h-3.5 mr-1" />
                  Edit Selected
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())} className="ml-auto text-muted-foreground">
                  Clear
                </Button>
              </div>
            )}

            {/* Table */}
            <Card>
              <CardContent className="p-0">
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading...</div>
                ) : gradingSlots.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No grading slots found. Create one to get started.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">
                          <Checkbox
                            checked={allSelected}
                            ref={(el) => { if (el) (el as any).indeterminate = someSelected; }}
                            onCheckedChange={toggleAll}
                            aria-label="Select all"
                          />
                        </TableHead>
                        <TableHead className="w-64">Title</TableHead>
                        <TableHead>Belt Levels</TableHead>
                        <TableHead>Capacity</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-20 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {gradingSlots.map((slot) => (
                        <TableRow key={slot.id} className={selectedIds.has(slot.id) ? 'bg-primary/5' : ''}>
                          <TableCell>
                            <Checkbox
                              checked={selectedIds.has(slot.id)}
                              onCheckedChange={() => toggleOne(slot.id)}
                              aria-label={`Select ${slot.title}`}
                            />
                          </TableCell>
                          <TableCell className="font-medium w-64">
                            <span className="block whitespace-normal line-clamp-2" title={slot.title || '-'}>
                              {slot.title || '-'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {(slot.belt_levels || []).slice(0, 3).map(belt => (
                                <Badge key={belt} variant="outline" className="text-xs">{belt}</Badge>
                              ))}
                              {(slot.belt_levels || []).length > 3 && (
                                <Badge variant="outline" className="text-xs">+{(slot.belt_levels || []).length - 3}</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <Users className="w-3 h-3 mr-1 text-muted-foreground" />
                              {slot.registration_count || 0}/{slot.max_capacity}
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(slot.status)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <GradingSlotDialog
                                trigger={
                                  <Button variant="ghost" size="icon" className="h-8 w-8" title="Edit slot">
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                }
                                editSlot={slot}
                                mode="edit"
                                onSlotSaved={loadData}
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                title="Duplicate slot"
                                onClick={() => handleDuplicateClick(slot)}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => setDeleteSlotId(slot.id)}
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
          </TabsContent>

          <TabsContent value="list" className="mt-6">
            <GradingListTab />
          </TabsContent>
        </Tabs>

        {/* Mass Edit Dialog */}
        <Dialog open={massEditOpen} onOpenChange={setMassEditOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit {selectedIds.size} Slot{selectedIds.size > 1 ? 's' : ''}</DialogTitle>
              <DialogDescription>Only filled fields will be applied to all selected slots.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              {/* Status */}
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={massEdit.status} onValueChange={v => setMassEdit(prev => ({ ...prev, status: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="No change" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Belt Levels */}
              <div className="space-y-2">
                <Label>Belt Levels <span className="text-xs text-muted-foreground">(replaces existing)</span></Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-between" type="button">
                      <span className="truncate text-sm">
                        {massEdit.belt_levels.length === 0 ? 'No change' : `${massEdit.belt_levels.length} selected`}
                      </span>
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-2 max-h-60 overflow-y-auto bg-popover border shadow-md z-50" align="start">
                    <div className="space-y-1">
                      {BELT_LEVELS.map(belt => (
                        <label key={belt} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer text-sm">
                          <Checkbox checked={massEdit.belt_levels.includes(belt)} onCheckedChange={() => toggleMassEditBelt(belt)} />
                          {belt}
                        </label>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Available Branches */}
              <div className="space-y-2">
                <Label>Available to Branches <span className="text-xs text-muted-foreground">(replaces existing)</span></Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-between" type="button">
                      <span className="truncate text-sm">
                        {massEdit.available_branch_ids.length === 0 ? 'No change' : `${massEdit.available_branch_ids.length} branch${massEdit.available_branch_ids.length > 1 ? 'es' : ''}`}
                      </span>
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-2 max-h-60 overflow-y-auto bg-popover border shadow-md z-50" align="start">
                    <div className="space-y-1">
                      {availBranches.map(branch => (
                        <label key={branch.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer text-sm">
                          <Checkbox checked={massEdit.available_branch_ids.includes(branch.id)} onCheckedChange={() => toggleMassEditBranch(branch.id)} />
                          {branch.name}
                        </label>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Age Range */}
              <div className="space-y-2">
                <Label>Age Range</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">Min Age</span>
                    <input
                      type="number"
                      min="0"
                      max="99"
                      value={massEdit.min_age}
                      onChange={e => setMassEdit(prev => ({ ...prev, min_age: e.target.value }))}
                      placeholder="No change"
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">Max Age</span>
                    <input
                      type="number"
                      min="0"
                      max="99"
                      value={massEdit.max_age}
                      onChange={e => setMassEdit(prev => ({ ...prev, max_age: e.target.value }))}
                      placeholder="No change"
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setMassEditOpen(false)} disabled={massEditSaving}>Cancel</Button>
              <Button onClick={handleMassEditSave} disabled={massEditSaving}>
                {massEditSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Apply to {selectedIds.size} Slot{selectedIds.size > 1 ? 's' : ''}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Duplicate Dialog */}
        <GradingSlotDialog
          trigger={<span />}
          duplicateSlot={slotToDuplicate}
          open={duplicateDialogOpen}
          onOpenChange={(val) => {
            setDuplicateDialogOpen(val);
            if (!val) setSlotToDuplicate(null);
          }}
          onSlotSaved={() => {
            setDuplicateDialogOpen(false);
            setSlotToDuplicate(null);
            loadData();
          }}
        />

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deleteSlotId} onOpenChange={() => setDeleteSlotId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Grading Slot?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this grading slot and all associated registrations. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </ResponsiveLayout>
  );
};

export default GradingManagement;
