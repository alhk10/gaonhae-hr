import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Plus, Calendar, Edit, Trash2, GraduationCap, Clock, AlertCircle, X } from 'lucide-react';
import { format, parseISO, addDays } from 'date-fns';
import { useBranches } from '@/hooks/useBranches';
import {
  Term,
  TermBreak,
  getTerms,
  createTerm,
  updateTerm,
  deleteTerm,
  addTermBreak,
  deleteTermBreak,
  calculateTeachingWeeks,
  getTermYears,
  CreateTermData,
  CreateTermBreakData
} from '@/services/termCalendarService';

const TERM_NUMBERS = [
  { value: 1, label: 'Term 1' },
  { value: 2, label: 'Term 2' },
  { value: 3, label: 'Term 3' },
  { value: 4, label: 'Term 4' },
];

interface TermFormData {
  branch_id: string;
  year: string;
  term_number: string;
  name: string;
  start_date: string;
  end_date: string;
  grace_days: string;
  is_active: boolean;
}

interface BreakFormData {
  name: string;
  start_date: string;
  end_date: string;
  description: string;
}

const initialTermForm: TermFormData = {
  branch_id: '',
  year: new Date().getFullYear().toString(),
  term_number: '1',
  name: '',
  start_date: '',
  end_date: '',
  grace_days: '7',
  is_active: true,
};

const initialBreakForm: BreakFormData = {
  name: '',
  start_date: '',
  end_date: '',
  description: '',
};

export function TermCalendarManagement() {
  const { branches } = useBranches();
  const [terms, setTerms] = useState<Term[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Filters
  const [filterBranch, setFilterBranch] = useState<string>('all');
  const [filterYear, setFilterYear] = useState<string>('all');
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  
  // Term dialog
  const [termDialogOpen, setTermDialogOpen] = useState(false);
  const [editingTerm, setEditingTerm] = useState<Term | null>(null);
  const [termForm, setTermForm] = useState<TermFormData>(initialTermForm);
  const [tempBreaks, setTempBreaks] = useState<TermBreak[]>([]);
  
  // Break dialog
  const [breakDialogOpen, setBreakDialogOpen] = useState(false);
  const [breakForm, setBreakForm] = useState<BreakFormData>(initialBreakForm);

  useEffect(() => {
    loadTerms();
    loadYears();
  }, [filterBranch, filterYear]);

  const loadTerms = async () => {
    setLoading(true);
    try {
      const data = await getTerms(
        filterBranch !== 'all' ? filterBranch : undefined,
        filterYear !== 'all' ? parseInt(filterYear) : undefined
      );
      setTerms(data);
    } catch (error) {
      toast.error('Failed to load terms');
    } finally {
      setLoading(false);
    }
  };

  const loadYears = async () => {
    const years = await getTermYears();
    const currentYear = new Date().getFullYear();
    const allYears = [...new Set([...years, currentYear, currentYear + 1])].sort((a, b) => b - a);
    setAvailableYears(allYears);
  };

  const openAddDialog = () => {
    setEditingTerm(null);
    setTermForm(initialTermForm);
    setTempBreaks([]);
    setTermDialogOpen(true);
  };

  const openEditDialog = (term: Term) => {
    setEditingTerm(term);
    setTermForm({
      branch_id: term.branch_id,
      year: term.year?.toString() || new Date().getFullYear().toString(),
      term_number: term.term_number?.toString() || '1',
      name: term.name,
      start_date: term.start_date,
      end_date: term.end_date,
      grace_days: term.grace_days?.toString() || '7',
      is_active: term.is_active,
    });
    setTempBreaks(term.breaks || []);
    setTermDialogOpen(true);
  };

  const handleTermFormChange = (field: keyof TermFormData, value: string | boolean) => {
    setTermForm(prev => {
      const updated = { ...prev, [field]: value };
      
      // Auto-generate name when year or term_number changes
      if ((field === 'year' || field === 'term_number') && updated.year && updated.term_number) {
        const termLabel = TERM_NUMBERS.find(t => t.value === parseInt(updated.term_number))?.label || `Term ${updated.term_number}`;
        updated.name = `${termLabel} ${updated.year}`;
      }
      
      return updated;
    });
  };

  const handleSaveTerm = async () => {
    if (!termForm.branch_id || !termForm.start_date || !termForm.end_date) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      const teachingWeeks = calculateTeachingWeeks(termForm.start_date, termForm.end_date, tempBreaks);
      
      const termData: CreateTermData = {
        branch_id: termForm.branch_id,
        name: termForm.name || `Term ${termForm.term_number} ${termForm.year}`,
        start_date: termForm.start_date,
        end_date: termForm.end_date,
        year: parseInt(termForm.year),
        term_number: parseInt(termForm.term_number),
        grace_days: parseInt(termForm.grace_days) || 7,
        total_weeks: teachingWeeks,
        is_active: termForm.is_active,
      };

      if (editingTerm) {
        await updateTerm(editingTerm.id, termData);
        
        // Handle breaks: delete removed ones, add new ones
        const existingBreakIds = (editingTerm.breaks || []).map(b => b.id);
        const newBreakIds = tempBreaks.filter(b => b.id).map(b => b.id);
        
        // Delete removed breaks
        for (const breakId of existingBreakIds) {
          if (!newBreakIds.includes(breakId)) {
            await deleteTermBreak(breakId);
          }
        }
        
        // Add new breaks (those without IDs)
        for (const brk of tempBreaks) {
          if (!brk.id) {
            await addTermBreak({
              term_id: editingTerm.id,
              name: brk.name,
              start_date: brk.start_date,
              end_date: brk.end_date,
              description: brk.description,
            });
          }
        }
        
        toast.success('Term updated successfully');
      } else {
        const termId = await createTerm(termData);
        
        // Add breaks
        for (const brk of tempBreaks) {
          await addTermBreak({
            term_id: termId,
            name: brk.name,
            start_date: brk.start_date,
            end_date: brk.end_date,
            description: brk.description,
          });
        }
        
        toast.success('Term created successfully');
      }

      setTermDialogOpen(false);
      loadTerms();
      loadYears();
    } catch (error) {
      toast.error('Failed to save term');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTerm = async (termId: string) => {
    try {
      await deleteTerm(termId);
      toast.success('Term deleted successfully');
      loadTerms();
    } catch (error) {
      toast.error('Failed to delete term');
    }
  };

  const openBreakDialog = () => {
    setBreakForm(initialBreakForm);
    setBreakDialogOpen(true);
  };

  const handleAddBreak = () => {
    if (!breakForm.name || !breakForm.start_date || !breakForm.end_date) {
      toast.error('Please fill in all break fields');
      return;
    }
    
    const newBreak: TermBreak = {
      id: '', // Empty ID indicates new break
      term_id: editingTerm?.id || '',
      name: breakForm.name,
      start_date: breakForm.start_date,
      end_date: breakForm.end_date,
      description: breakForm.description,
    };
    
    setTempBreaks(prev => [...prev, newBreak]);
    setBreakDialogOpen(false);
  };

  const handleRemoveBreak = (index: number) => {
    setTempBreaks(prev => prev.filter((_, i) => i !== index));
  };

  const getTeachingWeeks = () => {
    if (!termForm.start_date || !termForm.end_date) return null;
    return calculateTeachingWeeks(termForm.start_date, termForm.end_date, tempBreaks);
  };

  const getValidityEndDate = () => {
    if (!termForm.end_date) return null;
    const graceDays = parseInt(termForm.grace_days) || 7;
    return addDays(parseISO(termForm.end_date), graceDays);
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'd MMM yyyy');
    } catch {
      return dateStr;
    }
  };

  const groupedTerms = terms.reduce((acc, term) => {
    const key = term.branch_id;
    if (!acc[key]) {
      acc[key] = { branch_name: term.branch_name || term.branch_id, terms: [] };
    }
    acc[key].terms.push(term);
    return acc;
  }, {} as Record<string, { branch_name: string; terms: Term[] }>);

  return (
    <div className="space-y-6">
      {/* Header with filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-wrap gap-3">
          <Select value={filterBranch} onValueChange={setFilterBranch}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Branches" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Branches</SelectItem>
              {branches.map(branch => (
                <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={filterYear} onValueChange={setFilterYear}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="All Years" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              {availableYears.map(year => (
                <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <Button onClick={openAddDialog}>
          <Plus className="w-4 h-4 mr-2" />
          Add Term
        </Button>
      </div>

      {/* Terms list */}
      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading terms...</div>
      ) : Object.keys(groupedTerms).length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <GraduationCap className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No terms configured yet.</p>
            <p className="text-sm">Click "Add Term" to create your first academic term.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedTerms).map(([branchId, { branch_name, terms: branchTerms }]) => (
            <Card key={branchId}>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  {branch_name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {branchTerms.map(term => {
                  const validityEnd = addDays(parseISO(term.end_date), term.grace_days || 7);
                  const isActive = term.is_active;
                  const isCurrent = new Date() >= parseISO(term.start_date) && new Date() <= validityEnd;
                  
                  return (
                    <div
                      key={term.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border bg-card gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{term.name}</span>
                          {isCurrent && <Badge variant="default" className="text-xs">Current</Badge>}
                          {!isActive && <Badge variant="secondary" className="text-xs">Inactive</Badge>}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {formatDate(term.start_date)} – {formatDate(term.end_date)}
                          <span className="mx-2">•</span>
                          {term.total_weeks || calculateTeachingWeeks(term.start_date, term.end_date, term.breaks)} weeks
                          <span className="mx-2">•</span>
                          Valid until: {format(validityEnd, 'd MMM yyyy')}
                        </div>
                        {term.breaks && term.breaks.length > 0 && (
                          <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <Clock className="w-3 h-3" />
                            Breaks: {term.breaks.map(b => b.name).join(', ')}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEditDialog(term)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Term</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{term.name}"? This will also remove all associated break periods.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteTerm(term.id)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Term Dialog */}
      <Dialog open={termDialogOpen} onOpenChange={setTermDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTerm ? 'Edit Term' : 'Add New Term'}</DialogTitle>
            <DialogDescription>
              Configure academic term dates and break periods for a branch.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Branch */}
            <div className="space-y-2">
              <Label htmlFor="branch">Branch *</Label>
              <Select value={termForm.branch_id} onValueChange={v => handleTermFormChange('branch_id', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select branch" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map(branch => (
                    <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Year and Term Number */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="year">Year *</Label>
                <Input
                  id="year"
                  type="number"
                  value={termForm.year}
                  onChange={e => handleTermFormChange('year', e.target.value)}
                  min={2020}
                  max={2100}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="term_number">Term *</Label>
                <Select value={termForm.term_number} onValueChange={v => handleTermFormChange('term_number', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TERM_NUMBERS.map(term => (
                      <SelectItem key={term.value} value={term.value.toString()}>{term.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Name (auto-generated but editable) */}
            <div className="space-y-2">
              <Label htmlFor="name">Term Name</Label>
              <Input
                id="name"
                value={termForm.name}
                onChange={e => handleTermFormChange('name', e.target.value)}
                placeholder="e.g., Term 1 2026"
              />
            </div>
            
            <Separator />
            
            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">Start Date *</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={termForm.start_date}
                  onChange={e => handleTermFormChange('start_date', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date">End Date *</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={termForm.end_date}
                  onChange={e => handleTermFormChange('end_date', e.target.value)}
                />
              </div>
            </div>
            
            {/* Grace Days */}
            <div className="space-y-2">
              <Label htmlFor="grace_days">Grace Days After Term End</Label>
              <Input
                id="grace_days"
                type="number"
                value={termForm.grace_days}
                onChange={e => handleTermFormChange('grace_days', e.target.value)}
                min={0}
                max={30}
              />
              <p className="text-xs text-muted-foreground">
                Lessons remain valid for this many days after the term ends.
              </p>
            </div>
            
            {/* Calculated info */}
            {getTeachingWeeks() !== null && (
              <div className="rounded-lg bg-muted p-3 text-sm space-y-1">
                <div className="flex justify-between">
                  <span>Teaching Weeks:</span>
                  <span className="font-medium">{getTeachingWeeks()} weeks</span>
                </div>
                {getValidityEndDate() && (
                  <div className="flex justify-between">
                    <span>Validity Ends:</span>
                    <span className="font-medium">{format(getValidityEndDate()!, 'd MMM yyyy')}</span>
                  </div>
                )}
              </div>
            )}
            
            <Separator />
            
            {/* Break Periods */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Break Periods</Label>
                <Button type="button" variant="outline" size="sm" onClick={openBreakDialog}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add Break
                </Button>
              </div>
              
              {tempBreaks.length === 0 ? (
                <p className="text-sm text-muted-foreground">No break periods configured.</p>
              ) : (
                <div className="space-y-2">
                  {tempBreaks.map((brk, index) => (
                    <div key={index} className="flex items-center justify-between p-2 rounded border bg-muted/50">
                      <div className="text-sm">
                        <span className="font-medium">{brk.name}</span>
                        <span className="text-muted-foreground ml-2">
                          {formatDate(brk.start_date)} – {formatDate(brk.end_date)}
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveBreak(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <Separator />
            
            {/* Active status */}
            <div className="flex items-center justify-between">
              <Label htmlFor="is_active">Active</Label>
              <Switch
                id="is_active"
                checked={termForm.is_active}
                onCheckedChange={v => handleTermFormChange('is_active', v)}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setTermDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveTerm} disabled={saving}>
              {saving ? 'Saving...' : editingTerm ? 'Save Changes' : 'Create Term'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Break Dialog */}
      <Dialog open={breakDialogOpen} onOpenChange={setBreakDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Break Period</DialogTitle>
            <DialogDescription>
              Add a break period within this term (e.g., mid-term break, holidays).
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="break_name">Break Name *</Label>
              <Input
                id="break_name"
                value={breakForm.name}
                onChange={e => setBreakForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Mid-term Break"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="break_start">Start Date *</Label>
                <Input
                  id="break_start"
                  type="date"
                  value={breakForm.start_date}
                  onChange={e => setBreakForm(prev => ({ ...prev, start_date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="break_end">End Date *</Label>
                <Input
                  id="break_end"
                  type="date"
                  value={breakForm.end_date}
                  onChange={e => setBreakForm(prev => ({ ...prev, end_date: e.target.value }))}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="break_description">Description</Label>
              <Input
                id="break_description"
                value={breakForm.description}
                onChange={e => setBreakForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Optional notes"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setBreakDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddBreak}>Add Break</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
