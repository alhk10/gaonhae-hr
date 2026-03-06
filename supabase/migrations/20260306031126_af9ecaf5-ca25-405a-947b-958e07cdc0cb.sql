DO $$
DECLARE
  item_rec RECORD;
  enrollment_uuid UUID;
  slot TEXT;
  timetable_id_part TEXT;
  date_part TEXT;
  tt_rec RECORD;
BEGIN
  FOR item_rec IN
    SELECT 
      ii.id AS invoice_item_id,
      ii.product_id,
      ii.metadata,
      ii.unit_price,
      ii.quantity,
      i.student_id,
      i.branch_id,
      i.invoice_number,
      p.name AS product_name,
      (ii.metadata->>'term_id')::uuid AS term_id
    FROM invoice_items ii
    JOIN invoices i ON i.id = ii.invoice_id
    JOIN products p ON p.id = ii.product_id
    WHERE ii.metadata IS NOT NULL
      AND ii.metadata->>'selected_class_slots' IS NOT NULL
      AND jsonb_array_length(ii.metadata->'selected_class_slots') > 0
      AND (ii.metadata->>'term_id') IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM student_class_enrollments sce
        WHERE sce.invoice_item_id = ii.id
        AND sce.status = 'active'
      )
  LOOP
    UPDATE student_class_enrollments 
    SET status = 'inactive', updated_at = NOW()
    WHERE student_id = item_rec.student_id
      AND term_id = item_rec.term_id
      AND branch_id = item_rec.branch_id
      AND status = 'active';

    enrollment_uuid := gen_random_uuid();
    INSERT INTO student_class_enrollments (
      id, student_id, term_id, branch_id, class_type, tier_name,
      total_price, invoice_item_id, status, created_at, updated_at
    ) VALUES (
      enrollment_uuid,
      item_rec.student_id,
      item_rec.term_id,
      item_rec.branch_id,
      item_rec.product_name,
      item_rec.product_name,
      item_rec.unit_price * item_rec.quantity,
      item_rec.invoice_item_id,
      'active',
      NOW(),
      NOW()
    );

    FOR slot IN
      SELECT jsonb_array_elements_text(item_rec.metadata->'selected_class_slots')
    LOOP
      timetable_id_part := split_part(slot, '_', 1);
      date_part := split_part(slot, '_', 2);
      
      SELECT id, start_time, end_time INTO tt_rec
      FROM branch_timetables
      WHERE id = timetable_id_part::uuid
      LIMIT 1;

      IF tt_rec.id IS NOT NULL THEN
        INSERT INTO student_scheduled_classes (
          id, enrollment_id, timetable_id, scheduled_date, start_time, end_time, status, created_at, updated_at
        ) VALUES (
          gen_random_uuid(),
          enrollment_uuid,
          tt_rec.id,
          date_part::date,
          tt_rec.start_time,
          tt_rec.end_time,
          'scheduled',
          NOW(),
          NOW()
        );
      END IF;
    END LOOP;
  END LOOP;
END $$;
