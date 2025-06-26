
import React, { useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Upload, History, FileText, DollarSign, Calendar, User } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { useAuth } from '@/contexts/AuthContext';
import { getEmployeeClaims, createClaim } from '@/services/claimsService';
import { getEmployees } from '@/services/employeeService';

interface Claim {
  id: number;
  employeeId: string;
  employee: string;
  type: string;
  amount: number;
  date: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  description: string;
}

const SubmitClaim = () => {
  const { user } = useAuth();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [currentEmployee, setCurrentEmployee] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    type: 'Transport',
    amount: '',
    gstAmount: '',
    date: '',
    vendor: '',
    description: ''
  });

  // Load current employee and their claims
  useEffect(() => {
    const loadEmployeeAndClaims = async () => {
      if (!user?.email) return;

      try {
        setIsLoading(true);
        console.log('Loading employee data for:', user.email);
        
        // Get current employee
        const employees = await getEmployees();
        const employee = employees.find(emp => emp.email === user.email);
        
        if (employee) {
          console.log('Found employee:', employee);
          setCurrentEmployee(employee);
          
          // Load employee's claims
          console.log('Loading claims for employee ID:', employee.id);
          const employeeClaims = await getEmployeeClaims(employee.id);
          console.log('Loaded claims:', employeeClaims);
          setClaims(employeeClaims);
        } else {
          console.log('Employee not found for email:', user.email);
        }
      } catch (error) {
        console.error('Error loading employee data:', error);
        toast("Error loading claim history");
      } finally {
        setIsLoading(false);
      }
    };

    loadEmployeeAndClaims();
  }, [user]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmitClaim = async () => {
    if (!currentEmployee || !formData.type || !formData.amount || !formData.date || !formData.description) {
      toast("Please fill in all required fields");
      return;
    }

    try {
      setIsSubmitting(true);
      console.log('Submitting claim:', formData);

      const newClaim: Omit<Claim, 'id'> = {
        employeeId: currentEmployee.id,
        employee: currentEmployee.name,
        type: formData.type,
        amount: parseFloat(formData.amount),
        date: formData.date,
        status: 'Pending',
        description: formData.description
      };

      await createClaim(newClaim);
      
      // Reload claims to show the new one
      const updatedClaims = await getEmployeeClaims(currentEmployee.id);
      setClaims(updatedClaims);
      
      // Reset form
      setFormData({
        type: 'Transport',
        amount: '',
        gstAmount: '',
        date: '',
        vendor: '',
        description: ''
      });

      toast("Claim submitted successfully");
    } catch (error) {
      console.error('Error submitting claim:', error);
      toast("Error submitting claim. Please try again.");
    } finally {
      setIsSubmitting(false);
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex h-[calc(100vh-73px)]">
          <Sidebar />
          <main className="flex-1 p-6 overflow-auto">
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading...</p>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Navbar />
      <div className="flex h-[calc(100vh-73px)]">
        <Sidebar />
        <main className="flex-1 p-8 overflow-auto">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Header Section */}
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <FileText className="w-6 h-6 text-blue-600" />
                  </div>
                  Submit Claim
                </h1>
                <p className="text-gray-600">Submit your expense claims quickly and track their status</p>
              </div>
              <Button 
                onClick={handleSubmitClaim} 
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
                size="lg"
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

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              {/* Expense Claim Form */}
              <div className="xl:col-span-2">
                <Card className="shadow-lg border-0 bg-white">
                  <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
                    <CardTitle className="text-xl text-gray-800 flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-blue-600" />
                      Expense Claim Form
                    </CardTitle>
                    <CardDescription className="text-gray-600">
                      Fill out the details for your expense claim
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-8 space-y-6">
                    {/* Basic Information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          Claim Type *
                        </Label>
                        <select 
                          className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                          value={formData.type}
                          onChange={(e) => handleInputChange('type', e.target.value)}
                        >
                          <option value="Transport">🚗 Transport</option>
                          <option value="Meals">🍽️ Meals</option>
                          <option value="Equipment">💻 Equipment</option>
                          <option value="Training">📚 Training</option>
                          <option value="Medical">🏥 Medical</option>
                          <option value="Others">📋 Others</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <DollarSign className="w-4 h-4" />
                          Amount (S$) *
                        </Label>
                        <Input 
                          type="number" 
                          step="0.01"
                          className="p-3 text-lg border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                          placeholder="0.00"
                          value={formData.amount}
                          onChange={(e) => handleInputChange('amount', e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold text-gray-700">GST Amount (S$)</Label>
                        <Input 
                          type="number" 
                          step="0.01"
                          className="p-3 border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                          placeholder="0.00"
                          value={formData.gstAmount}
                          onChange={(e) => handleInputChange('gstAmount', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          Date of Expense *
                        </Label>
                        <Input 
                          type="date" 
                          className="p-3 border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                          value={formData.date}
                          onChange={(e) => handleInputChange('date', e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Vendor/Merchant
                      </Label>
                      <Input 
                        type="text" 
                        className="p-3 border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                        placeholder="Enter vendor name"
                        value={formData.vendor}
                        onChange={(e) => handleInputChange('vendor', e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-gray-700">Description *</Label>
                      <Textarea 
                        rows={4} 
                        className="p-3 border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none"
                        placeholder="Describe the expense in detail..."
                        value={formData.description}
                        onChange={(e) => handleInputChange('description', e.target.value)}
                      />
                    </div>

                    {/* Receipt Upload Section */}
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-gray-700">Receipt Upload</Label>
                      <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center bg-gray-50 hover:bg-gray-100 transition-colors duration-200">
                        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                        <p className="text-gray-600 mb-2">Upload receipt or supporting documents</p>
                        <p className="text-sm text-gray-500 mb-4">Drag and drop files here or click to browse</p>
                        <Button variant="outline" size="sm" className="bg-white hover:bg-gray-50">
                          <Upload className="w-4 h-4 mr-2" />
                          Choose Files
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Claim History Sidebar */}
              <div className="xl:col-span-1">
                <Card className="shadow-lg border-0 bg-white sticky top-6">
                  <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b">
                    <CardTitle className="text-xl text-gray-800 flex items-center gap-2">
                      <History className="w-5 h-5 text-green-600" />
                      Claim History
                    </CardTitle>
                    <CardDescription className="text-gray-600">
                      Your recent expense claims
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6">
                    {claims.length > 0 ? (
                      <div className="space-y-6">
                        {/* Summary Statistics */}
                        <div className="grid grid-cols-3 gap-3">
                          <div className="text-center p-4 bg-blue-50 rounded-lg">
                            <div className="text-2xl font-bold text-blue-600">
                              {claims.filter(c => c.status === 'Pending').length}
                            </div>
                            <div className="text-xs text-blue-600 font-medium">Pending</div>
                          </div>
                          <div className="text-center p-4 bg-green-50 rounded-lg">
                            <div className="text-2xl font-bold text-green-600">
                              {claims.filter(c => c.status === 'Approved').length}
                            </div>
                            <div className="text-xs text-green-600 font-medium">Approved</div>
                          </div>
                          <div className="text-center p-4 bg-red-50 rounded-lg">
                            <div className="text-2xl font-bold text-red-600">
                              {claims.filter(c => c.status === 'Rejected').length}
                            </div>
                            <div className="text-xs text-red-600 font-medium">Rejected</div>
                          </div>
                        </div>
                        
                        {/* Recent Claims Table */}
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
                        
                        {claims.length > 8 && (
                          <div className="text-center">
                            <Button variant="outline" size="sm" className="text-blue-600">
                              View All Claims
                            </Button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-gray-500">
                        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                          <FileText className="w-8 h-8 text-gray-300" />
                        </div>
                        <p className="font-medium mb-1">No claims submitted yet</p>
                        <p className="text-sm">Your claim history will appear here</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default SubmitClaim;
