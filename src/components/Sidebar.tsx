import React from 'react';
import { NavLink } from 'react-router-dom';
import { Menu, X, LogOut } from 'lucide-react'; // Añadimos LogOut aquí
import { useAuth } from '../context/AuthContext'; // Importamos el hook de autenticación

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (value: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, setIsCollapsed }) => {
  const { logout } = useAuth(); // Obtenemos la función logout
  
  const menuItems = [
    { path: '/inventario', name: 'Inventario', icon: '📦' },
    { path: '/pos', name: 'Punto de Venta', icon: '🛒' },
    { path: '/clientes', name: 'Clientes', icon: '👥' },
    { path: '/reportes', name: 'Reportes', icon: '📊' },
    { path: '/auditoria', name: 'Auditoría', icon: '🛡️' },
    { path: '/config', name: 'Configuración', icon: '⚙️' },
  ];

  const handleLinkClick = () => {
    if (window.innerWidth <= 768) {
      setIsCollapsed(true);
    }
  };

  return (
    <>
      <div className="mobile-top-bar">
        <button className="btn-toggle-mobile" onClick={() => setIsCollapsed(false)}>
          <Menu size={24} color="white" />
        </button>
        <span className="mobile-logo">Tienda Simona</span>
      </div>

      {!isCollapsed && (
        <div className="mobile-overlay-shadow" onClick={() => setIsCollapsed(true)}></div>
      )}

      <div className={`sidebar ${isCollapsed ? 'collapsed' : 'mobile-open'}`}>
        
        <div className="sidebar-header">
          <button className="toggle-btn-box" onClick={() => setIsCollapsed(!isCollapsed)}>
            <Menu size={20} color="#2C3E50" />
          </button>
          
          <div className={`app-title-container ${isCollapsed ? 'hide' : ''}`}>
            <span className="app-title-text">Tienda Simona</span>
          </div>
          
          <button className="btn-close-mobile-internal" onClick={() => setIsCollapsed(true)}>
            <X size={24} color="white" />
          </button>
        </div>

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

          {/* --- BOTÓN DE CERRAR SESIÓN --- */}
          <button 
            onClick={logout} 
            className="nav-item btn-logout-sidebar"
            style={{ 
              background: 'none', 
              border: 'none', 
              width: '100%', 
              cursor: 'pointer',
              marginTop: 'auto' // Esto lo empuja hacia abajo si hay espacio
            }}
          >
            <span className="nav-icon">
                <LogOut size={22} color="#E74C3C" />
            </span>
            <span className={`nav-text ${isCollapsed ? 'hide' : ''}`} style={{ color: '#E74C3C' }}>
                Cerrar Sesión
            </span>
          </button>
        </nav>

        <div className={`sidebar-status-footer ${isCollapsed ? 'hide' : ''}`}>
          <div className="status-admin">Admin</div>
          <div className="status-connected">Conectado</div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;