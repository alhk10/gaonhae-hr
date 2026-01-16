
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, AlertTriangle, Info, CheckCircle, FileText, Settings } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getEmployeeById } from '@/services/employeeService';
import { calculateLeaveBalance } from '@/utils/leaveCalculations';
import { isEligibleForLeave, getEmployeeEligibilityMessage } from '@/utils/employeeEligibility';
import { validateLeaveRequest } from '@/services/leaveValidationService';
import { applyForLeaveWithValidation, calculateEmployeeLeaveEntitlement } from '@/services/enhancedLeaveService';
import EmployeeLeaveInfo from '@/components/leave/EmployeeLeaveInfo';
import MedicalCertificateUpload from '@/components/leave/MedicalCertificateUpload';
import LeaveManagementContent from '@/components/leave/LeaveManagementContent';

const ApplyLeave = () => {
  const { user, userrole } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [employee, setEmployee] = useState<any>(null);
  const [leaveBalance, setLeaveBalance] = useState<any>(null);
  const [enhancedEntitlement, setEnhancedEntitlement] = useState<any>(null);
  const [entitlementSummary, setEntitlementSummary] = useState<string>('');
  const [formData, setFormData] = useState({
    type: '',
    startDate: '',
    endDate: '',
    reason: '',
    medicalCertificate: ''
  });
  const [calculatedDays, setCalculatedDays] = useState(0);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);

  // Check if user can manage leave (Senior Partner or Superadmin)
  const isSeniorPartner = employee?.position?.toLowerCase() === 'senior partner';
  const canManageLeave = userrole === 'superadmin' || isSeniorPartner;

  useEffect(() => {
    if (user?.employeeId) {
      loadEmployeeData();
    }
  }, [user]);

  useEffect(() => {
    if (formData.startDate && formData.endDate) {
      calculateLeaveDays();
      validateCurrentRequest();
    }
  }, [formData.startDate, formData.endDate, formData.type]);

  const loadEmployeeData = async () => {
    if (!user?.employeeId) return;

    try {
      const employeeData = await getEmployeeById(user.employeeId);
      if (!employeeData) {
        toast({
          title: "Error",
          description: "Employee data not found",
          variant: "destructive",
        });
        return;
      }

      setEmployee(employeeData);

      // Check eligibility first
      if (!isEligibleForLeave(employeeData)) {
        toast({
          title: "Leave Application Not Available",
          description: getEmployeeEligibilityMessage(employeeData),
          variant: "destructive",
        });
        return;
      }

      // Load leave balance using existing function
      if (employeeData.joinDate) {
        const balance = await calculateLeaveBalance(
          employeeData.id,
          employeeData.joinDate,
          [],
          { type: employeeData.type, position: employeeData.position }
        );
        setLeaveBalance(balance);
      }

      // Load enhanced entitlement data
      try {
        const entitlement = await calculateEmployeeLeaveEntitlement(employeeData.id);
        setEnhancedEntitlement(entitlement);
      } catch (error) {
        console.warn('Could not load enhanced entitlement data:', error);
      }

      // Load entitlement summary
      if (employeeData.joinDate) {
        const summary = await getLeaveEntitlementSummary(employeeData.id, employeeData.joinDate);
        setEntitlementSummary(summary);
      }

    } catch (error) {
      console.error('Error loading employee data:', error);
      toast({
        title: "Error",
        description: "Failed to load employee data",
        variant: "destructive",
      });
    }
  };

  const getLeaveEntitlementSummary = async (employeeId: string, joinDate: string): Promise<string> => {
    const currentYear = new Date().getFullYear();
    const joinYear = new Date(joinDate).getFullYear();
    
    try {
      const entitlement = await calculateEmployeeLeaveEntitlement(employeeId, currentYear);
      
      if (!entitlement) {
        return "Unable to calculate leave entitlement. Please contact HR.";
      }

      const { baseAnnualLeave, yearsOfService, serviceBonusDays, mondayHolidayBonus, finalAnnualLeave } = entitlement;
      
      let summary = `You are entitled to ${finalAnnualLeave} annual leave days for ${currentYear}. `;
      summary += `This includes ${baseAnnualLeave} base days`;
      
      if (yearsOfService > 0) {
        summary += ` + ${serviceBonusDays} service bonus days (${yearsOfService} years of service)`;
      }
      
      if (mondayHolidayBonus > 0) {
        summary += ` + ${mondayHolidayBonus} Monday holiday bonus days`;
      }
      
      summary += ` + 14 medical leave days.`;
      
      if (joinYear === currentYear) {
        summary += ` (Pro-rated from your join date in ${new Date(joinDate).toLocaleDateString('en-GB', { month: 'long' })})`;
      }
      
      return summary;
    } catch (error) {
      console.error('Error getting leave entitlement summary:', error);
      return "Unable to calculate leave entitlement. Please contact HR.";
    }
  };

  const calculateLeaveDays = () => {
    if (!formData.startDate || !formData.endDate) return;

    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    
    if (end < start) {
      setCalculatedDays(0);
      return;
    }

    const timeDiff = end.getTime() - start.getTime();
    const days = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
    setCalculatedDays(days);
  };

  const validateCurrentRequest = async () => {
    if (!employee || !formData.startDate || !formData.endDate || !formData.type || calculatedDays === 0) {
      setValidationErrors([]);
      setValidationWarnings([]);
      return;
    }

    try {
      const validation = await validateLeaveRequest({
        employeeId: employee.id,
        leaveType: formData.type,
        startDate: formData.startDate,
        endDate: formData.endDate,
        days: calculatedDays
      });

      setValidationErrors(validation.errors);
      setValidationWarnings(validation.warnings);
    } catch (error) {
      console.error('Error validating leave request:', error);
      setValidationErrors(['Error validating leave request']);
      setValidationWarnings([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!employee || !user?.employeeId || calculatedDays === 0) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (validationErrors.length > 0) {
      toast({
        title: "Validation Error",
        description: "Please fix the validation errors before submitting",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      await applyForLeaveWithValidation({
        employeeId: employee.id,
        type: formData.type,
        startDate: formData.startDate,
        endDate: formData.endDate,
        days: calculatedDays,
        reason: formData.reason,
        medicalCertificate: formData.medicalCertificate
      });

      toast({
        title: "Success",
        description: "Leave application submitted successfully",
      });

      navigate('/');
    } catch (error: any) {
      console.error('Error submitting leave application:', error);
      
      const errorMessage = error?.message?.includes('not eligible') 
        ? 'You are not eligible to apply for leave. Only Full-Time employees (excluding Senior Partners) can apply for leave.'
        : error?.message || 'Failed to submit leave application';
      
      toast({
        title: "Application Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMedicalCertificateUpload = (certificateUrl: string) => {
    setFormData(prev => ({ ...prev, medicalCertificate: certificateUrl }));
  };

  if (!employee) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex h-[calc(100vh-73px)]">
          <Sidebar />
          <main className="flex-1 p-6 overflow-auto">
            <div className="text-center flex items-center justify-center h-full">
              <div>
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-lg text-gray-600">Loading employee data...</p>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // Show eligibility message if employee is not eligible (but allow Senior Partners/Superadmins to access management tab)
  const isNotEligible = !isEligibleForLeave(employee);
  const showManagementOnly = isNotEligible && canManageLeave;

  if (isNotEligible && !canManageLeave) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex h-[calc(100vh-73px)]">
          <Sidebar />
          <main className="flex-1 p-6 overflow-auto">
            <div className="max-w-2xl mx-auto space-y-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Apply for Leave</h1>
                <p className="text-gray-600 mt-2">Submit your leave application</p>
              </div>

              <EmployeeLeaveInfo employee={employee} showDetailedInfo={true} />
              
              <Card className="border-red-200 bg-red-50">
                <CardContent className="p-6 text-center">
                  <AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-red-800 mb-2">Leave Application Not Available</h3>
                  <p className="text-red-700">{getEmployeeEligibilityMessage(employee)}</p>
                  <Button 
                    onClick={() => navigate('/')} 
                    className="mt-4"
                    variant="outline"
                  >
                    Return to Dashboard
                  </Button>
                </CardContent>
              </Card>
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
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{showManagementOnly ? 'Leave Management' : 'Apply for Leave'}</h1>
              <p className="text-gray-600 mt-2">{showManagementOnly ? 'Manage employee leave requests' : 'Submit your leave application'}</p>
            </div>

            <Tabs defaultValue={showManagementOnly ? "manage" : "apply"} className="w-full">
              <TabsList className={`grid w-full ${showManagementOnly ? 'grid-cols-1' : canManageLeave ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {!showManagementOnly && (
                  <TabsTrigger value="apply">
                    <FileText className="w-4 h-4 mr-2" />
                    Apply Leave
                  </TabsTrigger>
                )}
                {canManageLeave && (
                  <TabsTrigger value="manage">
                    <Settings className="w-4 h-4 mr-2" />
                    Leave Management
                  </TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="apply" className="space-y-6">
                <div className="max-w-2xl mx-auto space-y-6">
                  {/* Employee Information */}
                  <EmployeeLeaveInfo employee={employee} showDetailedInfo={true} />

                  {/* Leave Balance Information */}
                  {(leaveBalance || enhancedEntitlement) && (
                    <Card className="border-blue-200 bg-blue-50">
                      <CardContent className="p-4">
                        <div className="flex items-start space-x-3">
                          <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                          <div className="flex-1">
                            <h3 className="font-medium text-blue-800 mb-2">Your Leave Entitlement ({new Date().getFullYear()})</h3>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              {enhancedEntitlement ? (
                                <>
                                  <div>
                                    <p className="text-blue-600">Annual Leave (Base): <span className="font-medium">{enhancedEntitlement.baseAnnualLeave} days</span></p>
                                    <p className="text-green-600">Service Bonus: <span className="font-medium">+{enhancedEntitlement.serviceBonusDays} days</span></p>
                                    <p className="text-purple-600">Monday Holiday Bonus: <span className="font-medium">+{enhancedEntitlement.mondayHolidayBonus} days</span></p>
                                    <p className="text-blue-800 font-medium">Total Annual Leave: {enhancedEntitlement.finalAnnualLeave} days</p>
                                  </div>
                                  <div>
                                    <p className="text-green-600">Medical Leave: <span className="font-medium">{enhancedEntitlement.medicalLeave} days</span></p>
                                    <p className="text-gray-600">Years of Service: <span className="font-medium">{enhancedEntitlement.yearsOfService} years</span></p>
                                  </div>
                                </>
                              ) : leaveBalance ? (
                                <>
                                  <div>
                                    <p className="text-blue-600">Annual Leave: <span className="font-medium">{leaveBalance.annualLeave.remaining}/{leaveBalance.annualLeave.total} remaining</span></p>
                                  </div>
                                  <div>
                                    <p className="text-green-600">Medical Leave: <span className="font-medium">{leaveBalance.medicalLeave.remaining}/{leaveBalance.medicalLeave.total} remaining</span></p>
                                  </div>
                                </>
                              ) : null}
                            </div>
                            {entitlementSummary && (
                              <p className="text-xs text-blue-600 mt-2">
                                {entitlementSummary}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Validation Errors */}
                  {validationErrors.length > 0 && (
                    <Card className="border-red-200 bg-red-50">
                      <CardContent className="p-4">
                        <div className="flex items-start space-x-3">
                          <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                          <div>
                            <h3 className="font-medium text-red-800">Validation Errors</h3>
                            <ul className="text-sm text-red-700 mt-1 list-disc list-inside">
                              {validationErrors.map((error, index) => (
                                <li key={index}>{error}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Validation Warnings */}
                  {validationWarnings.length > 0 && (
                    <Card className="border-yellow-200 bg-yellow-50">
                      <CardContent className="p-4">
                        <div className="flex items-start space-x-3">
                          <Info className="w-5 h-5 text-yellow-600 mt-0.5" />
                          <div>
                            <h3 className="font-medium text-yellow-800">Please Note</h3>
                            <ul className="text-sm text-yellow-700 mt-1 list-disc list-inside">
                              {validationWarnings.map((warning, index) => (
                                <li key={index}>{warning}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Application Form */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Leave Application Form</CardTitle>
                      <CardDescription>
                        Please fill in all the required information for your leave request
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                          <Label htmlFor="type">Leave Type *</Label>
                          <Select 
                            value={formData.type} 
                            onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
                            required
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select leave type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Annual Leave">Annual Leave</SelectItem>
                              <SelectItem value="Medical Leave">Medical Leave</SelectItem>
                              <SelectItem value="Emergency Leave">Emergency Leave</SelectItem>
                              <SelectItem value="Maternity Leave">Maternity Leave</SelectItem>
                              <SelectItem value="Paternity Leave">Paternity Leave</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="startDate">Start Date *</Label>
                            <Input
                              id="startDate"
                              type="date"
                              value={formData.startDate}
                              onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="endDate">End Date *</Label>
                            <Input
                              id="endDate"
                              type="date"
                              value={formData.endDate}
                              onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                              required
                            />
                          </div>
                        </div>

                        {calculatedDays > 0 && (
                          <div className="bg-gray-50 p-3 rounded-lg">
                            <p className="text-sm text-gray-700">
                              <Calendar className="w-4 h-4 inline mr-2" />
                              Total days requested: <span className="font-medium">{calculatedDays} day{calculatedDays !== 1 ? 's' : ''}</span>
                            </p>
                          </div>
                        )}

                        <div>
                          <Label htmlFor="reason">Reason for Leave *</Label>
                          <Textarea
                            id="reason"
                            placeholder="Please provide the reason for your leave request"
                            value={formData.reason}
                            onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                            required
                            rows={3}
                          />
                        </div>

                        {formData.type === 'Medical Leave' && (
                          <div>
                            <Label>Medical Certificate</Label>
                            <MedicalCertificateUpload
                              onUploadComplete={handleMedicalCertificateUpload}
                              currentCertificateUrl={formData.medicalCertificate}
                            />
                            {formData.medicalCertificate && (
                              <div className="mt-2 flex items-center text-sm text-green-600">
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Medical certificate uploaded
                              </div>
                            )}
                          </div>
                        )}

                        <div className="flex space-x-4 pt-4">
                          <Button 
                            type="submit" 
                            disabled={loading || validationErrors.length > 0}
                            className="flex-1"
                          >
                            {loading ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Submitting...
                              </>
                            ) : (
                              <>
                                <FileText className="w-4 h-4 mr-2" />
                                Submit Application
                              </>
                            )}
                          </Button>
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => navigate('/')}
                            disabled={loading}
                          >
                            Cancel
                          </Button>
                        </div>
                      </form>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {canManageLeave && (
                <TabsContent value="manage" className="space-y-6">
                  <LeaveManagementContent />
                </TabsContent>
              )}
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ApplyLeave;
