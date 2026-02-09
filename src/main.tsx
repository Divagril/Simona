import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App' // En TS no hace falta poner .tsx al final
import { NotificationProvider } from './context/NotificationContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Envolvemos App con el proveedor de notificaciones */}
    <NotificationProvider>
      <App />
    </NotificationProvider>
  </StrictMode>,
)