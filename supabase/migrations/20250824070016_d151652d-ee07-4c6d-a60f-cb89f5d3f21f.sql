-- Insert sample data for product management
INSERT INTO public.products (
    sku, name, description, category_id, base_price, tax_rate,
    requires_belt_level, min_belt_level, max_belt_level,
    session_count, validity_months, is_recurring, is_active, created_by
) VALUES 
('CLASS-KID-BEGINNER', 'Kids Beginner Class', 'Introduction to martial arts for children ages 5-8', 
 (SELECT id FROM product_categories WHERE name = 'Classes' LIMIT 1), 120.00, 0.08,
 true, 'White', 'Yellow', 8, 1, true, true, 'system'),
('CLASS-ADULT-INTER', 'Adult Intermediate Class', 'Intermediate martial arts training for adults',
 (SELECT id FROM product_categories WHERE name = 'Classes' LIMIT 1), 180.00, 0.08,
 true, 'Green', 'Blue', 8, 1, true, true, 'system'),
('MERCH-GI-SM', 'Training Gi - Small', 'High-quality martial arts uniform',
 (SELECT id FROM product_categories WHERE name = 'Merchandise' LIMIT 1), 89.99, 0.08,
 false, null, null, null, null, false, true, 'system'),
('COURSE-SEMINAR', 'Weekend Seminar Course', 'Intensive weekend training seminar',
 (SELECT id FROM product_categories WHERE name = 'Courses' LIMIT 1), 299.99, 0.08,
 true, 'Yellow', null, 2, 1, false, true, 'system')
ON CONFLICT (sku) DO NOTHING;