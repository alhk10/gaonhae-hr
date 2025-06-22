
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
    { id: 'CLM001', employee: 'John Tan', type: 'Transport', amount: 'S$45.50', status: 'pending' },
    { id: 'CLM002', employee: 'Mary Ng', type: 'Meals', amount: 'S$120.00', status: 'approved' },
    { id: 'CLM003', employee: 'David Lim', type: 'Equipment', amount: 'S$850.00', status: 'pending' },
  ]);

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
              <Button className="flex items-center space-x-2">
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
                      <p className="text-2xl font-bold text-gray-900">{claims.filter(c => c.status === 'pending').length}</p>
                    </div>
                    <FileText className="w-8 h-8 text-orange-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Amount</p>
                      <p className="text-2xl font-bold text-gray-900">S$1,015.50</p>
                    </div>
                    <DollarSign className="w-8 h-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">This Month</p>
                      <p className="text-2xl font-bold text-gray-900">25</p>
                    </div>
                    <FileText className="w-8 h-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Recent Claims</CardTitle>
                <CardDescription>Latest expense claims requiring approval</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {claims.map((claim) => (
                    <div key={claim.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{claim.employee}</p>
                        <p className="text-sm text-gray-600">{claim.id} • {claim.type} • {claim.amount}</p>
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
