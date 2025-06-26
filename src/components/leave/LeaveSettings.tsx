
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings, Plus, Edit2, Trash2 } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

interface LeaveType {
  id: string;
  name: string;
  maxDays: number;
  requiresDocuments: boolean;
}

const LeaveSettings = () => {
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([
    { id: '1', name: 'Annual Leave', maxDays: 21, requiresDocuments: false },
    { id: '2', name: 'Medical Leave', maxDays: 14, requiresDocuments: true },
    { id: '3', name: 'Emergency Leave', maxDays: 5, requiresDocuments: false },
    { id: '4', name: 'Maternity Leave', maxDays: 90, requiresDocuments: true },
    { id: '5', name: 'Paternity Leave', maxDays: 14, requiresDocuments: true },
  ]);

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingLeaveType, setEditingLeaveType] = useState<LeaveType | null>(null);

  const handleAddLeaveType = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    
    const newLeaveType: LeaveType = {
      id: Date.now().toString(),
      name: formData.get('name') as string,
      maxDays: parseInt(formData.get('maxDays') as string),
      requiresDocuments: formData.get('requiresDocuments') === 'on'
    };

    setLeaveTypes([...leaveTypes, newLeaveType]);
    setShowAddForm(false);
    toast("Leave type added successfully");
  };

  const handleEditLeaveType = (leaveType: LeaveType) => {
    setEditingLeaveType(leaveType);
  };

  const handleUpdateLeaveType = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLeaveType) return;

    const formData = new FormData(e.target as HTMLFormElement);
    
    const updatedLeaveType: LeaveType = {
      ...editingLeaveType,
      name: formData.get('name') as string,
      maxDays: parseInt(formData.get('maxDays') as string),
      requiresDocuments: formData.get('requiresDocuments') === 'on'
    };

    setLeaveTypes(leaveTypes.map(lt => 
      lt.id === editingLeaveType.id ? updatedLeaveType : lt
    ));
    setEditingLeaveType(null);
    toast("Leave type updated successfully");
  };

  const handleDeleteLeaveType = (id: string) => {
    setLeaveTypes(leaveTypes.filter(lt => lt.id !== id));
    toast("Leave type deleted successfully");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Settings className="w-5 h-5" />
          <span>Leave Settings</span>
        </CardTitle>
        <CardDescription>Configure leave types and entitlements</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Leave Types</h3>
            <Button onClick={() => setShowAddForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Leave Type
            </Button>
          </div>

          {showAddForm && (
            <Card className="border-2 border-blue-200">
              <CardHeader>
                <CardTitle>Add New Leave Type</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddLeaveType} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Leave Type Name</Label>
                      <Input id="name" name="name" required />
                    </div>
                    <div>
                      <Label htmlFor="maxDays">Maximum Days per Year</Label>
                      <Input id="maxDays" name="maxDays" type="number" required />
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="requiresDocuments" name="requiresDocuments" />
                    <Label htmlFor="requiresDocuments">Requires Supporting Documents</Label>
                  </div>
                  <div className="flex space-x-2">
                    <Button type="submit">Add Leave Type</Button>
                    <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {editingLeaveType && (
            <Card className="border-2 border-orange-200">
              <CardHeader>
                <CardTitle>Edit Leave Type</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpdateLeaveType} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="editName">Leave Type Name</Label>
                      <Input 
                        id="editName" 
                        name="name" 
                        defaultValue={editingLeaveType.name}
                        required 
                      />
                    </div>
                    <div>
                      <Label htmlFor="editMaxDays">Maximum Days per Year</Label>
                      <Input 
                        id="editMaxDays" 
                        name="maxDays" 
                        type="number" 
                        defaultValue={editingLeaveType.maxDays}
                        required 
                      />
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input 
                      type="checkbox" 
                      id="editRequiresDocuments" 
                      name="requiresDocuments"
                      defaultChecked={editingLeaveType.requiresDocuments}
                    />
                    <Label htmlFor="editRequiresDocuments">Requires Supporting Documents</Label>
                  </div>
                  <div className="flex space-x-2">
                    <Button type="submit">Update Leave Type</Button>
                    <Button type="button" variant="outline" onClick={() => setEditingLeaveType(null)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <div className="space-y-3">
            {leaveTypes.map((leaveType) => (
              <div key={leaveType.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h4 className="font-medium">{leaveType.name}</h4>
                  <p className="text-sm text-gray-600">
                    {leaveType.maxDays} days per year
                    {leaveType.requiresDocuments && ' • Requires documents'}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditLeaveType(leaveType)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteLeaveType(leaveType.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default LeaveSettings;
