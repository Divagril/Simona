import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ShieldCheck, RefreshCw, Package, History, Clock, Info } from 'lucide-react';
import { useNotification } from '../context/NotificationContext';

const Audit: React.FC = () => {
  const { showNotification } = useNotification();
  const [logs, setLogs] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [cargando, setCargando] = useState(false);

  // URL del Backend (Asegúrate de que sea la correcta de tu Render)
  const API_URL = 'https://simona-backend.onrender.com/api';

  const cargarDatosAuditoria = async () => {
    setCargando(true);
    try {
      const resLogs = await axios.get(`${API_URL}/auditoria`);
      const resKardex = await axios.get(`${API_URL}/kardex`);
      setLogs(resLogs.data || []);
      setMovimientos(resKardex.data || []);
    } catch (error) {
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
      <div className="audit-header">
        <h2 className="audit-title"><ShieldCheck size={28} /> Control y Auditoría</h2>
        <button className={`btn-refresh-audit ${cargando ? 'spin' : ''}`} onClick={cargarDatosAuditoria} disabled={cargando}>
          <RefreshCw size={18} /> <span>{cargando ? 'Cargando...' : 'Actualizar Todo'}</span>
        </button>
      </div>

      {/* SECCIÓN KARDEX */}
      <div className="audit-card">
        <h3 className="card-subtitle"><Package size={20} /> Kardex de Inventario</h3>
        <div className="table-responsive-wrapper">
          <table className="modern-audit-table">
            <thead>
              <tr>
                <th>FECHA</th>
                <th>PRODUCTO</th>
                <th>MOTIVO</th>
                <th style={{ textAlign: 'center' }}>CANT.</th>
                <th style={{ textAlign: 'right' }}>STOCK FINAL</th>
              </tr>
            </thead>
            <tbody>
              {movimientos.length === 0 ? (
                <tr><td colSpan={5} className="empty-msg">No hay movimientos. Realiza una venta para generar datos.</td></tr>
              ) : (
                movimientos.map((m: any) => (
                  <tr key={m._id}>
                    <td className="time-col">{new Date(m.fecha).toLocaleString('es-PE', {day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit'})}</td>
                    <td className="bold">{m.nombre_producto}</td>
                    <td><span className="badge-motivo">{m.motivo}</span></td>
                    <td style={{ textAlign: 'center', fontWeight: 'bold', color: m.cantidad < 0 ? '#E74C3C' : '#27AE60' }}>
                        {m.cantidad}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{m.stock_actual}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECCIÓN LOGS */}
      <div className="audit-card">
        <h3 className="card-subtitle"><History size={20} /> Historial de Acciones</h3>
        <div className="table-responsive-wrapper">
          <table className="modern-audit-table">
            <thead>
              <tr>
                <th>HORA</th>
                <th>ACCIÓN</th>
                <th>DETALLE</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr><td colSpan={3} className="empty-msg">No hay acciones registradas.</td></tr>
              ) : (
                logs.map((log: any) => (
                  <tr key={log._id}>
                    <td className="time-col">{new Date(log.fecha).toLocaleTimeString()}</td>
                    <td><span className="badge-action">{log.accion}</span></td>
                    <td className="detail-text">{log.detalle}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        .audit-container { padding: 15px; display: flex; flex-direction: column; gap: 20px; background: #f8fafc; min-height: 100vh; }
        .audit-header { display: flex; justify-content: space-between; align-items: center; }
        .audit-title { display: flex; align-items: center; gap: 10px; font-weight: 800; color: #1e293b; margin: 0; }
        
        .audit-card { background: white; padding: 20px; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px rgba(0,0,0,0.02); }
        .card-subtitle { display: flex; align-items: center; gap: 8px; font-size: 16px; font-weight: 700; color: #334155; margin-bottom: 15px; }

        .table-responsive-wrapper { overflow-x: auto; border-radius: 10px; border: 1px solid #f1f5f9; }
        .modern-audit-table { width: 100%; border-collapse: collapse; min-width: 600px; }
        .modern-audit-table th { background: #f8fafc; padding: 12px; text-align: left; font-size: 11px; color: #64748b; text-transform: uppercase; }
        .modern-audit-table td { padding: 14px 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px; }

        .time-col { color: #94a3b8; font-size: 11px; width: 100px; }
        .badge-motivo { background: #f1f5f9; padding: 3px 8px; border-radius: 6px; font-size: 10px; font-weight: 700; color: #475569; }
        .badge-action { background: #e0f2fe; color: #0369a1; padding: 3px 8px; border-radius: 6px; font-size: 10px; font-weight: 700; }
        .empty-msg { text-align: center; padding: 40px; color: #94a3b8; font-style: italic; }

        .btn-refresh-audit { background: #1abc9c; color: white; border: none; padding: 10px 15px; border-radius: 10px; display: flex; align-items: center; gap: 8px; font-weight: 600; cursor: pointer; }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        @media (max-width: 600px) {
          .audit-title { font-size: 18px; }
          .btn-refresh-audit span { display: none; }
          .btn-refresh-audit { padding: 10px; }
        }
      `}</style>
    </div>
  );
};

export default Audit;