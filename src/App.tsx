import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// --- IMPORTACIÓN DE COMPONENTES ---
import Sidebar from './components/Sidebar';
import Inventory from './pages/Inventory';
import POS from './pages/POS';
import Clients from './pages/Clients';
import Reports from './pages/Reports';
import Audit from './pages/Audit';
import Config from './pages/Config'; // <--- 1. ASEGÚRATE DE ESTA IMPORTACIÓN

import './App.css';

function App() {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  return (
    <Router>
      <div className="app-container">
        <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
        
        <main className="content-area">
          <Routes>
            <Route path="/" element={<Navigate to="/pos" />} />
            <Route path="/inventario" element={<Inventory />} />
            <Route path="/pos" element={<POS />} />
            <Route path="/clientes" element={<Clients />} />
            <Route path="/reportes" element={<Reports />} />
            <Route path="/auditoria" element={<Audit />} />

            {/* 2. CAMBIA ESTA RUTA DE ABAJO */}
            <Route path="/config" element={<Config />} /> 
            
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;