INSERT INTO public.products (sku, name, description, category_id, base_price, tax_rate, is_active, is_service, metadata)
SELECT 'CONV-1STDAN-2NDDAN', 'STF 1st Dan > 2nd Dan', 'STF 1st Dan > 2nd Dan Conversion', category_id, 0, 9, true, true,
       jsonb_build_object('conversion_from','1st Dan','conversion_to','2nd Dan')
FROM public.products WHERE name = 'STF 2nd Dan > 3rd Dan'
AND NOT EXISTS (SELECT 1 FROM public.products WHERE name = 'STF 1st Dan > 2nd Dan');