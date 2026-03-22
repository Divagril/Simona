import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { Lock, User, Store, ArrowRight } from 'lucide-react';
import './Login.css'; // Importación de estilos

const Login: React.FC = () => {
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);
  
  const { login } = useAuth();
  const { showNotification } = useNotification();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    
    // Simulación de validación (Sincronizado con tu configuración)
    setTimeout(() => {
      if (usuario.toLowerCase() === 'simona' && password === 'simona') {
        login('token-de-acceso-seguro-simona-2024');
        showNotification("¡Bienvenido al sistema, Simona!");
      } else {
        showNotification("Usuario o contraseña incorrectos", true);
        setCargando(false);
      }
    }, 800);
  };

  return (
    <div className="login-full-screen">
      <div className="login-card-container">
        
        {/* LADO SUPERIOR: LOGO Y TÍTULO */}
        <div className="login-brand-header">
          <div className="login-logo-hex">
            <Store size={40} color="white" />
          </div>
          <h1>Tienda Simo</h1>
          <p>Sistema de Control Administrativo</p>
        </div>

        {/* FORMULARIO */}
        <form onSubmit={handleLogin} className="login-form-body">
          <div className="login-input-field">
            <label><User size={16} /> Nombre de Usuario</label>
            <div className="login-input-wrapper">
              <input 
                type="text" 
                value={usuario} 
                onChange={(e) => setUsuario(e.target.value)} 
                placeholder="Ej: simona"
                required
                autoFocus
              />
            </div>
          </div>

          <div className="login-input-field">
            <label><Lock size={16} /> Contraseña de Acceso</label>
            <div className="login-input-wrapper">
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button 
            type="submit" 
            className={`btn-login-main ${cargando ? 'loading' : ''}`}
            disabled={cargando}
          >
            {cargando ? (
              <div className="login-spinner"></div>
            ) : (
              <>
                INGRESAR AL SISTEMA <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div className="login-footer-info">
          <p>Versión 1.0.4 • © 2024</p>
          <p>Protección de datos activada</p>
        </div>
      </div>
      
      {/* DECORACIÓN DE FONDO */}
      <div className="login-bg-blob blob-1"></div>
      <div className="login-bg-blob blob-2"></div>
    </div>
  );
};

export default Login;