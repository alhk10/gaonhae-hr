/**
 * Utility functions for party data normalization
 * Ensures all party details are stored in uppercase
 */

export const toUppercasePartyField = (value: string | null | undefined): string => {
  return value?.toUpperCase() || '';
};

export const normalizePartyData = (data: Record<string, any>): Record<string, any> => {
  const textFields = ['first_name', 'last_name', 'name', 'nric', 'address', 'bank_name', 'bank_account', 'position', 'department'];
  const normalized = { ...data };
  
  for (const field of textFields) {
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
