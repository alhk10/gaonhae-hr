
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, Calendar, User } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface LocationException {
  id: string;
  employee_id: string;
  reason: string;
  enabled: boolean;
  created_by: string;
  created_at: string;
  expires_at?: string;
  employee_name?: string;
}

interface LocationExceptionManagerProps {
  employeeId?: string;
  employeeName?: string;
}

const LocationExceptionManager: React.FC<LocationExceptionManagerProps> = ({ 
  employeeId, 
  employeeName 
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newException, setNewException] = useState({
    reason: '',
    expires_at: '',
    employee_id: employeeId || ''
  });
  const queryClient = useQueryClient();

  const { data: exceptions = [], refetch } = useQuery({
    queryKey: ['location-exceptions', employeeId],
    queryFn: async () => {
      console.log('Fetching location exceptions for:', employeeId);
      
      let query = supabase
        .from('location_exceptions')
        .select(`
          *,
          employees!inner(name)
        `)
        .order('created_at', { ascending: false });

      if (employeeId) {
        query = query.eq('employee_id', employeeId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching location exceptions:', error);
        throw error;
      }

      return data?.map(exception => ({
        ...exception,
        employee_name: exception.employees?.name
      })) || [];
    },
  });

  const createException = async () => {
    if (!newException.reason.trim() || !newException.employee_id) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const exceptionData = {
        employee_id: newException.employee_id,
        reason: newException.reason,
        created_by: 'Admin', // In a real app, this would be the current admin user
        expires_at: newException.expires_at || null,
        enabled: true
      };

      console.log('Creating location exception:', exceptionData);

      const { error } = await supabase
        .from('location_exceptions')
        .insert([exceptionData]);

      if (error) {
        console.error('Error creating location exception:', error);
        throw error;
      }

      toast.success('Location exception created successfully');
      setIsCreating(false);
      setNewException({ reason: '', expires_at: '', employee_id: employeeId || '' });
      refetch();
      queryClient.invalidateQueries({ queryKey: ['location-exceptions'] });
    } catch (error) {
      console.error('Error creating location exception:', error);
      toast.error('Failed to create location exception');
    }
  };

  const toggleException = async (id: string, enabled: boolean) => {
    try {
      const { error } = await supabase
        .from('location_exceptions')
        .update({ enabled: !enabled })
        .eq('id', id);

      if (error) throw error;

      toast.success(`Location exception ${!enabled ? 'enabled' : 'disabled'}`);
      refetch();
      queryClient.invalidateQueries({ queryKey: ['location-exceptions'] });
    } catch (error) {
      console.error('Error toggling location exception:', error);
      toast.error('Failed to update location exception');
    }
  };

  const deleteException = async (id: string) => {
    try {
      const { error } = await supabase
        .from('location_exceptions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Location exception deleted');
      refetch();
      queryClient.invalidateQueries({ queryKey: ['location-exceptions'] });
    } catch (error) {
      console.error('Error deleting location exception:', error);
      toast.error('Failed to delete location exception');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <User className="w-5 h-5" />
          <span>Location Exceptions</span>
        </CardTitle>
        <CardDescription>
          {employeeName 
            ? `Manage location exceptions for ${employeeName}`
            : 'Manage location exceptions for employees'
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isCreating && (
          <Button onClick={() => setIsCreating(true)} className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Add Location Exception
          </Button>
        )}

        {isCreating && (
          <div className="border rounded-lg p-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Reason</Label>
              <Textarea
                id="reason"
                placeholder="Enter reason for location exception..."
                value={newException.reason}
                onChange={(e) => setNewException(prev => ({ ...prev, reason: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expires_at">Expiry Date (Optional)</Label>
              <Input
                id="expires_at"
                type="datetime-local"
                value={newException.expires_at}
                onChange={(e) => setNewException(prev => ({ ...prev, expires_at: e.target.value }))}
              />
            </div>

            <div className="flex space-x-2">
              <Button onClick={createException} className="flex-1">
                Create Exception
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsCreating(false);
                  setNewException({ reason: '', expires_at: '', employee_id: employeeId || '' });
                }}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {exceptions.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No location exceptions found</p>
          ) : (
            exceptions.map((exception) => (
              <div key={exception.id} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Badge variant={exception.enabled ? 'default' : 'secondary'}>
                      {exception.enabled ? 'Active' : 'Disabled'}
                    </Badge>
                    {exception.employee_name && (
                      <span className="font-medium">{exception.employee_name}</span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={exception.enabled}
                      onCheckedChange={() => toggleException(exception.id, exception.enabled)}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteException(exception.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                <p className="text-sm text-gray-600">{exception.reason}</p>
                
                <div className="flex items-center space-x-4 text-xs text-gray-500">
                  <span>Created: {new Date(exception.created_at).toLocaleDateString()}</span>
                  {exception.expires_at && (
                    <span className="flex items-center space-x-1">
                      <Calendar className="w-3 h-3" />
                      <span>Expires: {new Date(exception.expires_at).toLocaleDateString()}</span>
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default LocationExceptionManager;
