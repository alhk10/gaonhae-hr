import React, { useState, useEffect } from 'react';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { History, FileText, Calendar, User, AlertCircle, RefreshCw } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/sonner';
import { useAuth } from '@/contexts/AuthContext';
import { getEmployeeClaims, createClaim, type Claim } from '@/services/claimsService';
import { getEmployees } from '@/services/employeeService';
import { getClaimTypes, type ClaimType } from '@/services/claimTypesService';
import ReceiptUpload from '@/components/claim/ReceiptUpload';
import { useIsMobile } from '@/hooks/use-mobile';


const SubmitClaim = () => {
  const { user } = useAuth();
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

  console.log('SubmitClaim: Component rendered with user:', user?.email);


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
        console.log('SubmitClaim: Loading employee data for:', user.email);
        
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
      toast("Please fill in all required fields");
      return;
    }

    if (!receiptUrl) {
      console.error('SubmitClaim: No receipt uploaded');
      toast("Please upload a receipt before submitting");
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

  return (
    <ResponsiveLayout>
      <div className={`space-y-4 md:space-y-8 ${isMobile ? 'px-1' : 'max-w-7xl mx-auto'}`}>

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

        <Tabs defaultValue="submit" className="w-full">
          <TabsList className={`grid w-full grid-cols-2 ${isMobile ? 'mb-4' : 'mb-6'}`}>
            <TabsTrigger value="submit" className={isMobile ? 'text-sm' : ''}>Submit Claim</TabsTrigger>
            <TabsTrigger value="history" className={isMobile ? 'text-sm' : ''}>Claim History</TabsTrigger>
          </TabsList>

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
                    
                    {/* Recent Claims */}
                    {isMobile ? (
                      // Mobile: Card-based layout
                      <div className="space-y-3">
                        {claims.slice(0, 8).map((claim) => (
                          <div key={claim.id} className="bg-gray-50 rounded-lg p-3 border">
                            <div className="flex justify-between items-start mb-2">
                              <span className="font-medium text-sm">{claim.type}</span>
                              <Badge 
                                variant={getStatusBadgeVariant(claim.status)}
                                className="text-xs"
                              >
                                {claim.status}
                              </Badge>
                            </div>
                            <div className="text-sm text-gray-600">
                              {formatAmount(claim.amount)}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      // Desktop: Table layout
                      <div className="max-h-96 overflow-y-auto rounded-lg border border-gray-100">
                        <Table>
                          <TableHeader className="bg-gray-50">
                            <TableRow>
                              <TableHead className="text-xs font-semibold">Type</TableHead>
                              <TableHead className="text-xs font-semibold">Amount</TableHead>
                              <TableHead className="text-xs font-semibold">Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {claims.slice(0, 8).map((claim) => (
                              <TableRow key={claim.id} className="hover:bg-gray-50">
                                <TableCell className="font-medium text-sm">{claim.type}</TableCell>
                                <TableCell className="text-sm">{formatAmount(claim.amount)}</TableCell>
                                <TableCell>
                                  <Badge 
                                    variant={getStatusBadgeVariant(claim.status)}
                                    className="text-xs"
                                  >
                                    {claim.status}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                    
                    {claims.length > 8 && (
                      <div className="text-center">
                        <Button variant="outline" size="sm" className="text-blue-600">
                          View All Claims
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className={`text-center text-gray-500 ${isMobile ? 'py-8' : 'py-12'}`}>
                    <div className={`mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center ${isMobile ? 'w-12 h-12' : 'w-16 h-16'}`}>
                      <FileText className={`text-gray-300 ${isMobile ? 'w-6 h-6' : 'w-8 h-8'}`} />
                    </div>
                    <p className={`font-medium mb-1 ${isMobile ? 'text-sm' : ''}`}>No claims submitted yet</p>
                    <p className={`${isMobile ? 'text-xs' : 'text-sm'}`}>Your claim history will appear here</p>
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

export default SubmitClaim;
