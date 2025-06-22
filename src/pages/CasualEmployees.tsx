
import React from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Plus, Calendar, MapPin } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

const CasualEmployees = () => {
  const handleAddCasualWorker = () => {
    toast("Add casual worker functionality will be implemented");
  };

  const handleAssignShift = (workerId: string) => {
    toast(`Assigning shift to worker ${workerId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex h-[calc(100vh-73px)]">
        <Sidebar />
        <main className="flex-1 p-6 overflow-auto">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Casual Employee Management</h2>
                <p className="text-gray-600">Manage casual workers and shift assignments</p>
              </div>
              <Button className="flex items-center space-x-2" onClick={handleAddCasualWorker}>
                <Plus className="w-4 h-4" />
                <span>Add Casual Worker</span>
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Casual Workers</p>
                      <p className="text-2xl font-bold text-gray-900">45</p>
                    </div>
                    <Users className="w-8 h-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Active Today</p>
                      <p className="text-2xl font-bold text-gray-900">12</p>
                    </div>
                    <Calendar className="w-8 h-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Available</p>
                      <p className="text-2xl font-bold text-gray-900">18</p>
                    </div>
                    <Users className="w-8 h-8 text-orange-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Locations</p>
                      <p className="text-2xl font-bold text-gray-900">3</p>
                    </div>
                    <MapPin className="w-8 h-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Casual Workers</CardTitle>
                <CardDescription>Manage casual employee roster and assignments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { 
                      id: 'CW001', 
                      name: 'Ahmad Rahman', 
                      phone: '+65 9876 5432', 
                      location: 'Singapore Office', 
                      status: 'available',
                      lastShift: '2024-12-20'
                    },
                    { 
                      id: 'CW002', 
                      name: 'Priya Sharma', 
                      phone: '+65 8765 4321', 
                      location: 'Jurong Branch', 
                      status: 'working',
                      lastShift: '2024-12-22'
                    },
                    { 
                      id: 'CW003', 
                      name: 'Chen Wei Ming', 
                      phone: '+65 7654 3210', 
                      location: 'Tampines Branch', 
                      status: 'available',
                      lastShift: '2024-12-21'
                    },
                    { 
                      id: 'CW004', 
                      name: 'Maria Santos', 
                      phone: '+65 6543 2109', 
                      location: 'Singapore Office', 
                      status: 'unavailable',
                      lastShift: '2024-12-19'
                    },
                  ].map((worker) => (
                    <div key={worker.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <div>
                            <p className="font-medium text-gray-900">{worker.name}</p>
                            <p className="text-sm text-gray-600">{worker.id} • {worker.phone}</p>
                          </div>
                        </div>
                        <div className="mt-2 flex items-center space-x-4 text-sm text-gray-600">
                          <span className="flex items-center">
                            <MapPin className="w-4 h-4 mr-1" />
                            {worker.location}
                          </span>
                          <span>Last shift: {worker.lastShift}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Badge variant={
                          worker.status === 'working' ? 'default' :
                          worker.status === 'available' ? 'secondary' : 
                          'destructive'
                        }>
                          {worker.status}
                        </Badge>
                        {worker.status === 'available' && (
                          <Button 
                            size="sm" 
                            onClick={() => handleAssignShift(worker.id)}
                          >
                            Assign Shift
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
};

export default CasualEmployees;
