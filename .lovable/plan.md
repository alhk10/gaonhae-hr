
# Plan: Send Push Notifications for New Chat Messages

## Overview
Add push notifications when new chat messages are received to alert:
1. **Branch staff** when a student sends a message
2. **Students** when branch staff sends a message

## Current State Analysis

### Existing Notification System
- Push notifications are **employee-only** (stores `employee_id` in `notification_subscriptions`)
- Edge function `push-notification` sends notifications using VAPID keys
- Templates are stored in `notification_templates` table
- Current templates: `clock_out_reminder`, `tomorrow_slot_reminder`, `booking_reminder`

### Key Challenge
Students don't have entries in `notification_subscriptions` table - the system needs to support student notifications.

---

## Implementation Approach

### Option: Create a Separate Student Notification Table

This approach keeps employee and student notification systems separate for clarity.

---

## Database Changes

### 1. New Table: `student_notification_subscriptions`

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `student_id` | uuid | Reference to students table |
| `endpoint` | text | Push subscription endpoint |
| `p256dh` | text | Encryption key |
| `auth` | text | Auth secret |
| `user_agent` | text | Device info |
| `created_at` | timestamp | When created |

### 2. New Notification Template

Add `new_chat_message` template for chat notifications:
- **Title**: "New Message"
- **Body**: "{sender_name}: {message_preview}"

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/services/studentPushNotificationService.ts` | Push notification functions for students |
| `src/hooks/useStudentNotificationSubscription.ts` | Hook for student notification subscription |

## Files to Modify

| File | Change |
|------|--------|
| `src/services/chatService.ts` | Add notification trigger after sending messages |
| `supabase/functions/push-notification/index.ts` | Support student subscriptions |
| `src/components/chat/StudentChatPanel.tsx` | Add notification opt-in UI |
| `src/components/dashboard/StudentDashboard.tsx` | Add notification settings access |

---

## Implementation Details

### 1. Database Migration

```sql
-- Create student notification subscriptions table
CREATE TABLE student_notification_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, endpoint)
);

-- Enable RLS
ALTER TABLE student_notification_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "Students can manage own subscriptions" 
  ON student_notification_subscriptions FOR ALL USING (true);

-- Add new chat message notification template
INSERT INTO notification_templates (template_key, title, body, enabled)
VALUES ('new_chat_message', 'New Message', '{sender_name}: {message_preview}', true);
```

### 2. Student Push Notification Service

```typescript
// studentPushNotificationService.ts
export const subscribeStudentToPushNotifications = async (
  studentId: string
): Promise<PushSubscriptionData | null> => {
  // Similar to employee subscription but saves to student_notification_subscriptions
};

export const unsubscribeStudentFromPushNotifications = async (
  studentId: string
): Promise<boolean> => {
  // Remove subscription from student_notification_subscriptions
};

export const checkStudentExistingSubscription = async (
  studentId: string
): Promise<boolean> => {
  // Check if student has active subscription
};
```

### 3. Update Edge Function

Update `push-notification` to support both employee and student notifications:

```typescript
interface PushPayload {
  employee_id?: string;
  student_id?: string;  // New field
  template_key: string;
  variables?: Record<string, string>;
  url?: string;
}

// In the handler, check which ID is provided:
if (payload.student_id) {
  // Fetch from student_notification_subscriptions
} else if (payload.employee_id) {
  // Fetch from notification_subscriptions (existing)
}
```

### 4. Chat Service Integration

Add notification sending to `sendMessage` function:

```typescript
export const sendMessage = async (...) => {
  // Insert message (existing)
  const { data, error } = await supabase
    .from('student_branch_chats')
    .insert({...})
    .select()
    .single();

  // NEW: Send notification to recipient
  if (senderType === 'student') {
    // Notify branch staff - send to employees with branch access
    await notifyBranchStaffOfNewMessage(branchId, senderName, message);
  } else {
    // Notify student
    await notifyStudentOfNewMessage(studentId, senderName, message);
  }

  return data;
};

const notifyStudentOfNewMessage = async (
  studentId: string,
  senderName: string,
  message: string
) => {
  const messagePreview = message.length > 50 
    ? message.substring(0, 47) + '...' 
    : message;

  await supabase.functions.invoke('push-notification', {
    body: {
      student_id: studentId,
      template_key: 'new_chat_message',
      variables: {
        sender_name: senderName,
        message_preview: messagePreview
      },
      url: '/?tab=chat'  // Deep link to chat
    }
  });
};

const notifyBranchStaffOfNewMessage = async (
  branchId: string,
  studentName: string,
  message: string
) => {
  // Get employees with access to this branch
  const { data: branchAccess } = await supabase
    .from('employee_branch_access')
    .select('employee_id')
    .eq('branch_id', branchId);

  // Send notification to each employee
  for (const access of branchAccess || []) {
    await supabase.functions.invoke('push-notification', {
      body: {
        employee_id: access.employee_id,
        template_key: 'new_chat_message',
        variables: {
          sender_name: studentName,
          message_preview: message.substring(0, 50)
        },
        url: '/branch-dashboard?tab=chat'
      }
    });
  }
};
```

### 5. Student Notification Opt-In UI

Add notification toggle in Student Portal:

```tsx
// In StudentChatPanel or StudentDashboard
import { useStudentNotificationSubscription } from '@/hooks/useStudentNotificationSubscription';

const { isSubscribed, subscribe, unsubscribe, isSupported } = 
  useStudentNotificationSubscription(studentId);

// Show toggle or button
{isSupported && (
  <Button onClick={isSubscribed ? unsubscribe : subscribe}>
    {isSubscribed ? 'Disable Notifications' : 'Enable Notifications'}
  </Button>
)}
```

---

## Notification Flow

```text
Student sends message
       |
       v
[Insert into student_branch_chats]
       |
       v
[Call notifyBranchStaffOfNewMessage()]
       |
       v
[Invoke push-notification edge function]
       |
       v
[Send to all branch employees with subscriptions]

Branch replies
       |
       v
[Insert into student_branch_chats]
       |
       v
[Call notifyStudentOfNewMessage()]
       |
       v
[Invoke push-notification edge function]
       |
       v
[Send to student if they have subscription]
```

---

## Notification Content

**When student receives message from branch:**
- Title: "New Message"
- Body: "Branch Staff: Your class schedule has been updated..."
- Click action: Opens student chat

**When branch receives message from student:**
- Title: "New Message"
- Body: "John Smith: Hi, I have a question about..."
- Click action: Opens branch chat

---

## Summary of Changes

| Component | Changes |
|-----------|---------|
| Database | New `student_notification_subscriptions` table + template |
| Services | New `studentPushNotificationService.ts`, update `chatService.ts` |
| Edge Function | Support student notifications in `push-notification` |
| Hooks | New `useStudentNotificationSubscription.ts` |
| UI | Add notification opt-in in Student Portal |

---

## Technical Notes

### Rate Limiting
- Consider adding throttling to prevent spam notifications
- Only send notification if recipient isn't currently viewing chat

### Error Handling
- Silently fail notifications - don't block message sending
- Clean up expired subscriptions automatically

### User Experience
- Show notification opt-in prompt on first chat access
- Allow disabling notifications from settings
