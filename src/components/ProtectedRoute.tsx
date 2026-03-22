import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Importamos el CSS por si decidimos mostrar una pantalla de carga
import './ProtectedRoute.css';

interface Props {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<Props> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  // Si el usuario no está autenticado, lo mandamos al Login
  if (!isAuthenticated) {
    // 'replace' evita que el usuario pueda volver atrás a una ruta protegida
    // 'state' guarda la ubicación a la que intentaba ir el usuario
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Si está autenticado, permitimos que vea la página
  return <>{children}</>;
};