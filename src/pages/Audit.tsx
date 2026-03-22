import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  ShieldCheck, RefreshCw, Package, History 
} from 'lucide-react';
import { useNotification } from '../context/NotificationContext';
import './Audit.css'; // Importación de estilos

const Audit: React.FC = () => {
  const { showNotification } = useNotification();
  
  const [logs, setLogs] = useState<any[]>([]);
  const [movimientos, setMovimientos] = useState<any[]>([]);
  const [cargando, setCargando] = useState(false);

  // URL del Backend
  const API_URL = 'https://simona-backend.onrender.com/api';

  const cargarDatosAuditoria = async () => {
    setCargando(true);
    try {
      const [resLogs, resKardex] = await Promise.all([
        axios.get(`${API_URL}/auditoria`),
        axios.get(`${API_URL}/kardex`)
      ]);

      setLogs(Array.isArray(resLogs.data) ? resLogs.data : []);
      setMovimientos(Array.isArray(resKardex.data) ? resKardex.data : []);

      showNotification("✅ Datos sincronizados");
    } catch (error) {
      console.error("Error auditoría:", error);
      showNotification("Error al conectar con el servidor", true);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatosAuditoria();
  }, []);

  return (
    <div className="audit-container">
      
      {/* CABECERA */}
      <header className="audit-header">
        <h2><ShieldCheck size={32} color="#3b82f6" /> Auditoría de Sistema</h2>
        <button 
          className={`btn-refresh-audit ${cargando ? 'spin' : ''}`} 
          onClick={cargarDatosAuditoria}
        >
          <RefreshCw size={18} /> {cargando ? 'Cargando...' : 'Actualizar Listas'}
        </button>
      </header>

      {/* 1. KARDEX (MOVIMIENTOS DE PRODUCTOS) */}
      <div className="audit-card">
        <h3><Package size={20} color="#3498db" /> Kardex de Inventario</h3>
        
        <div className="audit-table-wrapper">
          <table className="audit-table">
            <thead>
              <tr>
                <th>FECHA / HORA</th>
                <th>PRODUCTO</th>
                <th>MOTIVO</th>
                <th style={{ textAlign: 'center' }}>CANT.</th>
                <th style={{ textAlign: 'right' }}>STOCK FINAL</th>
              </tr>
            </thead>
            <tbody>
              {movimientos.length === 0 ? (
                <tr><td colSpan={5} className="empty-row">No hay movimientos registrados.</td></tr>
              ) : (
                movimientos.map((m: any) => (
                  <tr key={m._id}>
                    <td className="text-date">{new Date(m.fecha).toLocaleString()}</td>
                    <td><strong>{m.nombre_producto?.toUpperCase()}</strong></td>
                    <td><span className="badge-motivo">{m.motivo}</span></td>
                    <td style={{ textAlign: 'center' }} className={m.cantidad < 0 ? 'text-minus' : 'text-plus'}>
                      {m.cantidad > 0 ? `+${m.cantidad}` : m.cantidad}
                    </td>
                    <td style={{ textAlign: 'right' }} className="text-stock">{m.stock_actual}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. LOGS (ACCIONES DEL USUARIO) */}
      <div className="audit-card">
        <h3><History size={20} color="#9b59b6" /> Historial de Actividad</h3>
        
        <div className="audit-table-wrapper">
          <table className="audit-table">
            <thead>
              <tr>
                <th style={{ width: '180px' }}>HORA</th>
                <th style={{ width: '150px' }}>ACCIÓN</th>
                <th>DETALLE DEL EVENTO</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr><td colSpan={3} className="empty-row">No hay acciones registradas hoy.</td></tr>
              ) : (
                logs.map((log: any) => (
                  <tr key={log._id}>
                    <td className="text-date">{new Date(log.fecha).toLocaleTimeString()}</td>
                    <td><span className="badge-accion">{log.accion}</span></td>
                    <td>{log.detalle}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default Audit;