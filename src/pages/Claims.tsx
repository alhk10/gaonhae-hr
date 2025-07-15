
import React, { useState, useEffect } from 'react';
import AuthGuard from '@/components/auth/AuthGuard';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AddClaimDialog from '@/components/claim/AddClaimDialog';
import { FileText, DollarSign, Clock, CheckCircle, XCircle, Search, Filter, Plus, Eye } from 'lucide-react';
import { getClaims, updateClaimStatus, type Claim } from '@/services/claimsService';
import { getClaimTypes } from '@/services/claimTypesService';
import { getEmployees } from '@/services/employeeService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const Claims = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [claims, setClaims] = useState<Claim[]>([]);
  const [claimTypes, setClaimTypes] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddClaimOpen, setIsAddClaimOpen] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [claimsData, typesData, employeesData] = await Promise.all([
        getClaims(),
        getClaimTypes(),
        getEmployees()
      ]);
      setClaims(claimsData);
      setClaimTypes(typesData);
      setEmployees(employeesData);
    } catch (error) {
      console.error('Error loading claims data:', error);
      toast('Error loading claims data');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveClaim = async (claimId: number) => {
    try {
      await updateClaimStatus(claimId, 'Approved');
      toast('Claim approved successfully');
      await loadData();
    } catch (error) {
      toast('Error approving claim');
    }
  };

  const handleRejectClaim = async (claimId: number) => {
    try {
      await updateClaimStatus(claimId, 'Rejected');
      toast('Claim rejected');
      await loadData();
    } catch (error) {
      toast('Error rejecting claim');
    }
  };

  const handleViewClaim = (claim: Claim) => {
    setSelectedClaim(claim);
    setIsViewDialogOpen(true);
  };

  const filteredClaims = claims.filter(claim => {
    const matchesSearch = claim.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         claim.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (claim.employeeId && employees.find(emp => emp.id === claim.employeeId)?.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || claim.status === statusFilter;
    return matchesSearch && matchesStatus;
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
            <span className="ml-2">Loading claims management...</span>
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
            <Button onClick={() => setIsAddClaimOpen(true)} className="flex items-center">
              <Plus className="w-4 h-4 mr-2" />
              Add Claim
            </Button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Pending Claims</p>
                    <p className="text-2xl font-bold">{pendingClaims.length}</p>
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
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Rejected Claims</p>
                    <p className="text-2xl font-bold text-red-600">{rejectedClaims.length}</p>
                  </div>
                  <XCircle className="w-8 h-8 text-red-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Total Approved</p>
                    <p className="text-2xl font-bold">S${totalAmount.toLocaleString()}</p>
                  </div>
                  <DollarSign className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="all">All Claims</TabsTrigger>
              <TabsTrigger value="types">Claim Types</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Claims</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {claims.slice(0, 5).map((claim) => {
                        const employee = employees.find(emp => emp.id === claim.employeeId);
                        return (
                          <div key={claim.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <p className="font-medium">{employee?.name || 'Unknown Employee'}</p>
                              <p className="text-sm text-gray-600">
                                {claim.type} • S${claim.amount.toLocaleString()}
                              </p>
                            </div>
                            <Badge variant={
                              claim.status === 'Approved' ? 'default' :
                              claim.status === 'Pending' ? 'secondary' : 'destructive'
                            }>
                              {claim.status}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Claims by Type</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {claimTypes.map((type) => {
                        const typeCount = claims.filter(claim => claim.type === type.name).length;
                        return (
                          <div key={type.id} className="flex justify-between items-center">
                            <span>{type.name}</span>
                            <Badge variant="secondary">{typeCount}</Badge>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="pending" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Pending Claims</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {pendingClaims.map((claim) => {
                      const employee = employees.find(emp => emp.id === claim.employeeId);
                      return (
                        <div key={claim.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3">
                              <p className="font-medium">{employee?.name || 'Unknown Employee'}</p>
                              <Badge variant="secondary">{claim.type}</Badge>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                              S${claim.amount.toLocaleString()} • {new Date(claim.date).toLocaleDateString()}
                            </p>
                            <p className="text-sm text-gray-500 mt-1">{claim.description}</p>
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
                      );
                    })}
                    {pendingClaims.length === 0 && (
                      <p className="text-gray-500 text-center py-8">No pending claims</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="all" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>All Claims</CardTitle>
                  <div className="flex space-x-4 mt-4">
                    <div className="flex-1">
                      <Input
                        placeholder="Search claims..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="max-w-sm"
                      />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="Pending">Pending</SelectItem>
                        <SelectItem value="Approved">Approved</SelectItem>
                        <SelectItem value="Rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {filteredClaims.map((claim) => {
                      const employee = employees.find(emp => emp.id === claim.employeeId);
                      return (
                        <div key={claim.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3">
                              <p className="font-medium">{employee?.name || 'Unknown Employee'}</p>
                              <Badge variant={
                                claim.status === 'Approved' ? 'default' :
                                claim.status === 'Pending' ? 'secondary' : 'destructive'
                              }>
                                {claim.status}
                              </Badge>
                              <Badge variant="outline">{claim.type}</Badge>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                              S${claim.amount.toLocaleString()} • {new Date(claim.date).toLocaleDateString()}
                            </p>
                            <p className="text-sm text-gray-500 mt-1">{claim.description}</p>
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
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="types" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Claim Types</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {claimTypes.map((type) => (
                      <Card key={type.id}>
                        <CardContent className="p-4">
                          <h3 className="font-medium">{type.name}</h3>
                          <p className="text-sm text-gray-600 mt-1">{type.description}</p>
                          {type.limitAmount && (
                            <p className="text-sm text-blue-600 mt-2">
                              Limit: S${type.limitAmount.toLocaleString()}
                            </p>
                          )}
                          {type.coPay > 0 && (
                            <p className="text-sm text-orange-600 mt-1">
                              Co-pay: S${type.coPay.toLocaleString()}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <AddClaimDialog
            onClose={() => setIsAddClaimOpen(false)}
            onSuccess={loadData}
          />

          <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Claim Details</DialogTitle>
              </DialogHeader>
              {selectedClaim && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Employee</p>
                      <p className="font-medium">
                        {employees.find(emp => emp.id === selectedClaim.employeeId)?.name || 'Unknown Employee'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Type</p>
                      <p className="font-medium">{selectedClaim.type}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Amount</p>
                      <p className="font-medium">S${selectedClaim.amount.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Status</p>
                      <Badge variant={
                        selectedClaim.status === 'Approved' ? 'default' :
                        selectedClaim.status === 'Pending' ? 'secondary' : 'destructive'
                      }>
                        {selectedClaim.status}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Description</p>
                    <p className="mt-1">{selectedClaim.description}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Submitted Date</p>
                    <p className="mt-1">{new Date(selectedClaim.date).toLocaleDateString()}</p>
                  </div>
                  {selectedClaim.receipt_url && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Receipt</p>
                      <Button
                        variant="outline"
                        className="mt-1"
                        onClick={() => window.open(selectedClaim.receipt_url, '_blank')}
                      >
                        View Receipt
                      </Button>
                    </div>
                  )}
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
