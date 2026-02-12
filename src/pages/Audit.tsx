import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  ShieldCheck, 
  RefreshCw, 
  Clock, 
  Info, 
  Package, 
  History
} from 'lucide-react';
import { useNotification } from '../context/NotificationContext';

const Audit: React.FC = () => {
  const { showNotification } = useNotification();
  
  const [logs, setLogs] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [cargando, setCargando] = useState(false);

  const cargarDatosAuditoria = async () => {
    setCargando(true);
    try {
      // Usamos la URL de Render
      const resLogs = await axios.get('https://simona-backend.onrender.com/api/auditoria');
      setLogs(resLogs.data);

      const resKardex = await axios.get('https://simona-backend.onrender.com/api/kardex');
      setMovimientos(resKardex.data);
      
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
    <div className="audit-layout" style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 className="title-icon" style={{ fontSize: '24px', color: '#2C3E50' }}>
          <ShieldCheck size={28} color="#2C3E50" /> Auditoría y Control de Inventario
        </h2>
        <button className="btn-teal-refresh" onClick={cargarDatosAuditoria} disabled={cargando}>
          <RefreshCw size={16} className={cargando ? 'spin' : ''} /> 
          {cargando ? 'Cargando...' : 'Refrescar Todo'}
        </button>
      </div>

      {/* SECCIÓN 1: KARDEX (MOVIMIENTOS) */}
      <fieldset className="group-box-pos">
        <legend className="group-legend">
          <Package size={18} /> Kardex (Movimientos de Inventario)
        </legend>
        
        <div className="table-wrapper">
          <table className="modern-table">
            <thead>
              <tr>
                <th>FECHA</th>
                <th>PRODUCTO</th>
                {/* --- SE ELIMINÓ LA COLUMNA TIPO AQUÍ --- */}
                <th>MOTIVO</th>
                <th style={{ textAlign: 'center' }}>STOCK</th> 
                <th style={{ textAlign: 'right' }}>S. ANTERIOR</th>
                <th style={{ textAlign: 'right' }}>S. ACTUAL</th>
              </tr>
            </thead>
            <tbody>
              {movimientos.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#BDC3C7' }}>
                    No hay movimientos registrados.
                  </td>
                </tr>
              ) : (
                movimientos.map((m: any) => (
                  <tr key={m._id} className="row-hover">
                    <td style={{ fontSize: '11px', color: '#7F8C8D' }}>{new Date(m.fecha).toLocaleString()}</td>
                    <td className="bold">{m.nombre_producto}</td>
                    
                    {/* --- SE ELIMINÓ LA CELDA DE ICONOS AQUÍ --- */}
                    
                    <td><span className="badge-motivo">{m.motivo}</span></td>
                    <td className="bold" style={{ textAlign: 'center' }}>{m.cantidad}</td>
                    <td style={{ textAlign: 'right', color: '#7F8C8D' }}>{m.stock_anterior}</td>
                    <td className="bold" style={{ textAlign: 'right', color: '#2C3E50' }}>{m.stock_actual}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </fieldset>

      {/* SECCIÓN 2: HISTORIAL DE ACCIONES (LOGS) */}
      <fieldset className="group-box-pos">
        <legend className="group-legend">
          <History size={20} style={{ marginRight: '8px' }} /> Historial de Acciones
        </legend>
        <div className="table-wrapper">
          <table className="modern-table">
            <thead>
              <tr>
                <th>HORA</th>
                <th>ACCIÓN</th>
                <th>DETALLE</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ textAlign: 'center', padding: '20px', color: '#BDC3C7' }}>
                    No hay acciones registradas.
                  </td>
                </tr>
              ) : (
                logs.map((log: any) => (
                  <tr key={log._id} className="row-hover">
                    <td style={{ fontSize: '12px', color: '#7F8C8D' }}>
                      {new Date(log.fecha).toLocaleString()}
                    </td>
                    <td><span className="badge-audit-action">{log.accion}</span></td>
                    <td style={{ fontSize: '14px' }}>{log.detalle}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </fieldset>
    </div>
  );
};

export default Audit;