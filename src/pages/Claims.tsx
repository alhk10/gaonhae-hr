import React, { useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Receipt, Settings, Check, X, Eye } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { getAllClaims, updateClaimStatus, type Claim } from '@/data/claimsData';

const Claims = () => {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [claimTypes, setClaimTypes] = useState(['Travel', 'Meals', 'Office Supplies', 'Medical', 'Training']);
  const [claimLimits, setClaimLimits] = useState<Record<string, number>>({
    'Travel': 500,
    'Meals': 100,
    'Office Supplies': 200,
    'Medical': 1000,
    'Training': 2000
  });

  useEffect(() => {
    // Load claims data on component mount
    const claimsData = getAllClaims();
    setClaims(claimsData);
  }, []);

  const handleApprove = (id: number) => {
    updateClaimStatus(id, 'Approved');
    setClaims(prev => prev.map(claim => 
      claim.id === id ? { ...claim, status: 'Approved' as const } : claim
    ));
    toast("Claim approved");
  };

  const handleReject = (id: number) => {
    updateClaimStatus(id, 'Rejected');
    setClaims(prev => prev.map(claim => 
      claim.id === id ? { ...claim, status: 'Rejected' as const } : claim
    ));
    toast("Claim rejected");
  };

  const handleSaveSettings = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    
    // Update claim types
    const newClaimTypes: string[] = [];
    const claimTypesData = formData.getAll('claimTypes');
    claimTypesData.forEach((type) => {
      if (type.toString().trim()) {
        newClaimTypes.push(type.toString().trim());
      }
    });
    
    // Update claim limits
    const newClaimLimits: Record<string, number> = {};
    newClaimTypes.forEach((type) => {
      const limit = formData.get(`limit_${type}`) as string;
      newClaimLimits[type] = parseFloat(limit) || 0;
    });
    
    // Handle the new claim type if provided
    const newClaimType = formData.get('claimTypes') as string;
    const newLimit = formData.get('limit_new') as string;
    if (newClaimType && newClaimType.trim() && !newClaimTypes.includes(newClaimType.trim())) {
      newClaimTypes.push(newClaimType.trim());
      newClaimLimits[newClaimType.trim()] = parseFloat(newLimit) || 0;
    }
    
    setClaimTypes(newClaimTypes.length > 0 ? newClaimTypes : claimTypes);
    setClaimLimits(Object.keys(newClaimLimits).length > 0 ? newClaimLimits : claimLimits);
    setIsSettingsOpen(false);
    toast("Claim settings updated");
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Approved': return 'default';
      case 'Rejected': return 'destructive';
      default: return 'secondary';
    }
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
                <p className="text-gray-600">Review and manage employee expense claims</p>
              </div>
              <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Settings className="w-4 h-4 mr-2" />
                    Claim Settings
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Claim Settings</DialogTitle>
                    <DialogDescription>Manage claim types and limits.</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSaveSettings}>
                    <div className="grid gap-4 py-4 max-h-96 overflow-y-auto">
                      <div>
                        <Label className="text-sm font-medium">Claim Types & Limits</Label>
                        <div className="grid gap-3 mt-2">
                          {claimTypes.map((type, index) => (
                            <div key={index} className="grid grid-cols-2 gap-2">
                              <Input 
                                name="claimTypes" 
                                defaultValue={type}
                                placeholder="Claim type name"
                              />
                              <Input 
                                name={`limit_${type}`}
                                type="number"
                                step="0.01"
                                defaultValue={claimLimits[type] || 0}
                                placeholder="Limit (S$)"
                              />
                            </div>
                          ))}
                          <div className="grid grid-cols-2 gap-2">
                            <Input 
                              name="claimTypes" 
                              placeholder="Add new claim type"
                            />
                            <Input 
                              name="limit_new"
                              type="number"
                              step="0.01"
                              placeholder="Limit (S$)"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setIsSettingsOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit">Save Settings</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Total Claims</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{claims.length}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Pending</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-orange-600">
                    {claims.filter(claim => claim.status === 'Pending').length}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Approved</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-green-600">
                    {claims.filter(claim => claim.status === 'Approved').length}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Total Amount</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">
                    S${claims.reduce((sum, claim) => sum + claim.amount, 0).toFixed(2)}
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Receipt className="w-5 h-5" />
                  <span>Claims List</span>
                </CardTitle>
                <CardDescription>All employee expense claims</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {claims.map((claim) => (
                      <TableRow key={claim.id}>
                        <TableCell className="font-medium">{claim.employee}</TableCell>
                        <TableCell>{claim.type}</TableCell>
                        <TableCell>S${claim.amount.toFixed(2)}</TableCell>
                        <TableCell>{claim.date}</TableCell>
                        <TableCell className="max-w-xs truncate">{claim.description}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(claim.status)}>
                            {claim.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            {claim.status === 'Pending' && (
                              <>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleApprove(claim.id)}
                                >
                                  <Check className="w-4 h-4" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleReject(claim.id)}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                            <Button size="sm" variant="outline">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Claims;
