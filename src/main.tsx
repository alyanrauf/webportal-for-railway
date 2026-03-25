import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './types';

// Initialize bcnSettings for development (AI Studio preview)
if (!window.bcnSettings) {
  window.bcnSettings = {
    root: '/api',
    nonce: '',
    // In development, we can use the environment variable. 
    // In production build, this will be empty.
    geminiApiKey: (import.meta as any).env.VITE_GEMINI_API_KEY || (import.meta as any).env.GEMINI_API_KEY || ""
  };
}

const rootElement = document.getElementById('bcn-root') || document.getElementById('root');

if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
