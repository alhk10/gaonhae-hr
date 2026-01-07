import React, { useState, useEffect } from 'react';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { History, FileText, Calendar, User, AlertCircle, RefreshCw, Briefcase, Building2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/sonner';
import { useAuth } from '@/contexts/AuthContext';
import { getEmployees } from '@/services/employeeService';
import ReceiptUpload from '@/components/claim/ReceiptUpload';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';

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
  { id: 'business_development', name: 'Business Development', icon: '💼' },
  { id: 'client_entertainment', name: 'Client Entertainment', icon: '🍽️' },
  { id: 'marketing', name: 'Marketing & Promotion', icon: '📢' },
  { id: 'partnership_expense', name: 'Partnership Expense', icon: '🤝' },
  { id: 'branch_operations', name: 'Branch Operations', icon: '🏢' },
  { id: 'training_development', name: 'Training & Development', icon: '📚' },
  { id: 'other', name: 'Other Business Expense', icon: '📋' },
];

const SubmitPartnersClaim = () => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [claims, setClaims] = useState<PartnerClaim[]>([]);
  const [currentEmployee, setCurrentEmployee] = useState<any>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [employeeLoadError, setEmployeeLoadError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    type: '',
    amount: '',
    date: '',
    vendor: '',
    description: '',
    branch_id: ''
  });

  // Load current employee, branches, and their partner claims
  useEffect(() => {
    const loadEmployeeAndClaims = async () => {
      if (!user?.email) return;

      try {
        setIsLoading(true);
        setEmployeeLoadError(null);
        
        // Load branches
        const { data: branchData, error: branchError } = await supabase
          .from('branches')
          .select('id, name')
          .order('name');
        
        if (!branchError && branchData) {
          setBranches(branchData);
        }
        
        const employees = await getEmployees();
        const employee = employees.find(emp => emp.email === user.email);
        
        if (employee) {
          setCurrentEmployee(employee);
          
          // Load partner claims (using claims table with partner-specific types)
          const { data: claimsData, error } = await supabase
            .from('claims')
            .select('*')
            .eq('employee_id', employee.id)
            .in('type', PARTNER_CLAIM_TYPES.map(t => t.name))
            .order('submitted_date', { ascending: false });
          
          if (!error && claimsData) {
            setClaims(claimsData as PartnerClaim[]);
          }
        } else {
          setEmployeeLoadError(`Employee not found for email: ${user.email}`);
        }
      } catch (error) {
        console.error('Error loading employee data:', error);
        setEmployeeLoadError('Failed to load employee information');
        toast.error("Error loading employee data");
      } finally {
        setIsLoading(false);
      }
    };

    loadEmployeeAndClaims();
  }, [user]);

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

      const { error } = await supabase.from('claims').insert({
        employee_id: currentEmployee.id,
        type: formData.type,
        amount: parseFloat(formData.amount),
        description: `${formData.vendor ? `Vendor: ${formData.vendor} - ` : ''}${formData.description}`,
        status: 'Pending',
        submitted_date: formData.date,
        receipt_url: receiptUrl,
        branch_id: formData.branch_id
      });

      if (error) throw error;
      
      // Reload claims
      const { data: claimsData } = await supabase
        .from('claims')
        .select('*')
        .eq('employee_id', currentEmployee.id)
        .in('type', PARTNER_CLAIM_TYPES.map(t => t.name))
        .order('submitted_date', { ascending: false });
      
      if (claimsData) setClaims(claimsData as PartnerClaim[]);
      
      setFormData({ type: formData.type, amount: '', date: '', vendor: '', description: '', branch_id: '' });
      setReceiptUrl(null);
      toast.success("Partner claim submitted successfully!");
    } catch (error) {
      console.error('Error submitting claim:', error);
      toast.error("Error submitting claim. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetryLoadEmployee = async () => {
    if (!user?.email) return;
    setEmployeeLoadError(null);
    setIsLoading(true);
    
    try {
      const employees = await getEmployees();
      const employee = employees.find(emp => emp.email === user.email);
      if (employee) {
        setCurrentEmployee(employee);
      } else {
        setEmployeeLoadError(`Employee not found for email: ${user.email}`);
      }
    } catch (error) {
      setEmployeeLoadError('Failed to load employee information');
    } finally {
      setIsLoading(false);
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

  const getClaimTypeIcon = (typeName: string) => {
    return PARTNER_CLAIM_TYPES.find(t => t.name === typeName)?.icon || '📋';
  };

  const getBranchName = (branchId: string | null) => {
    if (!branchId) return '-';
    return branches.find(b => b.id === branchId)?.name || branchId;
  };

  if (isLoading) {
    return (
      <ResponsiveLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading partner information...</p>
          </div>
        </div>
      </ResponsiveLayout>
    );
  }

  if (employeeLoadError) {
    return (
      <ResponsiveLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 font-medium mb-2">Unable to load your information</p>
            <p className="text-gray-600 text-sm mb-4">{employeeLoadError}</p>
            <Button onClick={handleRetryLoadEmployee} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </div>
        </div>
      </ResponsiveLayout>
    );
  }

  return (
    <ResponsiveLayout>
      <div className={`space-y-4 md:space-y-8 ${isMobile ? 'px-1' : 'max-w-7xl mx-auto'}`}>
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className={`font-bold text-gray-900 ${isMobile ? 'text-xl' : 'text-2xl'}`}>
              <Briefcase className="inline-block w-6 h-6 mr-2 text-indigo-600" />
              Partners Claim
            </h1>
            <p className="text-gray-600 text-sm mt-1">
              Submit business-related expense claims for Partners
            </p>
          </div>
          <Button 
            onClick={handleSubmitClaim} 
            disabled={isSubmitting || !receiptUrl}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Claim'}
          </Button>
        </div>

        <Tabs defaultValue="submit" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="submit">Submit Claim</TabsTrigger>
            <TabsTrigger value="history">Claim History</TabsTrigger>
          </TabsList>

          <TabsContent value="submit" className="space-y-6">
            <Card className="shadow-lg border-0">
              <CardContent className={`space-y-6 ${isMobile ? 'p-4' : 'p-8'}`}>
                
                {currentEmployee && (
                  <div className="text-xs text-gray-500 bg-indigo-50 p-3 rounded-lg border border-indigo-100">
                    <span className="font-medium text-indigo-700">Partner:</span> {currentEmployee.name} 
                    <span className="mx-2">|</span>
                    <span className="font-medium text-indigo-700">Position:</span> {currentEmployee.position}
                    {currentEmployee.department && (
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
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
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
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {claims.map((claim) => (
                          <TableRow key={claim.id}>
                            <TableCell>
                              <span className="mr-2">{getClaimTypeIcon(claim.type)}</span>
                              {claim.type}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{getBranchName(claim.branch_id)}</Badge>
                            </TableCell>
                            <TableCell>{claim.submitted_date}</TableCell>
                            <TableCell className="font-medium">{formatAmount(claim.amount)}</TableCell>
                            <TableCell>
                              <Badge variant={getStatusBadgeVariant(claim.status)}>
                                {claim.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-xs truncate">{claim.description}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <Briefcase className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>No partner claims submitted yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ResponsiveLayout>
  );
};

export default SubmitPartnersClaim;
