import React, { useState, useEffect } from 'react';
import {
import { formatDate } from '@/utils/dateFormat';
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronDown, 
  ChevronUp, 
  Calendar, 
  AlertTriangle,
  Info,
  Loader2,
  CheckCircle,
  Clock,
  XCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { EmployeeProfile } from '@/types/employee';
import { getAllLeaveRequests, type LeaveRequest } from '@/services/leaveService';
import { validateLeaveRequest } from '@/services/leaveValidationService';
import { applyForLeaveWithValidation, calculateEmployeeLeaveEntitlement } from '@/services/enhancedLeaveService';
import { calculateLeaveBalance } from '@/utils/leaveCalculations';
import MedicalCertificateUpload from '@/components/leave/MedicalCertificateUpload';

interface ApplyLeaveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string;
  employee: EmployeeProfile;
}

const ApplyLeaveDialog: React.FC<ApplyLeaveDialogProps> = ({
  open,
  onOpenChange,
  employeeId,
  employee,
}) => {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [leaveBalance, setLeaveBalance] = useState<any>(null);
  const [enhancedEntitlement, setEnhancedEntitlement] = useState<any>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
  const [calculatedDays, setCalculatedDays] = useState(0);
  
  const [formData, setFormData] = useState({
    type: 'Annual Leave',
    startDate: '',
    endDate: '',
    reason: '',
    medicalCertificate: ''
  });

  useEffect(() => {
    if (open) {
      loadLeaveData();
    }
  }, [open, employeeId]);

  useEffect(() => {
    if (formData.startDate && formData.endDate) {
      calculateLeaveDays();
      validateCurrentRequest();
    }
  }, [formData.startDate, formData.endDate, formData.type]);

  const loadLeaveData = async () => {
    try {
      setIsLoading(true);
      
      const allLeave = await getAllLeaveRequests();
      const employeeLeave = allLeave.filter(l => l.employeeId === employeeId);
      setLeaveRequests(employeeLeave);
      
      // Load leave balance
      if (employee.joinDate) {
        const balance = await calculateLeaveBalance(
          employeeId,
          employee.joinDate,
          [],
          { type: employee.type, position: employee.position }
        );
        setLeaveBalance(balance);
      }

      // Load enhanced entitlement
      try {
        const entitlement = await calculateEmployeeLeaveEntitlement(employeeId);
        setEnhancedEntitlement(entitlement);
      } catch (error) {
        console.warn('Could not load enhanced entitlement:', error);
      }
      
    } catch (error) {
      console.error('Error loading leave data:', error);
      toast.error('Failed to load leave data');
    } finally {
      setIsLoading(false);
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
    if (!formData.startDate || !formData.endDate || !formData.type || calculatedDays === 0) {
      setValidationErrors([]);
      setValidationWarnings([]);
      return;
    }

    try {
      const validation = await validateLeaveRequest({
        employeeId: employeeId,
        leaveType: formData.type,
        startDate: formData.startDate,
        endDate: formData.endDate,
        days: calculatedDays
      });

      setValidationErrors(validation.errors);
      setValidationWarnings(validation.warnings);
    } catch (error) {
      console.error('Error validating leave request:', error);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmitLeave = async () => {
    if (!formData.type || !formData.startDate || !formData.endDate || calculatedDays === 0) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (validationErrors.length > 0) {
      toast.error('Please fix validation errors before submitting');
      return;
    }

    try {
      setIsSubmitting(true);

      await applyForLeaveWithValidation({
        employeeId: employeeId,
        type: formData.type,
        startDate: formData.startDate,
        endDate: formData.endDate,
        days: calculatedDays,
        reason: formData.reason,
        medicalCertificate: formData.medicalCertificate
      });
      
      // Reload leave requests
      const allLeave = await getAllLeaveRequests();
      setLeaveRequests(allLeave.filter(l => l.employeeId === employeeId));
      
      // Reset form
      setFormData({
        type: 'Annual Leave',
        startDate: '',
        endDate: '',
        reason: '',
        medicalCertificate: ''
      });
      setCalculatedDays(0);

      toast.success('Leave application submitted successfully!');
    } catch (error: any) {
      console.error('Error submitting leave:', error);
      toast.error(error?.message || 'Error submitting leave application');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMedicalCertificateUpload = (certificateUrl: string) => {
    setFormData(prev => ({ ...prev, medicalCertificate: certificateUrl }));
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

  const formatDate = (dateString: string) => {formatDate(
    return new Date(dateString));
  };

  const pendingLeave = leaveRequests.filter(l => l.status === 'Pending');
  const currentYear = new Date().getFullYear();
  const yearLeave = leaveRequests.filter(l => 
    new Date(l.startDate).getFullYear() === currentYear
  );
  const recentLeave = leaveRequests.slice(0, 10);

  const leaveTypes = [
    { value: 'Annual Leave', label: 'Annual Leave' },
    { value: 'Medical Leave', label: 'Medical Leave' },
    { value: 'Emergency Leave', label: 'Emergency Leave' },
    { value: 'Unpaid Leave', label: 'Unpaid Leave' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="p-4 pb-2 border-b flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Apply for Leave
          </DialogTitle>
          <DialogDescription className="sr-only">
            Submit a leave application
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Leave Balance Summary */}
              <div className="flex gap-2">
                {enhancedEntitlement ? (
                  <>
                    <div className="flex-1 p-2 bg-blue-50 rounded-lg text-center">
                      <p className="text-lg font-semibold text-blue-700">{enhancedEntitlement.finalAnnualLeave}</p>
                      <p className="text-xs text-blue-600">Annual Leave</p>
                    </div>
                    <div className="flex-1 p-2 bg-green-50 rounded-lg text-center">
                      <p className="text-lg font-semibold text-green-700">{enhancedEntitlement.medicalLeave}</p>
                      <p className="text-xs text-green-600">Medical Leave</p>
                    </div>
                    <div className="flex-1 p-2 bg-yellow-50 rounded-lg text-center">
                      <p className="text-lg font-semibold text-yellow-700">{pendingLeave.length}</p>
                      <p className="text-xs text-yellow-600">Pending</p>
                    </div>
                  </>
                ) : leaveBalance ? (
                  <>
                    <div className="flex-1 p-2 bg-blue-50 rounded-lg text-center">
                      <p className="text-lg font-semibold text-blue-700">{leaveBalance.annualLeave?.remaining || 0}</p>
                      <p className="text-xs text-blue-600">Annual Left</p>
                    </div>
                    <div className="flex-1 p-2 bg-green-50 rounded-lg text-center">
                      <p className="text-lg font-semibold text-green-700">{leaveBalance.medicalLeave?.remaining || 0}</p>
                      <p className="text-xs text-green-600">Medical Left</p>
                    </div>
                    <div className="flex-1 p-2 bg-yellow-50 rounded-lg text-center">
                      <p className="text-lg font-semibold text-yellow-700">{pendingLeave.length}</p>
                      <p className="text-xs text-yellow-600">Pending</p>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 p-2 bg-yellow-50 rounded-lg text-center">
                    <p className="text-lg font-semibold text-yellow-700">{pendingLeave.length}</p>
                    <p className="text-xs text-yellow-600">Pending</p>
                  </div>
                )}
              </div>

              {/* Validation Errors */}
              {validationErrors.length > 0 && (
                <Card className="border-red-200 bg-red-50">
                  <CardContent className="p-3">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-red-800 text-sm">Validation Errors</p>
                        <ul className="text-xs text-red-700 mt-1 list-disc list-inside">
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
                  <CardContent className="p-3">
                    <div className="flex items-start gap-2">
                      <Info className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-yellow-800 text-sm">Please Note</p>
                        <ul className="text-xs text-yellow-700 mt-1 list-disc list-inside">
                          {validationWarnings.map((warning, index) => (
                            <li key={index}>{warning}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Leave Application Form */}
              <Card>
                <CardContent className="p-4 space-y-4">
                  {/* Leave Type */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Leave Type *</Label>
                    <select 
                      className="w-full border rounded-lg p-2.5 text-sm bg-background"
                      value={formData.type}
                      onChange={(e) => handleInputChange('type', e.target.value)}
                    >
                      {leaveTypes.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Date Range */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Start Date *</Label>
                      <Input 
                        type="date" 
                        value={formData.startDate}
                        onChange={(e) => handleInputChange('startDate', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">End Date *</Label>
                      <Input 
                        type="date" 
                        value={formData.endDate}
                        min={formData.startDate}
                        onChange={(e) => handleInputChange('endDate', e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Days Calculated */}
                  {calculatedDays > 0 && (
                    <div className="bg-blue-50 text-blue-700 p-2 rounded-lg text-center text-sm">
                      <span className="font-semibold">{calculatedDays}</span> day{calculatedDays > 1 ? 's' : ''} requested
                    </div>
                  )}

                  {/* Reason */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Reason</Label>
                    <Textarea 
                      placeholder="Optional reason for leave"
                      value={formData.reason}
                      onChange={(e) => handleInputChange('reason', e.target.value)}
                      rows={2}
                    />
                  </div>

                  {/* Medical Certificate Upload (for Medical Leave) */}
                  {formData.type === 'Medical Leave' && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Medical Certificate</Label>
                      <MedicalCertificateUpload 
                        onUploadComplete={handleMedicalCertificateUpload}
                        currentCertificateUrl={formData.medicalCertificate}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Submit Button */}
              <Button 
                onClick={handleSubmitLeave} 
                disabled={isSubmitting || calculatedDays === 0 || validationErrors.length > 0}
                className="w-full"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Calendar className="w-4 h-4 mr-2" />
                    Submit Leave Application
                  </>
                )}
              </Button>

              {/* Leave History Collapsible */}
              <Collapsible open={showHistory} onOpenChange={setShowHistory}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between h-10">
                    <span className="text-sm font-medium">Leave History ({recentLeave.length})</span>
                    {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2 pt-2">
                  {recentLeave.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No leave history
                    </p>
                  ) : (
                    recentLeave.map((leave) => (
                      <div 
                        key={leave.id} 
                        className="flex items-center justify-between p-2 bg-muted/50 rounded-lg"
                      >
                        <div>
                          <p className="text-sm font-medium">{leave.type}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(leave.startDate)} - {formatDate(leave.endDate)} • {leave.days} days
                          </p>
                        </div>
                        {getStatusBadge(leave.status)}
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

export default ApplyLeaveDialog;
