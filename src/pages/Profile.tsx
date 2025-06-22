
import React from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, Mail, Phone, MapPin, Calendar, CreditCard } from 'lucide-react';

const Profile = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex h-[calc(100vh-73px)]">
        <Sidebar />
        <main className="flex-1 p-6 overflow-auto">
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">My Profile</h2>
              <p className="text-gray-600">View and update your profile information</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <User className="w-5 h-5" />
                    <span>Personal Information</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-center mb-4">
                    <img 
                      src="/placeholder.svg" 
                      alt="Profile"
                      className="w-24 h-24 rounded-full object-cover border-4 border-gray-200"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Full Name</label>
                    <p className="text-lg text-gray-900">Tan Wei Ming</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Employee ID</label>
                    <p className="text-lg text-gray-900">EMP001</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">NRIC/FIN</label>
                    <p className="text-lg text-gray-900">S1234567A</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Email</label>
                    <p className="text-lg text-gray-900">employee@company.sg</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Phone</label>
                    <p className="text-lg text-gray-900">+65 9123 4567</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Work Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Department</label>
                    <p className="text-lg text-gray-900">Engineering</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Role</label>
                    <p className="text-lg text-gray-900">Developer</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Manager</label>
                    <p className="text-lg text-gray-900">Kumar Raj</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Join Date</label>
                    <p className="text-lg text-gray-900">2022-03-15</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Work Location</label>
                    <p className="text-lg text-gray-900">Singapore Office</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Frequently used actions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Button variant="outline" className="h-20 flex flex-col items-center space-y-2">
                    <Calendar className="w-6 h-6" />
                    <span className="text-sm">Apply Leave</span>
                  </Button>
                  <Button variant="outline" className="h-20 flex flex-col items-center space-y-2">
                    <CreditCard className="w-6 h-6" />
                    <span className="text-sm">Submit Claim</span>
                  </Button>
                  <Button variant="outline" className="h-20 flex flex-col items-center space-y-2">
                    <CreditCard className="w-6 h-6" />
                    <span className="text-sm">View Payslip</span>
                  </Button>
                  <Button variant="outline" className="h-20 flex flex-col items-center space-y-2">
                    <Clock className="w-6 h-6" />
                    <span className="text-sm">Clock In/Out</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Profile;
