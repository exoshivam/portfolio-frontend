import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { StoreProvider } from './lib/store';
import './index.css';
import { followSystemTheme } from './lib/theme';

followSystemTheme();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreProvider>
      <App />
    </StoreProvider>
  </StrictMode>
);
