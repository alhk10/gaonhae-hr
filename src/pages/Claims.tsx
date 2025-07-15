
import React, { useState, useEffect } from 'react';
import AuthGuard from '@/components/auth/AuthGuard';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AddClaimDialog from '@/components/claim/AddClaimDialog';
import { DollarSign, FileText, Clock, Users, Search, Filter, Eye, Plus } from 'lucide-react';
import { getClaims, updateClaimStatus, type Claim } from '@/services/claimsService';
import { getEmployees } from '@/services/employeeService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/sonner';

const Claims = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [claims, setClaims] = useState<Claim[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [claimTypes, setClaimTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [claimsData, employeesData] = await Promise.all([
        getClaims(),
        getEmployees()
      ]);
      setClaims(claimsData);
      setEmployees(employeesData);
      
      // Extract claim types from claims data
      const types = [...new Set(claimsData.map(claim => claim.type))];
      setClaimTypes(types.map(type => ({ name: type })));
    } catch (error) {
      console.error('Error loading claims data:', error);
      toast.error('Error loading claims data');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveClaim = async (claimId: number) => {
    try {
      await updateClaimStatus(claimId, 'Approved');
      toast.success('Claim approved successfully');
      await loadData();
    } catch (error) {
      console.error('Error approving claim:', error);
      toast.error('Error approving claim');
    }
  };

  const handleRejectClaim = async (claimId: number) => {
    try {
      await updateClaimStatus(claimId, 'Rejected');
      toast.success('Claim rejected successfully');
      await loadData();
    } catch (error) {
      console.error('Error rejecting claim:', error);
      toast.error('Error rejecting claim');
    }
  };

  const handleViewClaim = (claim: Claim) => {
    setSelectedClaim(claim);
    setIsViewDialogOpen(true);
  };

  const filteredClaims = claims.filter(claim => {
    const matchesSearch = claim.employee.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         claim.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         claim.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || claim.status === statusFilter;
    const matchesType = typeFilter === 'all' || claim.type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const pendingClaims = claims.filter(claim => claim.status === 'Pending');
  const approvedClaims = claims.filter(claim => claim.status === 'Approved');
  const rejectedClaims = claims.filter(claim => claim.status === 'Rejected');
  const totalAmount = approvedClaims.reduce((sum, claim) => sum + claim.amount, 0);

  if (loading) {
    return (
      <AuthGuard>
        <ResponsiveLayout>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Loading claims...</span>
          </div>
        </ResponsiveLayout>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <ResponsiveLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Claims Management</h1>
              <p className="text-gray-600 mt-1">Manage employee expense claims and reimbursements</p>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Pending Claims</p>
                    <p className="text-2xl font-bold text-yellow-600">{pendingClaims.length}</p>
                  </div>
                  <Clock className="w-8 h-8 text-yellow-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Approved Claims</p>
                    <p className="text-2xl font-bold text-green-600">{approvedClaims.length}</p>
                  </div>
                  <FileText className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Total Amount</p>
                    <p className="text-2xl font-bold text-blue-600">S${totalAmount.toLocaleString()}</p>
                  </div>
                  <DollarSign className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Rejected</p>
                    <p className="text-2xl font-bold text-red-600">{rejectedClaims.length}</p>
                  </div>
                  <Users className="w-8 h-8 text-red-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="all">All Claims</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Claims</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {claims.slice(0, 5).map((claim) => (
                        <div key={claim.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <p className="font-medium">{claim.employee}</p>
                              <Badge variant={
                                claim.status === 'Approved' ? 'default' :
                                claim.status === 'Pending' ? 'secondary' : 'destructive'
                              }>
                                {claim.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600">
                              {claim.type} • S${claim.amount.toLocaleString()}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(claim.date).toLocaleDateString()}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewClaim(claim)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                      {claims.length === 0 && (
                        <p className="text-gray-500 text-center py-4">No claims found</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Claims by Type</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {claimTypes.map(type => {
                        const typeClaims = claims.filter(claim => claim.type === type.name);
                        const typeAmount = typeClaims.reduce((sum, claim) => sum + claim.amount, 0);
                        return (
                          <div key={type.name} className="flex justify-between items-center">
                            <span>{type.name}</span>
                            <div className="text-right">
                              <p className="font-semibold">S${typeAmount.toLocaleString()}</p>
                              <p className="text-xs text-gray-500">{typeClaims.length} claims</p>
                            </div>
                          </div>
                        );
                      })}
                      {claimTypes.length === 0 && (
                        <p className="text-gray-500 text-center py-4">No claim types found</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="pending" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Pending Claims ({pendingClaims.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {pendingClaims.map((claim) => (
                      <div key={claim.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <p className="font-medium">{claim.employee}</p>
                            <Badge variant="secondary">Pending</Badge>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {claim.type} • S${claim.amount.toLocaleString()}
                          </p>
                          <p className="text-sm text-gray-500 mt-1">{claim.description}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            Submitted: {new Date(claim.date).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewClaim(claim)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleApproveClaim(claim.id)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleRejectClaim(claim.id)}
                          >
                            Reject
                          </Button>
                        </div>
                      </div>
                    ))}
                    {pendingClaims.length === 0 && (
                      <p className="text-gray-500 text-center py-8">No pending claims</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="all" className="space-y-6">
              {/* Filters */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-center space-x-4 space-y-2">
                    <div className="flex items-center space-x-2">
                      <Search className="w-4 h-4 text-gray-500" />
                      <Input
                        placeholder="Search claims..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-64"
                      />
                    </div>
                    
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="Pending">Pending</SelectItem>
                        <SelectItem value="Approved">Approved</SelectItem>
                        <SelectItem value="Rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        {claimTypes.map(type => (
                          <SelectItem key={type.name} value={type.name}>{type.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Claims List */}
              <Card>
                <CardHeader>
                  <CardTitle>All Claims ({filteredClaims.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {filteredClaims.map((claim) => (
                      <div key={claim.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <p className="font-medium">{claim.employee}</p>
                            <Badge variant={
                              claim.status === 'Approved' ? 'default' :
                              claim.status === 'Pending' ? 'secondary' : 'destructive'
                            }>
                              {claim.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {claim.type} • S${claim.amount.toLocaleString()}
                          </p>
                          <p className="text-sm text-gray-500 mt-1">{claim.description}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            Submitted: {new Date(claim.date).toLocaleDateString()}
                            {claim.receipt_url && ' • Has Receipt'}
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewClaim(claim)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {claim.status === 'Pending' && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleApproveClaim(claim.id)}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleRejectClaim(claim.id)}
                              >
                                Reject
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                    {filteredClaims.length === 0 && (
                      <p className="text-gray-500 text-center py-8">No claims found matching your criteria</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Monthly Trends</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-4">Claims submitted by month</p>
                    <div className="space-y-2">
                      {/* Simple monthly breakdown */}
                      {Array.from(new Set(claims.map(claim => 
                        new Date(claim.date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                      ))).slice(0, 6).map(month => {
                        const monthClaims = claims.filter(claim => 
                          new Date(claim.date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) === month
                        );
                        const monthAmount = monthClaims.reduce((sum, claim) => sum + claim.amount, 0);
                        return (
                          <div key={month} className="flex justify-between items-center p-2 hover:bg-gray-50 rounded">
                            <span className="text-sm">{month}</span>
                            <div className="text-right">
                              <p className="font-semibold">S${monthAmount.toLocaleString()}</p>
                              <p className="text-xs text-gray-500">{monthClaims.length} claims</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Top Claimants</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-4">Employees with most claims</p>
                    <div className="space-y-2">
                      {/* Group by employee and show top claimants */}
                      {Object.entries(
                        claims.reduce((acc, claim) => {
                          if (!acc[claim.employee]) {
                            acc[claim.employee] = { count: 0, amount: 0 };
                          }
                          acc[claim.employee].count++;
                          acc[claim.employee].amount += claim.amount;
                          return acc;
                        }, {} as Record<string, { count: number; amount: number }>)
                      ).sort(([,a], [,b]) => b.count - a.count).slice(0, 5).map(([employee, data]) => (
                        <div key={employee} className="flex justify-between items-center p-2 hover:bg-gray-50 rounded">
                          <span className="text-sm">{employee}</span>
                          <div className="text-right">
                            <p className="font-semibold">S${data.amount.toLocaleString()}</p>
                            <p className="text-xs text-gray-500">{data.count} claims</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>

          <AddClaimDialog onClaimAdded={loadData} />

          <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Claim Details</DialogTitle>
                <DialogDescription>
                  View complete claim information
                </DialogDescription>
              </DialogHeader>
              {selectedClaim && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Employee</label>
                      <p className="font-semibold">{selectedClaim.employee}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Type</label>
                      <p className="font-semibold">{selectedClaim.type}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Amount</label>
                      <p className="font-semibold">S${selectedClaim.amount.toLocaleString()}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Status</label>
                      <Badge variant={
                        selectedClaim.status === 'Approved' ? 'default' :
                        selectedClaim.status === 'Pending' ? 'secondary' : 'destructive'
                      }>
                        {selectedClaim.status}
                      </Badge>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Date Submitted</label>
                      <p className="font-semibold">{new Date(selectedClaim.date).toLocaleDateString()}</p>
                    </div>
                    {selectedClaim.receipt_url && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Receipt</label>
                        <a 
                          href={selectedClaim.receipt_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          View Receipt
                        </a>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Description</label>
                    <p className="mt-1 p-3 bg-gray-50 rounded-lg">{selectedClaim.description}</p>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </ResponsiveLayout>
    </AuthGuard>
  );
};

export default Claims;
