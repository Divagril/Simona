// src/App.tsx
import { useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Importación de componentes
import Sidebar from './components/Sidebar';
import Inventory from './pages/Inventory';
import POS from './pages/POS';
import Clients from './pages/Clients';
import Reports from './pages/Reports';
import Audit from './pages/Audit';
import Config from './pages/Config';
import Login from './pages/Login';     
import { ProtectedRoute } from './components/ProtectedRoute'; // Un solo punto

import './App.css';

function AppContent() {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const { isAuthenticated } = useAuth();

  return (
    <div className="app-container">
      {/* Solo mostrar Sidebar si está autenticado */}
      {isAuthenticated && <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />}
      
      <main className={isAuthenticated ? "content-area" : "login-area"}>
        <Routes>
          {/* Ruta Pública */}
          <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/pos" />} />

          {/* Rutas Protegidas */}
          <Route path="/pos" element={<ProtectedRoute><POS /></ProtectedRoute>} />
          <Route path="/inventario" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
          <Route path="/clientes" element={<ProtectedRoute><Clients /></ProtectedRoute>} />
          <Route path="/reportes" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
          <Route path="/auditoria" element={<ProtectedRoute><Audit /></ProtectedRoute>} />
          <Route path="/config" element={<ProtectedRoute><Config /></ProtectedRoute>} />

          {/* Redirección por defecto */}
          <Route path="*" element={<Navigate to={isAuthenticated ? "/pos" : "/login"} />} />
        </Routes>
      </main>
    </div>
  );
}

// El App principal debe estar envuelto en AuthProvider
function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;