import React, { useState, useEffect } from 'react';
import { 
  Settings, Printer, Cloud, RefreshCw, 
  Save, CheckCircle, Bluetooth, BluetoothSearching 
} from 'lucide-react';
import { useNotification } from '../context/NotificationContext';
import { getProductos } from '../services/api'; 

const Config: React.FC = () => {
  const { showNotification } = useNotification();
  
  // --- ESTADOS ---
  const [dbStatus, setDbStatus] = useState<'conectado' | 'desconectado' | 'cargando'>('cargando');
  const [btDevice, setBtDevice] = useState<string | null>(localStorage.getItem('bt_printer_name'));
  const [impresoraSeleccionada, setImpresoraSeleccionada] = useState(
    localStorage.getItem('printer_name') || 'Impresora Térmica 58mm'
  );

  const impresorasDisponibles = [
    "Impresora Térmica 58mm",
    "Impresora Térmica 80mm",
    "EPSON L3150 Series",
    "Microsoft Print to PDF",
    "Generic / Text Only"
  ];

  // --- VERIFICAR CONEXIÓN A MONGO ---
  const verificarConexion = async () => {
    setDbStatus('cargando');
    try {
      await getProductos(); 
      setDbStatus('conectado');
      showNotification("✅ Conexión con MongoDB exitosa");
    } catch (error) {
      setDbStatus('desconectado');
      showNotification("❌ El servidor no responde", true);
    }
  };

  useEffect(() => {
    verificarConexion();
  }, []);

  // --- LÓGICA DE ESCANEO BLUETOOTH REAL ---
  const escanearBluetooth = async () => {
    try {
      // Intentar solicitar dispositivo bluetooth (Solo funciona en Chrome/Edge y bajo HTTPS o Localhost)
      if (!(navigator as any).bluetooth) {
        showNotification("⚠️ Tu navegador no soporta Bluetooth Web", true);
        return;
      }

      const device = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb'] // UUID común de impresoras térmicas
      });

      if (device) {
        setBtDevice(device.name);
        localStorage.setItem('bt_printer_name', device.name);
        showNotification(`✅ Vinculado a: ${device.name}`);
      }
    } catch (error) {
      console.log("Error Bluetooth:", error);
      showNotification("❌ Escaneo cancelado o fallido", true);
    }
  };

  const guardarPreferencia = () => {
    localStorage.setItem('printer_name', impresoraSeleccionada);
    showNotification("✅ Preferencias de impresión guardadas");
  };

  return (
    <div className="config-layout">
      
      <h2 className="title-icon" style={{ marginBottom: '25px' }}>
        <Settings size={28} /> Configuración del Sistema
      </h2>

      {/* SECCIÓN 1: IMPRESORA */}
      <fieldset className="group-box config-box">
        <legend>
          <Printer size={18} style={{ marginRight: '8px' }} /> Impresora de Tickets
        </legend>
        
        <p className="config-label" style={{ fontSize: '14px', marginBottom: '8px', color: '#2C3E50' }}>
          Seleccione la impresora térmica predeterminada:
        </p>
        
        <select 
          className="config-select"
          value={impresoraSeleccionada}
          onChange={(e) => setImpresoraSeleccionada(e.target.value)}
          style={{ marginBottom: '20px' }}
        >
          {impresorasDisponibles.map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>

        {/* BOTÓN VINCULAR BLUETOOTH */}
        <button 
          className="btn-reconnect-config" 
          onClick={escanearBluetooth}
          style={{ backgroundColor: '#3498DB', marginBottom: '15px' }}
        >
          <BluetoothSearching size={18} /> {btDevice ? `Cambiar: ${btDevice}` : 'Vincular por Bluetooth'}
        </button>

        {/* BOTÓN GUARDAR (EL VERDE DE LA FOTO) */}
        <button className="btn-guardar-config" onClick={guardarPreferencia}>
          <Save size={18} /> Guardar Preferencia
        </button>
      </fieldset>

      {/* SECCIÓN 2: BASE DE DATOS */}
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
              <span>❌ Estado: DESCONECTADO (Verificar Internet)</span>
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

      <div style={{ textAlign: 'center', marginTop: '30px', color: '#BDC3C7', fontSize: '12px' }}>
        Tienda Simona v1.0.2 - Sistema de Control de Inventario y POS
      </div>
    </div>
  );
};

export default Config;