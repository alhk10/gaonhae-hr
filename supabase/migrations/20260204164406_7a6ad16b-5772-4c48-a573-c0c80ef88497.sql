-- Create table for student-branch instant messaging
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

-- RLS Policy: Users with branch access can manage messages for their branch
CREATE POLICY "Branch staff can view messages" ON student_branch_chats
  FOR SELECT USING (public.has_branch_access(branch_id));

CREATE POLICY "Branch staff can insert messages" ON student_branch_chats
  FOR INSERT WITH CHECK (public.has_branch_access(branch_id));

CREATE POLICY "Branch staff can update messages" ON student_branch_chats
  FOR UPDATE USING (public.has_branch_access(branch_id));

-- Students can view their own messages
CREATE POLICY "Students can view own messages" ON student_branch_chats
  FOR SELECT USING (student_id = public.get_current_student_id());

CREATE POLICY "Students can send messages" ON student_branch_chats
  FOR INSERT WITH CHECK (student_id = public.get_current_student_id() AND sender_type = 'student');

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE student_branch_chats;