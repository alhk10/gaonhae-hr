import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageCircle, Search, Users, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import ChatBubble from './ChatBubble';
import ChatInput from './ChatInput';
import {
  getStudentConversations,
  getMessages,
  sendMessage,
  markMessagesAsRead,
  subscribeToChat,
  getBranchStudents,
  ChatMessage,
  StudentConversation
} from '@/services/chatService';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface BranchChatPanelProps {
  branchId: string;
  currentUserName: string;
  currentUserId: string;
}

const BranchChatPanel: React.FC<BranchChatPanelProps> = ({ 
  branchId, 
  currentUserName,
  currentUserId 
}) => {
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedStudentName, setSelectedStudentName] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [newChatDialogOpen, setNewChatDialogOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Fetch conversations
  const { data: conversations = [], isLoading: conversationsLoading } = useQuery({
    queryKey: ['branch-conversations', branchId],
    queryFn: () => getStudentConversations(branchId),
    enabled: !!branchId,
  });

  // Fetch messages for selected student
  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ['chat-messages', selectedStudentId, branchId],
    queryFn: () => getMessages(selectedStudentId!, branchId),
    enabled: !!selectedStudentId && !!branchId,
  });

  // Fetch all students for new chat
  const { data: allStudents = [] } = useQuery({
    queryKey: ['branch-students', branchId],
    queryFn: () => getBranchStudents(branchId),
    enabled: !!branchId,
  });

  // Subscribe to real-time updates
  useEffect(() => {
    if (!branchId) return;

    const unsubscribe = subscribeToChat(branchId, (newMessage) => {
      // Refresh conversations list
      queryClient.invalidateQueries({ queryKey: ['branch-conversations', branchId] });
      queryClient.invalidateQueries({ queryKey: ['unread-chats-count', branchId] });
      
      // If the message is for the currently selected student, refresh messages
      if (newMessage.student_id === selectedStudentId) {
        queryClient.invalidateQueries({ queryKey: ['chat-messages', selectedStudentId, branchId] });
      }
    });

    return unsubscribe;
  }, [branchId, selectedStudentId, queryClient]);

  // Mark messages as read when selecting a student
  useEffect(() => {
    if (selectedStudentId && branchId) {
      markMessagesAsRead(selectedStudentId, branchId).then(() => {
        queryClient.invalidateQueries({ queryKey: ['branch-conversations', branchId] });
        queryClient.invalidateQueries({ queryKey: ['unread-chats-count', branchId] });
      });
    }
  }, [selectedStudentId, branchId, queryClient]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSelectStudent = (studentId: string, studentName: string) => {
    setSelectedStudentId(studentId);
    setSelectedStudentName(studentName);
  };

  const handleSendMessage = async (messageText: string) => {
    if (!selectedStudentId) return;

    try {
      await sendMessage(
        selectedStudentId,
        branchId,
        'branch',
        currentUserId,
        currentUserName,
        messageText
      );
      
      // Refresh messages and conversations
      queryClient.invalidateQueries({ queryKey: ['chat-messages', selectedStudentId, branchId] });
      queryClient.invalidateQueries({ queryKey: ['branch-conversations', branchId] });
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  const handleStartNewChat = (studentId: string, studentName: string) => {
    setSelectedStudentId(studentId);
    setSelectedStudentName(studentName);
    setNewChatDialogOpen(false);
  };

  const filteredConversations = conversations.filter(conv =>
    conv.student_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const studentsWithoutConversation = allStudents.filter(
    student => !conversations.some(conv => conv.student_id === student.id)
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[600px]">
      {/* Student List */}
      <Card className="md:col-span-1 flex flex-col overflow-hidden">
        <CardHeader className="pb-3 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">Conversations</span>
            </div>
            <Dialog open={newChatDialogOpen} onOpenChange={setNewChatDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Plus className="h-4 w-4 mr-1" />
                  New
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Start New Conversation</DialogTitle>
                </DialogHeader>
                <ScrollArea className="h-[300px] mt-4">
                  {studentsWithoutConversation.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">
                      All students have existing conversations
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {studentsWithoutConversation.map(student => (
                        <Button
                          key={student.id}
                          variant="ghost"
                          className="w-full justify-start"
                          onClick={() => handleStartNewChat(student.id, student.name)}
                        >
                          {student.name}
                        </Button>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </DialogContent>
            </Dialog>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search students..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <ScrollArea className="flex-1">
          <CardContent className="p-2">
            {conversationsLoading ? (
              <div className="flex items-center justify-center py-8">
                <span className="text-muted-foreground">Loading...</span>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <MessageCircle className="h-10 w-10 text-muted-foreground mb-2" />
                <p className="text-muted-foreground text-sm">
                  {searchTerm ? 'No matching conversations' : 'No conversations yet'}
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredConversations.map((conv) => (
                  <button
                    key={conv.student_id}
                    onClick={() => handleSelectStudent(conv.student_id, conv.student_name)}
                    className={cn(
                      "w-full text-left p-3 rounded-lg transition-colors hover:bg-muted/50",
                      selectedStudentId === conv.student_id && "bg-muted"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {conv.unread_count > 0 && (
                            <span className="w-2 h-2 bg-primary rounded-full shrink-0" />
                          )}
                          <span className="font-medium truncate">{conv.student_name}</span>
                        </div>
                        <p className="text-sm text-muted-foreground truncate mt-0.5">
                          {conv.last_message}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(conv.last_message_time), 'MMM d')}
                        </span>
                        {conv.unread_count > 0 && (
                          <Badge variant="default" className="h-5 min-w-[20px] justify-center">
                            {conv.unread_count}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </ScrollArea>
      </Card>

      {/* Chat Window */}
      <Card className="md:col-span-2 flex flex-col overflow-hidden">
        {selectedStudentId ? (
          <>
            <CardHeader className="border-b py-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-primary">
                    {selectedStudentName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="font-medium">{selectedStudentName}</span>
              </div>
            </CardHeader>
            <ScrollArea className="flex-1 p-4">
              {messagesLoading ? (
                <div className="flex items-center justify-center h-full">
                  <span className="text-muted-foreground">Loading messages...</span>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <MessageCircle className="h-12 w-12 text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">
                    No messages yet. Start the conversation!
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {messages.map((msg) => (
                    <ChatBubble
                      key={msg.id}
                      message={msg.message}
                      senderName={msg.sender_name}
                      timestamp={msg.created_at}
                      isOwnMessage={msg.sender_type === 'branch'}
                      isRead={msg.is_read}
                    />
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>
            <ChatInput onSend={handleSendMessage} />
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <MessageCircle className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="font-medium text-lg mb-1">Select a conversation</h3>
            <p className="text-muted-foreground text-sm">
              Choose a student from the list to view their messages
            </p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default BranchChatPanel;
