// Utility to force authentication refresh for debugging
export const forceAuthRefresh = () => {
  console.log('🔄 Forcing authentication refresh...');
  window.location.reload();
};

// Add to window for easy debugging
if (typeof window !== 'undefined') {
  (window as any).forceAuthRefresh = forceAuthRefresh;
  console.log('🔧 Debug utility loaded: window.forceAuthRefresh()');
}