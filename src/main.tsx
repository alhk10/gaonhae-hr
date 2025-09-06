import { createRoot } from 'react-dom/client'
import './index.css'

function SimpleApp() {
  return (
    <div style={{ padding: '20px' }}>
      <h1>Simple Test</h1>
      <p>If you see this, React is working!</p>
    </div>
  );
}

const root = createRoot(document.getElementById("root")!);
root.render(<SimpleApp />);
