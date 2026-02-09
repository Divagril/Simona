import React from 'react';
import { NavLink } from 'react-router-dom';
import { Menu } from 'lucide-react';

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (value: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, setIsCollapsed }) => {
  
  const menuItems = [
    { path: '/inventario', name: 'Inventario', icon: '📦' },
    { path: '/pos', name: 'Punto de Venta', icon: '🛒' },
    { path: '/clientes', name: 'Clientes', icon: '👥' },
    { path: '/reportes', name: 'Reportes', icon: '📊' },
    { path: '/auditoria', name: 'Auditoría', icon: '🛡️' },
    { path: '/config', name: 'Configuración', icon: '⚙️' },
  ];

  return (
    <div className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      {/* Botón de Hamburguesa arriba */}
      <div className="sidebar-header">
        <button className="toggle-btn-box" onClick={() => setIsCollapsed(!isCollapsed)}>
          <Menu size={24} color="#2C3E50" />
        </button>
        {!isCollapsed && <span className="app-title-text">Tienda Simona</span>}
      </div>

      {/* Lista de navegación */}
      <nav className="nav-menu">
        {menuItems.map((item) => (
          <NavLink 
            key={item.path} 
            to={item.path} 
            className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}
          >
            <span className="nav-icon">{item.icon}</span>
            {!isCollapsed && <span className="nav-text">{item.name}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Estado al fondo de la barra */}
      {!isCollapsed && (
        <div className="sidebar-status-footer">
          <div className="status-admin">Admin</div>
          <div className="status-connected">Conectado</div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;