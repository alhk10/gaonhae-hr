DELETE FROM public.grading_registrations gr
WHERE gr.invoice_item_id IS NULL
  AND gr.result IS NULL
  AND gr.ready_for_grading = true
  AND NOT EXISTS (
    SELECT 1
    FROM public.invoice_items ii
    JOIN public.invoices i  ON i.id = ii.invoice_id
    JOIN public.products  p  ON p.id = ii.product_id
    JOIN public.product_categories pc ON pc.id = p.category_id
    WHERE i.student_id = gr.student_id
      AND i.status <> 'cancelled'
      AND pc.name = 'Grading'
      AND lower(p.name) = lower(gr.current_belt || ' >> ' || gr.target_belt)
      AND COALESCE(ii.metadata->>'term_id', '') = COALESCE(gr.term_id::text, '')
  );