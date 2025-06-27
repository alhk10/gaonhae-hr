
import React, { useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/sonner';
import { DollarSign, FileText, Check, X, Trash2 } from 'lucide-react';
import { getClaims, updateClaimStatus, type Claim } from '@/services/claimsService';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const Claims = () => {
  const { user } = useAuth();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalAmount: 0,
    approvedAmount: 0,
    pendingAmount: 0,
    totalClaims: 0,
    approvedClaims: 0,
    pendingClaims: 0
  });

  useEffect(() => {
    loadClaims();
  }, []);

  const loadClaims = async () => {
    try {
      setLoading(true);
      const allClaims = await getClaims();
      
      // Filter out rejected claims - only show pending and approved
      const visibleClaims = allClaims.filter(claim => claim.status !== 'Rejected');
      setClaims(visibleClaims);
      
      // Calculate stats - only for approved claims this month
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      
      const approvedThisMonth = allClaims.filter(claim => {
        const claimDate = new Date(claim.date);
        return claim.status === 'Approved' && 
               claimDate.getMonth() === currentMonth && 
               claimDate.getFullYear() === currentYear;
      });
      
      const approvedAmount = approvedThisMonth.reduce((sum, claim) => sum + claim.amount, 0);
      const pendingAmount = visibleClaims.filter(c => c.status === 'Pending').reduce((sum, claim) => sum + claim.amount, 0);
      
      setStats({
        totalAmount: approvedAmount, // Only show approved amount this month
        approvedAmount,
        pendingAmount,
        totalClaims: visibleClaims.length,
        approvedClaims: visibleClaims.filter(c => c.status === 'Approved').length,
        pendingClaims: visibleClaims.filter(c => c.status === 'Pending').length
      });
      
      console.log('Loaded visible claims (excluding rejected):', visibleClaims);
      console.log('Approved claims this month:', approvedThisMonth);
    } catch (error) {
      console.error('Error loading claims:', error);
      toast('Error loading claims');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (claimId: number) => {
    try {
      await updateClaimStatus(claimId, 'Approved');
      toast('Claim approved successfully');
      await loadClaims();
    } catch (error) {
      console.error('Error approving claim:', error);
      toast('Error approving claim');
    }
  };

  const handleReject = async (claimId: number) => {
    try {
      await updateClaimStatus(claimId, 'Rejected');
      toast('Claim rejected successfully');
      await loadClaims();
    } catch (error) {
      console.error('Error rejecting claim:', error);
      toast('Error rejecting claim');
    }
  };

  const handleDelete = async (claimId: number) => {
    if (!user || user.role !== 'superadmin') {
      toast('Only superadmin can delete claims');
      return;
    }

    if (!confirm('Are you sure you want to delete this claim? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('claims')
        .delete()
        .eq('id', claimId);

      if (error) throw error;

      toast('Claim deleted successfully');
      await loadClaims();
    } catch (error) {
      console.error('Error deleting claim:', error);
      toast('Error deleting claim');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex h-[calc(100vh-73px)]">
          <Sidebar />
          <main className="flex-1 p-6 overflow-auto">
            <div className="text-center flex items-center justify-center h-full">
              <div>
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-lg text-gray-600">Loading claims...</p>
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
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Claims Management</h1>
              <p className="text-gray-600 mt-2">Manage and approve employee expense claims</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <DollarSign className="w-8 h-8 text-green-600" />
                    <div className="ml-4">
                      <p className="text-sm text-green-600">Approved This Month</p>
                      <p className="text-2xl font-bold text-green-900">S${stats.totalAmount.toFixed(2)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <FileText className="w-8 h-8 text-blue-600" />
                    <div className="ml-4">
                      <p className="text-sm text-blue-600">Total Claims</p>
                      <p className="text-2xl font-bold text-blue-900">{stats.totalClaims}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Check className="w-8 h-8 text-green-600" />
                    <div className="ml-4">
                      <p className="text-sm text-green-600">Approved</p>
                      <p className="text-2xl font-bold text-green-900">{stats.approvedClaims}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-200">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <FileText className="w-8 h-8 text-yellow-600" />
                    <div className="ml-4">
                      <p className="text-sm text-yellow-600">Pending</p>
                      <p className="text-2xl font-bold text-yellow-900">{stats.pendingClaims}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Claims Table */}
            <Card>
              <CardHeader>
                <CardTitle>All Claims (Excluding Rejected)</CardTitle>
                <CardDescription>Review and manage employee expense claims. Rejected claims are hidden from this view.</CardDescription>
              </CardHeader>
              <CardContent>
                {claims.length > 0 ? (
                  <div className="overflow-x-auto">
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
                            <TableCell>{new Date(claim.date).toLocaleDateString()}</TableCell>
                            <TableCell className="max-w-xs truncate">{claim.description}</TableCell>
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
                                {claim.status === 'Pending' && user?.role !== 'employee' && (
                                  <>
                                    <Button
                                      size="sm"
                                      onClick={() => handleApprove(claim.id)}
                                      className="bg-green-600 hover:bg-green-700"
                                    >
                                      <Check className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => handleReject(claim.id)}
                                    >
                                      <X className="w-4 h-4" />
                                    </Button>
                                  </>
                                )}
                                
                                {user?.role === 'superadmin' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleDelete(claim.id)}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg">No claims found</p>
                    <p className="text-sm">Claims will appear here once submitted by employees</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Claims;
