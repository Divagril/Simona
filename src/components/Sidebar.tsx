import React from 'react';
import { NavLink } from 'react-router-dom';
import { X, Menu, LogOut, ExternalLink } from 'lucide-react'; // Añadimos ExternalLink
import { useAuth } from '../context/AuthContext';
import './Sidebar.css';

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (value: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, setIsCollapsed }) => {
  const { logout } = useAuth();
  
  const menuItems = [
    { path: '/inventario', name: 'Inventario', icon: '📦' },
    { path: '/pos', name: 'Punto de Venta', icon: '🛒' },
    { path: '/clientes', name: 'Clientes', icon: '👥' },
    { path: '/reportes', name: 'Reportes', icon: '📊' },
    { path: '/auditoria', name: 'Auditoría', icon: '🛡️' },
    { path: '/config', name: 'Configuración', icon: '⚙️' },
  ];

  return (
    <>
      {isCollapsed && (
        <button className="sidebar-open-toggle" onClick={() => setIsCollapsed(false)}>
          <Menu size={24} />
        </button>
      )}

      <aside className={`sidebar-main ${isCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <button className="sidebar-close-btn" onClick={() => setIsCollapsed(true)}>
            <X size={22} strokeWidth={3} />
          </button>
          <span className="sidebar-brand">Tienda Simo</span>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <NavLink 
              key={item.path} 
              to={item.path} 
              className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}
            >
              <span className="item-icon">{item.icon}</span>
              <span className="item-text">{item.name}</span>
            </NavLink>
          ))}

          {/* --- BOTÓN DE INVERSIÓN (LINK EXTERNO) --- */}
          <a 
            href="https://inversion-simona.onrender.com/#/dashboard" 
            target="_blank" 
            rel="noopener noreferrer"
            className="nav-item external-link-btn"
          >
            <span className="item-icon">💰</span>
            <span className="item-text">Inversiones</span>
            <ExternalLink size={14} style={{ marginLeft: 'auto', opacity: 0.5 }} />
          </a>
        </nav>

        <div className="sidebar-footer">
          <button onClick={logout} className="nav-item logout-btn">
            <span className="item-icon"><LogOut size={20} /></span>
            <span className="item-text">Cerrar Sesión</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;