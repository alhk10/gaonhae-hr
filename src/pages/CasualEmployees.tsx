
import React from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Plus, Calendar, MapPin } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { getEmployees } from '@/data/employeeData';

const CasualEmployees = () => {
  // Get all employees and filter for casual workers
  const allEmployees = getEmployees();
  const casualWorkers = allEmployees.filter(emp => emp.type === 'Casual');

  const handleAddCasualWorker = () => {
    toast("Add casual worker functionality will be implemented");
  };

  const handleAssignShift = (workerId: string) => {
    toast(`Assigning shift to worker ${workerId}`);
  };

  // Calculate statistics
  const totalCasualWorkers = casualWorkers.length;
  const activeToday = Math.floor(casualWorkers.length * 0.4); // Simulate active workers
  const available = Math.floor(casualWorkers.length * 0.6); // Simulate available workers
  const locations = 3; // Fixed number of locations

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
                      <p className="text-2xl font-bold text-gray-900">{totalCasualWorkers}</p>
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
                      <p className="text-2xl font-bold text-gray-900">{activeToday}</p>
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
                      <p className="text-2xl font-bold text-gray-900">{available}</p>
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
                      <p className="text-2xl font-bold text-gray-900">{locations}</p>
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
                  {casualWorkers.map((worker, index) => {
                    // Simulate different statuses for workers
                    const statuses = ['available', 'working', 'unavailable'];
                    const status = statuses[index % statuses.length];
                    
                    return (
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
                              {worker.branch || 'Singapore Office'}
                            </span>
                            <span>Hourly Rate: S${worker.hourlyRate}/hr</span>
                            <span>Join Date: {worker.joinDate}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <Badge variant={
                            status === 'working' ? 'default' :
                            status === 'available' ? 'secondary' : 
                            'destructive'
                          }>
                            {status}
                          </Badge>
                          {status === 'available' && (
                            <Button 
                              size="sm" 
                              onClick={() => handleAssignShift(worker.id)}
                            >
                              Assign Shift
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
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
