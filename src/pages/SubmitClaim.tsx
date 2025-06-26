
import React, { useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Upload, History, FileText } from 'lucide-react';
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
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex h-[calc(100vh-73px)]">
        <Sidebar />
        <main className="flex-1 p-6 overflow-auto">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Submit Claim</h2>
                <p className="text-gray-600">Submit your expense claim and view history</p>
              </div>
              <Button 
                onClick={handleSubmitClaim} 
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Submitting...
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4 mr-2" />
                    Submit Claim
                  </>
                )}
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Expense Claim Form */}
              <Card>
                <CardHeader>
                  <CardTitle>Expense Claim Form</CardTitle>
                  <CardDescription>Fill out the details for your expense claim</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Claim Type *</label>
                      <select 
                        className="w-full p-2 border border-gray-300 rounded-lg"
                        value={formData.type}
                        onChange={(e) => handleInputChange('type', e.target.value)}
                      >
                        <option value="Transport">Transport</option>
                        <option value="Meals">Meals</option>
                        <option value="Equipment">Equipment</option>
                        <option value="Training">Training</option>
                        <option value="Medical">Medical</option>
                        <option value="Others">Others</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Amount (S$) *</label>
                      <input 
                        type="number" 
                        step="0.01"
                        className="w-full p-2 border border-gray-300 rounded-lg"
                        placeholder="0.00"
                        value={formData.amount}
                        onChange={(e) => handleInputChange('amount', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">GST Amount (S$)</label>
                      <input 
                        type="number" 
                        step="0.01"
                        className="w-full p-2 border border-gray-300 rounded-lg"
                        placeholder="0.00"
                        value={formData.gstAmount}
                        onChange={(e) => handleInputChange('gstAmount', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Date of Expense *</label>
                      <input 
                        type="date" 
                        className="w-full p-2 border border-gray-300 rounded-lg"
                        value={formData.date}
                        onChange={(e) => handleInputChange('date', e.target.value)}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Vendor/Merchant</label>
                      <input 
                        type="text" 
                        className="w-full p-2 border border-gray-300 rounded-lg"
                        placeholder="Enter vendor name"
                        value={formData.vendor}
                        onChange={(e) => handleInputChange('vendor', e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
                    <textarea 
                      rows={3} 
                      className="w-full p-2 border border-gray-300 rounded-lg"
                      placeholder="Describe the expense..."
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                    ></textarea>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Receipt Upload</label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                      <Upload className="mx-auto h-8 w-8 text-gray-400" />
                      <p className="text-sm text-gray-600 mt-2">Upload receipt or supporting documents</p>
                      <Button variant="outline" size="sm" className="mt-2">
                        Choose Files
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Claim History */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <History className="w-5 h-5" />
                    <span>Claim History</span>
                  </CardTitle>
                  <CardDescription>Your recent expense claims</CardDescription>
                </CardHeader>
                <CardContent>
                  {claims.length > 0 ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div className="text-center p-3 bg-blue-50 rounded-lg">
                          <div className="text-2xl font-bold text-blue-600">
                            {claims.filter(c => c.status === 'Pending').length}
                          </div>
                          <div className="text-blue-600">Pending</div>
                        </div>
                        <div className="text-center p-3 bg-green-50 rounded-lg">
                          <div className="text-2xl font-bold text-green-600">
                            {claims.filter(c => c.status === 'Approved').length}
                          </div>
                          <div className="text-green-600">Approved</div>
                        </div>
                        <div className="text-center p-3 bg-red-50 rounded-lg">
                          <div className="text-2xl font-bold text-red-600">
                            {claims.filter(c => c.status === 'Rejected').length}
                          </div>
                          <div className="text-red-600">Rejected</div>
                        </div>
                      </div>
                      
                      <div className="max-h-96 overflow-y-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Type</TableHead>
                              <TableHead>Amount</TableHead>
                              <TableHead>Date</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {claims.slice(0, 10).map((claim) => (
                              <TableRow key={claim.id}>
                                <TableCell className="font-medium">{claim.type}</TableCell>
                                <TableCell>{formatAmount(claim.amount)}</TableCell>
                                <TableCell>{new Date(claim.date).toLocaleDateString()}</TableCell>
                                <TableCell>
                                  <Badge variant={getStatusBadgeVariant(claim.status)}>
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
                      <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>No claims submitted yet</p>
                      <p className="text-sm">Your claim history will appear here</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default SubmitClaim;
