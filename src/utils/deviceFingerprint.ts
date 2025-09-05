
// Enhanced device fingerprinting utility for unique session isolation
export const generateDeviceFingerprint = (includeTimestamp: boolean = true): string => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx!.textBaseline = 'top';
  ctx!.font = '14px Arial';
  ctx!.fillText('Device fingerprint', 2, 2);
  
  // Generate a truly unique session identifier per browser tab/session
  const sessionId = crypto.getRandomValues(new Uint32Array(4)).join('-');
  const timestamp = includeTimestamp ? Date.now().toString() : '';
  const tabId = Math.random().toString(36).substring(2, 15);
  
  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height + 'x' + screen.colorDepth,
    new Date().getTimezoneOffset(),
    canvas.toDataURL(),
    navigator.hardwareConcurrency || 'unknown',
    navigator.platform,
    navigator.cookieEnabled.toString(),
    navigator.doNotTrack || 'unknown',
    sessionId, // Unique per session
    timestamp, // Timestamp for uniqueness
    tabId, // Tab-specific identifier
    window.location.href, // Include current URL
    document.referrer || 'direct' // Include referrer
  ].join('|');
  
  // Enhanced hash function for better uniqueness
  let hash = 0;
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Add additional randomness
  const randomSalt = Math.random().toString(36).substring(2, 15);
  const finalHash = Math.abs(hash).toString(36) + '-' + randomSalt;
  
  return finalHash;
};

export const getCurrentDeviceId = (): string => {
  // CRITICAL: Always generate a fresh device ID per session
  // Do NOT use sessionStorage as it causes session sharing between users
  const deviceId = generateDeviceFingerprint(true);
  console.log('Generated fresh device ID:', deviceId);
  return deviceId;
};

// Helper function to clear any existing device IDs from storage (no-op for security compliance)
export const clearStoredDeviceIds = (): void => {
  // Storage disabled for security compliance - no action needed
  console.log('Storage disabled for security compliance');
};

// Generate a unique session token for additional security
export const generateSessionToken = (): string => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};
