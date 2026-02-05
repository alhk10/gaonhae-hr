import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Building2, Loader2 } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getMessages,
  sendMessage,
  markBranchMessagesAsRead,
  subscribeToStudentChat,
  getBranchName,
  ChatMessage
} from '@/services/chatService';
import ChatBubble from './ChatBubble';
import ChatInput from './ChatInput';

interface StudentChatPanelProps {
  studentId: string;
  branchId: string;
  studentName: string;
}

const StudentChatPanel: React.FC<StudentChatPanelProps> = ({
  studentId,
  branchId,
  studentName
}) => {
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);

  // Fetch branch name
  const { data: branchName = 'Branch' } = useQuery({
    queryKey: ['branch-name', branchId],
    queryFn: () => getBranchName(branchId),
    enabled: !!branchId,
  });

  // Fetch messages
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['student-chat-messages', studentId, branchId],
    queryFn: () => getMessages(studentId, branchId),
    enabled: !!studentId && !!branchId,
  });

  // Sync server messages to local state
  useEffect(() => {
    setLocalMessages(messages);
  }, [messages]);

  // Mark branch messages as read when component mounts
  useEffect(() => {
    if (studentId && branchId) {
      markBranchMessagesAsRead(studentId, branchId).then(() => {
        queryClient.invalidateQueries({ queryKey: ['student-unread-count', studentId] });
      });
    }
  }, [studentId, branchId, queryClient]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!studentId || !branchId) return;

    const unsubscribe = subscribeToStudentChat(studentId, branchId, (newMessage) => {
      setLocalMessages(prev => {
        if (prev.some(m => m.id === newMessage.id)) return prev;
        return [...prev, newMessage];
      });
      
      // Mark as read if from branch
      if (newMessage.sender_type === 'branch') {
        markBranchMessagesAsRead(studentId, branchId);
        queryClient.invalidateQueries({ queryKey: ['student-unread-count', studentId] });
      }
    });

    return unsubscribe;
  }, [studentId, branchId, queryClient]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [localMessages]);

  const handleSend = async (messageText: string) => {
    try {
      const newMessage = await sendMessage(
        studentId,
        branchId,
        'student',
        studentId,
        studentName,
        messageText
      );
      
      setLocalMessages(prev => {
        if (prev.some(m => m.id === newMessage.id)) return prev;
        return [...prev, newMessage];
      });
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  if (!branchId) {
    return (
      <Card className="h-[600px] flex items-center justify-center">
        <CardContent className="text-center text-muted-foreground">
          <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No branch assigned</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="border-b py-3 px-4 shrink-0">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-muted-foreground" />
          <span className="font-medium">Chat with {branchName}</span>
        </div>
      </CardHeader>

      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : localMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          <div className="space-y-1">
            {localMessages.map((msg) => (
              <ChatBubble
                key={msg.id}
                message={msg.message}
                senderName={msg.sender_name}
                timestamp={msg.created_at}
                isOwnMessage={msg.sender_type === 'student'}
                isRead={msg.is_read}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      <ChatInput onSend={handleSend} placeholder="Type a message to your branch..." />
    </Card>
  );
};

export default StudentChatPanel;