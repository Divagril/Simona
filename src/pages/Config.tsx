import React, { useState, useEffect } from 'react';
import { Settings, Printer, Cloud, RefreshCw, Save, CheckCircle } from 'lucide-react';
import { useNotification } from '../context/NotificationContext';
import axios from 'axios';

const Config: React.FC = () => {
  const { showNotification } = useNotification();
  const [dbStatus, setDbStatus] = useState<'conectado' | 'desconectado' | 'cargando'>('cargando');
  const [impresoraSeleccionada, setImpresoraSeleccionada] = useState(
    localStorage.getItem('printer_name') || 'EPSON L3150 Series'
  );

  const impresorasDisponibles = [
    "EPSON L3150 Series",
    "OneNote (Desktop)",
    "Microsoft Print to PDF",
    "Fax",
    "Impresora Térmica 58mm"
  ];

  const verificarConexion = async () => {
    setDbStatus('cargando');
    try {
      await axios.get('http://localhost:5000/api/productos');
      setDbStatus('conectado');
    } catch (error) {
      setDbStatus('desconectado');
      showNotification("❌ Error de conexión con la base de datos", true);
    }
  };

  useEffect(() => {
    verificarConexion();
  }, []);

  const guardarPreferencia = () => {
    localStorage.setItem('printer_name', impresoraSeleccionada);
    showNotification("✅ Preferencia de impresora guardada");
  };

  return (
    <div className="config-layout">
      <h2 className="config-main-title">
        <Settings size={28} /> Configuración del Sistema
      </h2>

      <fieldset className="group-box config-box">
        <legend>
          <Printer size={18} style={{ marginRight: '8px' }} /> Impresora de Tickets
        </legend>
        <p className="config-label">Seleccione la impresora térmica:</p>
        <select 
          className="input-pos-flat config-select"
          value={impresoraSeleccionada}
          onChange={(e) => setImpresoraSeleccionada(e.target.value)}
        >
          {impresorasDisponibles.map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <button className="btn-guardar-config" onClick={guardarPreferencia}>
          <Save size={18} /> Guardar Preferencia
        </button>
      </fieldset>

      <fieldset className="group-box config-box">
        <legend>
          <Cloud size={18} style={{ marginRight: '8px' }} /> Conexión Base de Datos
        </legend>
        <div className="db-status-container">
          {dbStatus === 'conectado' && (
            <div className="status-msg success">
              <CheckCircle size={20} />
              <span>Estado: CONECTADO a MongoDB Atlas</span>
            </div>
          )}
          {dbStatus === 'desconectado' && (
            <div className="status-msg error">
              <span>❌ Estado: DESCONECTADO (Revisar servidor)</span>
            </div>
          )}
          {dbStatus === 'cargando' && (
            <div className="status-msg loading">
              <RefreshCw size={20} className="spin" />
              <span>Verificando conexión...</span>
            </div>
          )}
        </div>
        <button className="btn-reconnect-config" onClick={verificarConexion}>
          <RefreshCw size={18} /> Probar Conexión / Reconectar
        </button>
      </fieldset>
    </div>
  );
};

export default Config;