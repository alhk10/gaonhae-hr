import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, ZoomIn, ExternalLink } from 'lucide-react';
import { Notice } from '@/services/noticeService';
import { format } from 'date-fns';

interface NoticePopupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notice: Notice | null;
}

const NoticePopupDialog: React.FC<NoticePopupDialogProps> = ({ open, onOpenChange, notice }) => {
  const [showFullImage, setShowFullImage] = useState(false);

  if (!notice) return null;

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
                <img
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
              <Button variant="outline" size="sm" asChild>
                <a href={notice.attachment_url} target="_blank" rel="noopener noreferrer" download>
                  <Download className="w-4 h-4 mr-2" />
                  {notice.attachment_name || 'Download Attachment'}
                </a>
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
            <img
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
