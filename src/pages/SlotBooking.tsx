
import React, { useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, MapPin, Users } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

const SlotBooking = () => {
  const [selectedDate, setSelectedDate] = useState('2024-12-25');
  const [selectedLocation, setSelectedLocation] = useState('Singapore Office');

  const handleBookSlot = (time: string, location: string) => {
    toast(`Slot booked for ${time} at ${location}`);
  };

  const timeSlots = [
    { time: '09:00 - 13:00', available: 5, total: 10 },
    { time: '13:00 - 17:00', available: 3, total: 10 },
    { time: '17:00 - 21:00', available: 8, total: 10 },
  ];

  const locations = [
    { name: 'Singapore Office', address: '123 Marina Bay, Singapore' },
    { name: 'Jurong Branch', address: '456 Jurong East, Singapore' },
    { name: 'Tampines Branch', address: '789 Tampines Central, Singapore' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex h-[calc(100vh-73px)]">
        <Sidebar />
        <main className="flex-1 p-6 overflow-auto">
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Slot Booking</h2>
              <p className="text-gray-600">Book work slots for casual workers</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Available Slots</p>
                      <p className="text-2xl font-bold text-gray-900">16</p>
                    </div>
                    <Clock className="w-8 h-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Booked Today</p>
                      <p className="text-2xl font-bold text-gray-900">14</p>
                    </div>
                    <Users className="w-8 h-8 text-blue-500" />
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Select Date & Location</CardTitle>
                  <CardDescription>Choose your preferred work date and location</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                    <input 
                      type="date" 
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                    <select 
                      value={selectedLocation}
                      onChange={(e) => setSelectedLocation(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    >
                      {locations.map((location) => (
                        <option key={location.name} value={location.name}>{location.name}</option>
                      ))}
                    </select>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Available Time Slots</CardTitle>
                  <CardDescription>Select from available work shifts</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {timeSlots.map((slot, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{slot.time}</p>
                          <p className="text-sm text-gray-600">{slot.available} of {slot.total} slots available</p>
                        </div>
                        <Button 
                          size="sm" 
                          disabled={slot.available === 0}
                          onClick={() => handleBookSlot(slot.time, selectedLocation)}
                        >
                          {slot.available === 0 ? 'Full' : 'Book'}
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Work Locations</CardTitle>
                <CardDescription>Available work locations for casual workers</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {locations.map((location, index) => (
                    <div key={index} className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-start space-x-3">
                        <MapPin className="w-5 h-5 text-gray-400 mt-1" />
                        <div>
                          <p className="font-medium text-gray-900">{location.name}</p>
                          <p className="text-sm text-gray-600">{location.address}</p>
                        </div>
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

export default SlotBooking;
