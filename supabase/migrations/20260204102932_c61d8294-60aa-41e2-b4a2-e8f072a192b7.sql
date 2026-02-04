-- Add new columns to grading_registrations for grading list feature
ALTER TABLE grading_registrations 
ADD COLUMN IF NOT EXISTS ready_for_grading boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS certificate_ii_issued boolean DEFAULT false;