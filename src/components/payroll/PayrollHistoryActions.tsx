
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, Download, Lock, Unlock, Trash2, AlertTriangle, Calendar, DollarSign, FileText } from 'lucide-react';
import { PayrollRecord } from '@/services/payrollService';
import { formatCurrency } from '@/utils/payrollCalculations';
import { toast } from '@/components/ui/sonner';

interface PayrollHistoryActionsProps {
  record: PayrollRecord;
  onLockToggle?: (recordId: string, isLocked: boolean) => Promise<void>;
  onDelete?: (recordId: string) => Promise<void>;
  onDownload?: (record: PayrollRecord) => void;
}

const PayrollHistoryActions: React.FC<PayrollHistoryActionsProps> = ({
  record,
  onLockToggle,
  onDelete,
  onDownload
}) => {
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleLockToggle = async () => {
    if (!onLockToggle) return;
    
    setIsProcessing(true);
    try {
      await onLockToggle(record.id, !record.isLocked);
      toast.success(record.isLocked ? 'Payroll record unlocked' : 'Payroll record locked');
    } catch (error) {
      console.error('Error toggling lock status:', error);
      toast.error('Failed to update lock status');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    
    setIsProcessing(true);
    try {
      await onDelete(record.id);
      setIsDeleteDialogOpen(false);
      toast.success('Payroll record deleted successfully');
    } catch (error) {
      console.error('Error deleting record:', error);
      toast.error('Failed to delete payroll record');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (onDownload) {
      onDownload(record);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      {/* View Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm">
            <Eye className="w-4 h-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <FileText className="w-5 h-5 mr-2" />
              Payroll Record Details - {record.month} {record.year}
            </DialogTitle>
            <DialogDescription>
              Employee ID: {record.employeeId}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Status and Lock Info */}
            <div className="flex items-center space-x-2">
              <Badge variant={record.isLocked ? "destructive" : "secondary"}>
                {record.isLocked ? (
                  <>
                    <Lock className="w-3 h-3 mr-1" />
                    Locked
                  </>
                ) : (
                  <>
                    <Unlock className="w-3 h-3 mr-1" />
                    Unlocked
                  </>
                )}
              </Badge>
              <Badge variant="outline">
                <Calendar className="w-3 h-3 mr-1" />
                {new Date(record.updatedAt).toLocaleDateString()}
              </Badge>
            </div>

            {/* Payroll Summary */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-sm text-gray-600 mb-2">Income</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Base Salary:</span>
                    <span>{formatCurrency(record.payrollData.baseSalary)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Allowances:</span>
                    <span>{formatCurrency(record.payrollData.totalAllowances)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Claims:</span>
                    <span>{formatCurrency(record.payrollData.approvedClaims)}</span>
                  </div>
                  <div className="flex justify-between font-medium border-t pt-1">
                    <span>Gross:</span>
                    <span>{formatCurrency(record.payrollData.grossSalary)}</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-sm text-gray-600 mb-2">Deductions</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Employee CPF:</span>
                    <span>{formatCurrency(record.payrollData.employeeCPF)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Other Deductions:</span>
                    <span>{formatCurrency(record.payrollData.totalDeductions)}</span>
                  </div>
                  <div className="flex justify-between font-medium border-t pt-1">
                    <span>Total Deductions:</span>
                    <span>{formatCurrency(record.payrollData.employeeCPF + record.payrollData.totalDeductions)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Net Salary */}
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <div className="flex items-center justify-between">
                <span className="font-medium text-green-800">Net Salary:</span>
                <span className="font-bold text-xl text-green-600">
                  {formatCurrency(record.payrollData.netSalary)}
                </span>
              </div>
              <div className="text-sm text-green-600 mt-1">
                Employer CPF: {formatCurrency(record.payrollData.employerCPF)}
              </div>
            </div>

            {/* Allowances Breakdown */}
            {record.payrollData.allowances.length > 0 && (
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-medium text-sm text-blue-800 mb-2">Allowances Breakdown</h4>
                <div className="space-y-1">
                  {record.payrollData.allowances.map((allowance, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span>{allowance.name}:</span>
                      <span>{formatCurrency(allowance.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Deductions Breakdown */}
            {record.payrollData.deductions.length > 0 && (
              <div className="bg-red-50 rounded-lg p-4">
                <h4 className="font-medium text-sm text-red-800 mb-2">Deductions Breakdown</h4>
                <div className="space-y-1">
                  {record.payrollData.deductions.map((deduction, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span>{deduction.name}:</span>
                      <span>{formatCurrency(deduction.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Download Button */}
      <Button variant="ghost" size="sm" onClick={handleDownload}>
        <Download className="w-4 h-4" />
      </Button>

      {/* Lock/Unlock Button */}
      {onLockToggle && (
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleLockToggle}
          disabled={isProcessing}
        >
          {record.isLocked ? (
            <Unlock className="w-4 h-4" />
          ) : (
            <Lock className="w-4 h-4" />
          )}
        </Button>
      )}

      {/* Delete Button with Confirmation Dialog */}
      {onDelete && (
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm"
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
              disabled={record.isLocked}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center text-red-600">
                <AlertTriangle className="w-5 h-5 mr-2" />
                Delete Payroll Record
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this payroll record for {record.month} {record.year}?
                This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <div className="font-medium mb-1">This will permanently delete:</div>
                <ul className="list-disc list-inside text-sm">
                  <li>Employee: {record.employeeId}</li>
                  <li>Period: {record.month} {record.year}</li>
                  <li>Net Salary: {formatCurrency(record.payrollData.netSalary)}</li>
                </ul>
              </AlertDescription>
            </Alert>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleDelete}
                disabled={isProcessing}
              >
                {isProcessing ? 'Deleting...' : 'Delete Record'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default PayrollHistoryActions;
