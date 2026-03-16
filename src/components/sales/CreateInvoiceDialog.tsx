/**
 * CreateInvoiceDialog - Thin wrapper for backward compatibility
 * Delegates to the unified InvoiceDialog component in 'create' mode.
 */

import React from 'react';
import InvoiceDialog from './InvoiceDialog';

interface CreateInvoiceDialogProps {
  trigger: React.ReactNode;
  onInvoiceCreated?: () => void;
  branchId?: string;
}

const CreateInvoiceDialog: React.FC<CreateInvoiceDialogProps> = ({ trigger, onInvoiceCreated, branchId }) => {
  return (
    <InvoiceDialog
      mode="create"
      trigger={trigger}
      onInvoiceCreated={onInvoiceCreated}
      branchId={branchId}
    />
  );
};

export default CreateInvoiceDialog;
