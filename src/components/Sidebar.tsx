import React from 'react';
import { NavLink } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

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

  // Función para cerrar el menú automáticamente al hacer clic en un enlace (solo en celular)
  const handleLinkClick = () => {
    if (window.innerWidth <= 768) {
      setIsCollapsed(true);
    }
  };

  return (
    <>
      {/* 
         HEADER MÓVIL (Barra superior) 
         NOTA: Esta barra se oculta en PC gracias al CSS (ver abajo)
      */}
      <div className="mobile-top-bar">
        <button className="btn-toggle-mobile" onClick={() => setIsCollapsed(false)}>
          <Menu size={24} color="white" />
        </button>
        <span className="mobile-logo">Tienda Simona</span>
      </div>

      {/* OVERLAY MÓVIL (Fondo oscuro al abrir menú en celular) */}
      {!isCollapsed && (
        <div className="mobile-overlay-shadow" onClick={() => setIsCollapsed(true)}></div>
      )}

      {/* SIDEBAR PRINCIPAL */}
      <div className={`sidebar ${isCollapsed ? 'collapsed' : 'mobile-open'}`}>
        
        {/* CABECERA DEL SIDEBAR */}
        <div className="sidebar-header">
          {/* Botón para colapsar/expandir en PC */}
          <button className="toggle-btn-box" onClick={() => setIsCollapsed(!isCollapsed)}>
            <Menu size={20} color="#2C3E50" />
          </button>
          
          {/* Título que se oculta al colapsar */}
          <div className={`app-title-container ${isCollapsed ? 'hide' : ''}`}>
            <span className="app-title-text">Tienda Simona</span>
          </div>
          
          {/* Botón cerrar (X) solo visible en menú móvil abierto */}
          <button className="btn-close-mobile-internal" onClick={() => setIsCollapsed(true)}>
            <X size={24} color="white" />
          </button>
        </div>

        {/* NAVEGACIÓN */}
        <nav className="nav-menu">
          {menuItems.map((item) => (
            <NavLink 
              key={item.path} 
              to={item.path} 
              className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}
              onClick={handleLinkClick}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className={`nav-text ${isCollapsed ? 'hide' : ''}`}>{item.name}</span>
            </NavLink>
          ))}
        </nav>

        {/* FOOTER */}
        <div className={`sidebar-status-footer ${isCollapsed ? 'hide' : ''}`}>
          <div className="status-admin">Admin</div>
          <div className="status-connected">Conectado</div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;