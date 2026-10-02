import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from '@/App';
import { setupPWA } from '@/lib/pwa';
import '@/styles/globals.css';

setupPWA();

const container = document.getElementById('root');
if (!container) throw new Error('Elemento #root não encontrado em index.html');

createRoot(container).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
