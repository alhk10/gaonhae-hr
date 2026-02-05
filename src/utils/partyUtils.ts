/**
 * Utility functions for party data normalization
 * Ensures all party details are stored in uppercase
 */

export const toUppercasePartyField = (value: string | null | undefined): string => {
  return value?.toUpperCase() || '';
};

// Fields that should be uppercased for all party types
const UPPERCASE_FIELDS = [
  'first_name', 
  'last_name', 
  'name', 
  'nric', 
  'nric_passport',
  'passport_no',
  'address', 
  'bank_name', 
  'bank_account', 
  'position', 
  'department',
  'certificate_name',
  'display_name',
  'preferred_name',
  'emergency_contact_name',
  'emergency_contact_2_name'
];

export const normalizePartyData = (data: Record<string, any>): Record<string, any> => {
  const normalized = { ...data };
  
  for (const field of UPPERCASE_FIELDS) {
    if (normalized[field] && typeof normalized[field] === 'string') {
      normalized[field] = normalized[field].toUpperCase();
    }
  }
  
  return normalized;
};

// For form inputs - auto-uppercase as user types
export const handleUppercaseInput = (
  value: string,
  setter: (value: string) => void
) => {
  setter(value.toUpperCase());
};
