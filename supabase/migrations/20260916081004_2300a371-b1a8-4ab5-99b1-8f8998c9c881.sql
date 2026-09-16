WITH ev AS (
  SELECT g.matched_student_id AS sid, g.date_of_birth AS d FROM public.grading_payment_submissions g WHERE g.created_at > '2026-09-11' AND g.matched_student_id IS NOT NULL AND g.date_of_birth IS NOT NULL
  UNION ALL SELECT p.matched_student_id, p.date_of_birth FROM public.competition_payment_submissions p WHERE p.created_at > '2026-09-11' AND p.matched_student_id IS NOT NULL AND p.date_of_birth IS NOT NULL
  UNION ALL SELECT p.matched_student_id, p.date_of_birth FROM public.seminar_payment_submissions p WHERE p.created_at > '2026-09-11' AND p.matched_student_id IS NOT NULL AND p.date_of_birth IS NOT NULL
  UNION ALL SELECT p.matched_student_id, p.date_of_birth FROM public.guards_purchases p WHERE p.created_at > '2026-09-11' AND p.matched_student_id IS NOT NULL AND p.date_of_birth IS NOT NULL
), agg AS (
  SELECT sid, min(d) AS mn, max(d) AS mx FROM ev GROUP BY sid
)
UPDATE public.students s
SET date_of_birth = agg.mn, updated_at = now()
FROM agg
WHERE s.id = agg.sid
  AND agg.mn = agg.mx
  AND agg.mn = s.date_of_birth + 1;