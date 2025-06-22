
import React from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings as SettingsIcon, Users, Building, Shield } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

const Settings = () => {
  const handleSaveSetting = (setting: string) => {
    toast(`${setting} settings saved successfully`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex h-[calc(100vh-73px)]">
        <Sidebar />
        <main className="flex-1 p-6 overflow-auto">
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">System Settings</h2>
              <p className="text-gray-600">Configure system-wide settings and preferences</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Building className="w-5 h-5" />
                    <span>Company Settings</span>
                  </CardTitle>
                  <CardDescription>Basic company information and configuration</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Company Name</label>
                    <input type="text" defaultValue="Tech Solutions Pte Ltd" className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Registration Number</label>
                    <input type="text" defaultValue="201234567A" className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                  </div>
                  <Button onClick={() => handleSaveSetting('Company')}>Save Changes</Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Users className="w-5 h-5" />
                    <span>HR Policies</span>
                  </CardTitle>
                  <CardDescription>Leave policies and working hour configurations</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Annual Leave Days</label>
                    <input type="number" defaultValue="21" className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Working Hours per Day</label>
                    <input type="number" defaultValue="8" className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                  </div>
                  <Button onClick={() => handleSaveSetting('HR Policies')}>Save Changes</Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Shield className="w-5 h-5" />
                    <span>Security Settings</span>
                  </CardTitle>
                  <CardDescription>Access control and security configurations</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Two-Factor Authentication</span>
                    <input type="checkbox" className="rounded" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Password Expiry (days)</span>
                    <input type="number" defaultValue="90" className="w-20 border border-gray-300 rounded-lg px-2 py-1" />
                  </div>
                  <Button onClick={() => handleSaveSetting('Security')}>Save Changes</Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <SettingsIcon className="w-5 h-5" />
                    <span>System Preferences</span>
                  </CardTitle>
                  <CardDescription>General system configuration options</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Time Zone</label>
                    <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
                      <option>Asia/Singapore</option>
                      <option>Asia/Kuala_Lumpur</option>
                      <option>Asia/Jakarta</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
                    <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
                      <option>SGD (Singapore Dollar)</option>
                      <option>MYR (Malaysian Ringgit)</option>
                      <option>USD (US Dollar)</option>
                    </select>
                  </div>
                  <Button onClick={() => handleSaveSetting('System')}>Save Changes</Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Settings;
