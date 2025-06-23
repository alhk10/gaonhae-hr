
import React, { useState } from 'react';
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
import { CreditCard, Plus, Upload, Check, X } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

const Claims = () => {
  const [claims, setClaims] = useState([
    { id: 1, employee: 'John Tan', type: 'Transport', amount: 50, gstAmount: 3.5, status: 'Pending', date: '2024-12-20', description: 'Taxi to client meeting' },
    { id: 2, employee: 'Mary Ng', type: 'Meals', amount: 25, gstAmount: 1.75, status: 'Approved', date: '2024-12-19', description: 'Lunch with client' },
  ]);

  const [isNewClaimOpen, setIsNewClaimOpen] = useState(false);
  const [totalApproved, setTotalApproved] = useState(25);

  const employees = ['John Tan', 'Mary Ng', 'David Lim', 'Sarah Loh'];
  const claimTypes = ['Transport', 'Meals', 'Equipment', 'Training', 'Others'];

  const handleApprove = (id) => {
    const claim = claims.find(c => c.id === id);
    if (claim && claim.status === 'Pending') {
      setClaims(prev => prev.map(claim => 
        claim.id === id ? { ...claim, status: 'Approved' } : claim
      ));
      setTotalApproved(prev => prev + claim.amount + claim.gstAmount);
      toast("Claim approved");
    }
  };

  const handleReject = (id) => {
    setClaims(prev => prev.map(claim => 
      claim.id === id ? { ...claim, status: 'Rejected' } : claim
    ));
    toast("Claim rejected");
  };

  const handleNewClaim = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const amount = parseFloat(formData.get('amount'));
    const gstAmount = parseFloat(formData.get('gstAmount')) || 0;
    
    const newClaim = {
      id: Date.now(),
      employee: formData.get('employee'),
      type: formData.get('type'),
      amount,
      gstAmount,
      status: 'Approved',
      date: formData.get('date'),
      description: formData.get('description')
    };
    
    setClaims(prev => [...prev, newClaim]);
    setTotalApproved(prev => prev + amount + gstAmount);
    setIsNewClaimOpen(false);
    toast("New claim added and approved");
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
              <Dialog open={isNewClaimOpen} onOpenChange={setIsNewClaimOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    New Claim
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle>New Claim</DialogTitle>
                    <DialogDescription>Add a new expense claim for immediate approval.</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleNewClaim}>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="employee">Employee</Label>
                        <Select name="employee" required>
                          <SelectTrigger>
                            <SelectValue placeholder="Select employee" />
                          </SelectTrigger>
                          <SelectContent>
                            {employees.map((employee) => (
                              <SelectItem key={employee} value={employee}>
                                {employee}
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
                                {type}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="amount">Amount (S$)</Label>
                          <Input name="amount" type="number" step="0.01" placeholder="0.00" required />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="gstAmount">GST Amount (S$)</Label>
                          <Input name="gstAmount" type="number" step="0.01" placeholder="0.00" />
                        </div>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="date">Date of Expense</Label>
                        <Input name="date" type="date" required />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="vendor">Vendor/Merchant</Label>
                        <Input name="vendor" placeholder="Enter vendor name" />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea name="description" placeholder="Describe the expense..." required />
                      </div>
                      <div className="grid gap-2">
                        <Label>Receipt Upload</Label>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                          <Upload className="mx-auto h-8 w-8 text-gray-400" />
                          <p className="text-sm text-gray-600 mt-2">Upload receipt or supporting documents</p>
                          <input type="file" multiple accept="image/*,.pdf" className="hidden" id="receipt-upload" />
                          <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => document.getElementById('receipt-upload').click()}>
                            Choose Files
                          </Button>
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setIsNewClaimOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit">
                        <Check className="w-4 h-4 mr-2" />
                        Add & Approve
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                  <CardTitle>Pending Claims</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{claims.filter(c => c.status === 'Pending').length}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Total Amount Approved</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">S${totalApproved.toFixed(2)}</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CreditCard className="w-5 h-5" />
                  <span>Expense Claims</span>
                </CardTitle>
                <CardDescription>Review and approve employee claims</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>GST</TableHead>
                      <TableHead>Date</TableHead>
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
                        <TableCell>S${claim.gstAmount.toFixed(2)}</TableCell>
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
                            <Button variant="outline" size="sm">
                              View
                            </Button>
                            {claim.status === 'Pending' && (
                              <>
                                <Button variant="outline" size="sm" onClick={() => handleApprove(claim.id)}>
                                  Approve
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => handleReject(claim.id)}>
                                  Reject
                                </Button>
                              </>
                            )}
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
