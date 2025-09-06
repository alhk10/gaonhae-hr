import { createRoot } from 'react-dom/client'
import './index.css'

console.log('🔍 DIAGNOSTIC: Starting minimal app...');

// Create a minimal diagnostic component
function DiagnosticApp() {
  console.log('🔍 DIAGNOSTIC: DiagnosticApp rendering...');
  
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>🔍 Diagnostic Mode</h1>
      <p>React is working!</p>
      <p>Time: {new Date().toLocaleString()}</p>
      <div>
        <h2>Testing Imports:</h2>
        <ul id="import-tests">
          <li>✅ React DOM - OK</li>
        </ul>
      </div>
    </div>
  );
}

const rootElement = document.getElementById("root");
if (!rootElement) {
  console.error('🔍 DIAGNOSTIC: Root element not found!');
} else {
  console.log('🔍 DIAGNOSTIC: Root element found, creating React root...');
  
  try {
    const root = createRoot(rootElement);
    console.log('🔍 DIAGNOSTIC: React root created, rendering diagnostic app...');
    
    root.render(<DiagnosticApp />);
    console.log('🔍 DIAGNOSTIC: ✅ Diagnostic app rendered successfully');
  } catch (error) {
    console.error('🔍 DIAGNOSTIC: ❌ Error during render:', error);
    document.body.innerHTML = `
      <div style="padding: 20px; color: red; font-family: Arial;">
        <h1>🔍 DIAGNOSTIC ERROR</h1>
        <p>Failed to render React app: ${error}</p>
        <pre>${error.stack || 'No stack trace'}</pre>
      </div>
    `;
  }
}

// Test progressive imports
console.log('🔍 DIAGNOSTIC: Testing import capabilities...');

// Test Supabase import
try {
  import('@/integrations/supabase/client').then(() => {
    console.log('🔍 DIAGNOSTIC: ✅ Supabase client import OK');
    const list = document.getElementById('import-tests');
    if (list) {
      list.innerHTML += '<li>✅ Supabase client - OK</li>';
    }
  }).catch((error) => {
    console.error('🔍 DIAGNOSTIC: ❌ Supabase client import failed:', error);
    const list = document.getElementById('import-tests');
    if (list) {
      list.innerHTML += `<li>❌ Supabase client - FAILED: ${error.message}</li>`;
    }
  });
} catch (error) {
  console.error('🔍 DIAGNOSTIC: ❌ Immediate Supabase import error:', error);
}

// Test AuthContext import
try {
  import('./contexts/AuthContext').then(() => {
    console.log('🔍 DIAGNOSTIC: ✅ AuthContext import OK');
    const list = document.getElementById('import-tests');
    if (list) {
      list.innerHTML += '<li>✅ AuthContext - OK</li>';
    }
  }).catch((error) => {
    console.error('🔍 DIAGNOSTIC: ❌ AuthContext import failed:', error);
    const list = document.getElementById('import-tests');
    if (list) {
      list.innerHTML += `<li>❌ AuthContext - FAILED: ${error.message}</li>`;
    }
  });
} catch (error) {
  console.error('🔍 DIAGNOSTIC: ❌ Immediate AuthContext import error:', error);
}