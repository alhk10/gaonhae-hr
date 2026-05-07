/**
 * Partner Claim Content Component
 * Form for partners to submit business-related expense claims
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { History, FileText, Calendar, User, Building2, Eye } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { useAuth } from '@/contexts/AuthContext';
import ReceiptUpload from '@/components/claim/ReceiptUpload';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { formatDate } from '@/utils/dateFormat';
import { SignedImage } from '@/components/common/SignedMedia';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Branch {
  id: string;
  name: string;
}

interface PartnerClaim {
  id: number;
  employee_id: string;
  type: string;
  amount: number;
  description: string;
  status: string;
  submitted_date: string;
  receipt_url: string | null;
  reviewed_by: string | null;
  reviewed_date: string | null;
  branch_id: string | null;
}

const PARTNER_CLAIM_TYPES = [
  { id: 'transport', name: 'Transport', icon: '🚗' },
  { id: 'office_stationeries', name: 'Office Stationeries', icon: '📎' },
  { id: 'training_equipment', name: 'Training Equipment', icon: '🥋' },
  { id: 'other', name: 'Other Business Expense', icon: '📋' },
];

interface PartnerClaimContentProps {
  currentEmployee: any;
}

const PartnerClaimContent: React.FC<PartnerClaimContentProps> = ({ currentEmployee }) => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [claims, setClaims] = useState<PartnerClaim[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [allBranches, setAllBranches] = useState<Branch[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [viewingReceiptUrl, setViewingReceiptUrl] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    type: '',
    amount: '',
    date: '',
    vendor: '',
    description: '',
    branch_id: ''
  });

  useEffect(() => {
    const loadBranchesAndClaims = async () => {
      if (!currentEmployee) return;

      try {
        // Load all branches for display
        const { data: allBranchData } = await supabase
          .from('branches')
          .select('id, name')
          .order('name');
        
        if (allBranchData) {
          setAllBranches(allBranchData);
        }
        
        // Load only branches tagged to this partner via partner_branch_shares
        const { data: sharesData, error: sharesError } = await supabase
          .from('partner_branch_shares')
          .select('branch_id')
          .eq('employee_id', currentEmployee.id)
          .is('effective_to', null);
        
        if (!sharesError && sharesData && sharesData.length > 0) {
          const taggedBranchIds = sharesData.map(s => s.branch_id);
          
          const { data: branchData, error: branchError } = await supabase
            .from('branches')
            .select('id, name')
            .in('id', taggedBranchIds)
            .order('name');
          
          if (!branchError && branchData) {
            setBranches(branchData);
            // Auto-select if only one branch
            if (branchData.length === 1) {
              setFormData(prev => ({ ...prev, branch_id: branchData[0].id }));
            }
          }
        } else {
          setBranches([]);
        }
        
        // Load partner claims
        const { data: claimsData, error } = await supabase
          .from('claims')
          .select('*')
          .eq('employee_id', currentEmployee.id)
          .in('type', PARTNER_CLAIM_TYPES.map(t => t.name))
          .order('submitted_date', { ascending: false });
        
        if (!error && claimsData) {
          setClaims(claimsData as PartnerClaim[]);
        }
      } catch (error) {
        console.error('Error loading partner claim data:', error);
      }
    };

    loadBranchesAndClaims();
  }, [currentEmployee]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmitClaim = async () => {
    if (!currentEmployee || !formData.type || !formData.amount || !formData.date || !formData.description || !formData.branch_id) {
      toast.error("Please fill in all required fields including branch");
      return;
    }

    if (!receiptUrl) {
      toast.error("Please upload a receipt before submitting");
      return;
    }

    try {
      setIsSubmitting(true);

      const claimAmount = parseFloat(formData.amount);
      const claimDescription = `${formData.vendor ? `Vendor: ${formData.vendor} - ` : ''}${formData.description}`;

      // Insert claim as auto-approved via SECURITY DEFINER RPC (server-side partner check)
      const { data: newClaimId, error } = await (supabase.rpc as any)('partner_create_approved_claim', {
        p_type: formData.type,
        p_amount: claimAmount,
        p_description: claimDescription,
        p_submitted_date: formData.date,
        p_receipt_url: receiptUrl,
        p_branch_id: formData.branch_id,
      });

      if (error) throw error;

      const { data: insertedClaim } = await supabase
        .from('claims')
        .select('*')
        .eq('id', Number(newClaimId))
        .maybeSingle();

      // Sync to Branch P&L as expense
      if (insertedClaim) {
        const submittedDate = new Date(formData.date);
        const month = submittedDate.getMonth() + 1;
        const year = submittedDate.getFullYear();

        const { data: existingEntry } = await supabase
          .from('branch_profit_loss_entries')
          .select('id, amount, description')
          .eq('branch_id', formData.branch_id)
          .eq('month', month)
          .eq('year', year)
          .eq('category', 'Partner Claims')
          .eq('subcategory', formData.type)
          .single();

        if (existingEntry) {
          const newAmount = Number(existingEntry.amount) + claimAmount;
          const newDescription = `${existingEntry.description || ''} | Claim #${insertedClaim.id}`.trim();
          
          await supabase
            .from('branch_profit_loss_entries')
            .update({
              amount: newAmount,
              description: newDescription.substring(0, 500),
              updated_at: new Date().toISOString()
            })
            .eq('id', existingEntry.id);
        } else {
          await supabase
            .from('branch_profit_loss_entries')
            .insert({
              branch_id: formData.branch_id,
              month,
              year,
              category: 'Partner Claims',
              subcategory: formData.type,
              description: `Partner claim #${insertedClaim.id}: ${claimDescription.substring(0, 200)}`,
              amount: claimAmount,
              share_percentage: 100,
              type: 'expense',
              created_by: 'system'
            });
        }
      }
      
      // Reload claims
      const { data: claimsData } = await supabase
        .from('claims')
        .select('*')
        .eq('employee_id', currentEmployee.id)
        .in('type', PARTNER_CLAIM_TYPES.map(t => t.name))
        .order('submitted_date', { ascending: false });
      
      if (claimsData) setClaims(claimsData as PartnerClaim[]);
      
      setFormData({ type: formData.type, amount: '', date: '', vendor: '', description: '', branch_id: formData.branch_id });
      setReceiptUrl(null);
      toast.success("Partner claim approved and added to expenses!");
    } catch (error) {
      console.error('Error submitting claim:', error);
      toast.error("Error submitting claim. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'Approved': return 'default';
      case 'Rejected': return 'destructive';
      default: return 'secondary';
    }
  };

  const formatAmount = (amount: number) => `S$${amount.toFixed(2)}`;

  const formatDateSGT = (dateString: string | null) => {
    if (!dateString) return '-';
    return formatDate(dateString);
  };

  const getClaimTypeIcon = (typeName: string) => {
    return PARTNER_CLAIM_TYPES.find(t => t.name === typeName)?.icon || '📋';
  };

  const getBranchName = (branchId: string | null) => {
    if (!branchId) return '-';
    const branch = allBranches.find(b => b.id === branchId) || branches.find(b => b.id === branchId);
    return branch?.name || branchId;
  };

  return (
    <div className="space-y-6">
      {/* Submit Button */}
      <div className="flex items-center justify-end">
        <Button 
          onClick={handleSubmitClaim} 
          disabled={isSubmitting || !receiptUrl}
          className="bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Partner Claim'}
        </Button>
      </div>

      {/* Partner Claim Form */}
      <Card className="shadow-lg border-0">
        <CardContent className={`space-y-6 ${isMobile ? 'p-4' : 'p-8'}`}>
          
          {currentEmployee && (
            <div className="text-xs text-gray-500 bg-indigo-50 p-3 rounded-lg border border-indigo-100">
              <span className="font-medium text-indigo-700">Partner:</span> {currentEmployee.display_name || currentEmployee.name} 
              <span className="mx-2">|</span>
              <span className="font-medium text-indigo-700">Position:</span> {currentEmployee.position}
              {currentEmployee.department && currentEmployee.department !== 'Main Office' && (
                <>
                  <span className="mx-2">|</span>
                  <span className="font-medium text-indigo-700">Department:</span> {currentEmployee.department}
                </>
              )}
            </div>
          )}

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="font-semibold text-gray-700 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Claim Type *
              </Label>
              <select 
                className="w-full border border-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500"
                value={formData.type}
                onChange={(e) => handleInputChange('type', e.target.value)}
              >
                <option value="">Select claim type</option>
                {PARTNER_CLAIM_TYPES.map((type) => (
                  <option key={type.id} value={type.name}>
                    {type.icon} {type.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="space-y-2">
              <Label className="font-semibold text-gray-700">Amount (S$) *</Label>
              <Input 
                type="number" 
                step="0.01"
                className="p-3"
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => handleInputChange('amount', e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="font-semibold text-gray-700 flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Branch *
              </Label>
              <Select value={formData.branch_id} onValueChange={(value) => handleInputChange('branch_id', value)}>
                <SelectTrigger className="p-3">
                  <SelectValue placeholder="Select branch" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label className="font-semibold text-gray-700 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Date of Expense *
              </Label>
              <Input 
                type="date" 
                className="p-3"
                value={formData.date}
                onChange={(e) => handleInputChange('date', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="font-semibold text-gray-700 flex items-center gap-2">
              <User className="w-4 h-4" />
              Vendor/Merchant
            </Label>
            <Input 
              type="text" 
              className="p-3"
              placeholder="Enter vendor name"
              value={formData.vendor}
              onChange={(e) => handleInputChange('vendor', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label className="font-semibold text-gray-700">Description / Business Purpose *</Label>
            <Textarea 
              rows={4} 
              className="p-3 resize-none"
              placeholder="Describe the business purpose of this expense"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
            />
          </div>

          <ReceiptUpload 
            onFileUpload={setReceiptUrl}
            uploadedFileUrl={receiptUrl}
            employeeId={currentEmployee?.id || 'loading'}
            isRequired={true}
          />
        </CardContent>
      </Card>

      {/* Partner Claims History */}
      <Card className="shadow-lg border-0">
        <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b">
          <CardTitle className="text-gray-800 flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-600" />
            Partner Claims History
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {claims.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {claims.map((claim) => (
                    <TableRow key={claim.id}>
                      <TableCell>
                        <span className="mr-2">{getClaimTypeIcon(claim.type)}</span>
                        {claim.type}
                      </TableCell>
                      <TableCell>{getBranchName(claim.branch_id)}</TableCell>
                      <TableCell>{formatDateSGT(claim.submitted_date)}</TableCell>
                      <TableCell className="font-medium">{formatAmount(claim.amount)}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(claim.status)}>
                          {claim.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{claim.description}</TableCell>
                      <TableCell>
                        {claim.receipt_url && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setViewingReceiptUrl(claim.receipt_url)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No partner claims submitted yet
            </div>
          )}
        </CardContent>
      </Card>

      {/* Receipt Viewer Dialog */}
      <AlertDialog open={!!viewingReceiptUrl} onOpenChange={() => setViewingReceiptUrl(null)}>
        <AlertDialogContent className="max-w-3xl max-h-[90vh]">
          <AlertDialogHeader>
            <AlertDialogTitle>Receipt</AlertDialogTitle>
            <AlertDialogDescription>
              Proof of payment for this claim
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="overflow-auto max-h-[60vh]">
            {viewingReceiptUrl && (
              <SignedImage
                src={viewingReceiptUrl}
                alt="Receipt"
                className="w-full h-auto object-contain"
              />
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setViewingReceiptUrl(null)}>
              Close
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PartnerClaimContent;
