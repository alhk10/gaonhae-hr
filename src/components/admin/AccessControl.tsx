
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, DollarSign, Calendar, FileText, Clock, BookOpen, Plus, Edit, Trash2 } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions: {
    payroll: boolean;
    leaveManagement: boolean;
    claims: boolean;
    attendance: boolean;
    slotBooking: boolean;
  };
  status: 'Active' | 'Inactive';
}

const AccessControl = () => {
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([
    {
      id: 'ADM001',
      name: 'Sarah Johnson',
      email: 'sarah.johnson@company.com',
      role: 'Super Admin',
      permissions: {
        payroll: true,
        leaveManagement: true,
        claims: true,
        attendance: true,
        slotBooking: true,
      },
      status: 'Active'
    },
    {
      id: 'ADM002',
      name: 'Michael Chen',
      email: 'michael.chen@company.com',
      role: 'Payroll Admin',
      permissions: {
        payroll: true,
        leaveManagement: false,
        claims: false,
        attendance: false,
        slotBooking: false,
      },
      status: 'Active'
    },
    {
      id: 'ADM003',
      name: 'Lisa Wong',
      email: 'lisa.wong@company.com',
      role: 'HR Admin',
      permissions: {
        payroll: false,
        leaveManagement: true,
        claims: true,
        attendance: true,
        slotBooking: true,
      },
      status: 'Active'
    }
  ]);

  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);

  const modules = [
    { key: 'payroll', name: 'Payroll Management', icon: DollarSign, color: 'text-green-600' },
    { key: 'leaveManagement', name: 'Leave Management', icon: Calendar, color: 'text-blue-600' },
    { key: 'claims', name: 'Claims Management', icon: FileText, color: 'text-purple-600' },
    { key: 'attendance', name: 'Attendance Management', icon: Clock, color: 'text-orange-600' },
    { key: 'slotBooking', name: 'Slot Booking', icon: BookOpen, color: 'text-red-600' }
  ];

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const newUser: AdminUser = {
      id: `ADM${String(adminUsers.length + 1).padStart(3, '0')}`,
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      role: formData.get('role') as string,
      permissions: {
        payroll: formData.get('payroll') === 'on',
        leaveManagement: formData.get('leaveManagement') === 'on',
        claims: formData.get('claims') === 'on',
        attendance: formData.get('attendance') === 'on',
        slotBooking: formData.get('slotBooking') === 'on',
      },
      status: 'Active'
    };
    setAdminUsers(prev => [...prev, newUser]);
    setIsAddUserOpen(false);
    toast('Admin user added successfully');
  };

  const handleEditUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    
    const formData = new FormData(e.target as HTMLFormElement);
    const updatedUser: AdminUser = {
      ...editingUser,
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      role: formData.get('role') as string,
      permissions: {
        payroll: formData.get('payroll') === 'on',
        leaveManagement: formData.get('leaveManagement') === 'on',
        claims: formData.get('claims') === 'on',
        attendance: formData.get('attendance') === 'on',
        slotBooking: formData.get('slotBooking') === 'on',
      }
    };
    
    setAdminUsers(prev => prev.map(user => 
      user.id === editingUser.id ? updatedUser : user
    ));
    setIsEditUserOpen(false);
    setEditingUser(null);
    toast('Admin user updated successfully');
  };

  const handleDeleteUser = (userId: string) => {
    setAdminUsers(prev => prev.filter(user => user.id !== userId));
    toast('Admin user deleted successfully');
  };

  const toggleUserStatus = (userId: string) => {
    setAdminUsers(prev => prev.map(user => 
      user.id === userId 
        ? { ...user, status: user.status === 'Active' ? 'Inactive' : 'Active' }
        : user
    ));
    toast('User status updated');
  };

  const openEditUser = (user: AdminUser) => {
    setEditingUser(user);
    setIsEditUserOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Admin Access Control</h3>
          <p className="text-sm text-gray-600">Manage admin permissions for different modules</p>
        </div>
        <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Admin User
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Admin User</DialogTitle>
              <DialogDescription>Create a new admin user with specific permissions.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddUser}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input name="name" required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input name="email" type="email" required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="role">Role</Label>
                  <Select name="role" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Super Admin">Super Admin</SelectItem>
                      <SelectItem value="Payroll Admin">Payroll Admin</SelectItem>
                      <SelectItem value="HR Admin">HR Admin</SelectItem>
                      <SelectItem value="Operations Admin">Operations Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-3">
                  <Label>Module Permissions</Label>
                  {modules.map((module) => (
                    <div key={module.key} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        name={module.key}
                        id={module.key}
                        className="rounded"
                      />
                      <Label htmlFor={module.key} className="text-sm">
                        {module.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddUserOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Add User</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="w-5 h-5" />
            <span>Admin Users</span>
          </CardTitle>
          <CardDescription>Manage admin users and their module access permissions</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Permissions</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {adminUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.role}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {modules.map((module) => {
                        const hasPermission = user.permissions[module.key as keyof typeof user.permissions];
                        if (!hasPermission) return null;
                        return (
                          <Badge key={module.key} variant="secondary" className="text-xs">
                            {module.name}
                          </Badge>
                        );
                      })}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Badge variant={user.status === 'Active' ? 'default' : 'secondary'}>
                        {user.status}
                      </Badge>
                      <Switch
                        checked={user.status === 'Active'}
                        onCheckedChange={() => toggleUserStatus(user.id)}
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm" onClick={() => openEditUser(user)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDeleteUser(user.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Module Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {modules.map((module) => {
          const activeAdmins = adminUsers.filter(user => 
            user.permissions[module.key as keyof typeof user.permissions] && user.status === 'Active'
          ).length;
          
          return (
            <Card key={module.key}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{module.name}</p>
                    <p className="text-lg font-bold">{activeAdmins} Admins</p>
                  </div>
                  <module.icon className={`w-6 h-6 ${module.color}`} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Edit User Dialog */}
      <Dialog open={isEditUserOpen} onOpenChange={setIsEditUserOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Admin User</DialogTitle>
            <DialogDescription>Update admin user information and permissions.</DialogDescription>
          </DialogHeader>
          {editingUser && (
            <form onSubmit={handleEditUser}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input name="name" defaultValue={editingUser.name} required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input name="email" type="email" defaultValue={editingUser.email} required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="role">Role</Label>
                  <Select name="role" defaultValue={editingUser.role} required>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Super Admin">Super Admin</SelectItem>
                      <SelectItem value="Payroll Admin">Payroll Admin</SelectItem>
                      <SelectItem value="HR Admin">HR Admin</SelectItem>
                      <SelectItem value="Operations Admin">Operations Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-3">
                  <Label>Module Permissions</Label>
                  {modules.map((module) => (
                    <div key={module.key} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        name={module.key}
                        id={`edit-${module.key}`}
                        defaultChecked={editingUser.permissions[module.key as keyof typeof editingUser.permissions]}
                        className="rounded"
                      />
                      <Label htmlFor={`edit-${module.key}`} className="text-sm">
                        {module.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditUserOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Save Changes</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AccessControl;
