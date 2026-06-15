import React, { useState, useEffect } from 'react';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { History, FileText, Calendar, User, AlertCircle, RefreshCw, Settings, Briefcase } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/sonner';
import { useAuth } from '@/contexts/AuthContext';
import { getEmployeeClaims, createClaim, type Claim } from '@/services/claimsService';
import { getEmployees, getEmployeeById } from '@/services/employeeService';
import { getClaimTypes, type ClaimType } from '@/services/claimTypesService';
import ReceiptUpload from '@/components/claim/ReceiptUpload';
import { useIsMobile } from '@/hooks/use-mobile';
import ClaimsManagementContent from '@/components/claim/ClaimsManagementContent';
import PartnerClaimContent from '@/components/claim/PartnerClaimContent';
import { formatDate } from '@/utils/dateFormat';


const SubmitClaim = () => {
  const { user, userrole } = useAuth();
  const isMobile = useIsMobile();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [currentEmployee, setCurrentEmployee] = useState<any>(null);
  const [claimTypes, setClaimTypes] = useState<ClaimType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [employeeLoadError, setEmployeeLoadError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    type: '',
    amount: '',
    gstAmount: '',
    date: '',
    vendor: '',
    description: ''
  });

  // Check if user can manage claims (Senior Partner or Superadmin)
  const isSeniorPartner = currentEmployee?.position?.toLowerCase() === 'senior partner';
  const isPartner = currentEmployee?.position?.toLowerCase() === 'partner' || isSeniorPartner;
  const canManageClaims = userrole === 'superadmin' || isSeniorPartner;

  // Component rendered


  // Load claim types from database
  useEffect(() => {
    const loadClaimTypes = async () => {
      try {
        console.log('SubmitClaim: Loading claim types from database...');
        const types = await getClaimTypes();
        console.log('SubmitClaim: Loaded claim types:', types);
        setClaimTypes(types);
        
        // Set default type based on employee type
        if (types.length > 0 && !formData.type && currentEmployee) {
          const availableTypes = types.filter(type => 
            currentEmployee.type === 'Full-Time' || type.name !== 'Medical'
          );
          if (availableTypes.length > 0) {
            setFormData(prev => ({ ...prev, type: availableTypes[0].name }));
          }
        }
      } catch (error) {
        console.error('SubmitClaim: Error loading claim types:', error);
        toast("Error loading claim types");
      }
    };

    if (currentEmployee) {
      loadClaimTypes();
    }
  }, [currentEmployee]);

  // Load current employee and their claims
  useEffect(() => {
    const loadEmployeeAndClaims = async () => {
      if (!user?.email) {
        console.log('SubmitClaim: No user email available');
        return;
      }

      try {
        setIsLoading(true);
        setEmployeeLoadError(null);
        // Loading employee data
        
        // Get current employee
        const employees = await getEmployees();
        const employee = employees.find(emp => emp.email === user.email);
        
        if (employee) {
          console.log('SubmitClaim: Found employee:', employee);
          setCurrentEmployee(employee);
          
          // Load employee's claims
          console.log('SubmitClaim: Loading claims for employee ID:', employee.id);
          const employeeClaims = await getEmployeeClaims(employee.id);
          console.log('SubmitClaim: Loaded claims:', employeeClaims);
          setClaims(employeeClaims);
        } else {
          const errorMsg = `Employee not found for email: ${user.email}`;
          console.log('SubmitClaim:', errorMsg);
          setEmployeeLoadError(errorMsg);
        }
      } catch (error) {
        console.error('SubmitClaim: Error loading employee data:', error);
        setEmployeeLoadError('Failed to load employee information');
        toast("Error loading employee data");
      } finally {
        setIsLoading(false);
      }
    };

    loadEmployeeAndClaims();
  }, [user]);

  const handleInputChange = (field: string, value: string) => {
    console.log('SubmitClaim: Form field changed:', field, value);
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmitClaim = async () => {
    console.log('SubmitClaim: Attempting to submit claim with data:', formData);
    console.log('SubmitClaim: Receipt URL:', receiptUrl);
    console.log('SubmitClaim: Current employee:', currentEmployee);

    if (!currentEmployee || !formData.type || !formData.amount || !formData.date || !formData.description) {
      console.error('SubmitClaim: Missing required fields');
      toast.error("Please fill in all required fields");
      return;
    }

    if (!receiptUrl) {
      console.error('SubmitClaim: No receipt uploaded');
      toast.error("Please upload a receipt before submitting");
      return;
    }

    try {
      setIsSubmitting(true);
      console.log('SubmitClaim: Submitting claim...');

      const newClaim = {
        employeeId: currentEmployee.id,
        employee: currentEmployee.name,
        type: formData.type,
        amount: parseFloat(formData.amount),
        date: formData.date,
        status: 'Pending' as const,
        description: formData.description,
        receipt_url: receiptUrl
      };

      console.log('SubmitClaim: New claim object:', newClaim);
      await createClaim(newClaim);
      
      // Reload claims to show the new one
      const updatedClaims = await getEmployeeClaims(currentEmployee.id);
      setClaims(updatedClaims);
      
      // Reset form but keep the same claim type
      setFormData(prev => ({
        type: prev.type,
        amount: '',
        gstAmount: '',
        date: '',
        vendor: '',
        description: ''
      }));
      setReceiptUrl(null);

      console.log('SubmitClaim: Claim submitted successfully');
      toast("Claim submitted successfully!");
    } catch (error) {
      console.error('SubmitClaim: Error submitting claim:', error);
      toast("Error submitting claim. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetryLoadEmployee = async () => {
    console.log('SubmitClaim: Retrying employee load...');
    if (!user?.email) return;
    
    setEmployeeLoadError(null);
    setIsLoading(true);
    
    try {
      const employees = await getEmployees();
      const employee = employees.find(emp => emp.email === user.email);
      
      if (employee) {
        setCurrentEmployee(employee);
        const employeeClaims = await getEmployeeClaims(employee.id);
        setClaims(employeeClaims);
      } else {
        setEmployeeLoadError(`Employee not found for email: ${user.email}`);
      }
    } catch (error) {
      console.error('SubmitClaim: Retry failed:', error);
      setEmployeeLoadError('Failed to load employee information');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'Approved':
        return 'default';
      case 'Rejected':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const formatAmount = (amount: number) => {
    return `S$${amount.toFixed(2)}`;
  };

  const getClaimTypeIcon = (typeName: string) => {
    switch (typeName.toLowerCase()) {
      case 'medical':
        return '🏥';
      case 'transport':
        return '🚗';
      case 'meal':
        return '🍽️';
      case 'equipment':
        return '💻';
      case 'travel':
        return '✈️';
      case 'accommodation':
        return '🏨';
      default:
        return '📋';
    }
  };

  const getAvailableClaimTypes = () => {
    if (!currentEmployee) return claimTypes;
    
    // Filter out Medical claims for casual employees
    return claimTypes.filter(type => 
      currentEmployee.type === 'Full-Time' || type.name !== 'Medical'
    );
  };

  if (isLoading) {
    return (
      <ResponsiveLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading employee information...</p>
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

  // Calculate tab configuration based on role
  const getTabConfig = () => {
    if (isPartner) {
      // Partners only see Partners Claim and Claim History (plus Manage Claims for senior partners)
      const tabs = [
        { value: 'partners', label: 'Partners Claim', icon: Briefcase },
        { value: 'history', label: 'Claim History', icon: History }
      ];
      if (canManageClaims) {
        tabs.push({ value: 'manage', label: 'Manage Claims', icon: Settings });
      }
      return { tabs, defaultTab: 'partners' };
    } else {
      // Regular employees see Submit Claim and Claim History (plus Manage Claims if admin)
      const tabs = [
        { value: 'submit', label: 'Submit Claim', icon: FileText },
        { value: 'history', label: 'Claim History', icon: History }
      ];
      if (canManageClaims) {
        tabs.push({ value: 'manage', label: 'Manage Claims', icon: Settings });
      }
      return { tabs, defaultTab: 'submit' };
    }
  };

  const tabConfig = getTabConfig();

  return (
    <ResponsiveLayout>
      <div className={`space-y-4 md:space-y-8 ${isMobile ? 'px-1' : 'max-w-7xl mx-auto'}`}>

        {/* Submit button only shown for non-partners */}
        {!isPartner && (
          <div className="flex items-center justify-end">
            <Button 
              onClick={handleSubmitClaim} 
              disabled={isSubmitting || !receiptUrl}
              className={`bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 ${isMobile ? 'px-4 py-2 text-sm' : 'px-6 py-3 text-lg font-semibold'}`}
              size={isMobile ? "default" : "lg"}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Submitting...
                </>
              ) : (
                <>
                  <FileText className="w-5 h-5 mr-2" />
                  Submit Claim
                </>
              )}
            </Button>
          </div>
        )}

        <Tabs defaultValue={tabConfig.defaultTab} className="w-full">
          <TabsList className={`grid w-full grid-cols-${tabConfig.tabs.length} ${isMobile ? 'mb-4' : 'mb-6'}`}>
            {tabConfig.tabs.map(tab => (
              <TabsTrigger key={tab.value} value={tab.value} className={isMobile ? 'text-sm' : ''}>
                <tab.icon className="w-4 h-4 mr-1" />
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Partners Claim Tab (only for partners) */}
          {isPartner && (
            <TabsContent value="partners" className="space-y-4 md:space-y-6">
              <PartnerClaimContent currentEmployee={currentEmployee} />
            </TabsContent>
          )}

          {/* Regular Submit Claim Tab (only for non-partners) */}
          {!isPartner && (
            <TabsContent value="submit" className={`space-y-4 md:space-y-6`}>
              <Card className="shadow-lg border-0 bg-white">
                <CardContent className={`space-y-4 md:space-y-6 ${isMobile ? 'p-4' : 'p-8'}`}>
                {/* Employee Info Debug */}
                {currentEmployee && (
                  <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                    Employee: {currentEmployee.name} (ID: {currentEmployee.id}) - {currentEmployee.email}
                  </div>
                )}

                {/* Basic Information */}
                <div className={`grid gap-4 md:gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
                  <div className="space-y-2">
                    <Label className={`font-semibold text-gray-700 flex items-center gap-2 ${isMobile ? 'text-sm' : 'text-sm'}`}>
                      <FileText className="w-4 h-4" />
                      Claim Type *
                    </Label>
                    <select 
                      className={`w-full border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${isMobile ? 'p-2 text-sm' : 'p-3'}`}
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
                  <div className="space-y-2">
                    <Label className={`font-semibold text-gray-700 ${isMobile ? 'text-sm' : 'text-sm'}`}>
                      Amount (S$) *
                    </Label>
                    <Input 
                      type="number" 
                      step="0.01"
                      className={`border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${isMobile ? 'p-2 text-sm' : 'p-3 text-lg'}`}
                      placeholder="0.00"
                      value={formData.amount}
                      onChange={(e) => handleInputChange('amount', e.target.value)}
                    />
                  </div>
                </div>

                <div className={`grid gap-4 md:gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
                  <div className="space-y-2">
                    <Label className={`font-semibold text-gray-700 ${isMobile ? 'text-sm' : 'text-sm'}`}>GST Amount (S$)</Label>
                    <Input 
                      type="number" 
                      step="0.01"
                      className={`border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${isMobile ? 'p-2 text-sm' : 'p-3'}`}
                      placeholder="0.00"
                      value={formData.gstAmount}
                      onChange={(e) => handleInputChange('gstAmount', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className={`font-semibold text-gray-700 flex items-center gap-2 ${isMobile ? 'text-sm' : 'text-sm'}`}>
                      <Calendar className="w-4 h-4" />
                      Date of Expense *
                    </Label>
                    <Input 
                      type="date" 
                      className={`border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${isMobile ? 'p-2 text-sm' : 'p-3'}`}
                      value={formData.date}
                      onChange={(e) => handleInputChange('date', e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className={`font-semibold text-gray-700 flex items-center gap-2 ${isMobile ? 'text-sm' : 'text-sm'}`}>
                    <User className="w-4 h-4" />
                    Vendor/Merchant
                  </Label>
                  <Input 
                    type="text" 
                    className={`border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${isMobile ? 'p-2 text-sm' : 'p-3'}`}
                    placeholder="Enter vendor name"
                    value={formData.vendor}
                    onChange={(e) => handleInputChange('vendor', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label className={`font-semibold text-gray-700 ${isMobile ? 'text-sm' : 'text-sm'}`}>Description *</Label>
                  <Textarea 
                    rows={isMobile ? 3 : 4} 
                    className={`border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none ${isMobile ? 'p-2 text-sm' : 'p-3'}`}
                    placeholder="Describe the expense"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                  />
                </div>

                {/* Receipt Upload Section */}
                <ReceiptUpload 
                  onFileUpload={setReceiptUrl}
                  uploadedFileUrl={receiptUrl}
                  employeeId={currentEmployee?.id || 'loading'}
                  isRequired={true}
                />
              </CardContent>
            </Card>
          </TabsContent>
          )}

          <TabsContent value="history" className={`space-y-4 md:space-y-6`}>
            <Card className="shadow-lg border-0 bg-white">
              <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b">
                <CardTitle className={`text-gray-800 flex items-center gap-2 ${isMobile ? 'text-lg' : 'text-xl'}`}>
                  <History className="w-5 h-5 text-green-600" />
                  Claim History
                </CardTitle>
              </CardHeader>
              <CardContent className={isMobile ? 'p-4' : 'p-6'}>
                {claims.length > 0 ? (
                  <div className={`space-y-4 md:space-y-6`}>
                    {/* Summary Statistics */}
                    <div className={`grid gap-3 ${isMobile ? 'grid-cols-3' : 'grid-cols-3'}`}>
                      <div className={`text-center bg-blue-50 rounded-lg ${isMobile ? 'p-3' : 'p-4'}`}>
                        <div className={`font-bold text-blue-600 ${isMobile ? 'text-lg' : 'text-2xl'}`}>
                          {claims.filter(c => c.status === 'Pending').length}
                        </div>
                        <div className={`text-blue-600 font-medium ${isMobile ? 'text-xs' : 'text-xs'}`}>Pending</div>
                      </div>
                      <div className={`text-center bg-green-50 rounded-lg ${isMobile ? 'p-3' : 'p-4'}`}>
                        <div className={`font-bold text-green-600 ${isMobile ? 'text-lg' : 'text-2xl'}`}>
                          {claims.filter(c => c.status === 'Approved').length}
                        </div>
                        <div className={`text-green-600 font-medium ${isMobile ? 'text-xs' : 'text-xs'}`}>Approved</div>
                      </div>
                      <div className={`text-center bg-red-50 rounded-lg ${isMobile ? 'p-3' : 'p-4'}`}>
                        <div className={`font-bold text-red-600 ${isMobile ? 'text-lg' : 'text-2xl'}`}>
                          {claims.filter(c => c.status === 'Rejected').length}
                        </div>
                        <div className={`text-red-600 font-medium ${isMobile ? 'text-xs' : 'text-xs'}`}>Rejected</div>
                      </div>
                    </div>

                    {/* Claims Table */}
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className={isMobile ? 'text-xs' : ''}>Date</TableHead>
                            <TableHead className={isMobile ? 'text-xs' : ''}>Type</TableHead>
                            <TableHead className={isMobile ? 'text-xs' : ''}>Amount</TableHead>
                            <TableHead className={isMobile ? 'text-xs' : ''}>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {claims.map((claim) => (
                            <TableRow key={claim.id}>
                              <TableCell className={isMobile ? 'text-xs' : ''}>
                                {formatDate(new Date(claim.date))}
                              </TableCell>
                              <TableCell className={isMobile ? 'text-xs' : ''}>{claim.type}</TableCell>
                              <TableCell className={isMobile ? 'text-xs' : ''}>{formatAmount(claim.amount)}</TableCell>
                              <TableCell>
                                <Badge variant={getStatusBadgeVariant(claim.status)} className={isMobile ? 'text-xs' : ''}>
                                  {claim.status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <History className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>No claims found</p>
                    <p className="text-sm mt-2">Submit your first claim to see it here</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {canManageClaims && (
            <TabsContent value="manage" className="space-y-6">
              <ClaimsManagementContent />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </ResponsiveLayout>
  );
};

export default SubmitClaim;
