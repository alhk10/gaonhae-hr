import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import ErrorBoundary from './components/ErrorBoundary'

console.log('main.tsx: Starting application...');

const rootElement = document.getElementById("root");
if (!rootElement) {
  console.error('main.tsx: Root element not found!');
} else {
  console.log('main.tsx: Root element found, creating React root...');
  
  try {
    const root = createRoot(rootElement);
    console.log('main.tsx: React root created, rendering app...');
    
    root.render(
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    );
    console.log('main.tsx: ✅ App rendered successfully');
  } catch (error) {
    console.error('main.tsx: ❌ Error during render:', error);
  }
}
