
import React, { useState, useEffect } from 'react';
import AuthGuard from '@/components/auth/AuthGuard';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Calendar } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/sonner";
import { useToast } from "@/components/ui/use-toast"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  getClaims,
  getEmployeeClaims,
  updateClaimStatus,
  addClaim,
  getAllClaims
} from '@/data/claimsData';
import { getEmployeeById } from '@/services/employeeService';

interface Claim {
  id: number;
  employeeId: string;
  employee: string;
  type: string;
  amount: number;
  date: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  description: string;
  receipt_url?: string;
  reviewed_by?: string;
  reviewed_date?: string;
  submitted_date?: string;
  created_at?: string;
}

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

const Claims = () => {
  console.log('📋 Claims page loading - comprehensive version');
  
  const [claims, setClaims] = useState<ClaimWithEmployee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState<ClaimWithEmployee | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<keyof Claim>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const loadClaims = async () => {
    setIsLoading(true);
    try {
      const data = await getClaims();
      console.log('📊 Raw claims data from service:', data);
      
      const employeeNames = await Promise.all(
        data.map(async (claim) => {
          try {
            const employee = await getEmployeeById(claim.employeeId || '');
            return employee?.name || 'Unknown Employee';
          } catch (error) {
            console.error(`Error fetching employee for claim ${claim.id}:`, error);
            return 'Unknown Employee';
          }
        })
      );

      const transformedClaims: ClaimWithEmployee[] = data.map((claim, index) => ({
        id: claim.id,
        employeeId: claim.employeeId || '',
        employee: employeeNames[index],
        employeeName: employeeNames[index],
        type: claim.type,
        amount: claim.amount,
        date: claim.submitted_date || claim.created_at || new Date().toISOString(),
        submittedDate: claim.submitted_date || claim.created_at || new Date().toISOString(),
        status: claim.status as 'Pending' | 'Approved' | 'Rejected',
        description: claim.description,
        receipt_url: claim.receipt_url || undefined,
        reviewed_by: claim.reviewed_by || undefined,
        reviewed_date: claim.reviewed_date || undefined,
      }));

      setClaims(transformedClaims);
      console.log('📊 Processed claims data:', transformedClaims);
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

  const sortedClaims = [...filteredClaims].sort((a, b) => {
    const column = sortColumn;
    const direction = sortDirection;

    if (a[column] < b[column]) {
      return direction === 'asc' ? -1 : 1;
    }
    if (a[column] > b[column]) {
      return direction === 'asc' ? 1 : -1;
    }
    return 0;
  });

  const handleSort = (column: keyof Claim) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  return (
    <AuthGuard>
      <ResponsiveLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Claims Management</h1>
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
              <Button onClick={() => setIsAddDialogOpen(true)}>Add Claim</Button>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Claims List</CardTitle>
              <CardDescription>View and manage all employee claims</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p>Loading claims data...</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead onClick={() => handleSort('employee')}>
                          Employee
                        </TableHead>
                        <TableHead onClick={() => handleSort('type')}>
                          Type
                        </TableHead>
                        <TableHead onClick={() => handleSort('amount')}>
                          Amount
                        </TableHead>
                        <TableHead onClick={() => handleSort('date')}>
                          Date
                        </TableHead>
                        <TableHead onClick={() => handleSort('status')}>
                          Status
                        </TableHead>
                        <TableHead>
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedClaims.map((claim) => (
                        <TableRow key={claim.id}>
                          <TableCell>{claim.employee}</TableCell>
                          <TableCell>{claim.type}</TableCell>
                          <TableCell>S${claim.amount.toLocaleString()}</TableCell>
                          <TableCell>{new Date(claim.date).toLocaleDateString()}</TableCell>
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

          {/* Simple Add Claim Dialog */}
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Claim</DialogTitle>
                <DialogDescription>
                  Create a new claim for an employee
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  This is a placeholder for the claim form. The AddClaimDialog component needs to be implemented.
                </p>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleClaimSuccess}>
                    Add Claim
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </ResponsiveLayout>
    </AuthGuard>
  );
};

export default Claims;
