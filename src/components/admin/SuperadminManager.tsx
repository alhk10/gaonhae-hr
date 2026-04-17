
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Shield, Plus, Trash2, AlertTriangle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { getEmployees } from '@/services/employeeService';
import { logSecurityEvent } from '@/services/securityService';
import { EmployeeProfile } from '@/types/employee';
import { formatDate } from '@/utils/dateFormat';

interface SuperadminUser {
  id: string;
  employee_email: string;
  employee_name: string;
  created_at: string;
  created_by: string;
  is_active: boolean;
  notes: string;
}

const SuperadminManager: React.FC = () => {
  const [superadmins, setSuperadmins] = useState<SuperadminUser[]>([]);
  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [notes, setNotes] = useState('');
  const [removingSuperadmin, setRemovingSuperadmin] = useState<SuperadminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      console.log('SuperadminManager: Loading superadmin users and employees...');
      
      // Load employees
      const employeeData = await getEmployees();
      setEmployees(employeeData);
      console.log('SuperadminManager: Loaded employees:', employeeData.length);
      
      // Load superadmin users directly from superadmin_users table
      const { data: superadminData, error } = await supabase
        .from('superadmin_users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading superadmin users:', error);
        toast({
          title: "Error",
          description: "Failed to load superadmin users",
          variant: "destructive",
        });
        return;
      }

      setSuperadmins(superadminData || []);
      console.log('SuperadminManager: Loaded superadmins:', superadminData?.length);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddSuperadmin = async () => {
    if (!selectedEmployee || !notes.trim()) {
      toast({
        title: "Missing Information",
        description: "Please select an employee and provide notes",
        variant: "destructive",
      });
      return;
    }

    try {
      const selectedEmp = employees.find(emp => emp.id === selectedEmployee);
      if (!selectedEmp) {
        toast({
          title: "Error",
          description: "Selected employee not found",
          variant: "destructive",
        });
        return;
      }

      // Check if employee is already a superadmin
      const existingSuperadmin = superadmins.find(sa => sa.employee_email === selectedEmp.email && sa.is_active);
      if (existingSuperadmin) {
        toast({
          title: "Already Superadmin",
          description: "This employee is already a superadmin",
          variant: "destructive",
        });
        return;
      }

      // Adding superadmin

      const { error } = await supabase
        .from('superadmin_users')
        .insert({
          employee_email: selectedEmp.email || '',
          employee_name: selectedEmp.name,
          created_by: 'CURRENT_USER', // In a real app, get from current user context
          notes: notes.trim()
        });

      if (error) {
        console.error('Error adding superadmin:', error);
        toast({
          title: "Error",
          description: "Failed to add superadmin user",
          variant: "destructive",
        });
        return;
      }

      // Log security event
      await logSecurityEvent({
        user_email: selectedEmp.email || '',
        action: 'SUPERADMIN_GRANTED',
        details: {
          employee_name: selectedEmp.name,
          granted_by: 'CURRENT_USER',
          notes: notes.trim()
        }
      });

      toast({
        title: "Superadmin Added",
        description: `${selectedEmp.name} has been granted superadmin access`,
      });

      // Reload data and close dialog
      await loadData();
      setIsAddDialogOpen(false);
      setSelectedEmployee('');
      setNotes('');
    } catch (error) {
      console.error('Error adding superadmin:', error);
      toast({
        title: "Error",
        description: "Failed to add superadmin user",
        variant: "destructive",
      });
    }
  };

  const handleRemoveSuperadmin = async () => {
    if (!removingSuperadmin) return;

    try {
      console.log('SuperadminManager: Removing superadmin:', removingSuperadmin.employee_email);

      const { error } = await supabase
        .from('superadmin_users')
        .update({ is_active: false })
        .eq('id', removingSuperadmin.id);

      if (error) {
        console.error('Error removing superadmin:', error);
        toast({
          title: "Error",
          description: "Failed to remove superadmin access",
          variant: "destructive",
        });
        return;
      }

      // Log security event
      await logSecurityEvent({
        user_email: removingSuperadmin.employee_email,
        action: 'SUPERADMIN_REVOKED',
        details: {
          employee_name: removingSuperadmin.employee_name,
          revoked_by: 'CURRENT_USER'
        }
      });

      toast({
        title: "Superadmin Removed",
        description: `${removingSuperadmin.employee_name}'s superadmin access has been revoked`,
      });

      // Reload data and close dialog
      await loadData();
      setIsRemoveDialogOpen(false);
      setRemovingSuperadmin(null);
    } catch (error) {
      console.error('Error removing superadmin:', error);
      toast({
        title: "Error",
        description: "Failed to remove superadmin access",
        variant: "destructive",
      });
    }
  };

  const openRemoveDialog = (superadmin: SuperadminUser) => {
    setRemovingSuperadmin(superadmin);
    setIsRemoveDialogOpen(true);
  };

  // Filter out employees who are already superadmins
  const availableEmployees = employees.filter(emp => 
    !superadmins.find(sa => sa.employee_email === emp.email && sa.is_active)
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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
              <Shield className="w-5 h-5" />
              <span>Superadmin Management</span>
            </CardTitle>
            <CardDescription>Manage users with superadmin privileges</CardDescription>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Superadmin
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Grant Superadmin Access</DialogTitle>
                <DialogDescription>
                  Grant superadmin privileges to an employee. This action will be logged for security purposes.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="employee">Employee</Label>
                  <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableEmployees.map((employee) => (
                        <SelectItem key={employee.id} value={employee.id}>
                          {employee.name} ({employee.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Reason for granting superadmin access..."
                    required
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddSuperadmin}>Grant Access</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Granted Date</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {superadmins.map((superadmin) => (
              <TableRow key={superadmin.id}>
                <TableCell className="font-medium">{superadmin.employee_name}</TableCell>
                <TableCell>{superadmin.employee_email}</TableCell>
                <TableCell>{formatDate(new Date(superadmin.created_at))}</TableCell>
                <TableCell className="max-w-xs truncate">{superadmin.notes}</TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    superadmin.is_active 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {superadmin.is_active ? 'Active' : 'Revoked'}
                  </span>
                </TableCell>
                <TableCell>
                  {superadmin.is_active && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => openRemoveDialog(superadmin)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>

      {/* Remove Superadmin Dialog */}
      <Dialog open={isRemoveDialogOpen} onOpenChange={setIsRemoveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Revoke Superadmin Access
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to revoke superadmin access for {removingSuperadmin?.employee_name}?
            </DialogDescription>
          </DialogHeader>
          
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-red-800">Warning:</p>
                <ul className="mt-1 text-red-700 space-y-1">
                  <li>• This will immediately remove all superadmin privileges</li>
                  <li>• The user will be logged out on their next session refresh</li>
                  <li>• This action will be logged for security purposes</li>
                  <li>• This action cannot be easily undone</li>
                </ul>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsRemoveDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRemoveSuperadmin}
              className="bg-red-600 hover:bg-red-700"
            >
              Revoke Access
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default SuperadminManager;
