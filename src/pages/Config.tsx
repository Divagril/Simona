import React, { useState, useEffect } from 'react';
import axios from 'axios'; // Importación necesaria
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
  const verificarConexion = async () => {
    setDbStatus('cargando');
    try {
        // 1. USA LA URL QUE TERMINA EN -pl4b
        await axios.get('https://simona-pl4b.onrender.com/api/productos');
        setDbStatus('conectado');
        showNotification("✅ Conexión con la Nube exitosa");
    } catch (error) {
        setDbStatus('desconectado');
        // CAMBIAMOS EL MENSAJE PARA SABER QUE YA NO ES LOCAL
        showNotification("❌ El servidor en Render no responde. Espera 1 minuto a que despierte.", true);
    }
  };

  useEffect(() => {
    verificarConexion();
  }, []);

  // --- LÓGICA DE ESCANEO BLUETOOTH REAL ---
  const escanearBluetooth = async () => {
    try {
      if (!(navigator as any).bluetooth) {
        showNotification("⚠️ Tu navegador no soporta Bluetooth Web", true);
        return;
      }

      const device = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb'] 
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
      
      <h2 className="title-icon" style={{ marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Settings size={28} /> Configuración del Sistema
      </h2>

      {/* SECCIÓN 1: IMPRESORA */}
      <fieldset className="group-box config-box" style={{ padding: '20px', border: '1px solid #D5DBDB', borderRadius: '12px', background: 'white', marginBottom: '20px' }}>
        <legend style={{ padding: '0 10px', fontWeight: 'bold' }}>
          <Printer size={18} style={{ marginRight: '8px' }} /> Impresora de Tickets
        </legend>
        
        <p className="config-label" style={{ fontSize: '14px', marginBottom: '8px', color: '#2C3E50' }}>
          Seleccione la impresora térmica predeterminada:
        </p>
        
        <select 
          className="config-select"
          value={impresoraSeleccionada}
          onChange={(e) => setImpresoraSeleccionada(e.target.value)}
          style={{ width: '100%', padding: '12px', borderRadius: '8px', marginBottom: '20px' }}
        >
          {impresorasDisponibles.map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>

        <button 
          className="btn-reconnect-config" 
          onClick={escanearBluetooth}
          style={{ width: '100%', backgroundColor: '#3498DB', color: 'white', padding: '12px', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '10px' }}
        >
          <BluetoothSearching size={18} /> {btDevice ? `Cambiar: ${btDevice}` : 'Vincular por Bluetooth'}
        </button>

        <button 
          className="btn-guardar-config" 
          onClick={guardarPreferencia}
          style={{ width: '100%', backgroundColor: '#27AE60', color: 'white', padding: '12px', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
        >
          <Save size={18} /> Guardar Preferencia
        </button>
      </fieldset>

      {/* SECCIÓN 2: BASE DE DATOS */}
      <fieldset className="group-box config-box" style={{ padding: '20px', border: '1px solid #D5DBDB', borderRadius: '12px', background: 'white' }}>
        <legend style={{ padding: '0 10px', fontWeight: 'bold' }}>
          <Cloud size={18} style={{ marginRight: '8px' }} /> Conexión Base de Datos
        </legend>
        
        <div className="db-status-container" style={{ marginBottom: '15px' }}>
          {dbStatus === 'conectado' && (
            <div className="status-msg success" style={{ background: '#D5F5E3', color: '#27AE60', padding: '15px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <CheckCircle size={20} />
              <span>Estado: CONECTADO a Render / MongoDB</span>
            </div>
          )}
          {dbStatus === 'desconectado' && (
            <div className="status-msg error" style={{ background: '#FADBD8', color: '#E74C3C', padding: '15px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span>❌ Estado: DESCONECTADO (Verificar Internet)</span>
            </div>
          )}
          {dbStatus === 'cargando' && (
            <div className="status-msg loading" style={{ background: '#FCF3CF', color: '#F39C12', padding: '15px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite' }} />
              <span>Verificando conexión...</span>
            </div>
          )}
        </div>

        <button 
          className="btn-reconnect-config" 
          onClick={verificarConexion}
          style={{ width: '100%', backgroundColor: '#95A5A6', color: 'white', padding: '12px', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
        >
          <RefreshCw size={18} /> Probar Conexión / Reconectar
        </button>
      </fieldset>

      <div style={{ textAlign: 'center', marginTop: '30px', color: '#BDC3C7', fontSize: '12px' }}>
        Tienda Simona v1.0.2 - Sistema de Control de Inventario y POS
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default Config;