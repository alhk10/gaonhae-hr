// Shared form options for student/trial forms

export const relationshipOptions = [
  { value: 'father', label: 'Father' },
  { value: 'mother', label: 'Mother' },
  { value: 'guardian', label: 'Guardian' },
  { value: 'spouse', label: 'Spouse' },
  { value: 'sibling', label: 'Sibling' },
  { value: 'grandparent', label: 'Grandparent' },
  { value: 'friend', label: 'Friend' },
  { value: 'other', label: 'Other' }
];

export const trainingGoalOptions = [
  'Increase Physical Fitness',
  'Increase Mental Tenacity',
  'Increase Confidence',
  'Weight Loss',
  'Self-Defense',
  'Social'
];

export const countryCodes = [
  { code: '+65', country: 'SG', flag: '🇸🇬', name: 'Singapore' },
  { code: '+61', country: 'AU', flag: '🇦🇺', name: 'Australia' },
  { code: '+60', country: 'MY', flag: '🇲🇾', name: 'Malaysia' },
  { code: '+62', country: 'ID', flag: '🇮🇩', name: 'Indonesia' },
  { code: '+86', country: 'CN', flag: '🇨🇳', name: 'China' },
  { code: '+91', country: 'IN', flag: '🇮🇳', name: 'India' },
  { code: '+63', country: 'PH', flag: '🇵🇭', name: 'Philippines' },
  { code: '+66', country: 'TH', flag: '🇹🇭', name: 'Thailand' },
  { code: '+84', country: 'VN', flag: '🇻🇳', name: 'Vietnam' },
  { code: '+81', country: 'JP', flag: '🇯🇵', name: 'Japan' },
  { code: '+82', country: 'KR', flag: '🇰🇷', name: 'South Korea' },
  { code: '+1', country: 'US', flag: '🇺🇸', name: 'United States' },
  { code: '+44', country: 'GB', flag: '🇬🇧', name: 'United Kingdom' },
  { code: '+64', country: 'NZ', flag: '🇳🇿', name: 'New Zealand' },
  { code: '+49', country: 'DE', flag: '🇩🇪', name: 'Germany' },
  { code: '+33', country: 'FR', flag: '🇫🇷', name: 'France' },
  { code: '+39', country: 'IT', flag: '🇮🇹', name: 'Italy' },
  { code: '+34', country: 'ES', flag: '🇪🇸', name: 'Spain' },
  { code: '+971', country: 'AE', flag: '🇦🇪', name: 'UAE' },
  { code: '+966', country: 'SA', flag: '🇸🇦', name: 'Saudi Arabia' },
  { code: '+852', country: 'HK', flag: '🇭🇰', name: 'Hong Kong' },
  { code: '+886', country: 'TW', flag: '🇹🇼', name: 'Taiwan' },
  { code: '+95', country: 'MM', flag: '🇲🇲', name: 'Myanmar' },
  { code: '+855', country: 'KH', flag: '🇰🇭', name: 'Cambodia' },
  { code: '+856', country: 'LA', flag: '🇱🇦', name: 'Laos' },
];

/**
 * Parse a phone string into country code and local number.
 * Tries to match the longest country code prefix.
 */
export function parsePhone(phone: string): { countryCode: string; localNumber: string } {
  if (!phone) return { countryCode: '+65', localNumber: '' };
  const trimmed = phone.trim();
  
  // Try matching longest codes first
  const sorted = [...countryCodes].sort((a, b) => b.code.length - a.code.length);
  for (const cc of sorted) {
    if (trimmed.startsWith(cc.code)) {
      return { countryCode: cc.code, localNumber: trimmed.slice(cc.code.length).trim() };
    }
  }
  
  // No match - default to +65
  if (trimmed.startsWith('+')) {
    return { countryCode: '+65', localNumber: trimmed };
  }
  return { countryCode: '+65', localNumber: trimmed };
}

export function formatPhone(countryCode: string, localNumber: string): string {
  if (!localNumber) return '';
  // Strip leading 0 (local trunk prefix) from local number for E164-style format
  const cleaned = localNumber.trim().replace(/^0+/, '');
  return `${countryCode} ${cleaned}`.trim();
}

/**
 * Normalize a stored phone string by stripping a leading 0 right after a
 * known country code. Safe for: empty, null, no-country-code, already-correct.
 *   "+61 0431..." -> "+61 431..."
 *   "+610431..."  -> "+61 431..."
 *   "+65 91234567" -> "+65 91234567" (unchanged)
 *   "91234567"    -> "91234567" (unchanged)
 */
export function normalizeStoredPhone<T extends string | null | undefined>(value: T): T {
  if (!value || typeof value !== 'string') return value;
  const re = /^(\+(?:65|61|60|62|86|91|63|66|84|81|82|44|64|49|33|39|34|95|971|966|852|886|855|856|1)) ?0/;
  return value.replace(re, '$1 ') as T;
}
