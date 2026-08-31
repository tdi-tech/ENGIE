import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import AppContent from './app/App.tsx'
import { ThemeProvider } from './app/providers/ThemeProvider.tsx'
import { ToastProvider } from './app/providers/ToastProvider.tsx'
import { ModalProvider } from './app/providers/ModalProvider.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <ToastProvider>
        <ModalProvider>
          <AppContent />
        </ModalProvider>
      </ToastProvider>
    </ThemeProvider>
  </StrictMode>,
)