import { supabase } from "@/integrations/supabase/client";

export interface ChatMessage {
  id: string;
  student_id: string;
  branch_id: string;
  sender_type: 'student' | 'branch';
  sender_id: string;
  sender_name: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface StudentConversation {
  student_id: string;
  student_name: string;
  last_message: string;
  last_message_time: string;
  unread_count: number;
}

// Get all student conversations for a branch with last message and unread count
export const getStudentConversations = async (branchId: string): Promise<StudentConversation[]> => {
  // Get all unique students with messages for this branch
  const { data: messages, error } = await supabase
    .from('student_branch_chats')
    .select(`
      student_id,
      message,
      created_at,
      sender_type,
      is_read
    `)
    .eq('branch_id', branchId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching conversations:', error);
    throw error;
  }

  // Get student names
  const studentIds = [...new Set(messages?.map(m => m.student_id) || [])];
  
  if (studentIds.length === 0) {
    return [];
  }

  const { data: students, error: studentsError } = await supabase
    .from('students')
    .select('id, first_name, last_name')
    .in('id', studentIds);

  if (studentsError) {
    console.error('Error fetching student names:', studentsError);
    throw studentsError;
  }

  const studentMap = new Map(students?.map(s => [s.id, `${s.first_name} ${s.last_name}`]) || []);

  // Group by student and calculate stats
  const conversationMap = new Map<string, StudentConversation>();
  
  messages?.forEach(msg => {
    if (!conversationMap.has(msg.student_id)) {
      conversationMap.set(msg.student_id, {
        student_id: msg.student_id,
        student_name: studentMap.get(msg.student_id) || 'Unknown Student',
        last_message: msg.message,
        last_message_time: msg.created_at,
        unread_count: 0
      });
    }
    
    // Count unread messages from students
    if (msg.sender_type === 'student' && !msg.is_read) {
      const conv = conversationMap.get(msg.student_id)!;
      conv.unread_count++;
    }
  });

  return Array.from(conversationMap.values()).sort((a, b) => 
    new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime()
  );
};

// Get chat messages between a student and branch
export const getMessages = async (studentId: string, branchId: string): Promise<ChatMessage[]> => {
  const { data, error } = await supabase
    .from('student_branch_chats')
    .select('*')
    .eq('student_id', studentId)
    .eq('branch_id', branchId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching messages:', error);
    throw error;
  }

  return (data || []) as ChatMessage[];
};

// Send a new message
export const sendMessage = async (
  studentId: string,
  branchId: string,
  senderType: 'student' | 'branch',
  senderId: string,
  senderName: string,
  message: string
): Promise<ChatMessage> => {
  const { data, error } = await supabase
    .from('student_branch_chats')
    .insert({
      student_id: studentId,
      branch_id: branchId,
      sender_type: senderType,
      sender_id: senderId,
      sender_name: senderName,
      message: message,
      is_read: false
    })
    .select()
    .single();

  if (error) {
    console.error('Error sending message:', error);
    throw error;
  }

   // Send push notification to recipient (fire and forget - don't block message sending)
   try {
     if (senderType === 'student') {
       // Notify branch staff
       notifyBranchStaffOfNewMessage(branchId, senderName, message).catch(console.error);
     } else {
       // Notify student
       notifyStudentOfNewMessage(studentId, senderName, message).catch(console.error);
     }
   } catch (notifyError) {
     // Don't block message sending if notification fails
     console.error('Error sending notification:', notifyError);
   }
 
  return data as ChatMessage;
};

// Mark all student messages as read for a conversation
export const markMessagesAsRead = async (studentId: string, branchId: string): Promise<void> => {
  const { error } = await supabase
    .from('student_branch_chats')
    .update({ is_read: true })
    .eq('student_id', studentId)
    .eq('branch_id', branchId)
    .eq('sender_type', 'student')
    .eq('is_read', false);

  if (error) {
    console.error('Error marking messages as read:', error);
    throw error;
  }
};

// Get total unread count for a branch (messages from students)
export const getUnreadCountForBranch = async (branchId: string): Promise<number> => {
  const { count, error } = await supabase
    .from('student_branch_chats')
    .select('*', { count: 'exact', head: true })
    .eq('branch_id', branchId)
    .eq('sender_type', 'student')
    .eq('is_read', false);

  if (error) {
    console.error('Error fetching unread count:', error);
    return 0;
  }

  return count || 0;
};

// Subscribe to new messages for a branch
export const subscribeToChat = (
  branchId: string,
  onNewMessage: (message: ChatMessage) => void
) => {
  const channel = supabase
    .channel(`branch-chat:${branchId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'student_branch_chats',
        filter: `branch_id=eq.${branchId}`
      },
      (payload) => {
        onNewMessage(payload.new as ChatMessage);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

// Get all students for a branch (for starting new conversations)
export const getBranchStudents = async (branchId: string): Promise<{ id: string; name: string }[]> => {
  const { data, error } = await supabase
    .from('students')
    .select('id, first_name, last_name')
    .eq('branch_id', branchId)
    .ilike('status', 'active')
    .order('first_name');

  if (error) {
    console.error('Error fetching students:', error);
    throw error;
  }

  return (data || []).map(s => ({
    id: s.id,
    name: `${s.first_name} ${s.last_name}`
  }));
};

// ==================== Student-side Functions ====================

// Get unread count for a student (messages from branch)
export const getUnreadCountForStudent = async (studentId: string): Promise<number> => {
  const { count, error } = await supabase
    .from('student_branch_chats')
    .select('*', { count: 'exact', head: true })
    .eq('student_id', studentId)
    .eq('sender_type', 'branch')
    .eq('is_read', false);

  if (error) {
    console.error('Error fetching student unread count:', error);
    return 0;
  }

  return count || 0;
};

// Mark all branch messages as read for a student
export const markBranchMessagesAsRead = async (studentId: string, branchId: string): Promise<void> => {
  const { error } = await supabase
    .from('student_branch_chats')
    .update({ is_read: true })
    .eq('student_id', studentId)
    .eq('branch_id', branchId)
    .eq('sender_type', 'branch')
    .eq('is_read', false);

  if (error) {
    console.error('Error marking branch messages as read:', error);
    throw error;
  }
};

// Subscribe to chat for a student
export const subscribeToStudentChat = (
  studentId: string,
  branchId: string,
  onNewMessage: (message: ChatMessage) => void
) => {
  const channel = supabase
    .channel(`student-chat:${studentId}:${branchId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'student_branch_chats',
        filter: `student_id=eq.${studentId}`
      },
      (payload) => {
        onNewMessage(payload.new as ChatMessage);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

// ==================== Superadmin Functions ====================

export interface BranchConversation {
  branch_id: string;
  branch_name: string;
  unread_count: number;
  conversation_count: number;
}

// Get all branches with conversation counts for superadmin
export const getAllBranchConversations = async (): Promise<BranchConversation[]> => {
  // Get all branches first
  const { data: branches, error: branchError } = await supabase
    .from('branches')
    .select('id, name')
    .order('name');

  if (branchError) {
    console.error('Error fetching branches:', branchError);
    throw branchError;
  }

  // Get all chats grouped by branch
  const { data: chats, error: chatError } = await supabase
    .from('student_branch_chats')
    .select('branch_id, sender_type, is_read, student_id');

  if (chatError) {
    console.error('Error fetching chats:', chatError);
    throw chatError;
  }

  // Calculate stats per branch
  const branchStats = new Map<string, { unread: number; students: Set<string> }>();

  chats?.forEach(chat => {
    if (!branchStats.has(chat.branch_id)) {
      branchStats.set(chat.branch_id, { unread: 0, students: new Set() });
    }
    const stats = branchStats.get(chat.branch_id)!;
    stats.students.add(chat.student_id);
    if (chat.sender_type === 'student' && !chat.is_read) {
      stats.unread++;
    }
  });

  return (branches || []).map(branch => {
    const stats = branchStats.get(branch.id);
    return {
      branch_id: branch.id,
      branch_name: branch.name,
      unread_count: stats?.unread || 0,
      conversation_count: stats?.students.size || 0,
    };
  }).filter(b => b.conversation_count > 0 || b.unread_count > 0);
};

// Get total unread count across all branches for superadmin
export const getTotalUnreadCount = async (): Promise<number> => {
  const { count, error } = await supabase
    .from('student_branch_chats')
    .select('*', { count: 'exact', head: true })
    .eq('sender_type', 'student')
    .eq('is_read', false);

  if (error) {
    console.error('Error fetching total unread count:', error);
    return 0;
  }

  return count || 0;
};

// Subscribe to all chats for superadmin
export const subscribeToAllChats = (
  onNewMessage: (message: ChatMessage) => void
) => {
  const channel = supabase
    .channel('superadmin-all-chats')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'student_branch_chats'
      },
      (payload) => {
        onNewMessage(payload.new as ChatMessage);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

// Get branch name by ID
export const getBranchName = async (branchId: string): Promise<string> => {
  const { data, error } = await supabase
    .from('branches')
    .select('name')
    .eq('id', branchId)
    .single();

  if (error) {
    console.error('Error fetching branch name:', error);
    return 'Unknown Branch';
  }

  return data?.name || 'Unknown Branch';
};
 
 // ==================== Notification Functions ====================
 
 // Notify student of new message from branch
 const notifyStudentOfNewMessage = async (
   studentId: string,
   senderName: string,
   message: string
 ): Promise<void> => {
   const messagePreview = message.length > 50 
     ? message.substring(0, 47) + '...' 
     : message;
 
   try {
     await supabase.functions.invoke('push-notification', {
       body: {
         student_id: studentId,
         template_key: 'new_chat_message',
         variables: {
           sender_name: senderName,
           message_preview: messagePreview
         },
         url: '/?tab=chat'
       }
     });
   } catch (error) {
     console.error('Error notifying student:', error);
   }
 };
 
 // Notify branch staff of new message from student
 const notifyBranchStaffOfNewMessage = async (
   branchId: string,
   studentName: string,
   message: string
 ): Promise<void> => {
   const messagePreview = message.length > 50 
     ? message.substring(0, 47) + '...' 
     : message;
 
   try {
     // Get employees with access to this branch
     const { data: branchAccess, error } = await supabase
       .from('employee_branch_access')
       .select('employee_id')
       .eq('branch_id', branchId);
 
     if (error) {
       console.error('Error fetching branch access:', error);
       return;
     }
 
     // Send notification to each employee with branch access
     const notificationPromises = (branchAccess || []).map(access => 
       supabase.functions.invoke('push-notification', {
         body: {
           employee_id: access.employee_id,
           template_key: 'new_chat_message',
           variables: {
             sender_name: studentName,
             message_preview: messagePreview
           },
           url: '/branch-dashboard?tab=chat'
         }
       }).catch(err => console.error('Error notifying employee:', err))
     );
 
     await Promise.allSettled(notificationPromises);
   } catch (error) {
     console.error('Error notifying branch staff:', error);
   }
 };
