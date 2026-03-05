import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  ShieldCheck, RefreshCw, Package, History, 
  ArrowDownCircle, ArrowUpCircle, Info 
} from 'lucide-react';
import { useNotification } from '../context/NotificationContext';

const Audit: React.FC = () => {
  const { showNotification } = useNotification();
  
  // --- ESTADOS ---
  const [logs, setLogs] = useState<any[]>([]);
  const [movimientos, setMovimientos] = useState<any[]>([]);
  const [cargando, setCargando] = useState(false);

  // --- URL DEL BACKEND (Asegúrate que sea la de Render) ---
  const API_URL = 'https://simona-backend.onrender.com/api';

  const cargarDatosAuditoria = async () => {
    setCargando(true);
    try {
      // Pedimos los datos al servidor
      const resLogs = await axios.get(`${API_URL}/auditoria`);
      const resKardex = await axios.get(`${API_URL}/kardex`);

      // Pintamos los datos (aseguramos que sean arrays)
      setLogs(Array.isArray(resLogs.data) ? resLogs.data : []);
      setMovimientos(Array.isArray(resKardex.data) ? resKardex.data : []);

      if (resLogs.data.length > 0 || resKardex.data.length > 0) {
        showNotification("✅ Datos actualizados");
      }
    } catch (error) {
      console.error("Error cargando auditoría:", error);
      showNotification("Error al conectar con el servidor", true);
    } finally {
      setCargando(false);
    }
  };

  // Carga inicial al abrir la página
  useEffect(() => {
    cargarDatosAuditoria();
  }, []);

  return (
    <div className="audit-layout" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '25px', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0, fontWeight: 800 }}>
          <ShieldCheck size={28} color="#1e293b" /> Auditoría de Inventario
        </h2>
        <button 
          className={`btn-refresh-audit ${cargando ? 'spin' : ''}`} 
          onClick={cargarDatosAuditoria}
          style={{ padding: '10px 20px', background: '#1abc9c', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <RefreshCw size={18} /> {cargando ? 'Cargando...' : 'Actualizar'}
        </button>
      </div>

      {/* 1. TABLA KARDEX (MOVIMIENTOS DE STOCK) */}
      <div className="audit-card" style={{ background: 'white', padding: '20px', borderRadius: '15px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
        <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Package size={20} color="#3498db" /> Kardex de Productos
        </h3>
        
        <div style={{ overflowX: 'auto', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
            <thead style={{ background: '#f8fafc', textAlign: 'left' }}>
              <tr>
                <th style={{ padding: '12px', fontSize: '11px', color: '#64748b' }}>FECHA / HORA</th>
                <th style={{ padding: '12px', fontSize: '11px', color: '#64748b' }}>PRODUCTO</th>
                <th style={{ padding: '12px', fontSize: '11px', color: '#64748b' }}>MOTIVO</th>
                <th style={{ padding: '12px', fontSize: '11px', color: '#64748b', textAlign: 'center' }}>CANT.</th>
                <th style={{ padding: '12px', fontSize: '11px', color: '#64748b', textAlign: 'right' }}>STOCK FINAL</th>
              </tr>
            </thead>
            <tbody>
              {movimientos.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>No hay movimientos registrados hoy.</td></tr>
              ) : (
                movimientos.map((m: any) => (
                  <tr key={m._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px', fontSize: '11px', color: '#94a3b8' }}>{new Date(m.fecha).toLocaleString()}</td>
                    <td style={{ padding: '12px', fontWeight: 'bold' }}>{m.nombre_producto?.toUpperCase()}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ fontSize: '10px', padding: '4px 8px', borderRadius: '5px', background: '#f1f5f9', fontWeight: 'bold' }}>{m.motivo}</span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center', fontWeight: '900', color: m.cantidad < 0 ? '#ef4444' : '#22c55e' }}>
                      {m.cantidad > 0 ? `+${m.cantidad}` : m.cantidad}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold' }}>{m.stock_actual}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. TABLA LOGS (ACCIONES) */}
      <div className="audit-card" style={{ background: 'white', padding: '20px', borderRadius: '15px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
        <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <History size={20} color="#9b59b6" /> Historial de Acciones
        </h3>
        <div style={{ overflowX: 'auto', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#f8fafc', textAlign: 'left' }}>
              <tr>
                <th style={{ padding: '12px', width: '150px', fontSize: '11px', color: '#64748b' }}>HORA</th>
                <th style={{ padding: '12px', width: '150px', fontSize: '11px', color: '#64748b' }}>ACCIÓN</th>
                <th style={{ padding: '12px', fontSize: '11px', color: '#64748b' }}>DETALLE DEL EVENTO</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr><td colSpan={3} style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>No hay acciones registradas hoy.</td></tr>
              ) : (
                logs.map((log: any) => (
                  <tr key={log._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px', fontSize: '11px', color: '#94a3b8' }}>{new Date(log.fecha).toLocaleTimeString()}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ fontSize: '10px', padding: '4px 8px', borderRadius: '5px', background: '#e0f2fe', color: '#0369a1', fontWeight: 'bold' }}>{log.accion}</span>
                    </td>
                    <td style={{ padding: '12px', fontSize: '13px' }}>{log.detalle}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`.spin { animation: spin 1s linear infinite; } @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default Audit;