// src/context/NotificationContext.tsx
import React, { createContext, useState, useContext, type ReactNode } from 'react';

// Definimos qué datos va a tener el contexto
interface NotificationContextType {
  showNotification: (msg: string, isError?: boolean) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// El Proveedor que envolverá la App
export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notif, setNotif] = useState<{ msg: string; isError: boolean } | null>(null);

  const showNotification = (msg: string, isError = false) => {
    setNotif({ msg, isError });
    // Desaparece a los 3 segundos
    setTimeout(() => setNotif(null), 3000);
  };

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      
      {/* Estilo de la notificación (Igual al de tu Python) */}
      {notif && (
        <div style={{
          position: 'fixed',
          bottom: '30px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: notif.isError ? '#E74C3C' : '#27AE60',
          color: 'white',
          padding: '12px 25px',
          borderRadius: '12px',
          fontWeight: 'bold',
          boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
          zIndex: 9999,
          border: '2px solid white',
          fontSize: '15px'
        }}>
          {notif.isError ? '⚠️ ' : '✅ '} {notif.msg}
        </div>
      )}
    </NotificationContext.Provider>
  );
};

// Hook para usar las notificaciones fácilmente
export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotification debe usarse dentro de un NotificationProvider");
  }
  return context;
};