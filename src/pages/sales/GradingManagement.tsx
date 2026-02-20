/**
 * Grading Management Page
 * Manage grading examination slots and student registrations
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { getGradingSlots, updateGradingSlot, deleteGradingSlot, type GradingSlot } from '@/services/gradingService';
import GradingSlotDialog from '@/components/sales/AddGradingSlotDialog';
import GradingListTab from '@/components/sales/GradingListTab';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';
import { Plus, Users, Trash2, CheckCircle, XCircle, AlertCircle, Pencil, Copy } from 'lucide-react';

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

const GradingManagement: React.FC = () => {
  const [gradingSlots, setGradingSlots] = useState<GradingSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<Array<{id: string, name: string, country: string | null}>>([]);
  const [deleteSlotId, setDeleteSlotId] = useState<string | null>(null);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [slotToDuplicate, setSlotToDuplicate] = useState<GradingSlot | null>(null);
  
  // Filters
  const [filterCountry, setFilterCountry] = useState<string>('all');
  const [filterBranch, setFilterBranch] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, [filterCountry, filterBranch, filterStatus]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load branches with country
      const { data: branchData } = await supabase
        .from('branches')
        .select('id, name, country')
        .order('name');
      setBranches(branchData?.filter(b => !['Competition', 'Headquarters'].includes(b.name)) || []);

      // Load grading slots with filters
      const filters: any = {};
      if (filterBranch !== 'all') {
        filters.branch_id = filterBranch;
      } else if (filterCountry !== 'all') {
        // Get branch IDs for the selected country
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

  const handleStatusChange = async (slotId: string, newStatus: 'active' | 'cancelled' | 'completed') => {
    try {
      await updateGradingSlot(slotId, { status: newStatus });
      toast.success('Status updated');
      loadData();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
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

  // Stats
  const upcomingCount = gradingSlots.filter(s => s.status === 'active' && new Date(s.grading_date) >= new Date()).length;
  const totalRegistrations = gradingSlots.reduce((sum, s) => sum + (s.registration_count || 0), 0);
  const completedCount = gradingSlots.filter(s => s.status === 'completed').length;

  return (
    <ResponsiveLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Grading Management</h1>
            <p className="text-muted-foreground">Schedule and manage grading examination slots</p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="slots" className="w-full">
          <TabsList>
            <TabsTrigger value="slots">Grading Slots</TabsTrigger>
            <TabsTrigger value="list">Grading List</TabsTrigger>
          </TabsList>

          <TabsContent value="slots" className="space-y-6 mt-6">
            {/* Add Button */}
            <div className="flex justify-end">
              <GradingSlotDialog 
                trigger={
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Grading Slot
                  </Button>
                }
                onSlotSaved={loadData}
              />
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Upcoming Gradings</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{upcomingCount}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Registrations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalRegistrations}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Completed Gradings</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{completedCount}</div>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle>Filters</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4">
                  <div className="w-48">
                    <Select value={filterCountry} onValueChange={(val) => { setFilterCountry(val); setFilterBranch('all'); }}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Countries" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Countries</SelectItem>
                        <SelectItem value="Singapore">🇸🇬 Singapore</SelectItem>
                        <SelectItem value="Australia">🇦🇺 Australia</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-48">
                    <Select value={filterBranch} onValueChange={setFilterBranch}>
                      <SelectTrigger>
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
                  </div>
                  <div className="w-48">
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger>
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
                </div>
              </CardContent>
            </Card>

            {/* Grading Slots Table */}
            <Card>
              <CardHeader>
                <CardTitle>Grading Slots</CardTitle>
                <CardDescription>
                  {gradingSlots.length} slot{gradingSlots.length !== 1 ? 's' : ''} found
                </CardDescription>
              </CardHeader>
              <CardContent>
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
                        <TableHead className="w-64">Title</TableHead>
                        <TableHead>Belt Levels</TableHead>
                        <TableHead>Capacity</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-24">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {gradingSlots.map((slot) => (
                        <TableRow key={slot.id}>
                          <TableCell className="font-medium w-64">
                            <span className="block whitespace-normal line-clamp-2" title={slot.title || '-'}>
                              {slot.title || '-'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {(slot.belt_levels || []).slice(0, 3).map(belt => (
                                <Badge key={belt} variant="outline" className="text-xs">
                                  {belt}
                                </Badge>
                              ))}
                              {(slot.belt_levels || []).length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{(slot.belt_levels || []).length - 3}
                                </Badge>
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
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Select 
                                value={slot.status}
                                onValueChange={(value) => handleStatusChange(slot.id, value as any)}
                              >
                                <SelectTrigger className="h-8 w-28">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="active">Active</SelectItem>
                                  <SelectItem value="completed">Completed</SelectItem>
                                  <SelectItem value="cancelled">Cancelled</SelectItem>
                                </SelectContent>
                              </Select>
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
