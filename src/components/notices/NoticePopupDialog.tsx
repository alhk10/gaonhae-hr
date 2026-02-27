import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { Notice } from '@/services/noticeService';
import { format } from 'date-fns';

interface NoticePopupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notice: Notice | null;
}

const NoticePopupDialog: React.FC<NoticePopupDialogProps> = ({ open, onOpenChange, notice }) => {
  if (!notice) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">{notice.subject}</DialogTitle>
          <p className="text-xs text-muted-foreground">
            {format(new Date(notice.created_at), 'dd MMM yyyy, h:mm a')} • {notice.created_by_email}
          </p>
        </DialogHeader>

        <div className="space-y-4">
          {notice.image_url && (
            <img
              src={notice.image_url}
              alt={notice.subject}
              className="w-full rounded-md object-contain max-h-80"
            />
          )}

          {notice.content && (
            <p className="text-sm text-foreground whitespace-pre-wrap">{notice.content}</p>
          )}

          {notice.attachment_url && (
            <Button variant="outline" size="sm" asChild>
              <a href={notice.attachment_url} target="_blank" rel="noopener noreferrer" download>
                <Download className="w-4 h-4 mr-2" />
                {notice.attachment_name || 'Download Attachment'}
              </a>
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NoticePopupDialog;
