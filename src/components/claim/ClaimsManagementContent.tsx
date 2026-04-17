
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/sonner';
import { getClaims, updateClaimStatus } from '@/services/claimsService';
import { getEmployeeById } from '@/services/employeeService';
import AddClaimDialog from '@/components/claim/AddClaimDialog';
import ClaimSettingsDialog from '@/components/claim/ClaimSettingsDialog';
import { formatDate } from '@/utils/dateFormat';

interface ClaimWithEmployee {
  id: number;
  employeeId: string;
  employee: string;
  employeeName: string;
  type: string;
  amount: number;
  date: string;
  submittedDate: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  description: string;
  receipt_url?: string;
  reviewed_by?: string;
  reviewed_date?: string;
}

const ClaimsManagementContent = () => {
  const [claims, setClaims] = useState<ClaimWithEmployee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const loadClaims = async () => {
    setIsLoading(true);
    try {
      const data = await getClaims();
      
      // Fetch employee details including resign status
      const employeeDetails = await Promise.all(
        data.map(async (claim) => {
          try {
            const employee = await getEmployeeById(claim.employeeId || '');
            return {
              name: employee?.name || 'Unknown Employee',
              resignDate: employee?.resignDate || null
            };
          } catch (error) {
            console.error(`Error fetching employee for claim ${claim.id}:`, error);
            return { name: 'Unknown Employee', resignDate: null };
          }
        })
      );

      // Filter out claims from resigned employees
      const transformedClaims: ClaimWithEmployee[] = data
        .map((claim, index) => ({
          id: claim.id,
          employeeId: claim.employeeId || '',
          employee: employeeDetails[index].name,
          employeeName: employeeDetails[index].name,
          type: claim.type,
          amount: claim.amount,
          date: claim.date || new Date().toISOString(),
          submittedDate: claim.date || new Date().toISOString(),
          status: claim.status as 'Pending' | 'Approved' | 'Rejected',
          description: claim.description,
          receipt_url: claim.receipt_url || undefined,
          reviewed_by: undefined,
          reviewed_date: undefined,
          _resignDate: employeeDetails[index].resignDate
        }))
        .filter(claim => !(claim as any)._resignDate)
        .map(({ ...claim }) => {
          delete (claim as any)._resignDate;
          return claim;
        });

      setClaims(transformedClaims);
    } catch (error) {
      console.error('Error loading claims:', error);
      toast.error('Error loading claims data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadClaims();
  }, []);

  const handleClaimSuccess = async () => {
    toast.success('Claim added successfully');
    await loadClaims();
  };

  const handleStatusChange = async (claimId: number, newStatus: 'Approved' | 'Rejected') => {
    try {
      await updateClaimStatus(claimId, newStatus);
      toast.success(`Claim status updated to ${newStatus}`);
      await loadClaims();
    } catch (error) {
      console.error('Error updating claim status:', error);
      toast.error('Error updating claim status');
    }
  };

  const filteredClaims = claims.filter(claim => {
    const searchRegex = new RegExp(searchTerm, 'i');
    return (
      searchRegex.test(claim.employee) ||
      searchRegex.test(claim.type) ||
      searchRegex.test(claim.description) ||
      searchRegex.test(claim.amount.toString()) ||
      searchRegex.test(claim.status)
    );
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading claims data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Claims Management</h2>
          <p className="text-gray-600 mt-1">Manage employee claims and reimbursements</p>
        </div>
        <div className="flex items-center space-x-4">
          <Input
            type="text"
            placeholder="Search claims..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
          <div className="flex space-x-2">
            <ClaimSettingsDialog onClaimTypesUpdated={loadClaims} />
            <AddClaimDialog onClaimAdded={handleClaimSuccess} />
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Claims List</CardTitle>
          <CardDescription>View and manage all employee claims</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredClaims.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No claims found
            </div>
          ) : (
            <div className="overflow-x-auto">
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
                  {filteredClaims.map((claim) => (
                    <TableRow key={claim.id}>
                      <TableCell>{claim.employee}</TableCell>
                      <TableCell>{claim.type}</TableCell>
                      <TableCell>S${claim.amount.toLocaleString()}</TableCell>
                      <TableCell>{formatDate(new Date(claim.date))}</TableCell>
                      <TableCell>
                        <Badge variant={claim.status === 'Approved' ? 'default' : claim.status === 'Rejected' ? 'destructive' : 'secondary'}>
                          {claim.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {claim.status === 'Pending' && (
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleStatusChange(claim.id, 'Approved')}
                            >
                              Approve
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleStatusChange(claim.id, 'Rejected')}
                            >
                              Reject
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ClaimsManagementContent;
