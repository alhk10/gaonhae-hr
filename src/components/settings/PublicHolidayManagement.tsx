
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Calendar, Plus, Edit, Trash2, Gift } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { format } from 'date-fns';
import {
  getPublicHolidays,
  addPublicHoliday,
  updatePublicHoliday,
  deletePublicHoliday,
  PublicHoliday
} from '@/services/publicHolidayService';

const PublicHolidayManagement = () => {
  const [holidays, setHolidays] = useState<PublicHoliday[]>([]);
  const [isAddHolidayOpen, setIsAddHolidayOpen] = useState(false);
  const [isEditHolidayOpen, setIsEditHolidayOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<PublicHoliday | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHolidays();
  }, []);

  const loadHolidays = async () => {
    try {
      setLoading(true);
      console.log('PublicHolidayManagement: Loading holidays...');
      const holidayData = await getPublicHolidays();
      setHolidays(holidayData);
      console.log('PublicHolidayManagement: Loaded holidays:', holidayData.length);
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

  const openEditHoliday = (holiday: PublicHoliday) => {
    setEditingHoliday(holiday);
    setIsEditHolidayOpen(true);
  };

  const getDayOfWeek = (dateString: string) => {
    return format(new Date(dateString), 'EEEE');
  };

  const mondayHolidays = holidays.filter(h => h.is_monday_holiday);
  const currentYear = new Date().getFullYear();
  const currentYearHolidays = holidays.filter(h => h.year === currentYear);

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
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
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
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">Total Holidays {currentYear}</span>
              </div>
              <p className="text-2xl font-bold text-blue-900">{currentYearHolidays.length}</p>
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

          {/* Holidays Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Holiday Name</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Day of Week</TableHead>
                <TableHead>Year</TableHead>
                <TableHead>Monday Bonus</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {holidays.map((holiday) => (
                <TableRow key={holiday.id}>
                  <TableCell className="font-medium">{holiday.name}</TableCell>
                  <TableCell>{format(new Date(holiday.date), 'dd/MM/yyyy')}</TableCell>
                  <TableCell>
                    <span className={holiday.is_monday_holiday ? 'font-medium text-green-600' : ''}>
                      {getDayOfWeek(holiday.date)}
                    </span>
                  </TableCell>
                  <TableCell>{holiday.year}</TableCell>
                  <TableCell>
                    {holiday.is_monday_holiday ? (
                      <div className="flex items-center space-x-1 text-green-600">
                        <Gift className="w-4 h-4" />
                        <span className="text-sm font-medium">+1 Leave Day</span>
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
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
              {holidays.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    No public holidays configured. Add your first holiday to get started.
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
