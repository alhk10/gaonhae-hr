import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Building2, Users, MessageCircle, Loader2, Search } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import {
  getAllBranchConversations,
  getStudentConversations,
  getMessages,
  sendMessage,
  markMessagesAsRead,
  subscribeToAllChats,
  BranchConversation,
  StudentConversation,
  ChatMessage
} from '@/services/chatService';
import { useAuth } from '@/contexts/AuthContext';
import ChatBubble from './ChatBubble';
import ChatInput from './ChatInput';

const SuperadminChatPanel: React.FC = () => {
  const { userDetails } = useAuth();
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedStudentName, setSelectedStudentName] = useState<string>('');
  const [branchSearch, setBranchSearch] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);

  // Fetch all branch conversations
  const { data: branchConversations = [], isLoading: branchesLoading } = useQuery({
    queryKey: ['superadmin-branch-conversations'],
    queryFn: getAllBranchConversations,
  });

  // Fetch student conversations for selected branch
  const { data: studentConversations = [], isLoading: studentsLoading } = useQuery({
    queryKey: ['superadmin-student-conversations', selectedBranchId],
    queryFn: () => getStudentConversations(selectedBranchId!),
    enabled: !!selectedBranchId,
  });

  // Fetch messages for selected student
  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ['superadmin-chat-messages', selectedStudentId, selectedBranchId],
    queryFn: () => getMessages(selectedStudentId!, selectedBranchId!),
    enabled: !!selectedStudentId && !!selectedBranchId,
  });

  // Sync server messages to local state
  useEffect(() => {
    setLocalMessages(messages);
  }, [messages]);

  // Mark messages as read when viewing a conversation
  useEffect(() => {
    if (selectedStudentId && selectedBranchId) {
      markMessagesAsRead(selectedStudentId, selectedBranchId).then(() => {
        queryClient.invalidateQueries({ queryKey: ['superadmin-branch-conversations'] });
        queryClient.invalidateQueries({ queryKey: ['superadmin-student-conversations', selectedBranchId] });
        queryClient.invalidateQueries({ queryKey: ['superadmin-total-unread'] });
      });
    }
  }, [selectedStudentId, selectedBranchId, queryClient]);

  // Subscribe to real-time updates
  useEffect(() => {
    const unsubscribe = subscribeToAllChats((newMessage) => {
      // If viewing this conversation, add message locally
      if (newMessage.student_id === selectedStudentId && newMessage.branch_id === selectedBranchId) {
        setLocalMessages(prev => {
          if (prev.some(m => m.id === newMessage.id)) return prev;
          return [...prev, newMessage];
        });
        
        // Mark as read if from student
        if (newMessage.sender_type === 'student') {
          markMessagesAsRead(newMessage.student_id, newMessage.branch_id);
        }
      }
      
      // Refresh lists
      queryClient.invalidateQueries({ queryKey: ['superadmin-branch-conversations'] });
      queryClient.invalidateQueries({ queryKey: ['superadmin-student-conversations', newMessage.branch_id] });
      queryClient.invalidateQueries({ queryKey: ['superadmin-total-unread'] });
    });

    return unsubscribe;
  }, [selectedStudentId, selectedBranchId, queryClient]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [localMessages]);

  const handleSelectBranch = (branchId: string) => {
    setSelectedBranchId(branchId);
    setSelectedStudentId(null);
    setSelectedStudentName('');
    setStudentSearch('');
  };

  const handleSelectStudent = (studentId: string, studentName: string) => {
    setSelectedStudentId(studentId);
    setSelectedStudentName(studentName);
  };

  const handleSend = async (messageText: string) => {
    if (!selectedStudentId || !selectedBranchId || !userDetails) return;

    try {
      const senderName = userDetails.name || userDetails.display_name || 'Superadmin';
      const newMessage = await sendMessage(
        selectedStudentId,
        selectedBranchId,
        'branch',
        userDetails.id,
        senderName,
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

  // Filter branches
  const filteredBranches = branchConversations.filter(b =>
    b.branch_name.toLowerCase().includes(branchSearch.toLowerCase())
  );

  // Filter students
  const filteredStudents = studentConversations.filter(s =>
    s.student_name.toLowerCase().includes(studentSearch.toLowerCase())
  );

  const selectedBranch = branchConversations.find(b => b.branch_id === selectedBranchId);

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 h-[600px]">
      {/* Branch List (Column 1) */}
      <Card className="overflow-hidden flex flex-col">
        <CardHeader className="py-3 px-4 border-b shrink-0">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span className="font-medium text-sm">Branches</span>
          </div>
          <div className="relative mt-2">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={branchSearch}
              onChange={(e) => setBranchSearch(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
        </CardHeader>
        <ScrollArea className="flex-1">
          {branchesLoading ? (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : filteredBranches.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No conversations
            </div>
          ) : (
            filteredBranches.map((branch) => (
              <button
                key={branch.branch_id}
                onClick={() => handleSelectBranch(branch.branch_id)}
                className={cn(
                  "w-full p-3 text-left hover:bg-muted/50 border-b transition-colors",
                  selectedBranchId === branch.branch_id && "bg-muted"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm truncate">{branch.branch_name}</span>
                  {branch.unread_count > 0 && (
                    <Badge variant="destructive" className="ml-2 shrink-0">
                      {branch.unread_count}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {branch.conversation_count} conversation{branch.conversation_count !== 1 ? 's' : ''}
                </p>
              </button>
            ))
          )}
        </ScrollArea>
      </Card>

      {/* Student List (Column 2) */}
      <Card className="overflow-hidden flex flex-col">
        <CardHeader className="py-3 px-4 border-b shrink-0">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="font-medium text-sm">
              {selectedBranch ? selectedBranch.branch_name : 'Students'}
            </span>
          </div>
          {selectedBranchId && (
            <div className="relative mt-2">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>
          )}
        </CardHeader>
        <ScrollArea className="flex-1">
          {!selectedBranchId ? (
            <div className="flex flex-col items-center justify-center h-full p-4 text-muted-foreground">
              <Building2 className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm text-center">Select a branch</p>
            </div>
          ) : studentsLoading ? (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No conversations
            </div>
          ) : (
            filteredStudents.map((student) => (
              <button
                key={student.student_id}
                onClick={() => handleSelectStudent(student.student_id, student.student_name)}
                className={cn(
                  "w-full p-3 text-left hover:bg-muted/50 border-b transition-colors",
                  selectedStudentId === student.student_id && "bg-muted"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm truncate">{student.student_name}</span>
                  {student.unread_count > 0 && (
                    <Badge variant="destructive" className="ml-2 shrink-0">
                      {student.unread_count}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  {student.last_message}
                </p>
              </button>
            ))
          )}
        </ScrollArea>
      </Card>

      {/* Chat Window (Columns 3-4) */}
      <Card className="md:col-span-2 flex flex-col overflow-hidden">
        {selectedStudentId && selectedBranchId ? (
          <>
            <CardHeader className="py-3 px-4 border-b shrink-0">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4" />
                <span className="font-medium text-sm">
                  Chat with {selectedStudentName}
                </span>
              </div>
            </CardHeader>
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
              {messagesLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : localMessages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <p>No messages yet</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {localMessages.map((msg) => (
                    <ChatBubble
                      key={msg.id}
                      message={msg.message}
                      senderName={msg.sender_name}
                      timestamp={msg.created_at}
                      isOwnMessage={msg.sender_type === 'branch'}
                      isRead={msg.is_read}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
            <ChatInput onSend={handleSend} />
          </>
        ) : (
          <CardContent className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <MessageCircle className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-sm">Select a conversation to view messages</p>
          </CardContent>
        )}
      </Card>
    </div>
  );
};

export default SuperadminChatPanel;