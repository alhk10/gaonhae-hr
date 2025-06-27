
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings, Plus, Edit2, Trash2 } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { getLeaveTypes, createLeaveType, updateLeaveType, deleteLeaveType, LeaveType } from '@/services/leaveTypesService';

const LeaveSettings = () => {
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingLeaveType, setEditingLeaveType] = useState<LeaveType | null>(null);

  useEffect(() => {
    loadLeaveTypes();
  }, []);

  const loadLeaveTypes = async () => {
    try {
      setLoading(true);
      const types = await getLeaveTypes();
      setLeaveTypes(types);
    } catch (error) {
      console.error('Error loading leave types:', error);
      toast("Error loading leave types. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddLeaveType = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    
    try {
      const newLeaveType = await createLeaveType({
        name: formData.get('name') as string,
        maxDays: parseInt(formData.get('maxDays') as string),
        requiresDocuments: formData.get('requiresDocuments') === 'on',
        isActive: true
      });

      setLeaveTypes([...leaveTypes, newLeaveType]);
      setShowAddForm(false);
      toast("Leave type added successfully");
      (e.target as HTMLFormElement).reset();
    } catch (error) {
      console.error('Error adding leave type:', error);
      toast("Error adding leave type. Please try again.");
    }
  };

  const handleEditLeaveType = (leaveType: LeaveType) => {
    setEditingLeaveType(leaveType);
  };

  const handleUpdateLeaveType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLeaveType) return;

    const formData = new FormData(e.target as HTMLFormElement);
    
    try {
      const updatedLeaveType = await updateLeaveType(editingLeaveType.id, {
        name: formData.get('name') as string,
        maxDays: parseInt(formData.get('maxDays') as string),
        requiresDocuments: formData.get('requiresDocuments') === 'on'
      });

      setLeaveTypes(leaveTypes.map(lt => 
        lt.id === editingLeaveType.id ? updatedLeaveType : lt
      ));
      setEditingLeaveType(null);
      toast("Leave type updated successfully");
    } catch (error) {
      console.error('Error updating leave type:', error);
      toast("Error updating leave type. Please try again.");
    }
  };

  const handleDeleteLeaveType = async (id: string) => {
    try {
      await deleteLeaveType(id);
      setLeaveTypes(leaveTypes.filter(lt => lt.id !== id));
      toast("Leave type deleted successfully");
    } catch (error) {
      console.error('Error deleting leave type:', error);
      toast("Error deleting leave type. Please try again.");
    }
  };

  if (loading) {
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
            <Button onClick={() => setShowAddForm(true)} disabled={showAddForm}>
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
                      <Input id="maxDays" name="maxDays" type="number" min="0" required />
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
                        min="0"
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
                    disabled={editingLeaveType?.id === leaveType.id}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteLeaveType(leaveType.id)}
                    disabled={editingLeaveType?.id === leaveType.id}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
            {leaveTypes.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No leave types configured. Add your first leave type to get started.
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default LeaveSettings;
