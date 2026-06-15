/**
 * Application Configuration Constants
 * Centralized configuration values used throughout the app
 */

// Payroll Constants
export const PAYROLL_CONSTANTS = {
  SLOT_BOOKING_START_DATE: '2025-11-01',
  DEFAULT_BASE_SALARY_FULL_TIME: 0,
  DEFAULT_HOURLY_RATE: 0,
} as const;

// Pricing Constants
export const PRICING_CONSTANTS = {
  DEFAULT_WEEKDAY_RATE: 70,
  DEFAULT_WEEKEND_RATE: 85,
  DEFAULT_YEARS_OF_SERVICE_BONUS: 3,
  DAN_LEVEL_BONUSES: {
    '1st Dan': 5,
    '2nd Dan': 10,
    '3rd Dan & Above': 15,
  },
  COACHING_CERT_BONUSES: {
    'Coach Induction': 1,
    'Poomsae Coach Level 1': 3,
    'Poomsae Coach Level 2': 5,
    'Poomsae Coach Level 3': 7,
    'SG Coach Level 1': 3,
    'SG Coach Level 2': 5,
  },
  REFEREE_CERT_BONUSES: {
    'STF Poomsae Referee': 3,
    'STF Kyorugi Referee': 3,
  },
} as const;

// Authentication Constants
export const AUTH_CONSTANTS = {
  SESSION_CHECK_TIMEOUT: 5000,
  DATA_FETCH_TIMEOUT: 8000,
  INACTIVITY_TIMEOUT_MINUTES: 30,
  PASSWORD_MIN_LENGTH: 8,
  MAX_FAILED_LOGIN_ATTEMPTS: 5,
} as const;

// Cache Constants
export const CACHE_CONSTANTS = {
  EMPLOYEE_CACHE_TTL: 5 * 60 * 1000, // 5 minutes
  PAYROLL_CACHE_TTL: 10 * 60 * 1000, // 10 minutes
  PRICING_CONFIG_CACHE_TTL: 15 * 60 * 1000, // 15 minutes
} as const;

// Query Client Configuration
export const QUERY_CONFIG = {
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      retry: 2,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
    },
  },
} as const;

// API Timeout Constants
export const DEFAULT_QUERY_TIMEOUT = 60000; // 60 seconds

// Emergency Fallback Data
export const EMERGENCY_FALLBACKS = {
  DEFAULT_USER: {
    id: 'fallback',
    email: 'fallback@system.local',
    name: 'System User',
    role: 'employee' as const,
  },
  DEFAULT_ADMIN_ACCESS: {
    employees: false,
    payroll: false,
    leaveManagement: false,
    claims: false,
    attendance: false,
    slotBooking: false,
    reports: false,
  },
  DEFAULT_PAGE_ACCESS: {
    profile: true,
    applyLeave: true,
    submitClaim: true,
    payslips: true,
    myAttendance: true,
    slotBookingEmployee: true,
    cctvMonitoring: false,
    socialMedia: false,
  },
} as const;

// Date Format Constants
export const DATE_FORMATS = {
  API_DATE: 'yyyy-MM-dd',
  DISPLAY_DATE: 'dd/MM/yyyy',
  DISPLAY_DATETIME: 'dd/MM/yyyy HH:mm',
  MONTH_YEAR: 'MMMM yyyy',
  API_PERIOD: 'yyyy-MM',
} as const;

// CPF Constants
export const CPF_CONSTANTS = {
  MAX_OW_CEILING: 6800,
  MAX_AW_CEILING: 102000,
  MIN_AGE_FOR_CPF: 18,
  RETIREMENT_AGE: 55,
} as const;

// Leave Constants
export const LEAVE_CONSTANTS = {
  BASE_ANNUAL_LEAVE: 14,
  MAX_ANNUAL_LEAVE: 18,
  MEDICAL_LEAVE: 14,
  SERVICE_BONUS_PER_YEAR: 1,
} as const;

// Pagination Constants
export const PAGINATION_CONSTANTS = {
  DEFAULT_PAGE_SIZE: 50,
  MAX_PAGE_SIZE: 100,
} as const;

// Country Tax Rates
export const COUNTRY_TAX_RATES: Record<string, number> = {
  'Singapore': 9,
  'Australia': 10,
  'Malaysia': 0,
} as const;

// Country Tax Inclusion Defaults (true = tax included in price, false = tax excluded/added on top)
export const COUNTRY_TAX_INCLUDED: Record<string, boolean> = {
  'Singapore': false,  // Price + tax
  'Australia': true,   // Price includes tax
  'Malaysia': false,
} as const;

export const DEFAULT_TAX_RATE = 0;
export const DEFAULT_TAX_INCLUDED = false;

// File Upload Constants
export const FILE_UPLOAD_CONSTANTS = {
  MAX_FILE_SIZE: 15 * 1024 * 1024, // 15MB — accommodates modern phone photos
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'image/heic', 'image/heif'],
  ALLOWED_DOCUMENT_TYPES: [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
  ],
} as const;
