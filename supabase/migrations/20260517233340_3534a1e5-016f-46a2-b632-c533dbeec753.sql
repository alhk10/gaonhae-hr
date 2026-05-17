UPDATE public.grading_slots
SET belt_levels = ARRAY['Foundation','Foundation 1','Foundation 2','Foundation 3'],
    grading_product_ids = ARRAY[
      'e1f5a299-4c47-42ff-8abe-c2db0820a754',
      '00a4c25b-a86b-4be8-a0f6-405211f01dd3',
      'cbf48656-03c3-4c68-b3ac-d06a84cf92ae',
      'ae08f80c-90e0-4faa-b30a-470e2f9656f0'
    ]::uuid[],
    available_branch_ids = ARRAY['bukit-merah','BR1769014228743','BR1769014316844','jurong-west','kembangan','BR1768967806476','yishun']
WHERE id = '5b9c0183-7a15-44fc-a80b-4ce4321ea21b';