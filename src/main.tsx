import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import { App } from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { MaterialTheme } from './components/MaterialTheme';
import { queryClient } from './lib/queryClient';
import { BASE_PATH } from './lib/basePath';
import { applyTheme } from './stores/themeStore';
import {
  bindNativeBackButton,
  keepFocusedFieldVisible,
  registerPwaServiceWorker,
} from './lib/device';
import './styles/global.css';
applyTheme();
keepFocusedFieldVisible();
void bindNativeBackButton();
registerPwaServiceWorker();
// Em telas estreitas (celular/maquininha) os avisos ficam no topo, longe dos botões de ação.
const toastPosition = window.matchMedia('(max-width: 599px)').matches
  ? 'top-center'
  : 'bottom-right';
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <MaterialTheme>
          <BrowserRouter basename={BASE_PATH || '/'}>
            <App />
            <Toaster richColors position={toastPosition} closeButton />
          </BrowserRouter>
        </MaterialTheme>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
