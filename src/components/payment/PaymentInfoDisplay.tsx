/**
 * Payment Info Display Component
 * Shows bank transfer info or PayNow QR code based on payment method and template
 */

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Building2, QrCode } from 'lucide-react';

interface PaymentInfoDisplayProps {
  paymentMethod: string;
  bankTransferInfo?: string | null;
  paynowQrUrl?: string | null;
}

const PaymentInfoDisplay: React.FC<PaymentInfoDisplayProps> = ({
  paymentMethod,
  bankTransferInfo,
  paynowQrUrl,
}) => {
  // Show bank transfer info
  if (paymentMethod === 'bank_transfer' && bankTransferInfo) {
    return (
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Building2 className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-blue-900 mb-2">Bank Transfer Details</p>
              <pre className="text-sm text-blue-800 whitespace-pre-wrap font-sans leading-relaxed">
                {bankTransferInfo}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show PayNow QR code
  if (paymentMethod === 'paynow' && paynowQrUrl) {
    return (
      <Card className="bg-purple-50 border-purple-200">
        <CardContent className="p-4">
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-purple-600" />
              <p className="font-medium text-purple-900">Scan to Pay via PayNow</p>
            </div>
            <img 
              src={paynowQrUrl} 
              alt="PayNow QR Code" 
              className="w-40 h-40 object-contain border rounded bg-white p-2"
            />
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
};

export default PaymentInfoDisplay;
