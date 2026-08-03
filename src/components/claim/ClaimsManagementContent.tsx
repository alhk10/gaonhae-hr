
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/sonner';
import { getClaims, updateClaimStatus, updateClaim } from '@/services/claimsService';
import { getClaimTypes, ClaimType } from '@/services/claimTypesService';
import { getEmployeeById } from '@/services/employeeService';
import AddClaimDialog from '@/components/claim/AddClaimDialog';
import ClaimSettingsDialog from '@/components/claim/ClaimSettingsDialog';
import { formatDate } from '@/utils/dateFormat';
import { formatCurrency } from '@/utils/currencyUtils';
import { SignedLink } from '@/components/common/SignedMedia';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Check, X, Pencil, ExternalLink, CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

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
  const [claimTypes, setClaimTypes] = useState<ClaimType[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [editData, setEditData] = useState<{ type: string; amount: string; description: string }>({
    type: '',
    amount: '',
    description: '',
  });

  const startEdit = (claim: ClaimWithEmployee) => {
    setEditingId(claim.id);
    setEditData({
      type: claim.type,
      amount: String(claim.amount),
      description: claim.description || '',
    });
  };

  const cancelEdit = () => setEditingId(null);

  const saveEdit = async () => {
    if (editingId === null) return;
    const amount = parseFloat(editData.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    setIsSaving(true);
    try {
      await updateClaim(editingId, {
        type: editData.type,
        amount,
        description: editData.description,
      });
      toast.success('Claim updated successfully');
      setEditingId(null);
      await loadClaims();
    } catch (error) {
      console.error('Error updating claim:', error);
      toast.error('Error updating claim');
    } finally {
      setIsSaving(false);
    }
  };



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
    getClaimTypes().then(setClaimTypes).catch(() => setClaimTypes([]));
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
                    <TableHead>Description</TableHead>
                    <TableHead>Receipt</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClaims.map((claim) => {
                    const isEditing = editingId === claim.id;
                    return (
                    <TableRow key={claim.id}>
                      <TableCell>{claim.employee}</TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Select value={editData.type} onValueChange={(v) => setEditData(prev => ({ ...prev, type: v }))}>
                            <SelectTrigger className="h-8 w-[150px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {claimTypes.map(ct => (<SelectItem key={ct.id} value={ct.name}>{ct.name}</SelectItem>))}
                            </SelectContent>
                          </Select>
                        ) : claim.type}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            type="number"
                            step="0.01"
                            className="h-8 w-[110px]"
                            value={editData.amount}
                            onChange={(e) => setEditData(prev => ({ ...prev, amount: e.target.value }))}
                          />
                        ) : formatCurrency(claim.amount)}
                      </TableCell>
                      <TableCell>{formatDate(new Date(claim.date))}</TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            className="h-8 w-[180px]"
                            value={editData.description}
                            onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="Description"
                          />
                        ) : (
                          <div className="max-w-[200px] truncate text-sm text-muted-foreground">{claim.description || '-'}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        {claim.receipt_url ? (
                          <SignedLink
                            href={claim.receipt_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline flex items-center gap-1 text-sm"
                          >
                            <ExternalLink className="h-3 w-3" />View
                          </SignedLink>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={claim.status === 'Approved' ? 'default' : claim.status === 'Rejected' ? 'destructive' : 'secondary'}>
                          {claim.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {isEditing ? (
                            <>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600" onClick={saveEdit} disabled={isSaving}>
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={cancelEdit} disabled={isSaving}>
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600" onClick={() => startEdit(claim)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              {claim.status === 'Pending' && (
                                <>
                                  <Button variant="outline" size="sm" onClick={() => handleStatusChange(claim.id, 'Approved')}>
                                    Approve
                                  </Button>
                                  <Button variant="outline" size="sm" onClick={() => handleStatusChange(claim.id, 'Rejected')}>
                                    Reject
                                  </Button>
                                </>
                              )}
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                    );
                  })}
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
