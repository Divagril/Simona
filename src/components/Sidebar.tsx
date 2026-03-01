import React from 'react';
import { NavLink } from 'react-router-dom';
import { Menu, X, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

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

  // Función para cerrar el menú automáticamente al hacer clic en un enlace (solo en celular)
  const handleLinkClick = () => {
    if (window.innerWidth <= 768) {
      setIsCollapsed(true); // true significa CERRADO
    }
  };

  return (
    <>
      {/* 1. BARRA SUPERIOR MÓVIL (FIJA Y SÓLIDA) */}
      <div className="mobile-top-bar">
        <button className="btn-toggle-mobile" onClick={() => setIsCollapsed(false)}>
          <Menu size={28} color="white" />
        </button>
        <span className="mobile-logo">Tienda Simo</span>
      </div>

      {/* 2. SOMBRA OSCURA (OVERLAY) 
          Solo aparece cuando el menú está abierto en móvil (isCollapsed === false) */}
      {!isCollapsed && window.innerWidth <= 768 && (
        <div className="mobile-overlay-shadow" onClick={() => setIsCollapsed(true)}></div>
      )}

      {/* 3. SIDEBAR PRINCIPAL */}
      <div className={`sidebar ${isCollapsed ? 'collapsed' : 'mobile-open'}`}>
        
        {/* CABECERA DEL SIDEBAR */}
        <div className="sidebar-header">
          {/* Botón para colapsar en PC / Cerrar en Móvil */}
          <button className="toggle-btn-box" onClick={() => setIsCollapsed(!isCollapsed)}>
            {isCollapsed ? <Menu size={20} color="#2C3E50" /> : <X size={20} color="#2C3E50" />}
          </button>
          
          <div className={`app-title-container ${isCollapsed ? 'hide' : ''}`}>
            <span className="app-title-text">Tienda Simo</span>
          </div>
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

          {/* BOTÓN CERRAR SESIÓN (AL FINAL) */}
          <button 
            onClick={logout} 
            className="nav-item btn-logout-sidebar"
            style={{ 
              background: 'none', 
              border: 'none', 
              width: '100%', 
              cursor: 'pointer',
              marginTop: 'auto' 
            }}
          >
            <span className="nav-icon">
                <LogOut size={22} color="#E74C3C" />
            </span>
            <span className={`nav-text ${isCollapsed ? 'hide' : ''}`} style={{ color: '#E74C3C', fontWeight: 'bold' }}>
                Cerrar Sesión
            </span>
          </button>
        </nav>

        {/* FOOTER DEL SIDEBAR */}
        <div className={`sidebar-status-footer ${isCollapsed ? 'hide' : ''}`}>
          <div className="status-admin">Admin</div>
          <div className="status-connected">Conectado</div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;