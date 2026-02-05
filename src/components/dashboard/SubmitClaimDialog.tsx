import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  ChevronDown, 
  ChevronUp, 
  FileText, 
  Calendar,
  Loader2,
  CheckCircle,
  Clock,
  XCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { EmployeeProfile } from '@/types/employee';
import { getEmployeeClaims, createClaim, type Claim } from '@/services/claimsService';
import { getClaimTypes, type ClaimType } from '@/services/claimTypesService';
import ReceiptUpload from '@/components/claim/ReceiptUpload';
import PartnerClaimContent from '@/components/claim/PartnerClaimContent';

interface SubmitClaimDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string;
  employee: EmployeeProfile;
}

const SubmitClaimDialog: React.FC<SubmitClaimDialogProps> = ({
  open,
  onOpenChange,
  employeeId,
  employee,
}) => {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [claimTypes, setClaimTypes] = useState<ClaimType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  
  const [formData, setFormData] = useState({
    type: '',
    amount: '',
    date: '',
    description: ''
  });

  const isPartner = employee?.position?.toLowerCase() === 'partner' || 
                    employee?.position?.toLowerCase() === 'senior partner';

  useEffect(() => {
    if (open) {
      loadClaimData();
    }
  }, [open, employeeId]);

  const loadClaimData = async () => {
    try {
      setIsLoading(true);
      const [employeeClaims, types] = await Promise.all([
        getEmployeeClaims(employeeId),
        getClaimTypes()
      ]);
      
      setClaims(employeeClaims);
      setClaimTypes(types);
      
      // Set default type
      const availableTypes = types.filter(type => 
        employee.type === 'Full-Time' || type.name !== 'Medical'
      );
      if (availableTypes.length > 0 && !formData.type) {
        setFormData(prev => ({ ...prev, type: availableTypes[0].name }));
      }
    } catch (error) {
      console.error('Error loading claim data:', error);
      toast.error('Failed to load claim data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmitClaim = async () => {
    if (!formData.type || !formData.amount || !formData.date || !formData.description) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!receiptUrl) {
      toast.error('Please upload a receipt before submitting');
      return;
    }

    try {
      setIsSubmitting(true);

      const newClaim = {
        employeeId: employeeId,
        employee: employee.name,
        type: formData.type,
        amount: parseFloat(formData.amount),
        date: formData.date,
        status: 'Pending' as const,
        description: formData.description,
        receipt_url: receiptUrl
      };

      await createClaim(newClaim);
      
      // Reload claims
      const updatedClaims = await getEmployeeClaims(employeeId);
      setClaims(updatedClaims);
      
      // Reset form
      setFormData(prev => ({
        type: prev.type,
        amount: '',
        date: '',
        description: ''
      }));
      setReceiptUrl(null);

      toast.success('Claim submitted successfully!');
    } catch (error) {
      console.error('Error submitting claim:', error);
      toast.error('Error submitting claim. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Approved':
        return <Badge className="bg-green-100 text-green-700 border-green-300"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'Pending':
        return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'Rejected':
        return <Badge className="bg-red-100 text-red-700 border-red-300"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getClaimTypeIcon = (typeName: string) => {
    switch (typeName.toLowerCase()) {
      case 'medical': return '🏥';
      case 'transport': return '🚗';
      case 'meal': return '🍽️';
      case 'equipment': return '💻';
      case 'travel': return '✈️';
      default: return '📋';
    }
  };

  const getAvailableClaimTypes = () => {
    return claimTypes.filter(type => 
      employee.type === 'Full-Time' || type.name !== 'Medical'
    );
  };

  const pendingClaims = claims.filter(c => c.status === 'Pending');
  const approvedClaims = claims.filter(c => c.status === 'Approved');
  const recentClaims = claims.slice(0, 10);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="p-4 pb-2 border-b flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {isPartner ? 'Submit Partners Claim' : 'Submit Claim'}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Submit an expense claim with receipt upload
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : isPartner ? (
            <PartnerClaimContent currentEmployee={employee} />
          ) : (
            <>
              {/* Summary Stats */}
              <div className="flex gap-2">
                <div className="flex-1 p-2 bg-yellow-50 rounded-lg text-center">
                  <p className="text-lg font-semibold text-yellow-700">{pendingClaims.length}</p>
                  <p className="text-xs text-yellow-600">Pending</p>
                </div>
                <div className="flex-1 p-2 bg-green-50 rounded-lg text-center">
                  <p className="text-lg font-semibold text-green-700">{approvedClaims.length}</p>
                  <p className="text-xs text-green-600">Approved</p>
                </div>
              </div>

              {/* Claim Form */}
              <Card>
                <CardContent className="p-4 space-y-4">
                  {/* Claim Type */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Claim Type *
                    </Label>
                    <select 
                      className="w-full border rounded-lg p-2.5 text-sm bg-background"
                      value={formData.type}
                      onChange={(e) => handleInputChange('type', e.target.value)}
                    >
                      <option value="">Select claim type</option>
                      {getAvailableClaimTypes().map((claimType) => (
                        <option key={claimType.id} value={claimType.name}>
                          {getClaimTypeIcon(claimType.name)} {claimType.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Amount and Date Row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Amount (S$) *</Label>
                      <Input 
                        type="number" 
                        step="0.01"
                        placeholder="0.00"
                        value={formData.amount}
                        onChange={(e) => handleInputChange('amount', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Date *
                      </Label>
                      <Input 
                        type="date" 
                        value={formData.date}
                        onChange={(e) => handleInputChange('date', e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Description *</Label>
                    <Textarea 
                      placeholder="Brief description of the expense"
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      rows={2}
                    />
                  </div>

                  {/* Receipt Upload */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Receipt *</Label>
                    <ReceiptUpload 
                      onFileUpload={(url) => setReceiptUrl(url)}
                      uploadedFileUrl={receiptUrl}
                      employeeId={employeeId}
                      isRequired
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Submit Button */}
              <Button 
                onClick={handleSubmitClaim} 
                disabled={isSubmitting || !receiptUrl}
                className="w-full"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4 mr-2" />
                    Submit Claim
                  </>
                )}
              </Button>

              {/* Claim History Collapsible */}
              <Collapsible open={showHistory} onOpenChange={setShowHistory}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between h-10">
                    <span className="text-sm font-medium">Claim History ({recentClaims.length})</span>
                    {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2 pt-2">
                  {recentClaims.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No claim history
                    </p>
                  ) : (
                    recentClaims.map((claim) => (
                      <div 
                        key={claim.id} 
                        className="flex items-center justify-between p-2 bg-muted/50 rounded-lg"
                      >
                        <div>
                          <p className="text-sm font-medium">{claim.type}</p>
                          <p className="text-xs text-muted-foreground">
                            S${claim.amount.toFixed(2)} • {claim.date}
                          </p>
                        </div>
                        {getStatusBadge(claim.status)}
                      </div>
                    ))
                  )}
                </CollapsibleContent>
              </Collapsible>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SubmitClaimDialog;
