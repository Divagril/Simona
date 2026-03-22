import React, { useState, useEffect } from 'react';
import { 
  BarChart3, RefreshCw, Search, Printer, DollarSign, Wallet 
} from 'lucide-react';
import { getVentasReporte } from '../services/api';
import { useNotification } from '../context/NotificationContext';
import TicketPreviewModal from '../components/TicketPreviewModal'; 
import './Reports.css'; 

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
  const [cargando, setCargando] = useState(false);

  // --- ESTADOS PARA EL TICKET ---
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [datosTicket, setDatosTicket] = useState<any>(null);

  const consultarVentas = async () => {
    setCargando(true);
    try {
      const res = await getVentasReporte(fechaDesde, fechaHasta, 'TODAS');
      setReporteData(res || { ventas: [], abonos: [], totalGananciaReal: 0, totalFiadoPeriodo: 0 });
    } catch (error) {
      showNotification("Error de conexión", true);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { consultarVentas(); }, []);

  // --- FUNCIÓN PARA ABRIR EL TICKET ---
  const handleVerTicket = (venta: any) => {
    // Preparamos los datos para el modal
    // Si la venta tiene 'items', los usamos; si no (es un abono), creamos un item genérico
    const itemsParaTicket = venta.items ? venta.items : [
        { nombre: "ABONO DE DEUDA", cantidadSeleccionada: 1, subtotal: venta.monto || venta.total, precio: venta.monto || venta.total }
    ];

    setDatosTicket({
      items: itemsParaTicket,
      total: venta.total || venta.monto,
      metodoPago: venta.metodoPago || "EFECTIVO",
      fechaOriginal: venta.fecha
    });
    
    setIsTicketModalOpen(true);
  };

  return (
    <div className="reports-container">
      {/* HEADER TÍTULO */}
      <div className="reports-top-header">
        <h2 className="title-with-icon"><BarChart3 size={24} /> Reporte de Caja</h2>
        <button onClick={consultarVentas} className={`btn-refresh-simple ${cargando ? 'spin' : ''}`}>
          <RefreshCw size={16} /> Actualizar
        </button>
      </div>

      {/* 1. BARRA DE FILTROS */}
      <div className="filter-card-pro">
        <div className="filter-group">
          <label>DESDE</label>
          <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} />
        </div>
        <div className="filter-group">
          <label>HASTA</label>
          <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} />
        </div>
        <button className="btn-consultar-blue" onClick={consultarVentas}>
          <Search size={20} /> CONSULTAR
        </button>
      </div>

      {/* 2. TARJETAS DE DINERO */}
      <div className="kpi-row-pro">
        <div className="kpi-card-modern green">
          <div className="kpi-icon-box"><DollarSign size={28} /></div>
          <div className="kpi-text-content">
            <span className="kpi-label">DINERO EN CAJA</span>
            <span className="kpi-value">S/. {(reporteData?.totalGananciaReal || 0).toFixed(2)}</span>
          </div>
        </div>
        <div className="kpi-card-modern orange">
          <div className="kpi-icon-box"><Wallet size={28} /></div>
          <div className="kpi-text-content">
            <span className="kpi-label">POR COBRAR</span>
            <span className="kpi-value">S/. {(reporteData?.totalFiadoPeriodo || 0).toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* 3. TABLA DE HISTORIAL */}
      <div className="table-card-dashboard">
        <div className="table-header-row">
            <h3>Historial de Ingresos</h3>
        </div>
        <div className="table-responsive-wrapper">
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
              {/* LISTA DE VENTAS Y FIADOS */}
              {reporteData.ventas.map((v: any) => (
                <tr key={v._id} className={v.metodoPago === 'FIADO' ? 'row-fiado' : ''}>
                  <td className="col-date">{new Date(v.fecha).toLocaleString()}</td>
                  <td>
                    <div className="concept-stack">
                        <strong>{v.metodoPago === 'FIADO' ? '📝 FIADO' : '🛒 VENTA'}</strong>
                        <small>{v.metodoPago}</small>
                    </div>
                  </td>
                  <td className={`col-amount ${v.metodoPago === 'FIADO' ? '' : 'text-green'}`}>
                    S/. {v.total.toFixed(2)}
                  </td>
                  <td style={{textAlign: 'center'}}>
                    {/* BOTÓN CORREGIDO AQUÍ */}
                    <button className="btn-reprint-mini" onClick={() => handleVerTicket(v)}>
                        <Printer size={16} />
                    </button>
                  </td>
                </tr>
              ))}

              {/* LISTA DE ABONOS (PAGOS DE CLIENTES) */}
              {reporteData.abonos.map((a: any) => (
                <tr key={a._id} className="row-abono">
                  <td className="col-date">{new Date(a.fecha).toLocaleString()}</td>
                  <td>
                    <div className="concept-stack">
                        <strong>💰 ABONO</strong>
                        <small>{a.metodoPago || 'EFECTIVO'}</small>
                    </div>
                  </td>
                  <td className="col-amount text-green">
                    S/. {a.monto.toFixed(2)}
                  </td>
                  <td style={{textAlign: 'center'}}>
                    <button className="btn-reprint-mini" onClick={() => handleVerTicket(a)}>
                        <Printer size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. MODAL DEL TICKET */}
      {isTicketModalOpen && datosTicket && (
        <TicketPreviewModal 
            isOpen={isTicketModalOpen} 
            onClose={() => setIsTicketModalOpen(false)} 
            items={datosTicket.items} 
            total={datosTicket.total}
            metodoPago={datosTicket.metodoPago} 
            fechaManual={datosTicket.fechaOriginal} 
        />
      )}
    </div>
  );
};

export default Reports;