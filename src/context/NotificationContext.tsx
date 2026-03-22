import React, { createContext, useState, useContext, useCallback } from 'react';
// Importamos el tipo de forma separada para evitar errores de TypeScript
import type { ReactNode } from 'react';
import { CheckCircle, AlertTriangle, X } from 'lucide-react';
import './NotificationContext.css';

// 1. Definición de la Interface del Mensaje
interface NotificationContextType {
  showNotification: (msg: string, isError?: boolean) => void;
}

// 2. Crear el Contexto
const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// 3. Crear el Proveedor
export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notif, setNotif] = useState<{ msg: string; isError: boolean } | null>(null);
  
  // Usamos 'any' para evitar el error de NodeJS vs Navegador
  const [timerId, setTimerId] = useState<any>(null);

  const showNotification = useCallback((msg: string, isError = false) => {
    // Si ya hay una notificación corriendo, la detenemos
    if (timerId) clearTimeout(timerId);

    setNotif({ msg, isError });

    // Se oculta tras 3.5 segundos
    const id = setTimeout(() => {
      setNotif(null);
    }, 3500);

    setTimerId(id);
  }, [timerId]);

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      
      {/* DISEÑO DE LA NOTIFICACIÓN */}
      {notif && (
        <div className={`notification-toast ${notif.isError ? 'error' : 'success'}`}>
          <div className="notif-icon">
            {notif.isError ? <AlertTriangle size={20} /> : <CheckCircle size={20} />}
          </div>
          <div className="notif-content">
            <span className="notif-message">{notif.msg}</span>
          </div>
          <button className="notif-close" onClick={() => setNotif(null)}>
            <X size={16} />
          </button>
          <div className="notif-progress-bar"></div>
        </div>
      )}
    </NotificationContext.Provider>
  );
};

// 4. Hook para usarlo fácilmente
export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotification debe usarse dentro de un NotificationProvider");
  }
  return context;
};