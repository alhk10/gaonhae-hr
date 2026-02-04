

# Plan: Add Instant Chat Tab to Branch Dashboard

## Overview
Add a new "Chat" tab to the Branch Dashboard that enables real-time instant messaging with students from that branch. The tab will display an unread message count in brackets.

## Database Design

### New Table: `student_branch_chats`

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `student_id` | uuid | Reference to students table |
| `branch_id` | text | Reference to branches table |
| `sender_type` | text | 'student' or 'branch' |
| `sender_id` | text | Student ID or Employee ID |
| `sender_name` | text | Display name of sender |
| `message` | text | Message content |
| `is_read` | boolean | Whether message has been read by recipient |
| `created_at` | timestamp | When message was sent |

## Files to Create

| File | Purpose |
|------|---------|
| `src/services/chatService.ts` | Service for chat operations + real-time subscriptions |
| `src/components/chat/BranchChatPanel.tsx` | Main chat panel with student list + chat window |
| `src/components/chat/ChatBubble.tsx` | Reusable chat bubble component |
| `src/components/chat/ChatInput.tsx` | Message input with send button |

## Files to Modify

| File | Change |
|------|--------|
| `src/components/dashboard/BranchDashboard.tsx` | Add Chat tab with unread count |

## Implementation Details

### 1. Database Migration

```sql
CREATE TABLE student_branch_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  branch_id TEXT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('student', 'branch')),
  sender_id TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX idx_chats_student ON student_branch_chats(student_id, created_at);
CREATE INDEX idx_chats_branch ON student_branch_chats(branch_id, created_at);
CREATE INDEX idx_chats_unread_branch ON student_branch_chats(branch_id, is_read) 
  WHERE sender_type = 'student' AND is_read = FALSE;

-- Enable RLS
ALTER TABLE student_branch_chats ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Branch staff can read/write messages for their branch
CREATE POLICY "Branch staff can manage messages" ON student_branch_chats
  FOR ALL USING (true);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE student_branch_chats;
```

### 2. Chat Service

```typescript
// chatService.ts
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

// Functions:
// - getStudentConversations(branchId) - List students with chat history
// - getMessages(studentId, branchId) - Get chat history
// - sendMessage(message) - Send new message
// - markMessagesAsRead(studentId, branchId) - Mark student messages as read
// - getUnreadCountForBranch(branchId) - Count unread from students
// - subscribeToChat(branchId, callback) - Real-time subscription
```

### 3. Branch Dashboard - Chat Tab

Add a new tab between "Grading List" and "Pending Approvals":

```tsx
// Query for unread count
const { data: unreadChatsCount = 0 } = useQuery({
  queryKey: ['unread-chats-count', branchId],
  queryFn: () => getUnreadCountForBranch(branchId),
  enabled: !!branchId,
  refetchInterval: 30000, // Refresh every 30 seconds
});

// Tab Trigger
<TabsTrigger value="chat">
  Chat ({unreadChatsCount})
</TabsTrigger>

// Tab Content
<TabsContent value="chat">
  <BranchChatPanel branchId={branchId} />
</TabsContent>
```

### 4. BranchChatPanel Component

Split-view layout with:
- **Left sidebar**: List of students with conversations
  - Search filter
  - Unread badge per student
  - Last message preview
  - Click to select student
- **Right panel**: Chat window for selected student
  - Student name header
  - Message bubbles (scrollable)
  - Text input at bottom

```tsx
interface BranchChatPanelProps {
  branchId: string;
}

const BranchChatPanel: React.FC<BranchChatPanelProps> = ({ branchId }) => {
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  
  // Fetch conversations list
  // Fetch messages for selected student
  // Subscribe to real-time updates
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[600px]">
      {/* Student List */}
      <Card className="md:col-span-1 overflow-hidden">
        <CardHeader>
          <Input placeholder="Search students..." />
        </CardHeader>
        <ScrollArea className="h-[500px]">
          {/* Student conversation items */}
        </ScrollArea>
      </Card>
      
      {/* Chat Window */}
      <Card className="md:col-span-2 flex flex-col">
        {selectedStudentId ? (
          <>
            <CardHeader>Student Name</CardHeader>
            <ScrollArea className="flex-1">
              {/* Chat bubbles */}
            </ScrollArea>
            <ChatInput onSend={handleSend} />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            Select a conversation
          </div>
        )}
      </Card>
    </div>
  );
};
```

### 5. Chat UI Components

**ChatBubble:**
```tsx
interface ChatBubbleProps {
  message: string;
  senderName: string;
  timestamp: string;
  isOwnMessage: boolean; // Branch messages on right (blue)
}
```

**ChatInput:**
```tsx
interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}
// Features:
// - Text input
// - Send button (or Enter key)
// - Shift+Enter for new line
```

## Tab Order (Updated)

1. Students (count)
2. Invoice & Payment (amount)
3. Grading List (count)
4. **Chat (unread count)** - NEW
5. Pending Approvals (count)
6. Weekly Timetable

## Real-time Flow

```text
Student sends message (from StudentDashboard - future)
       |
       v
[Insert into student_branch_chats]
       |
       v
[Supabase Realtime broadcasts INSERT]
       |
       +---> Branch Chat (sees new message, unread badge updates)

Branch replies
       |
       v
[Insert into student_branch_chats]
       |
       v
[Supabase Realtime broadcasts INSERT]
       |
       +---> Student (if viewing chat)
```

## Visual Preview

```text
+------------------------------------------+
| Chat (3)                                 |  <- Tab with unread count
+------------------------------------------+
| Students         |  Chat with John Smith |
+------------------+-----------------------+
| [Search...]      |                       |
+------------------+  [John]               |
| ● John Smith (2) |  Hi, I have a         |
|   Hi, I have a   |  question about...    |
|   10:32 AM       |  10:32 AM             |
+------------------+                       |
| Sarah Lee        |          [You]        |
|   Thanks!        |  Sure! How can I      |
|   Yesterday      |  help you?            |
+------------------+          10:35 AM  ✓  |
|                  |                       |
|                  +-----------------------+
|                  | [Type a message...][>]|
+------------------+-----------------------+
```

## Technical Notes

### Real-time Subscription
```typescript
const subscription = supabase
  .channel(`branch-chat:${branchId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'student_branch_chats',
    filter: `branch_id=eq.${branchId}`
  }, (payload) => {
    // Add new message to chat
    // Update unread count if from student
  })
  .subscribe();
```

### Unread Count Logic
- Count messages where `sender_type = 'student'` AND `is_read = false`
- Grouped by student for per-student badges

### Auto-scroll
- Scroll to bottom when chat opens
- Scroll to bottom on new messages
- Preserve scroll if user scrolled up

### Mark as Read
- When branch staff opens a student's chat, mark all student messages as read

## Future Enhancement (Student Side)
The Student Dashboard can have a matching "Chat" tab added later to complete the two-way messaging. For now, the branch can initiate conversations and will see any future student messages.

## Summary of Changes

| Component | Changes |
|-----------|---------|
| Database | New `student_branch_chats` table with RLS + Realtime |
| Services | New `chatService.ts` |
| Branch Dashboard | New Chat tab with unread count |
| UI Components | BranchChatPanel, ChatBubble, ChatInput |

