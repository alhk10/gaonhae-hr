
import React, { useState, useEffect } from 'react';
import AuthGuard from '@/components/auth/AuthGuard';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DollarSign, FileText, Users, TrendingUp, Clock, CheckCircle, XCircle, AlertCircle, Search, Filter } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { getClaims, updateClaimStatus } from '@/services/claimsService';
import { getEmployees } from '@/services/employeeService';
import { getClaimTypes } from '@/services/claimTypesService';
import AddClaimDialog from '@/components/claim/AddClaimDialog';

interface ClaimWithEmployee {
  id: number;
  employeeId: string;
  employeeName: string;
  type: string;
  description: string;
  amount: number;
  status: 'Pending' | 'Approved' | 'Rejected';
  submittedDate: string;
  reviewedBy?: string;
  reviewedDate?: string;
  receiptUrl?: string;
}

const Claims = () => {
  console.log('💰 Claims page loading - comprehensive version v2.1');
  
  const [activeTab, setActiveTab] = useState('overview');
  const [claims, setClaims] = useState<ClaimWithEmployee[]>([]);
  const [employees, setEmployees] = useState([]);
  const [claimTypes, setClaimTypes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [claimsData, employeesData, typesData] = await Promise.all([
        getClaims(),
        getEmployees(),
        getClaimTypes()
      ]);

      // Map employee names to claims and fix the data structure
      const claimsWithEmployees = claimsData.map(claim => ({
        id: claim.id,
        employeeId: claim.employeeId,
        employeeName: employeesData.find(emp => emp.id === claim.employeeId)?.name || 'Unknown Employee',
        type: claim.type,
        description: claim.description,
        amount: claim.amount,
        status: claim.status,
        submittedDate: claim.date, // Map 'date' to 'submittedDate'
        reviewedBy: claim.reviewed_by,
        reviewedDate: claim.reviewed_date,
        receiptUrl: claim.receipt_url
      }));

      setClaims(claimsWithEmployees);
      setEmployees(employeesData);
      setClaimTypes(typesData);
      console.log('💸 Loaded claims:', claimsWithEmployees.length);
      console.log('👥 Loaded employees:', employeesData.length);
      console.log('📋 Loaded claim types:', typesData.length);
    } catch (error) {
      console.error('Error loading claims data:', error);
      toast.error('Failed to load claims data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveClaim = async (claimId: number) => {
    try {
      await updateClaimStatus(claimId, 'Approved');
      toast.success('Claim approved');
      loadData();
    } catch (error) {
      console.error('Error approving claim:', error);
      toast.error('Failed to approve claim');
    }
  };

  const handleRejectClaim = async (claimId: number) => {
    try {
      await updateClaimStatus(claimId, 'Rejected');
      toast.success('Claim rejected');
      loadData();
    } catch (error) {
      console.error('Error rejecting claim:', error);
      toast.error('Failed to reject claim');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Approved':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'Rejected':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Approved':
        return 'bg-green-100 text-green-800';
      case 'Rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const filteredClaims = claims.filter(claim => {
    const matchesStatus = filterStatus === 'all' || claim.status.toLowerCase() === filterStatus.toLowerCase();
    const matchesType = filterType === 'all' || claim.type === filterType;
    const matchesSearch = searchTerm === '' || 
      claim.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      claim.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesStatus && matchesType && matchesSearch;
  });

  const pendingClaims = claims.filter(claim => claim.status === 'Pending');
  const approvedClaims = claims.filter(claim => claim.status === 'Approved');
  const rejectedClaims = claims.filter(claim => claim.status === 'Rejected');
  const totalClaimAmount = claims.reduce((sum, claim) => sum + claim.amount, 0);
  const approvedAmount = approvedClaims.reduce((sum, claim) => sum + claim.amount, 0);

  return (
    <AuthGuard>
      <ResponsiveLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Claims Management</h1>
              <p className="text-gray-600 mt-1">Manage and process employee expense claims</p>
            </div>
            <div className="flex items-center space-x-4">
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <FileText className="w-4 h-4 mr-2" />
                Add Claim
              </Button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Claims</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{claims.length}</div>
                <p className="text-xs text-muted-foreground">All time</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{pendingClaims.length}</div>
                <p className="text-xs text-muted-foreground">
                  S${pendingClaims.reduce((sum, claim) => sum + claim.amount, 0).toLocaleString()}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Approved Amount</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  S${approvedAmount.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">{approvedClaims.length} claims</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Value</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">S${totalClaimAmount.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">All claims</p>
              </CardContent>
            </Card>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">
                <TrendingUp className="w-4 h-4 mr-2" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="claims">
                <FileText className="w-4 h-4 mr-2" />
                Claims
              </TabsTrigger>
              <TabsTrigger value="analytics">
                <Users className="w-4 h-4 mr-2" />
                Analytics
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Claims Activity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {claims.slice(0, 5).map((claim) => (
                        <div key={claim.id} className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            {getStatusIcon(claim.status)}
                            <div>
                              <p className="font-medium">{claim.employeeName}</p>
                              <p className="text-sm text-gray-500">{claim.type}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">S${claim.amount.toLocaleString()}</p>
                            <Badge className={getStatusColor(claim.status)} variant="secondary">
                              {claim.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Claims by Type</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {claimTypes.map((type: any) => {
                        const typeClaims = claims.filter(claim => claim.type === type.name);
                        const typeAmount = typeClaims.reduce((sum, claim) => sum + claim.amount, 0);
                        return (
                          <div key={type.id} className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{type.name}</p>
                              <p className="text-sm text-gray-500">{typeClaims.length} claims</p>
                            </div>
                            <p className="font-semibold">S${typeAmount.toLocaleString()}</p>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="claims" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>All Claims</CardTitle>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <Search className="w-4 h-4 text-gray-400" />
                        <Input
                          placeholder="Search claims..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-64"
                        />
                      </div>
                      <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger className="w-32">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="approved">Approved</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={filterType} onValueChange={setFilterType}>
                        <SelectTrigger className="w-40">
                          <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Types</SelectItem>
                          {claimTypes.map((type: any) => (
                            <SelectItem key={type.id} value={type.name}>
                              {type.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="text-center py-8">Loading claims...</div>
                  ) : filteredClaims.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No claims found
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredClaims.map((claim) => (
                        <div key={claim.id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3">
                                {getStatusIcon(claim.status)}
                                <div>
                                  <h3 className="font-semibold">{claim.employeeName}</h3>
                                  <p className="text-sm text-gray-600">
                                    {claim.type} • S${claim.amount.toLocaleString()}
                                  </p>
                                </div>
                              </div>
                              <div className="mt-2">
                                <p className="text-sm text-gray-600">{claim.description}</p>
                                <p className="text-xs text-gray-500 mt-1">
                                  Submitted: {new Date(claim.submittedDate).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-3">
                              <Badge className={getStatusColor(claim.status)}>
                                {claim.status}
                              </Badge>
                              {claim.status === 'Pending' && (
                                <div className="flex space-x-2">
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
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
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
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">This Month</span>
                        <span className="text-sm">
                          {claims.filter(c => new Date(c.submittedDate).getMonth() === new Date().getMonth()).length} claims
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Last Month</span>
                        <span className="text-sm">
                          {claims.filter(c => new Date(c.submittedDate).getMonth() === new Date().getMonth() - 1).length} claims
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Average Processing Time</span>
                        <span className="text-sm">2.3 days</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Top Claimants</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {Object.entries(
                        claims.reduce((acc, claim) => {
                          acc[claim.employeeName] = (acc[claim.employeeName] || 0) + claim.amount;
                          return acc;
                        }, {} as Record<string, number>)
                      )
                        .sort(([,a], [,b]) => b - a)
                        .slice(0, 5)
                        .map(([name, amount]) => (
                          <div key={name} className="flex justify-between items-center">
                            <span className="text-sm font-medium">{name}</span>
                            <span className="text-sm">S${amount.toLocaleString()}</span>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>

          <AddClaimDialog
            open={isAddDialogOpen}
            onOpenChange={setIsAddDialogOpen}
            onSuccess={loadData}
          />
        </div>
      </ResponsiveLayout>
    </AuthGuard>
  );
};

export default Claims;
