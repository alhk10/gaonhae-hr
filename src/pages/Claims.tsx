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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Receipt, Settings, Check, X, Eye, Plus, Trash2 } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { getClaims, updateClaimStatus, createClaim, type Claim } from '@/services/claimsService';
import { getEmployees } from '@/services/employeeService';

const Claims = () => {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAddClaimOpen, setIsAddClaimOpen] = useState(false);
  const [claimTypes, setClaimTypes] = useState(['Travel', 'Meals', 'Office Supplies', 'Medical', 'Training']);
  const [claimLimits, setClaimLimits] = useState<Record<string, number | null>>({
    'Travel': 500,
    'Meals': 100,
    'Office Supplies': 200,
    'Medical': 1000,
    'Training': 2000
  });
  const [employeeCoPayments, setEmployeeCoPayments] = useState<Record<string, number>>({
    'Travel': 0,
    'Meals': 10,
    'Office Supplies': 0,
    'Medical': 20,
    'Training': 0
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [claimsData, employeesData] = await Promise.all([
          getClaims(),
          getEmployees()
        ]);
        setClaims(claimsData);
        setEmployees(employeesData);
      } catch (error) {
        console.error('Error loading data:', error);
        toast('Error loading data');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const handleApprove = async (id: number) => {
    try {
      await updateClaimStatus(id, 'Approved');
      setClaims(prev => prev.map(claim => 
        claim.id === id ? { ...claim, status: 'Approved' as const } : claim
      ));
      toast("Claim approved");
    } catch (error) {
      console.error('Error approving claim:', error);
      toast('Error approving claim');
    }
  };

  const handleReject = async (id: number) => {
    try {
      await updateClaimStatus(id, 'Rejected');
      setClaims(prev => prev.map(claim => 
        claim.id === id ? { ...claim, status: 'Rejected' as const } : claim
      ));
      toast("Claim rejected");
    } catch (error) {
      console.error('Error rejecting claim:', error);
      toast('Error rejecting claim');
    }
  };

  const handleAddClaim = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    
    const employeeId = formData.get('employee') as string;
    const type = formData.get('type') as string;
    const amount = parseFloat(formData.get('amount') as string);
    const description = formData.get('description') as string;

    if (!employeeId || !type || !amount || !description) {
      toast('Please fill in all required fields');
      return;
    }

    // Find the employee name for the claim
    const selectedEmployee = employees.find(emp => emp.id === employeeId);
    const employeeName = selectedEmployee ? selectedEmployee.name : 'Unknown Employee';

    try {
      await createClaim({
        employeeId,
        employee: employeeName,
        type,
        amount,
        description,
        date: new Date().toISOString().split('T')[0],
        status: 'Pending' as const
      });
      
      // Refresh claims list
      const updatedClaims = await getClaims();
      setClaims(updatedClaims);
      setIsAddClaimOpen(false);
      toast("Claim added successfully");
    } catch (error) {
      console.error('Error adding claim:', error);
      toast('Error adding claim');
    }
  };

  const handleRemoveClaimType = (typeToRemove: string) => {
    const updatedTypes = claimTypes.filter(type => type !== typeToRemove);
    setClaimTypes(updatedTypes);
    
    // Remove from limits and co-payments
    const updatedLimits = { ...claimLimits };
    delete updatedLimits[typeToRemove];
    setClaimLimits(updatedLimits);
    
    const updatedCoPayments = { ...employeeCoPayments };
    delete updatedCoPayments[typeToRemove];
    setEmployeeCoPayments(updatedCoPayments);
    
    toast(`${typeToRemove} claim type removed`);
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
    
    // Update claim limits (null for unlimited)
    const newClaimLimits: Record<string, number | null> = {};
    const newCoPayments: Record<string, number> = {};
    
    newClaimTypes.forEach((type) => {
      const limitValue = formData.get(`limit_${type}`) as string;
      const coPayValue = formData.get(`copay_${type}`) as string;
      
      // If limit is empty or blank, set to null for unlimited
      newClaimLimits[type] = limitValue && limitValue.trim() ? parseFloat(limitValue) : null;
      newCoPayments[type] = coPayValue ? parseFloat(coPayValue) : 0;
    });
    
    // Handle the new claim type if provided
    const newClaimType = formData.get('newClaimType') as string;
    const newLimit = formData.get('newLimit') as string;
    const newCoPay = formData.get('newCoPay') as string;
    
    if (newClaimType && newClaimType.trim() && !newClaimTypes.includes(newClaimType.trim())) {
      newClaimTypes.push(newClaimType.trim());
      newClaimLimits[newClaimType.trim()] = newLimit && newLimit.trim() ? parseFloat(newLimit) : null;
      newCoPayments[newClaimType.trim()] = newCoPay ? parseFloat(newCoPay) : 0;
    }
    
    setClaimTypes(newClaimTypes.length > 0 ? newClaimTypes : claimTypes);
    setClaimLimits(Object.keys(newClaimLimits).length > 0 ? newClaimLimits : claimLimits);
    setEmployeeCoPayments(Object.keys(newCoPayments).length > 0 ? newCoPayments : employeeCoPayments);
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

  const formatLimit = (limit: number | null) => {
    return limit === null ? 'Unlimited' : `S$${limit}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex h-[calc(100vh-73px)]">
          <Sidebar />
          <main className="flex-1 p-6 overflow-auto">
            <div className="flex items-center justify-center h-full">
              <p>Loading claims...</p>
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
                <p className="text-gray-600">Review and manage employee expense claims</p>
              </div>
              <div className="flex space-x-2">
                <Dialog open={isAddClaimOpen} onOpenChange={setIsAddClaimOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Claim
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Add New Claim</DialogTitle>
                      <DialogDescription>Create a new expense claim for an employee.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAddClaim}>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label htmlFor="employee">Employee</Label>
                          <Select name="employee" required>
                            <SelectTrigger>
                              <SelectValue placeholder="Select employee" />
                            </SelectTrigger>
                            <SelectContent>
                              {employees.map((employee) => (
                                <SelectItem key={employee.id} value={employee.id}>
                                  {employee.name} ({employee.id})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="type">Claim Type</Label>
                          <Select name="type" required>
                            <SelectTrigger>
                              <SelectValue placeholder="Select claim type" />
                            </SelectTrigger>
                            <SelectContent>
                              {claimTypes.map((type) => (
                                <SelectItem key={type} value={type}>
                                  {type} ({formatLimit(claimLimits[type])})
                                  {employeeCoPayments[type] > 0 && ` - ${employeeCoPayments[type]}% co-pay`}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="amount">Amount (S$)</Label>
                          <Input
                            name="amount"
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            required
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="description">Description</Label>
                          <Textarea
                            name="description"
                            placeholder="Enter claim description"
                            required
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsAddClaimOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit">Add Claim</Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
                <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <Settings className="w-4 h-4 mr-2" />
                      Claim Settings
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Claim Settings</DialogTitle>
                      <DialogDescription>Manage claim types, limits, and employee co-payment percentages.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSaveSettings}>
                      <div className="grid gap-4 py-4 max-h-96 overflow-y-auto">
                        <div>
                          <Label className="text-sm font-medium">Claim Types & Limits</Label>
                          <div className="grid gap-3 mt-2">
                            <div className="grid grid-cols-4 gap-2 text-xs font-medium text-gray-500">
                              <span>Claim Type</span>
                              <span>Limit (S$)</span>
                              <span>Employee Co-pay (%)</span>
                              <span>Action</span>
                            </div>
                            {claimTypes.map((type, index) => (
                              <div key={index} className="grid grid-cols-4 gap-2 items-center">
                                <Input 
                                  name="claimTypes" 
                                  defaultValue={type}
                                  placeholder="Claim type name"
                                />
                                <Input 
                                  name={`limit_${type}`}
                                  type="number"
                                  step="0.01"
                                  defaultValue={claimLimits[type] || ''}
                                  placeholder="Leave blank for unlimited"
                                />
                                <Input 
                                  name={`copay_${type}`}
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  max="100"
                                  defaultValue={employeeCoPayments[type] || 0}
                                  placeholder="0"
                                />
                                <Button 
                                  type="button" 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleRemoveClaimType(type)}
                                  className="w-8 h-8 p-0"
                                >
                                  <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                              </div>
                            ))}
                            <div className="grid grid-cols-4 gap-2 border-t pt-2">
                              <Input 
                                name="newClaimType" 
                                placeholder="Add new claim type"
                              />
                              <Input 
                                name="newLimit"
                                type="number"
                                step="0.01"
                                placeholder="Limit (S$) or blank"
                              />
                              <Input 
                                name="newCoPay"
                                type="number"
                                step="0.01"
                                min="0"
                                max="100"
                                placeholder="Co-pay %"
                              />
                              <div></div>
                            </div>
                          </div>
                          <p className="text-xs text-gray-500 mt-2">
                            Leave limit blank for unlimited claims. Co-pay percentage is the amount employee pays.
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
                      <TableHead>Co-pay</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {claims.map((claim) => {
                      const coPayPercentage = employeeCoPayments[claim.type] || 0;
                      const coPayAmount = (claim.amount * coPayPercentage) / 100;
                      return (
                        <TableRow key={claim.id}>
                          <TableCell className="font-medium">{claim.employee}</TableCell>
                          <TableCell>{claim.type}</TableCell>
                          <TableCell>S${claim.amount.toFixed(2)}</TableCell>
                          <TableCell>
                            {coPayPercentage > 0 ? (
                              <span className="text-sm">
                                {coPayPercentage}% (S${coPayAmount.toFixed(2)})
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </TableCell>
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
                      );
                    })}
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
