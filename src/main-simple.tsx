import { createRoot } from 'react-dom/client'
import './index.css'

// Simple test component to verify React is working
function SimpleApp() {
  console.log('SimpleApp: Rendering test component');
  
  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      backgroundColor: '#f3f4f6',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <div style={{ 
        textAlign: 'center',
        padding: '2rem',
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
      }}>
        <h1 style={{ color: '#1f2937', marginBottom: '1rem' }}>
          🎉 React is Working!
        </h1>
        <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
          The application is now loading successfully.
        </p>
        <button 
          onClick={() => {
            console.log('Button clicked - React event handling works');
            alert('React is fully functional!');
          }}
          style={{
            backgroundColor: '#3b82f6',
            color: 'white',
            padding: '0.5rem 1rem',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Test React Functionality
        </button>
        <div style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#9ca3af' }}>
          Check console for logs
        </div>
      </div>
    </div>
  );
}

console.log('main-simple.tsx: Starting React app mount...');

const rootElement = document.getElementById("root");
if (!rootElement) {
  console.error('main-simple.tsx: Root element not found!');
} else {
  console.log('main-simple.tsx: Root element found, creating React root...');
  
  try {
    const root = createRoot(rootElement);
    console.log('main-simple.tsx: React root created, rendering app...');
    
    root.render(<SimpleApp />);
    console.log('main-simple.tsx: ✅ App rendered successfully');
  } catch (error) {
    console.error('main-simple.tsx: ❌ Error during render:', error);
  }
}