import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart3, RefreshCw, FileText, Search, TrendingUp, Calendar, Printer, DollarSign, Wallet 
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell 
} from 'recharts';
import { getVentasReporte } from '../services/api';
import { useNotification } from '../context/NotificationContext';
import TicketPreviewModal from '../components/TicketPreviewModal'; 
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Reports: React.FC = () => {
  const { showNotification } = useNotification();
  
  const hoy = new Date();
  const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split('T')[0];
  const hoyString = hoy.toISOString().split('T')[0];

  const [reporteData, setReporteData] = useState<any>({
    ventas: [], abonos: [], totalGananciaReal: 0, totalFiadoPeriodo: 0
  });
  const [fechaDesde, setFechaDesde] = useState(primerDiaMes);
  const [fechaHasta, setFechaHasta] = useState(hoyString);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [datosTicket, setDatosTicket] = useState<any>(null);
  const [cargando, setCargando] = useState(false);

  const consultarVentas = async () => {
    setCargando(true);
    try {
      const res = await getVentasReporte(fechaDesde, fechaHasta, 'TODAS');
      setReporteData(res || { ventas: [], abonos: [], totalGananciaReal: 0, totalFiadoPeriodo: 0 });
    } catch (error) {
      showNotification("Error al conectar con el servidor", true);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { consultarVentas(); }, []);

  const datosGrafico = useMemo(() => {
    const dias: any = {};
    (reporteData?.ventas || []).forEach((v: any) => {
      if(v.metodoPago === 'FIADO') return;
      const d = new Date(v.fecha).toLocaleDateString('es-PE', { day: 'numeric', month: 'short' });
      dias[d] = { name: d, total: (dias[d]?.total || 0) + v.total };
    });
    (reporteData?.abonos || []).forEach((a: any) => {
      const d = new Date(a.fecha).toLocaleDateString('es-PE', { day: 'numeric', month: 'short' });
      dias[d] = { name: d, total: (dias[d]?.total || 0) + a.monto };
    });
    return Object.values(dias);
  }, [reporteData]);

  const handleReimprimir = (item: any, esAbono: boolean) => {
    setDatosTicket({
      items: esAbono ? [{ nombre: "ABONO DE DEUDA", cantidadSeleccionada: 1, subtotal: item.monto }] : item.items,
      total: esAbono ? item.monto : item.total,
      metodoPago: esAbono ? "EFECTIVO" : item.metodoPago,
      fecha: item.fecha 
    });
    setIsTicketModalOpen(true);
  };

  return (
    <div className="reports-container">
      <div className="reports-header">
        <h2 className="title-main"><BarChart3 size={28} /> Reporte de Caja</h2>
        <button onClick={consultarVentas} className={`btn-refresh-pro ${cargando ? 'spin' : ''}`}>
          <RefreshCw size={18} /> <span>Actualizar</span>
        </button>
      </div>

      {/* FILTROS RESPONSIVE */}
      <div className="filters-card">
        <div className="filter-inputs">
          <div className="input-box">
            <label>DESDE</label>
            <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} />
          </div>
          <div className="input-box">
            <label>HASTA</label>
            <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} />
          </div>
        </div>
        <button onClick={consultarVentas} className="btn-search-pro">
          <Search size={20} /> CONSULTAR
        </button>
      </div>

      {/* TARJETAS DE DINERO (KPIs) */}
      <div className="kpi-grid">
        <div className="kpi-card green">
          <div className="kpi-icon"><DollarSign size={24} /></div>
          <div className="kpi-info">
            <span className="label">DINERO EN CAJA</span>
            <span className="amount">S/. {(reporteData?.totalGananciaReal || 0).toFixed(2)}</span>
          </div>
        </div>
        <div className="kpi-card orange">
          <div className="kpi-icon"><Wallet size={24} /></div>
          <div className="kpi-info">
            <span className="label">POR COBRAR</span>
            <span className="amount">S/. {(reporteData?.totalFiadoPeriodo || 0).toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* GRÁFICO RESPONSIVE */}
      <div className="chart-card">
        <h3 className="chart-title"><TrendingUp size={18} /> Flujo de Caja por Día</h3>
        <div className="chart-wrapper">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={datosGrafico}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip cursor={{fill: '#f8fafc'}} />
              <Bar dataKey="total" fill="#2563eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* TABLA CON SCROLL LATERAL EN MÓVIL */}
      <div className="table-card">
        <h3 className="table-title">Historial de Ingresos</h3>
        <div className="table-overflow">
          <table className="pro-table">
            <thead>
              <tr>
                <th>FECHA</th>
                <th>CONCEPTO</th>
                <th style={{textAlign: 'right'}}>INGRESO</th>
                <th style={{textAlign: 'center'}}>TICKET</th>
              </tr>
            </thead>
            <tbody>
              {(reporteData?.ventas || []).map((v: any) => (
                <tr key={v._id} className={v.metodoPago === 'FIADO' ? 'row-fiado' : ''}>
                  <td className="date-cell">{new Date(v.fecha).toLocaleString('es-PE', {day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit'})}</td>
                  <td>
                    <div className="concept-cell">
                      <strong>{v.metodoPago === 'FIADO' ? '📝 FIADO' : '🛒 VENTA'}</strong>
                      <span>{v.metodoPago}</span>
                    </div>
                  </td>
                  <td className={`amount-cell ${v.metodoPago === 'FIADO' ? '' : 'text-green'}`}>
                    S/. {v.total.toFixed(2)}
                  </td>
                  <td style={{textAlign: 'center'}}>
                    <button onClick={() => handleReimprimir(v, false)} className="btn-reprint"><Printer size={16} /></button>
                  </td>
                </tr>
              ))}
              {(reporteData?.abonos || []).map((a: any) => (
                <tr key={a._id} className="row-abono">
                  <td className="date-cell">{new Date(a.fecha).toLocaleString('es-PE', {day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit'})}</td>
                  <td>
                    <div className="concept-cell">
                      <strong style={{color: '#059669'}}>💰 ABONO</strong>
                      <span>Efectivo</span>
                    </div>
                  </td>
                  <td className="amount-cell text-green">S/. {a.monto.toFixed(2)}</td>
                  <td style={{textAlign: 'center'}}>
                    <button onClick={() => handleReimprimir(a, true)} className="btn-reprint"><Printer size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {datosTicket && (
        <TicketPreviewModal 
            isOpen={isTicketModalOpen} onClose={() => setIsTicketModalOpen(false)} 
            items={datosTicket.items} total={datosTicket.total}
            metodoPago={datosTicket.metodoPago} fechaManual={datosTicket.fecha} 
        />
      )}

      <style>{`
        .reports-container { display: flex; flex-direction: column; gap: 20px; padding: 15px; background: #f8fafc; min-height: 100vh; }
        .reports-header { display: flex; justify-content: space-between; align-items: center; }
        .title-main { display: flex; align-items: center; gap: 10px; font-weight: 800; color: #1e293b; margin: 0; }
        
        .card-glass, .filters-card, .kpi-card, .chart-card, .table-card { 
          background: white; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px rgba(0,0,0,0.02);
        }

        .filters-card { padding: 20px; display: flex; flex-direction: column; gap: 15px; }
        .filter-inputs { display: flex; gap: 15px; }
        .input-box { flex: 1; display: flex; flex-direction: column; gap: 5px; }
        .input-box label { font-size: 10px; font-weight: 800; color: #64748b; }
        .input-box input { padding: 12px; border-radius: 10px; border: 1px solid #cbd5e1; outline: none; width: 100%; }
        .btn-search-pro { background: #2563eb; color: white; padding: 14px; border: none; border-radius: 10px; font-weight: 800; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; }

        .kpi-grid { display: grid; grid-template-columns: 1fr; gap: 15px; }
        .kpi-card { padding: 20px; display: flex; align-items: center; gap: 15px; }
        .kpi-card.green { border-left: 6px solid #22c55e; }
        .kpi-card.orange { border-left: 6px solid #f59e0b; }
        .kpi-icon { width: 50px; height: 50px; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
        .green .kpi-icon { background: #dcfce7; color: #166534; }
        .orange .kpi-icon { background: #fffbeb; color: #b45309; }
        .kpi-info { display: flex; flex-direction: column; }
        .kpi-info .label { font-size: 11px; font-weight: 800; color: #64748b; }
        .kpi-info .amount { font-size: 28px; font-weight: 900; }

        .chart-card { padding: 20px; }
        .chart-wrapper { height: 250px; width: 100%; margin-top: 15px; }
        
        .table-card { padding: 20px; }
        .table-overflow { overflow-x: auto; margin-top: 15px; border-radius: 12px; border: 1px solid #f1f5f9; }
        .pro-table { width: 100%; border-collapse: collapse; min-width: 500px; }
        .pro-table th { background: #f8fafc; padding: 12px; text-align: left; font-size: 11px; color: #64748b; }
        .pro-table td { padding: 15px 12px; border-bottom: 1px solid #f1f5f9; }
        
        .date-cell { font-size: 10px; color: #64748b; width: 100px; }
        .concept-cell { display: flex; flex-direction: column; gap: 2px; }
        .concept-cell span { font-size: 9px; color: #94a3b8; font-weight: bold; text-transform: uppercase; }
        .amount-cell { font-weight: 800; text-align: right; font-size: 15px; }
        .text-green { color: #059669; }
        .row-fiado { background-color: #fafafa; }
        .row-abono { background-color: #f0fdf4; }

        .btn-reprint { background: #f1f5f9; border: none; padding: 8px; border-radius: 8px; cursor: pointer; color: #475569; }
        .btn-refresh-pro { background: white; border: 1px solid #e2e8f0; padding: 8px 15px; border-radius: 10px; display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; cursor: pointer; }

        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        /* --- MEDIA QUERIES PARA PANTALLAS GRANDES --- */
        @media (min-width: 768px) {
          .kpi-grid { grid-template-columns: 1fr 1fr; }
          .filters-card { flex-direction: row; align-items: flex-end; }
          .btn-search-pro { width: auto; height: 42px; }
          .chart-wrapper { height: 350px; }
          .reports-container { padding: 30px; }
        }
      `}</style>
    </div>
  );
};

export default Reports;