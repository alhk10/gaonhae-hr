
CREATE OR REPLACE FUNCTION public.admin_append_competition_grading_cards(
  p_id uuid, p_new_urls text[]
) RETURNS text[]
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.competition_payment_submissions
     SET grading_card_urls = COALESCE(grading_card_urls, '{}'::text[]) || COALESCE(p_new_urls, '{}'::text[]),
         updated_at = now()
   WHERE id = p_id
   RETURNING grading_card_urls;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_competition_grading_cards(
  p_id uuid, p_urls text[]
) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.competition_payment_submissions
     SET grading_card_urls = COALESCE(p_urls, '{}'::text[]),
         updated_at = now()
   WHERE id = p_id;
$$;

CREATE OR REPLACE FUNCTION public.admin_replace_competition_grading_card_at(
  p_id uuid, p_index int, p_new_url text
) RETURNS text[]
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.competition_payment_submissions
     SET grading_card_urls =
           COALESCE(grading_card_urls[1:p_index], '{}'::text[]) ||
           ARRAY[p_new_url] ||
           COALESCE(grading_card_urls[p_index+2:array_length(grading_card_urls,1)], '{}'::text[]),
         updated_at = now()
   WHERE id = p_id
     AND p_index >= 0
     AND p_index < COALESCE(array_length(grading_card_urls,1), 0)
   RETURNING grading_card_urls;
$$;

GRANT EXECUTE ON FUNCTION public.admin_append_competition_grading_cards(uuid, text[]) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_competition_grading_cards(uuid, text[]) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_replace_competition_grading_card_at(uuid, int, text) TO anon, authenticated;
