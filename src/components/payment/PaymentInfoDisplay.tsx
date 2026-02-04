/**
 * Payment Info Display Component
 * Shows bank transfer info or PayNow QR code based on payment method and template
 */

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Building2, QrCode, Download } from 'lucide-react';
import { toast } from 'sonner';

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
  // Download QR code image
  const handleDownloadQR = async () => {
    if (!paynowQrUrl) return;
    
    try {
      const response = await fetch(paynowQrUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'paynow-qr-code.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('QR code downloaded');
    } catch (error) {
      console.error('Error downloading QR code:', error);
      toast.error('Failed to download QR code');
    }
  };

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
            <div 
              className="relative group cursor-pointer"
              onClick={handleDownloadQR}
              title="Click to download QR code"
            >
              <img 
                src={paynowQrUrl} 
                alt="PayNow QR Code" 
                className="w-[250px] h-[250px] object-contain border rounded bg-white p-2 transition-opacity group-hover:opacity-90"
              />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/10 rounded">
                <div className="bg-white/90 rounded-full p-2 shadow-sm">
                  <Download className="h-5 w-5 text-purple-600" />
                </div>
              </div>
            </div>
            <p className="text-xs text-purple-600">Click to download</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
};

export default PaymentInfoDisplay;
