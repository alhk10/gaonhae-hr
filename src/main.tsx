import { createRoot } from 'react-dom/client'
import './index.css'
import ErrorBoundary from './components/ErrorBoundary'

console.log('main.tsx: Starting full application...');

function SafeApp() {
  try {
    console.log('main.tsx: Attempting to import App...');
    const App = require('./App.tsx').default;
    console.log('main.tsx: ✅ App imported successfully');
    return <App />;
  } catch (error) {
    console.error('main.tsx: ❌ Failed to import App:', error);
    return (
      <div style={{ padding: '20px', color: 'red' }}>
        <h1>Import Error</h1>
        <p>Failed to load main application: {String(error)}</p>
        <pre>{error instanceof Error ? error.stack : 'No stack trace'}</pre>
      </div>
    );
  }
}

const rootElement = document.getElementById("root");
if (!rootElement) {
  console.error('main.tsx: Root element not found!');
} else {
  try {
    const root = createRoot(rootElement);
    root.render(
      <ErrorBoundary>
        <SafeApp />
      </ErrorBoundary>
    );
    console.log('main.tsx: ✅ App rendered with error boundaries');
  } catch (error) {
    console.error('main.tsx: ❌ Critical render error:', error);
    rootElement.innerHTML = `
      <div style="padding: 20px; color: red;">
        <h1>Critical Error</h1>
        <p>Failed to start application: ${error}</p>
      </div>
    `;
  }
}
