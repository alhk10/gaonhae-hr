/**
 * An invoice number in the /access lists. Tappable when the row is linked to an
 * invoice; plain text otherwise.
 */
import React from 'react';

interface Props {
  invoiceId?: string | null;
  invoiceNumber?: string | null;
  onOpen: (invoiceId: string, invoiceNumber?: string | null) => void;
  className?: string;
  fallback?: string;
}

export const InvoiceNumberButton: React.FC<Props> = ({
  invoiceId,
  invoiceNumber,
  onOpen,
  className,
  fallback = '—',
}) => {
  if (!invoiceId) return <span className={className}>{invoiceNumber || fallback}</span>;
  return (
    <button
      type="button"
      className={`text-left font-mono underline-offset-2 hover:underline text-primary ${className || ''}`}
      onClick={(e) => {
        e.stopPropagation();
        onOpen(invoiceId, invoiceNumber);
      }}
      title="View invoice"
    >
      {invoiceNumber || 'View'}
    </button>
  );
};

export default InvoiceNumberButton;
