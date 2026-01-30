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
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { getGradingSlots, updateGradingSlot, deleteGradingSlot, type GradingSlot } from '@/services/gradingService';
import AddGradingSlotDialog from '@/components/sales/AddGradingSlotDialog';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';
import { Plus, Calendar, Users, MapPin, Clock, Edit, Trash2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
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
  const [branches, setBranches] = useState<Array<{id: string, name: string}>>([]);
  const [deleteSlotId, setDeleteSlotId] = useState<string | null>(null);
  
  // Filters
  const [filterBranch, setFilterBranch] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, [filterBranch, filterStatus]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load branches
      const { data: branchData } = await supabase
        .from('branches')
        .select('id, name')
        .order('name');
      setBranches(branchData?.filter(b => !['Competition', 'Headquarters'].includes(b.name)) || []);

      // Load grading slots with filters
      const filters: any = {};
      if (filterBranch !== 'all') filters.branch_id = filterBranch;
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Active</Badge>;
      case 'cancelled':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Cancelled</Badge>;
      case 'completed':
        return <Badge className="bg-blue-100 text-blue-800"><AlertCircle className="w-3 h-3 mr-1" />Completed</Badge>;
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
          <AddGradingSlotDialog 
            trigger={
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Grading Slot
              </Button>
            }
            onSlotCreated={loadData}
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
                <Select value={filterBranch} onValueChange={setFilterBranch}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Branches" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Branches</SelectItem>
                    {branches.map(b => (
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
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Examiner</TableHead>
                    <TableHead>Belt Levels</TableHead>
                    <TableHead>Capacity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gradingSlots.map((slot) => (
                    <TableRow key={slot.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
                          {format(parseISO(slot.grading_date), 'dd MMM yyyy')}
                        </div>
                      </TableCell>
                      <TableCell>
                        {slot.start_time && slot.end_time ? (
                          <div className="flex items-center text-sm">
                            <Clock className="w-3 h-3 mr-1 text-muted-foreground" />
                            {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                          </div>
                        ) : '-'}
                      </TableCell>
                      <TableCell>{slot.branch_name}</TableCell>
                      <TableCell>
                        {slot.location ? (
                          <div className="flex items-center text-sm">
                            <MapPin className="w-3 h-3 mr-1 text-muted-foreground" />
                            {slot.location}
                          </div>
                        ) : '-'}
                      </TableCell>
                      <TableCell>{slot.examiner_name || '-'}</TableCell>
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
