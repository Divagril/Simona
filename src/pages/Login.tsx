// src/pages/Login.tsx
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { Lock, User, Store } from 'lucide-react';

const Login: React.FC = () => {
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();
  const { showNotification } = useNotification();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Simulación de validación (Luego puedes conectarlo a tu backend)
    if (usuario === 'simona' && password === 'simona') {
      login('token-de-acceso-seguro');
      showNotification("¡Bienvenido de nuevo!");
    } else {
      showNotification("Usuario o contraseña incorrectos", true);
    }
  };

  return (
    <div className="login-overlay">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo-circle">
            <Store size={40} color="#3498DB" />
          </div>
          <h2>Tienda Simona</h2>
          <p>Acceso al Sistema Administrativo</p>
        </div>

        <form onSubmit={handleLogin} className="login-form">
          <div className="login-input-group">
            <label><User size={16} /> Usuario</label>
            <input 
              type="text" 
              value={usuario} 
              onChange={(e) => setUsuario(e.target.value)} 
              placeholder="Ingrese su usuario"
              required
            />
          </div>

          <div className="login-input-group">
            <label><Lock size={16} /> Contraseña</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="••••••••"
              required
            />
          </div>

          <button type="submit" className="btn-login-submit">
            INGRESAR AL SISTEMA
          </button>
        </form>
        
        <div className="login-footer">
          v1.0.2 © 2024 - Sistema de Control
        </div>
      </div>
    </div>
  );
};

export default Login;