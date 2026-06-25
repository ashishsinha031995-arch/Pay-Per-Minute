import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Safe override safeguard for window.fetch in sandboxed iframes.
// Prevents libraries like Razorpay from crashing the app with:
// "Uncaught TypeError: Cannot set property fetch of #<Window> which has only a getter"
try {
  if (typeof window !== 'undefined' && window.fetch) {
    let currentFetch = window.fetch;

    // Attempt to delete own property 'fetch' on window first to enable inheritance setup.
    try {
      delete (window as any).fetch;
    } catch (e) {}
    
    const defineOn = (obj: any) => {
      try {
        Object.defineProperty(obj, 'fetch', {
          configurable: true,
          enumerable: true,
          get: () => currentFetch,
          set: (value) => {
            console.warn('Intercepted and processed window.fetch override attempt.');
            currentFetch = value;
          }
        });
        return true;
      } catch (err) {
        return false;
      }
    };

    // Try defining on window instance first
    let success = defineOn(window);
    
    // If that fails, try defining on Window.prototype
    if (!success && typeof Window !== 'undefined' && Window.prototype) {
      success = defineOn(Window.prototype);
    }

    // As a fallback, try a simple writable property on window
    if (!success) {
      try {
        Object.defineProperty(window, 'fetch', {
          value: currentFetch,
          writable: true,
          configurable: true,
          enumerable: true
        });
      } catch (err) {
        console.warn('All fetch override safeguards failed:', err);
      }
    }
  }
} catch (e) {
  console.error('Fetch polyfill safeguard failed:', e);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

