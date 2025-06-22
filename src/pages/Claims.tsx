
import React, { useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Plus, DollarSign } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

const Claims = () => {
  const [claims, setClaims] = useState([
    { id: 'CLM001', employee: 'John Tan', type: 'Transport', amount: 'S$45.50', status: 'approved', date: '2024-12-15' },
    { id: 'CLM002', employee: 'Mary Ng', type: 'Meals', amount: 'S$120.00', status: 'approved', date: '2024-12-10' },
    { id: 'CLM003', employee: 'David Lim', type: 'Equipment', amount: 'S$850.00', status: 'pending', date: '2024-12-08' },
  ]);

  const [showThisMonth, setShowThisMonth] = useState(false);
  const [showClaimForm, setShowClaimForm] = useState(false);

  const thisMonthClaims = claims.filter(claim => {
    const claimDate = new Date(claim.date);
    const currentDate = new Date();
    return claimDate.getMonth() === currentDate.getMonth() && 
           claimDate.getFullYear() === currentDate.getFullYear();
  });

  const handleApproveClaim = (claimId: string) => {
    setClaims(prev => 
      prev.map(claim => 
        claim.id === claimId 
          ? { ...claim, status: 'approved' }
          : claim
      )
    );
    toast(`Claim ${claimId} approved successfully`);
  };

  const handleRejectClaim = (claimId: string) => {
    setClaims(prev => 
      prev.map(claim => 
        claim.id === claimId 
          ? { ...claim, status: 'rejected' }
          : claim
      )
    );
    toast(`Claim ${claimId} rejected`);
  };

  const handleNewClaim = () => {
    setShowClaimForm(true);
  };

  const handleSubmitNewClaim = () => {
    const newClaim = {
      id: `CLM${String(claims.length + 1).padStart(3, '0')}`,
      employee: 'New Employee',
      type: 'General',
      amount: 'S$100.00',
      status: 'pending' as const,
      date: new Date().toISOString().split('T')[0]
    };
    setClaims(prev => [...prev, newClaim]);
    setShowClaimForm(false);
    toast("New claim submitted successfully");
  };

  const handleThisMonthClick = () => {
    setShowThisMonth(!showThisMonth);
  };

  const displayClaims = showThisMonth ? thisMonthClaims : claims;
  const totalAmountApproved = displayClaims
    .filter(claim => claim.status === 'approved')
    .reduce((sum, claim) => {
      const amount = parseFloat(claim.amount.replace('S$', '').replace(',', ''));
      return sum + amount;
    }, 0);

  if (showClaimForm) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex h-[calc(100vh-73px)]">
          <Sidebar />
          <main className="flex-1 p-6 overflow-auto">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">New Claim</h2>
                  <p className="text-gray-600">Submit a new expense claim</p>
                </div>
                <Button variant="outline" onClick={() => setShowClaimForm(false)}>
                  Back to Claims
                </Button>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Claim Details</CardTitle>
                  <CardDescription>Fill in the claim information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Employee</label>
                      <select className="w-full p-2 border border-gray-300 rounded-lg">
                        <option>John Tan</option>
                        <option>Mary Ng</option>
                        <option>David Lim</option>
                      </select>
                    </div>
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
                      <input type="number" step="0.01" className="w-full p-2 border border-gray-300 rounded-lg" placeholder="0.00" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                      <input type="date" className="w-full p-2 border border-gray-300 rounded-lg" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <textarea rows={3} className="w-full p-2 border border-gray-300 rounded-lg" placeholder="Describe the expense..."></textarea>
                  </div>
                  <div className="flex space-x-2">
                    <Button onClick={handleSubmitNewClaim}>Submit & Approve</Button>
                    <Button variant="outline">Save as Draft</Button>
                  </div>
                </CardContent>
              </Card>
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
        <main className="flex-1 p-6 overflow-auto">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Claims Management</h2>
                <p className="text-gray-600">Manage employee expense claims</p>
              </div>
              <Button className="flex items-center space-x-2" onClick={handleNewClaim}>
                <Plus className="w-4 h-4" />
                <span>New Claim</span>
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Pending Claims</p>
                      <p className="text-2xl font-bold text-gray-900">{displayClaims.filter(c => c.status === 'pending').length}</p>
                    </div>
                    <FileText className="w-8 h-8 text-orange-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Amount Approved</p>
                      <p className="text-2xl font-bold text-gray-900">S${totalAmountApproved.toFixed(2)}</p>
                    </div>
                    <DollarSign className="w-8 h-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
              <Card className="cursor-pointer hover:bg-gray-50" onClick={handleThisMonthClick}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">This Month</p>
                      <p className="text-2xl font-bold text-gray-900">{thisMonthClaims.length}</p>
                    </div>
                    <FileText className="w-8 h-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>
                  {showThisMonth ? 'This Month\'s Claims' : 'Recent Claims'}
                  {showThisMonth && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="ml-4"
                      onClick={() => setShowThisMonth(false)}
                    >
                      Show All
                    </Button>
                  )}
                </CardTitle>
                <CardDescription>
                  {showThisMonth 
                    ? `Claims made in ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`
                    : 'Latest expense claims requiring approval'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {displayClaims.map((claim) => (
                    <div key={claim.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{claim.employee}</p>
                        <p className="text-sm text-gray-600">{claim.id} • {claim.type} • {claim.amount} • {claim.date}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={
                          claim.status === 'approved' ? 'default' : 
                          claim.status === 'rejected' ? 'destructive' : 
                          'secondary'
                        }>
                          {claim.status}
                        </Badge>
                        {claim.status === 'pending' && (
                          <div className="space-x-2">
                            <Button size="sm" variant="outline" onClick={() => handleRejectClaim(claim.id)}>
                              Reject
                            </Button>
                            <Button size="sm" onClick={() => handleApproveClaim(claim.id)}>
                              Approve
                            </Button>
                          </div>
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

export default Claims;
