import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Settings, Printer, Cloud, RefreshCw, 
  Save, CheckCircle, Bluetooth, AlertCircle 
} from 'lucide-react';
import { useNotification } from '../context/NotificationContext';
import './Config.css'; // Importación de estilos

const Config: React.FC = () => {
  const { showNotification } = useNotification();
  
  // --- ESTADOS ---
  const [dbStatus, setDbStatus] = useState<'conectado' | 'desconectado' | 'cargando'>('cargando');
  const [btDevice, setBtDevice] = useState<string | null>(localStorage.getItem('bt_printer_name'));
  const [impresoraSeleccionada, setImpresoraSeleccionada] = useState(
    localStorage.getItem('printer_name') || 'Impresora Térmica 58mm'
  );

  const API_URL = 'https://simona-backend.onrender.com/api';

  const impresorasDisponibles = [
    "Impresora Térmica 58mm",
    "Impresora Térmica 80mm",
    "EPSON L3150 Series",
    "Generic / Text Only",
    "Microsoft Print to PDF"
  ];

  const verificarConexion = async () => {
    setDbStatus('cargando');
    try {
        await axios.get(`${API_URL}/productos`);
        setDbStatus('conectado');
        showNotification("✅ Servidor en la nube conectado");
    } catch (error) {
        setDbStatus('desconectado');
        showNotification("❌ Error de conexión al servidor", true);
    }
  };

  useEffect(() => {
    verificarConexion();
  }, []);

  const escanearBluetooth = async () => {
    try {
      if (!(navigator as any).bluetooth) {
        showNotification("⚠️ Navegador no soporta Bluetooth", true);
        return;
      }

      const device = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true
      });

      if (device) {
        setBtDevice(device.name);
        localStorage.setItem('bt_printer_name', device.name);
        showNotification(`✅ Vinculado a: ${device.name}`);
      }
    } catch (error) {
      showNotification("❌ Escaneo cancelado", true);
    }
  };

  const guardarPreferencia = () => {
    localStorage.setItem('printer_name', impresoraSeleccionada);
    showNotification("✅ Configuración de impresión guardada");
  };

  return (
    <div className="config-container">
      
      <h2 className="config-title">
        <Settings size={32} color="#1e293b" /> Configuración de Sistema
      </h2>

      {/* SECCIÓN 1: IMPRESORA */}
      <section className="config-card">
        <h3><Printer size={20} color="#3b82f6" /> Impresora de Tickets</h3>
        
        <div className="config-group">
          <label>Seleccionar Dispositivo de Salida</label>
          <select 
            className="config-select"
            value={impresoraSeleccionada}
            onChange={(e) => setImpresoraSeleccionada(e.target.value)}
          >
            {impresorasDisponibles.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        <div className="config-actions">
          <button className="btn-config btn-blue" onClick={escanearBluetooth}>
            <Bluetooth size={20} /> {btDevice ? `Vinculado: ${btDevice}` : 'Vincular por Bluetooth'}
          </button>

          <button className="btn-config btn-green" onClick={guardarPreferencia}>
            <Save size={20} /> Guardar Preferencias
          </button>
        </div>
      </section>

      {/* SECCIÓN 2: BASE DE DATOS */}
      <section className="config-card">
        <h3><Cloud size={20} color="#9b59b6" /> Conexión con Servidor</h3>
        
        <div className="db-status-container">
          {dbStatus === 'conectado' && (
            <div className="status-box connected">
              <CheckCircle size={22} />
              <span>Estado: Conectado a Render / MongoDB</span>
            </div>
          )}
          {dbStatus === 'desconectado' && (
            <div className="status-box disconnected">
              <AlertCircle size={22} />
              <span>Estado: Sin conexión (Verificar Internet)</span>
            </div>
          )}
          {dbStatus === 'cargando' && (
            <div className="status-box loading">
              <RefreshCw size={22} className="spin" />
              <span>Verificando enlace...</span>
            </div>
          )}
        </div>

        <button className="btn-config btn-gray" onClick={verificarConexion}>
          <RefreshCw size={20} /> Probar Conexión
        </button>
      </section>

      <footer className="config-footer">
        Tienda Simona v1.0.4 - 2024
        <br />
        Desarrollado para Control de Inventario y POS
      </footer>
    </div>
  );
};

export default Config;