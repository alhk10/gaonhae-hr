
import React from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Plus, Calendar, MapPin, Phone, Mail } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { getCasualEmployees } from '@/services/employeeService';
import { useIsMobile } from '@/hooks/use-mobile';
import { useQuery } from '@tanstack/react-query';
import type { EmployeeProfile } from '@/types/employee';

const CasualEmployees = () => {
  const isMobile = useIsMobile();
  
  const { data: casualWorkers = [], isLoading, error } = useQuery({
    queryKey: ['casualEmployees'],
    queryFn: getCasualEmployees,
  });

  if (error) {
    console.error('Error loading casual employees:', error);
    toast.error('Error loading casual employees');
  }

  const handleAddCasualWorker = () => {
    toast("Add casual worker functionality will be implemented");
  };

  const handleAssignShift = (workerId: string) => {
    toast(`Assigning shift to worker ${workerId}`);
  };

  const totalCasualWorkers = casualWorkers.length;
  const activeToday = Math.floor(casualWorkers.length * 0.4);
  const available = Math.floor(casualWorkers.length * 0.6);
  const locations = 3;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex h-[calc(100vh-73px)]">
          <Sidebar />
          <main className="flex-1 p-3 md:p-6 overflow-auto">
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading casual employees...</p>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex h-[calc(100vh-73px)]">
        <Sidebar />
        <main className="flex-1 p-3 md:p-6 overflow-auto">
          <div className="space-y-4 md:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-gray-900">Casual Employee Management</h2>
                <p className="text-sm md:text-base text-gray-600">Manage casual workers and shift assignments</p>
              </div>
              <Button 
                className="flex items-center space-x-2 w-full sm:w-auto" 
                onClick={handleAddCasualWorker}
              >
                <Plus className="w-4 h-4" />
                <span>Add Casual Worker</span>
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              <Card>
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Casual Workers</p>
                      <p className="text-2xl font-bold text-gray-900">{totalCasualWorkers}</p>
                    </div>
                    <Users className="w-6 h-6 md:w-8 md:h-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Active Today</p>
                      <p className="text-2xl font-bold text-gray-900">{activeToday}</p>
                    </div>
                    <Calendar className="w-6 h-6 md:w-8 md:h-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Available</p>
                      <p className="text-2xl font-bold text-gray-900">{available}</p>
                    </div>
                    <Users className="w-6 h-6 md:w-8 md:h-8 text-orange-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Locations</p>
                      <p className="text-2xl font-bold text-gray-900">{locations}</p>
                    </div>
                    <MapPin className="w-6 h-6 md:w-8 md:h-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg md:text-xl">Casual Workers</CardTitle>
                <CardDescription>Manage casual employee roster and assignments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {casualWorkers.map((worker: EmployeeProfile, index: number) => {
                    const statuses = ['available', 'working', 'unavailable'];
                    const status = statuses[index % statuses.length];
                    
                    return (
                      <Card key={worker.id} className="p-4">
                        <div className="space-y-3">
                          {/* Header with name and status */}
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                            <div className="flex-1">
                              <h3 className="font-medium text-gray-900 text-lg">{worker.name}</h3>
                              <p className="text-sm text-gray-600">{worker.id}</p>
                            </div>
                            <div className="flex items-center gap-2">
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
                                  className="whitespace-nowrap"
                                >
                                  Assign Shift
                                </Button>
                              )}
                            </div>
                          </div>

                          {/* Contact and details */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600">
                            {worker.phone && (
                              <div className="flex items-center space-x-2">
                                <Phone className="w-4 h-4 flex-shrink-0" />
                                <span>{worker.phone}</span>
                              </div>
                            )}
                            {worker.email && (
                              <div className="flex items-center space-x-2">
                                <Mail className="w-4 h-4 flex-shrink-0" />
                                <span className="break-all">{worker.email}</span>
                              </div>
                            )}
                            <div className="flex items-center space-x-2">
                              <MapPin className="w-4 h-4 flex-shrink-0" />
                              <span>{worker.branch || worker.department || 'Main Office'}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Calendar className="w-4 h-4 flex-shrink-0" />
                              <span>Joined: {worker.joinDate}</span>
                            </div>
                          </div>

                          {/* Hourly rate */}
                          <div className="text-sm">
                            <span className="font-medium">Hourly Rate: </span>
                            <span className="text-green-600">S${worker.hourlyRate}/hr</span>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                  
                  {casualWorkers.length === 0 && (
                    <div className="text-center py-8">
                      <Users className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                      <p className="text-gray-500">No casual workers found</p>
                      <Button 
                        className="mt-4" 
                        onClick={handleAddCasualWorker}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add First Casual Worker
                      </Button>
                    </div>
                  )}
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
