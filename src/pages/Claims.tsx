
import React, { useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Settings, Receipt, Plus, Trash2, Check, X } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { getClaims, updateClaimStatus, Claim } from '@/services/claimsService';
import { getEmployees } from '@/services/employeeService';

interface ClaimType {
  id: string;
  name: string;
  limit: number | null;
  coPay: number;
}

const Claims = () => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [claimTypes, setClaimTypes] = useState<ClaimType[]>([]);
  const [stats, setStats] = useState({
    totalClaims: 0,
    pendingClaims: 0,
    totalAmount: 0
  });

  // Load claims, employees, and claim types
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        console.log('Loading claims and employee data...');
        
        // Load claims and employees in parallel
        const [claimsData, employeesData] = await Promise.all([
          getClaims(),
          getEmployees()
        ]);
        
        console.log('Loaded claims:', claimsData);
        console.log('Loaded employees:', employeesData);
        
        setClaims(claimsData);
        setEmployees(employeesData);
        
        // Calculate real-time stats from actual data
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const thisMonthClaims = claimsData.filter(claim => {
          const claimDate = new Date(claim.date);
          return claimDate.getMonth() === currentMonth && claimDate.getFullYear() === currentYear;
        });
        
        const newStats = {
          totalClaims: thisMonthClaims.length,
          pendingClaims: claimsData.filter(claim => claim.status === 'Pending').length,
          totalAmount: thisMonthClaims.reduce((sum, claim) => sum + claim.amount, 0)
        };
        
        console.log('Calculated stats:', newStats);
        setStats(newStats);
        
        // Load claim types from localStorage
        const stored = localStorage.getItem('claim_types');
        if (stored) {
          const parsedTypes = JSON.parse(stored);
          console.log('Loaded claim types:', parsedTypes);
          setClaimTypes(parsedTypes);
        } else {
          // Default claim types with medical restriction
          const defaultTypes: ClaimType[] = [
            { id: 'medical', name: 'Medical', limit: 1000, coPay: 0 },
            { id: 'transport', name: 'Transport', limit: 500, coPay: 0 },
            { id: 'meal', name: 'Meal', limit: 300, coPay: 20 },
            { id: 'equipment', name: 'Equipment', limit: null, coPay: 10 }
          ];
          console.log('Setting default claim types:', defaultTypes);
          setClaimTypes(defaultTypes);
          localStorage.setItem('claim_types', JSON.stringify(defaultTypes));
        }
      } catch (error) {
        console.error('Error loading data:', error);
        toast("Error loading claims data");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Auto-refresh claims data every 30 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        console.log('Auto-refreshing claims data...');
        const claimsData = await getClaims();
        setClaims(claimsData);
        
        // Recalculate stats
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const thisMonthClaims = claimsData.filter(claim => {
          const claimDate = new Date(claim.date);
          return claimDate.getMonth() === currentMonth && claimDate.getFullYear() === currentYear;
        });
        
        setStats({
          totalClaims: thisMonthClaims.length,
          pendingClaims: claimsData.filter(claim => claim.status === 'Pending').length,
          totalAmount: thisMonthClaims.reduce((sum, claim) => sum + claim.amount, 0)
        });
      } catch (error) {
        console.error('Error refreshing claims:', error);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const handleApproveClaim = async (claimId: number) => {
    try {
      const claim = claims.find(c => c.id === claimId);
      if (!claim) return;

      // Check if medical claim and employee type
      if (claim.type === 'Medical') {
        const employee = employees.find(emp => emp.id === claim.employeeId);
        if (employee && employee.type !== 'Full-Time') {
          toast("Medical claims are only available for full-time employees");
          return;
        }
      }

      await updateClaimStatus(claimId, 'Approved');
      // Refresh claims data
      const updatedClaims = await getClaims();
      setClaims(updatedClaims);
      
      // Update stats
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const thisMonthClaims = updatedClaims.filter(claim => {
        const claimDate = new Date(claim.date);
        return claimDate.getMonth() === currentMonth && claimDate.getFullYear() === currentYear;
      });
      
      setStats({
        totalClaims: thisMonthClaims.length,
        pendingClaims: updatedClaims.filter(claim => claim.status === 'Pending').length,
        totalAmount: thisMonthClaims.reduce((sum, claim) => sum + claim.amount, 0)
      });
      
      toast("Claim approved successfully");
    } catch (error) {
      console.error('Error approving claim:', error);
      toast("Error approving claim");
    }
  };

  const handleRejectClaim = async (claimId: number) => {
    try {
      await updateClaimStatus(claimId, 'Rejected');
      // Refresh claims data
      const updatedClaims = await getClaims();
      setClaims(updatedClaims);
      
      // Update stats
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const thisMonthClaims = updatedClaims.filter(claim => {
        const claimDate = new Date(claim.date);
        return claimDate.getMonth() === currentMonth && claimDate.getFullYear() === currentYear;
      });
      
      setStats({
        totalClaims: thisMonthClaims.length,
        pendingClaims: updatedClaims.filter(claim => claim.status === 'Pending').length,
        totalAmount: thisMonthClaims.reduce((sum, claim) => sum + claim.amount, 0)
      });
      
      toast("Claim rejected successfully");
    } catch (error) {
      console.error('Error rejecting claim:', error);
      toast("Error rejecting claim");
    }
  };

  const saveClaimTypes = (types: ClaimType[]) => {
    try {
      console.log('Saving claim types:', types);
      localStorage.setItem('claim_types', JSON.stringify(types));
      setClaimTypes(types);
      toast("Claim settings saved successfully");
    } catch (error) {
      console.error('Error saving claim types:', error);
      toast("Error saving claim settings");
    }
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    
    try {
      // Get existing types and new type data
      const updatedTypes = [...claimTypes];
      
      // Handle new claim type if provided
      const newName = formData.get('newName') as string;
      const newLimitStr = formData.get('newLimit') as string;
      const newCoPayStr = formData.get('newCoPay') as string;
      
      if (newName && newName.trim()) {
        const newLimit = newLimitStr && newLimitStr.trim() ? parseFloat(newLimitStr) : null;
        const newCoPay = newCoPayStr && newCoPayStr.trim() ? parseFloat(newCoPayStr) : 0;
        
        // Check if claim type already exists
        const existingIndex = updatedTypes.findIndex(type => 
          type.name.toLowerCase() === newName.trim().toLowerCase()
        );
        
        if (existingIndex >= 0) {
          // Update existing type
          updatedTypes[existingIndex] = {
            ...updatedTypes[existingIndex],
            limit: newLimit,
            coPay: Math.max(0, Math.min(100, newCoPay))
          };
        } else {
          // Add new type
          updatedTypes.push({
            id: newName.toLowerCase().replace(/\s+/g, '-'),
            name: newName.trim(),
            limit: newLimit,
            coPay: Math.max(0, Math.min(100, newCoPay))
          });
        }
      }
      
      // Update existing types from form
      claimTypes.forEach((type, index) => {
        const limitKey = `limit-${type.id}`;
        const coPayKey = `coPay-${type.id}`;
        
        const limitStr = formData.get(limitKey) as string;
        const coPayStr = formData.get(coPayKey) as string;
        
        if (limitStr !== null && coPayStr !== null) {
          const limit = limitStr && limitStr.trim() ? parseFloat(limitStr) : null;
          const coPay = coPayStr && coPayStr.trim() ? parseFloat(coPayStr) : 0;
          
          const typeIndex = updatedTypes.findIndex(t => t.id === type.id);
          if (typeIndex >= 0) {
            updatedTypes[typeIndex] = {
              ...updatedTypes[typeIndex],
              limit: limit,
              coPay: Math.max(0, Math.min(100, coPay))
            };
          }
        }
      });
      
      console.log('Updated claim types before save:', updatedTypes);
      saveClaimTypes(updatedTypes);
      setIsSettingsOpen(false);
      
    } catch (error) {
      console.error('Error processing form data:', error);
      toast("Error saving claim settings");
    }
  };

  const handleRemoveClaimType = (typeId: string) => {
    const updatedTypes = claimTypes.filter(type => type.id !== typeId);
    console.log('Removing claim type:', typeId, 'Updated types:', updatedTypes);
    saveClaimTypes(updatedTypes);
  };

  const formatCurrency = (amount: number) => {
    return `S$${amount.toFixed(2)}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex h-[calc(100vh-73px)]">
          <Sidebar />
          <main className="flex-1 p-6 overflow-auto">
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading claims data...</p>
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
        <main className="flex-1 p-6 overflow-auto">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Claims Management</h2>
                <p className="text-gray-600">Manage employee expense claims and reimbursements</p>
              </div>
              <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Claim Settings</DialogTitle>
                    <DialogDescription>Manage claim types, annual limits, and employee co-payment percentages.</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSaveSettings}>
                    <div className="grid gap-4 py-4 max-h-96 overflow-y-auto">
                      <div>
                        <Label className="text-sm font-medium">Claim Types & Annual Limits</Label>
                        <div className="grid gap-3 mt-2">
                          <div className="grid grid-cols-4 gap-2 text-xs font-medium text-gray-500">
                            <span>Claim Type</span>
                            <span>Annual Limit (S$)</span>
                            <span>Employee Co-pay (%)</span>
                            <span>Action</span>
                          </div>
                          {claimTypes.map((type) => (
                            <div key={type.id} className="grid grid-cols-4 gap-2 items-center">
                              <span className="text-sm font-medium">{type.name}</span>
                              <Input 
                                name={`limit-${type.id}`}
                                type="number"
                                step="0.01"
                                placeholder="Unlimited"
                                defaultValue={type.limit || ''}
                              />
                              <Input 
                                name={`coPay-${type.id}`}
                                type="number"
                                min="0"
                                max="100"
                                step="0.1"
                                placeholder="0"
                                defaultValue={type.coPay}
                              />
                              <Button 
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleRemoveClaimType(type.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          ))}
                          <div className="border-t pt-3 mt-2">
                            <Label className="text-sm font-medium text-green-700">Add New Claim Type</Label>
                            <div className="grid grid-cols-4 gap-2 items-center mt-2">
                              <Input 
                                name="newName"
                                placeholder="Claim type name"
                              />
                              <Input 
                                name="newLimit"
                                type="number"
                                step="0.01"
                                placeholder="Annual limit (S$) or blank"
                              />
                              <Input 
                                name="newCoPay"
                                type="number"
                                min="0"
                                max="100"
                                step="0.1"
                                placeholder="0"
                              />
                              <div className="flex items-center justify-center">
                                <Plus className="w-4 h-4 text-green-600" />
                              </div>
                            </div>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          Annual limits apply per calendar year. Leave limit blank for unlimited claims. Co-pay percentage is the amount employee pays.
                        </p>
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

            {/* Claims Overview - Updated with real-time stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Claims</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalClaims}</div>
                  <p className="text-xs text-gray-500">This month</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">{stats.pendingClaims}</div>
                  <p className="text-xs text-gray-500">Awaiting review</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalAmount)}</div>
                  <p className="text-xs text-gray-500">This month</p>
                </CardContent>
              </Card>
            </div>

            {/* Claims List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Receipt className="w-5 h-5" />
                  <span>Claims List</span>
                </CardTitle>
                <CardDescription>All employee expense claims with real-time updates</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {claims.map((claim) => (
                      <TableRow key={claim.id}>
                        <TableCell className="font-medium">{claim.employee}</TableCell>
                        <TableCell>
                          {claim.type}
                          {claim.type === 'Medical' && (
                            <span className="ml-2 text-xs text-blue-600">(Full-time only)</span>
                          )}
                        </TableCell>
                        <TableCell>{formatCurrency(claim.amount)}</TableCell>
                        <TableCell>{claim.date}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              claim.status === 'Approved' ? 'default' : 
                              claim.status === 'Pending' ? 'secondary' : 
                              'destructive'
                            }
                          >
                            {claim.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            {claim.status === 'Pending' && (
                              <>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => handleApproveClaim(claim.id)}
                                  className="text-green-600 hover:text-green-700"
                                >
                                  <Check className="w-4 h-4" />
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => handleRejectClaim(claim.id)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {claims.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                          No claims found.
                        </TableCell>
                      </TableRow>
                    )}
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
