
# Plan: Add Chat to Student Portal and Superadmin Dashboard

## Overview
This plan adds:
1. **Chat Action Card** on Student Portal (QuickActionsSection) - quick access to chat
2. **Chat Tab** on Student Portal - full chat interface with their branch
3. **Chat Tab** on Superadmin Dashboard - aggregated view of all chats across all branches

## Database Changes
No database changes required - uses existing `student_branch_chats` table.

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/chat/StudentChatPanel.tsx` | Chat interface for students |
| `src/components/chat/SuperadminChatPanel.tsx` | All-branches chat view for superadmin |

## Files to Modify

| File | Change |
|------|--------|
| `src/services/chatService.ts` | Add student-side and superadmin functions |
| `src/components/dashboard/QuickActionsSection.tsx` | Add Chat action card |
| `src/components/dashboard/StudentDashboard.tsx` | Add Chat tab |
| `src/components/dashboard/SuperadminDashboard.tsx` | Add Chat tab |

---

## Implementation Details

### 1. Chat Service Extensions

Add new functions to `chatService.ts`:

```typescript
// Get unread count for a student (messages from branch)
export const getUnreadCountForStudent = async (studentId: string): Promise<number>

// Mark branch messages as read (when student opens chat)
export const markBranchMessagesAsRead = async (studentId: string, branchId: string): Promise<void>

// Subscribe to chat for a student
export const subscribeToStudentChat = (
  studentId: string,
  branchId: string,
  onNewMessage: (message: ChatMessage) => void
) => { ... }

// Superadmin: Get all conversations across all branches
export const getAllConversations = async (): Promise<BranchConversation[]>

// Superadmin: Get total unread count across all branches
export const getTotalUnreadCount = async (): Promise<number>
```

### 2. Student Chat Action Card (QuickActionsSection)

Add a third action card for Chat:

```tsx
{/* Chat with Branch */}
<Card className="cursor-pointer transition-all hover:shadow-md">
  <CardContent className="p-6">
    <div className="flex items-start gap-4">
      <div className="bg-green-500/10 p-3 rounded-lg relative">
        <MessageCircle className="w-6 h-6 text-green-600" />
        {unreadCount > 0 && (
          <Badge className="absolute -top-1 -right-1">{unreadCount}</Badge>
        )}
      </div>
      <div className="flex-1">
        <h3 className="font-semibold text-lg">Chat with Branch</h3>
        <p className="text-sm text-muted-foreground mb-3">
          Send messages to your branch staff
        </p>
        <Button size="sm" variant="outline" onClick={() => setActiveTab('chat')}>
          <MessageCircle className="w-4 h-4 mr-2" />
          Open Chat
        </Button>
      </div>
    </div>
  </CardContent>
</Card>
```

### 3. Student Chat Tab (StudentDashboard)

Add Chat tab after Class Schedule:

```tsx
// Tab trigger
<TabsTrigger value="chat">
  Chat {unreadCount > 0 && <Badge variant="destructive">{unreadCount}</Badge>}
</TabsTrigger>

// Tab content
<TabsContent value="chat">
  <StudentChatPanel 
    studentId={studentId}
    branchId={student.branch_id}
    studentName={`${student.first_name} ${student.last_name}`}
  />
</TabsContent>
```

### 4. StudentChatPanel Component

Full chat interface for students:

```tsx
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
  // Fetch messages
  // Real-time subscription
  // Mark messages as read on open
  // Send message function
  
  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="border-b py-3">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          <span>Chat with {branchName}</span>
        </div>
      </CardHeader>
      <ScrollArea className="flex-1 p-4">
        {/* Chat bubbles */}
        {messages.map(msg => (
          <ChatBubble
            key={msg.id}
            message={msg.message}
            senderName={msg.sender_name}
            timestamp={msg.created_at}
            isOwnMessage={msg.sender_type === 'student'}
            isRead={msg.is_read}
          />
        ))}
      </ScrollArea>
      <ChatInput onSend={handleSend} />
    </Card>
  );
};
```

### 5. Superadmin Chat Tab

Add Chat tab to SuperadminDashboard:

```tsx
// Convert to tabbed layout
<Tabs value={activeTab} onValueChange={setActiveTab}>
  <TabsList>
    <TabsTrigger value="overview">Overview</TabsTrigger>
    <TabsTrigger value="chat">Chat ({totalUnreadCount})</TabsTrigger>
  </TabsList>
  
  <TabsContent value="overview">
    {/* Existing dashboard content */}
  </TabsContent>
  
  <TabsContent value="chat">
    <SuperadminChatPanel />
  </TabsContent>
</Tabs>
```

### 6. SuperadminChatPanel Component

Aggregated view of all branch conversations:

```tsx
const SuperadminChatPanel: React.FC = () => {
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  
  // Fetch all branches with conversation counts
  // Fetch conversations for selected branch
  // Fetch messages for selected student
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 h-[600px]">
      {/* Branch List (Column 1) */}
      <Card className="overflow-hidden">
        <CardHeader>
          <span>Branches</span>
        </CardHeader>
        <ScrollArea>
          {branches.map(branch => (
            <button onClick={() => setSelectedBranchId(branch.id)}>
              {branch.name}
              <Badge>{branch.unread_count}</Badge>
            </button>
          ))}
        </ScrollArea>
      </Card>
      
      {/* Student List (Column 2) */}
      <Card className="overflow-hidden">
        <CardHeader>
          <span>Students</span>
        </CardHeader>
        <ScrollArea>
          {selectedBranchId && conversations.map(conv => (
            <button onClick={() => setSelectedStudentId(conv.student_id)}>
              {conv.student_name}
              <Badge>{conv.unread_count}</Badge>
            </button>
          ))}
        </ScrollArea>
      </Card>
      
      {/* Chat Window (Columns 3-4) */}
      <Card className="md:col-span-2 flex flex-col">
        {selectedStudentId ? (
          <>
            <CardHeader>Chat with {studentName}</CardHeader>
            <ScrollArea className="flex-1">
              {messages.map(msg => <ChatBubble ... />)}
            </ScrollArea>
            <ChatInput onSend={handleSend} />
          </>
        ) : (
          <EmptyState>Select a conversation</EmptyState>
        )}
      </Card>
    </div>
  );
};
```

---

## Tab Order Updates

**Student Dashboard Tabs:**
1. Overview
2. My Profile
3. Invoices
4. Class Schedule
5. **Chat** (new)

**Superadmin Dashboard:**
- Convert to tabbed layout with Overview and Chat tabs

---

## Visual Preview

**Student Portal - Chat Action Card:**
```text
+------------------------------------------+
| Quick Actions                            |
+------------------------------------------+
| [Pay School Fees] [Pay Grading] [Chat]   |
|                                   (2)    |
+------------------------------------------+
```

**Student Portal - Chat Tab:**
```text
+------------------------------------------+
| Chat with Tampines Branch                |
+------------------------------------------+
|                                          |
|  [Branch Staff]                          |
|  Your class is at 3pm today              |
|  10:30 AM                                |
|                                          |
|                          [You]           |
|              Thank you!                  |
|                           10:32 AM  ✓✓   |
|                                          |
+------------------------------------------+
| [Type a message...              ] [Send] |
+------------------------------------------+
```

**Superadmin - Chat Tab:**
```text
+----------+----------+----------------------+
| Branches | Students |  Chat with Student   |
+----------+----------+----------------------+
| Tampines | J.Smith  |                      |
|   (5)    |   (2)    |  [John]              |
| Jurong   | S.Lee    |  Question about...   |
|   (3)    |   (1)    |  10:30 AM            |
| Bedok    +----------+                      |
|   (0)    |          |       [Branch]       |
+----------+          |  Let me check...     |
                      |       10:32 AM  ✓✓   |
                      +----------------------+
                      | [Type message...][>] |
                      +----------------------+
```

---

## Real-time Flow

```text
Student sends message
       |
       v
[Insert into student_branch_chats]
       |
       v
[Supabase Realtime broadcasts INSERT]
       |
       +---> Student Chat (sees own message)
       |
       +---> Branch Dashboard (notification)
       |
       +---> Superadmin Dashboard (notification)

Branch replies
       |
       v
[Insert into student_branch_chats]
       |
       v
[Supabase Realtime broadcasts INSERT]
       |
       +---> Branch Chat (sees own message)
       |
       +---> Student Chat (sees new message)
       |
       +---> Superadmin Dashboard (update)
```

---

## Technical Summary

| Component | Changes |
|-----------|---------|
| Chat Service | Add student/superadmin functions |
| QuickActionsSection | Add Chat action card with unread badge |
| StudentDashboard | Add Chat tab with StudentChatPanel |
| SuperadminDashboard | Convert to tabs, add Chat tab with SuperadminChatPanel |
| New Components | StudentChatPanel, SuperadminChatPanel |
