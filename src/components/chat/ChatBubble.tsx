import React from 'react';
import { format } from 'date-fns';
import { Check, CheckCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatBubbleProps {
  message: string;
  senderName: string;
  timestamp: string;
  isOwnMessage: boolean;
  isRead?: boolean;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({
  message,
  senderName,
  timestamp,
  isOwnMessage,
  isRead = false
}) => {
  const formattedTime = format(new Date(timestamp), 'h:mm a');
  const formattedDate = format(new Date(timestamp), 'MMM d');
  const isToday = new Date(timestamp).toDateString() === new Date().toDateString();

  return (
    <div className={cn(
      "flex flex-col max-w-[80%] mb-3",
      isOwnMessage ? "ml-auto items-end" : "mr-auto items-start"
    )}>
      {!isOwnMessage && (
        <span className="text-xs text-muted-foreground mb-1 px-1">
          {senderName}
        </span>
      )}
      <div className={cn(
        "rounded-2xl px-4 py-2 break-words",
        isOwnMessage 
          ? "bg-primary text-primary-foreground rounded-br-md" 
          : "bg-muted text-foreground rounded-bl-md"
      )}>
        <p className="text-sm whitespace-pre-wrap">{message}</p>
      </div>
      <div className="flex items-center gap-1 mt-1 px-1">
        <span className="text-xs text-muted-foreground">
          {isToday ? formattedTime : `${formattedDate}, ${formattedTime}`}
        </span>
        {isOwnMessage && (
          isRead 
            ? <CheckCheck className="h-3 w-3 text-primary" />
            : <Check className="h-3 w-3 text-muted-foreground" />
        )}
      </div>
    </div>
  );
};

export default ChatBubble;
