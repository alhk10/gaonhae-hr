
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Plus, Edit, Trash2, Gift, Copy } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { format } from 'date-fns';
import {
  getPublicHolidays,
  addPublicHoliday,
  updatePublicHoliday,
  deletePublicHoliday,
  copyHolidaysToYear,
  PublicHoliday
} from '@/services/publicHolidayService';

const PublicHolidayManagement = () => {
  const [holidays, setHolidays] = useState<PublicHoliday[]>([]);
  const [isAddHolidayOpen, setIsAddHolidayOpen] = useState(false);
  const [isEditHolidayOpen, setIsEditHolidayOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<PublicHoliday | null>(null);
  const [loading, setLoading] = useState(true);
  const [copying, setCopying] = useState(false);

  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);

  // Derive available years from data + ensure current year is always shown
  const availableYears = Array.from(
    new Set([...holidays.map(h => h.year), currentYear, currentYear - 1, currentYear + 1])
  ).sort((a, b) => a - b);

  const filteredHolidays = holidays.filter(h => h.year === selectedYear);
  const mondayHolidays = filteredHolidays.filter(h => h.is_monday_holiday);

  useEffect(() => {
    loadHolidays();
  }, []);

  const loadHolidays = async () => {
    try {
      setLoading(true);
      const holidayData = await getPublicHolidays();
      setHolidays(holidayData);
    } catch (error) {
      console.error('Error loading holidays:', error);
      toast.error("Error loading public holidays");
    } finally {
      setLoading(false);
    }
  };

  const handleAddHoliday = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    
    try {
      const newHoliday = await addPublicHoliday({
        name: formData.get('name') as string,
        date: formData.get('date') as string
      });
      
      setHolidays(prev => [...prev, newHoliday].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
      setIsAddHolidayOpen(false);
      
      if (newHoliday.is_monday_holiday) {
        toast.success(`Holiday added successfully! Bonus leave day granted to all employees (Monday holiday).`);
      } else {
        toast.success("Holiday added successfully");
      }
    } catch (error) {
      console.error('Error adding holiday:', error);
      toast.error("Error adding holiday");
    }
  };

  const handleEditHoliday = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingHoliday) return;

    const formData = new FormData(e.target as HTMLFormElement);
    
    try {
      const updatedHoliday = await updatePublicHoliday({
        ...editingHoliday,
        name: formData.get('name') as string,
        date: formData.get('date') as string
      });
      
      setHolidays(prev => prev.map(holiday => 
        holiday.id === editingHoliday.id ? updatedHoliday : holiday
      ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
      
      setIsEditHolidayOpen(false);
      setEditingHoliday(null);
      
      if (updatedHoliday.is_monday_holiday && !editingHoliday.is_monday_holiday) {
        toast.success("Holiday updated successfully! Bonus leave day granted to all employees (now a Monday holiday).");
      } else {
        toast.success("Holiday updated successfully");
      }
    } catch (error) {
      console.error('Error updating holiday:', error);
      toast.error("Error updating holiday");
    }
  };

  const handleDeleteHoliday = async (holidayId: string, holidayName: string) => {
    try {
      await deletePublicHoliday(holidayId);
      setHolidays(prev => prev.filter(holiday => holiday.id !== holidayId));
      toast.success(`Holiday "${holidayName}" deleted successfully`);
    } catch (error) {
      console.error('Error deleting holiday:', error);
      toast.error("Error deleting holiday");
    }
  };

  const handleCopyToNextYear = async () => {
    const targetYear = selectedYear + 1;
    try {
      setCopying(true);
      const count = await copyHolidaysToYear(selectedYear, targetYear);
      if (count === 0) {
        toast.info(`No new holidays to copy. ${targetYear} already has all holidays from ${selectedYear}.`);
      } else {
        toast.success(`Copied ${count} holiday(s) to ${targetYear}. Please review dates for holidays that shift annually.`);
        await loadHolidays();
        setSelectedYear(targetYear);
      }
    } catch (error) {
      console.error('Error copying holidays:', error);
      toast.error("Error copying holidays to next year");
    } finally {
      setCopying(false);
    }
  };

  const openEditHoliday = (holiday: PublicHoliday) => {
    setEditingHoliday(holiday);
    setIsEditHolidayOpen(true);
  };

  const getDayOfWeek = (dateString: string) => {
    return format(new Date(dateString), 'EEEE');
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="w-5 h-5" />
            <span>Public Holiday Management</span>
          </CardTitle>
          <CardDescription>Configure public holidays and manage Monday holiday leave bonuses</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="w-5 h-5" />
              <span>Public Holiday Management</span>
            </CardTitle>
            <CardDescription>
              Configure public holidays and manage Monday holiday leave bonuses
              <br />
              <span className="text-sm text-green-600 font-medium">
                Monday holidays automatically grant +1 annual leave day to all employees
              </span>
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map(y => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleCopyToNextYear} disabled={copying || filteredHolidays.length === 0}>
              <Copy className="w-4 h-4 mr-2" />
              {copying ? 'Copying...' : `Copy to ${selectedYear + 1}`}
            </Button>
            <Dialog open={isAddHolidayOpen} onOpenChange={setIsAddHolidayOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Holiday
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Add Public Holiday</DialogTitle>
                  <DialogDescription>Add a new public holiday to the system.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddHoliday}>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="name">Holiday Name</Label>
                      <Input name="name" placeholder="e.g., New Year's Day" required />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="date">Date</Label>
                      <Input name="date" type="date" required />
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Note: If this holiday falls on a Monday, all employees will automatically receive +1 annual leave day.
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsAddHolidayOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">Add Holiday</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">Total Holidays {selectedYear}</span>
              </div>
              <p className="text-2xl font-bold text-blue-900">{filteredHolidays.length}</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center space-x-2">
                <Gift className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-900">Monday Holidays</span>
              </div>
              <p className="text-2xl font-bold text-green-900">{mondayHolidays.length}</p>
            </div>
            <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
              <div className="flex items-center space-x-2">
                <Gift className="w-4 h-4 text-orange-600" />
                <span className="text-sm font-medium text-orange-900">Bonus Leave Days</span>
              </div>
              <p className="text-2xl font-bold text-orange-900">{mondayHolidays.length}</p>
            </div>
          </div>

          {/* No holidays banner */}
          {filteredHolidays.length === 0 && holidays.some(h => h.year === selectedYear - 1) && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
              No holidays configured for {selectedYear}. You can use the <strong>"Copy to {selectedYear}"</strong> button after selecting {selectedYear - 1} to quickly duplicate last year's holidays.
            </div>
          )}

          {/* Holidays Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Holiday Name</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Day of Week</TableHead>
                <TableHead>Monday Bonus</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredHolidays.map((holiday) => (
                <TableRow key={holiday.id}>
                  <TableCell className="font-medium">{holiday.name}</TableCell>
                  <TableCell>{format(new Date(holiday.date), 'dd/MM/yyyy')}</TableCell>
                  <TableCell>
                    <span className={holiday.is_monday_holiday ? 'font-medium text-green-600' : ''}>
                      {getDayOfWeek(holiday.date)}
                    </span>
                  </TableCell>
                  <TableCell>
                    {holiday.is_monday_holiday ? (
                      <div className="flex items-center space-x-1 text-green-600">
                        <Gift className="w-4 h-4" />
                        <span className="text-sm font-medium">+1 Leave Day</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm" onClick={() => openEditHoliday(holiday)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleDeleteHoliday(holiday.id, holiday.name)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredHolidays.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No public holidays configured for {selectedYear}. Add your first holiday to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Edit Holiday Dialog */}
      <Dialog open={isEditHolidayOpen} onOpenChange={setIsEditHolidayOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Public Holiday</DialogTitle>
            <DialogDescription>Update holiday information.</DialogDescription>
          </DialogHeader>
          {editingHoliday && (
            <form onSubmit={handleEditHoliday}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Holiday Name</Label>
                  <Input name="name" defaultValue={editingHoliday.name} required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="date">Date</Label>
                  <Input name="date" type="date" defaultValue={editingHoliday.date} required />
                </div>
                <div className="text-sm text-muted-foreground">
                  Note: If this holiday falls on a Monday, all employees will automatically receive +1 annual leave day.
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditHolidayOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Save Changes</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default PublicHolidayManagement;
