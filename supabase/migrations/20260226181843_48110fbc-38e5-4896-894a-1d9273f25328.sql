-- MERGE DUPLICATES: Update keepers with missing data, delete student_auth for duplicates, then delete duplicates

-- 1. AYDEN JUN XIANG TAN: Keep da931f44 (has belt Blue Tip, real DOB), merge email from abbab525
UPDATE students SET email = 'TAY_KAIWEN@YAHOO.COM' WHERE id = 'da931f44-6f50-4cb8-8d50-e8e17980ef85' AND email IS NULL;
-- Delete student_auth for duplicate
DELETE FROM student_auth WHERE student_id = 'abbab525-3f74-4371-9b61-6fa2ef643f59'::uuid;
-- Delete duplicate
DELETE FROM students WHERE id = 'abbab525-3f74-4371-9b61-6fa2ef643f59';

-- 2. ESTHER MEI LIM: Keep 7b087187 (has belt Green Tip, real DOB 1987-04-14)
DELETE FROM student_auth WHERE student_id = '667d87ea-9534-46b4-a157-80d2523b530a'::uuid;
DELETE FROM students WHERE id = '667d87ea-9534-46b4-a157-80d2523b530a';

-- 3. HARESH RAJ: Keep 482f42e1 (has email hharesh18@gmail.com)
DELETE FROM students WHERE id = '62b78a4e-5709-4a60-8c3c-03127a3c2b40';

-- 4. JON YI EN NG: Keep 7ce685b1 (has belt Blue Tip, real DOB 2018-04-29)
DELETE FROM student_auth WHERE student_id = '50724e79-7c0c-4b6b-829c-46787685b37b'::uuid;
DELETE FROM students WHERE id = '50724e79-7c0c-4b6b-829c-46787685b37b';

-- 5. JULIAN: Keep 3a98beea (has real DOB 2014-02-09, email)
DELETE FROM students WHERE id = '8d98d686-6d6e-405e-a47e-ddaea75704a1';

-- 6. YI LIN YEO: Keep d4a70c93 (has real DOB 2005-12-12, email)
DELETE FROM students WHERE id = '6bece585-f8f5-4612-928c-36c812250c99';