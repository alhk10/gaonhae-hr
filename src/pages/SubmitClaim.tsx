
import React from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, DollarSign, Upload } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

const SubmitClaim = () => {
  const handleSubmitClaim = () => {
    toast("Claim submitted successfully");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex h-[calc(100vh-73px)]">
        <Sidebar />
        <main className="flex-1 p-6 overflow-auto">
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Submit Claim</h2>
              <p className="text-gray-600">Submit your expense claim</p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Expense Claim Form</CardTitle>
                <CardDescription>Fill out the details for your expense claim</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Claim Type</label>
                    <select className="w-full p-2 border border-gray-300 rounded-lg">
                      <option>Transport</option>
                      <option>Meals</option>
                      <option>Equipment</option>
                      <option>Training</option>
                      <option>Others</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Amount (S$)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      className="w-full p-2 border border-gray-300 rounded-lg"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date of Expense</label>
                    <input type="date" className="w-full p-2 border border-gray-300 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Vendor/Merchant</label>
                    <input 
                      type="text" 
                      className="w-full p-2 border border-gray-300 rounded-lg"
                      placeholder="Enter vendor name"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea 
                    rows={3} 
                    className="w-full p-2 border border-gray-300 rounded-lg"
                    placeholder="Describe the expense..."
                  ></textarea>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Receipt Upload</label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                    <Upload className="mx-auto h-8 w-8 text-gray-400" />
                    <p className="text-sm text-gray-600 mt-2">Upload receipt or supporting documents</p>
                    <Button variant="outline" size="sm" className="mt-2">
                      Choose Files
                    </Button>
                  </div>
                </div>
                <Button onClick={handleSubmitClaim} className="w-full">
                  Submit Claim
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
};

export default SubmitClaim;
