import React from 'react';
import { Card } from '@/components/ui/card';
import { Heart, MessageCircle, Send, Bookmark } from 'lucide-react';

interface Props {
  mediaUrl?: string | null;
  mediaType?: 'image' | 'video' | null;
  caption?: string;
  cta?: string;
  hashtags?: string[];
  branchName?: string;
}

export const InstagramPreview: React.FC<Props> = ({
  mediaUrl,
  mediaType,
  caption,
  cta,
  hashtags,
  branchName,
}) => {
  const fullText = [caption, cta, (hashtags || []).join(' ')].filter(Boolean).join('\n\n');

  return (
    <Card className="max-w-sm mx-auto overflow-hidden border bg-background">
      {/* Header */}
      <div className="flex items-center gap-2 p-3 border-b">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-purple-500" />
        <div className="text-sm font-semibold">{branchName || 'your_brand'}</div>
      </div>

      {/* Square media */}
      <div className="aspect-square bg-muted flex items-center justify-center overflow-hidden">
        {mediaUrl ? (
          mediaType === 'video' ? (
            <video src={mediaUrl} className="w-full h-full object-cover" controls muted />
          ) : (
            <img src={mediaUrl} alt="preview" className="w-full h-full object-cover" />
          )
        ) : (
          <span className="text-xs text-muted-foreground">No media yet</span>
        )}
      </div>

      {/* Action row */}
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex gap-3">
          <Heart className="w-5 h-5" />
          <MessageCircle className="w-5 h-5" />
          <Send className="w-5 h-5" />
        </div>
        <Bookmark className="w-5 h-5" />
      </div>

      {/* Caption */}
      <div className="px-3 pb-3 text-sm whitespace-pre-wrap break-words">
        <span className="font-semibold mr-1">{branchName || 'your_brand'}</span>
        {fullText || <span className="text-muted-foreground italic">Caption preview will appear here…</span>}
      </div>
    </Card>
  );
};
