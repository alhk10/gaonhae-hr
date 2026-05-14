import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download, ZoomIn, ExternalLink, CreditCard, Loader2 } from 'lucide-react';
import { Notice, uploadNoticeFile } from '@/services/noticeService';
import ProofOfPaymentUpload from '@/components/payment/ProofOfPaymentUpload';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { openSignedUrl, SignedImage } from '@/components/common/SignedMedia';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface NoticePopupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notice: Notice | null;
}

const NoticePopupDialog: React.FC<NoticePopupDialogProps> = ({ open, onOpenChange, notice }) => {
  const [showFullImage, setShowFullImage] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const proofInputRef = useRef<HTMLInputElement>(null);

  // Fetch product name for display
  const { data: productName } = useQuery({
    queryKey: ['product-name', notice?.payment_product_id],
    queryFn: async () => {
      if (!notice?.payment_product_id) return null;
      const { data } = await supabase
        .from('products')
        .select('name')
        .eq('id', notice.payment_product_id)
        .single();
      return data?.name || 'Product';
    },
    enabled: !!notice?.payment_product_id,
  });

  if (!notice) return null;

  const hasPayment = !!notice.payment_product_id;

  const handlePaymentSubmit = async () => {
    if (!paymentMethod) {
      toast.error('Please select a payment method');
      return;
    }
    if (paymentMethod !== 'cash' && !proofFile) {
      toast.error('Please upload proof of payment');
      return;
    }
    if (paymentMethod !== 'cash' && !referenceNumber.trim()) {
      toast.error('Please enter a reference number');
      return;
    }

    setSubmittingPayment(true);
    try {
      let proofUrl = null;
      if (proofFile) {
        proofUrl = await uploadNoticeFile(proofFile, 'payment-proofs');
      }

      // Store payment record in notice_payments table
      const { error } = await supabase
        .from('notice_payments' as any)
        .insert({
          notice_id: notice.id,
          product_id: notice.payment_product_id,
          variant: notice.payment_variant || null,
          amount: notice.payment_amount,
          payment_method: paymentMethod,
          reference_number: referenceNumber.trim() || null,
          proof_url: proofUrl,
          paid_by_email: (await supabase.auth.getUser()).data.user?.email || '',
        } as any);

      if (error) throw error;
      toast.success('Payment submitted successfully');
      setPaymentMethod('');
      setReferenceNumber('');
      setProofFile(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit payment');
    } finally {
      setSubmittingPayment(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto overflow-x-hidden w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle className="text-lg break-words">{notice.subject}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 overflow-hidden break-words">
            {notice.image_url && (
              <div
                className="relative cursor-pointer group"
                onClick={() => setShowFullImage(true)}
              >
                <SignedImage
                  src={notice.image_url}
                  alt={notice.subject}
                  className="w-full max-w-full rounded-md object-contain max-h-80"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-md flex items-center justify-center">
                  <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            )}

            {notice.content && (
              <div className="text-sm text-foreground" dangerouslySetInnerHTML={{ __html: notice.content }} />
            )}

            {notice.attachment_url && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => openSignedUrl(notice.attachment_url)}
              >
                <Download className="w-4 h-4 mr-2" />
                {notice.attachment_name || 'Download Attachment'}
              </Button>
            )}

            {notice.link && (
              <Button variant="outline" size="sm" asChild>
                <a href={notice.link} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open Link
                </a>
              </Button>
            )}

            {/* Payment Section */}
            {hasPayment && (
              <div className="border rounded-lg p-4 bg-muted/30 space-y-3">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold">Payment Required</span>
                </div>

                <div className="text-sm space-y-1">
                  <p><span className="text-muted-foreground">Product:</span> {productName || 'Loading...'}</p>
                  {notice.payment_variant && (
                    <p><span className="text-muted-foreground">Variant:</span> {notice.payment_variant}</p>
                  )}
                  <p className="text-lg font-bold">${Number(notice.payment_amount).toFixed(2)}</p>
                </div>

                <div className="space-y-2">
                  <div>
                    <Label className="text-xs">Payment Method *</Label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="paynow">PayNow</SelectItem>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                        <SelectItem value="cash">Cash</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {paymentMethod && paymentMethod !== 'cash' && (
                    <>
                      <div>
                        <Label className="text-xs">Reference Number *</Label>
                        <Input
                          value={referenceNumber}
                          onChange={(e) => setReferenceNumber(e.target.value)}
                          placeholder="Transaction reference"
                          className="mt-1"
                        />
                      </div>

                      <ProofOfPaymentUpload
                        value={proofFile}
                        onChange={setProofFile}
                        required
                        compact
                      />
                    </>
                  )}

                  <Button
                    onClick={handlePaymentSubmit}
                    disabled={submittingPayment || !paymentMethod}
                    className="w-full"
                  >
                    {submittingPayment && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Submit Payment
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Full-size image viewer */}
      <Dialog open={showFullImage} onOpenChange={setShowFullImage}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-2">
          <DialogHeader>
            <DialogTitle className="text-sm">{notice.subject}</DialogTitle>
          </DialogHeader>
          {notice.image_url && (
            <SignedImage
              src={notice.image_url}
              alt={notice.subject}
              className="w-full h-auto max-h-[85vh] object-contain rounded-md"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default NoticePopupDialog;
