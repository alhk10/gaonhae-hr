-- Uppercase all existing student text data
UPDATE public.students SET 
  first_name = UPPER(first_name),
  last_name = UPPER(last_name),
  preferred_name = UPPER(preferred_name),
  address = UPPER(address),
  nric_passport = UPPER(nric_passport),
  emergency_contact_name = UPPER(emergency_contact_name),
  emergency_contact_2_name = UPPER(emergency_contact_2_name)
WHERE first_name IS NOT NULL OR last_name IS NOT NULL;