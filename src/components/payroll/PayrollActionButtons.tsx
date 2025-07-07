
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Download, Eye, Save, FileText, Calculator, AlertTriangle, CheckCircle } from 'lucide-react';
import { usePayroll } from '@/contexts/PayrollContext';
import { toast } from '@/components/ui/sonner';
import { Badge } from '@/components/ui/badge';

interface PayrollActionButtonsProps {
  hasEmployees: boolean;
  onProcessPayroll: () => void;
  onPaymentSummary: () => void;
  onGeneratePDF: () => void;
  onSavePayroll: () => void;
  isSaving: boolean;
}

const PayrollActionButtons: React.FC<PayrollActionButtonsProps> = ({
  hasEmployees,
  onProcessPayroll,
  onPaymentSummary,
  onGeneratePDF,
  onSavePayroll,
  isSaving
}) => {
  const { payrollState, setPayrollStatus, calculatePayrollTotal } = usePayroll();
  const [showStatusDialog, setShowStatusDialog] = useState(false);

  const currentTotal = calculatePayrollTotal();
  const statusOptions = [
    { value: 'draft', label: 'Draft', icon: FileText, color: 'bg-gray-500' },
    { value: 'processing', label: 'Processing', icon: Calculator, color: 'bg-blue-500' },
    { value: 'approved', label: 'Approved', icon: CheckCircle, color: 'bg-green-500' },
    { value: 'paid', label: 'Paid', icon: CheckCircle, color: 'bg-purple-500' },
    { value: 'completed', label: 'Completed', icon: CheckCircle, color: 'bg-green-600' }
  ];

  const handleStatusChange = (newStatus: typeof payrollState.status) => {
    setPayrollStatus(newStatus);
    setShowStatusDialog(false);
    toast.success(`Payroll status updated to ${newStatus}`);
  };

  const getStatusIcon = () => {
    const status = statusOptions.find(s => s.value === payrollState.status);
    return status ? status.icon : FileText;
  };

  const getStatusColor = () => {
    const status = statusOptions.find(s => s.value === payrollState.status);
    return status ? status.color : 'bg-gray-500';
  };

  const primaryActions = [
    {
      label: isSaving ? 'Saving...' : 'Save Payroll',
      icon: Save,
      onClick: onSavePayroll,
      disabled: !hasEmployees || isSaving,
      variant: 'default' as const,
      description: 'Save current payroll data'
    },
    {
      label: 'Process Payroll',
      icon: Calculator,
      onClick: onProcessPayroll,
      disabled: !hasEmployees,
      variant: 'default' as const,
      description: 'Begin payroll processing workflow'
    }
  ];

  const secondaryActions = [
    {
      label: 'Payment Summary',
      icon: Eye,
      onClick: onPaymentSummary,
      disabled: false,
      description: 'View detailed payment breakdown'
    },
    {
      label: 'Download Report',
      icon: Download,
      onClick: onGeneratePDF,
      disabled: !hasEmployees,
      description: 'Generate PDF payroll report'
    }
  ];

  return (
    <div className="space-y-4">
      {/* Status Management */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Payroll Status</CardTitle>
              <CardDescription>Current status and quick actions</CardDescription>
            </div>
            <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" className="flex items-center">
                  <Badge className={`${getStatusColor()} text-white mr-2`}>
                    {payrollState.status.charAt(0).toUpperCase() + payrollState.status.slice(1)}
                  </Badge>
                  Change Status
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Change Payroll Status</DialogTitle>
                  <DialogDescription>
                    Update the status of the current payroll period: {payrollState.currentPeriod}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 gap-2 mt-4">
                  {statusOptions.map((status) => {
                    const StatusIcon = status.icon;
                    return (
                      <Button
                        key={status.value}
                        variant={payrollState.status === status.value ? "default" : "outline"}
                        className="justify-start h-auto p-3"
                        onClick={() => handleStatusChange(status.value as typeof payrollState.status)}
                      >
                        <StatusIcon className="w-4 h-4 mr-2" />
                        <div className="text-left">
                          <div className="font-medium">{status.label}</div>
                        </div>
                      </Button>
                    );
                  })}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full ${getStatusColor()} mr-2`}></div>
              <span className="font-medium">
                {payrollState.status.charAt(0).toUpperCase() + payrollState.status.slice(1)}
              </span>
            </div>
            <div className="text-sm text-gray-600">
              Total: S${currentTotal.toLocaleString()}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Primary Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Primary Actions</CardTitle>
          <CardDescription>Main payroll operations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {primaryActions.map((action, index) => (
              <Button
                key={index}
                variant={action.variant}
                onClick={action.onClick}
                disabled={action.disabled}
                className="h-auto p-4 flex flex-col items-start"
              >
                <div className="flex items-center w-full">
                  <action.icon className="w-4 h-4 mr-2" />
                  <span className="font-medium">{action.label}</span>
                </div>
                <span className="text-xs opacity-80 mt-1">{action.description}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Secondary Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Reports & Export</CardTitle>
          <CardDescription>Generate reports and summaries</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {secondaryActions.map((action, index) => (
              <Button
                key={index}
                variant="outline"
                onClick={action.onClick}
                disabled={action.disabled}
                className="h-auto p-4 flex flex-col items-start"
              >
                <div className="flex items-center w-full">
                  <action.icon className="w-4 h-4 mr-2" />
                  <span className="font-medium">{action.label}</span>
                </div>
                <span className="text-xs text-gray-600 mt-1">{action.description}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Validation Warnings */}
      {!hasEmployees && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-center">
              <AlertTriangle className="w-5 h-5 text-amber-600 mr-2" />
              <div>
                <p className="font-medium text-amber-800">No Employees in Payroll</p>
                <p className="text-sm text-amber-700">Add employees to enable payroll processing and reports.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PayrollActionButtons;
