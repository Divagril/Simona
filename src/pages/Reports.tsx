import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart3, RefreshCw, FileText, Search, TrendingUp, Calendar, Printer // Añadimos Printer
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell 
} from 'recharts';
import { getVentasReporte, getProductos } from '../services/api';
import { useNotification } from '../context/NotificationContext';
import TicketPreviewModal from '../components/TicketPreviewModal'; // Importamos el modal
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Reports: React.FC = () => {
  const { showNotification } = useNotification();
  
  const [ventas, setVentas] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<string[]>([]);
  const [fechaDesde, setFechaDesde] = useState(new Date().toISOString().split('T')[0]);
  const [fechaHasta, setFechaHasta] = useState(new Date().toISOString().split('T')[0]);
  const [catFiltro, setCatFiltro] = useState('TODAS');

  // --- ESTADOS PARA EL TICKET ---
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [datosTicket, setDatosTicket] = useState<any>(null);

  const cargarDatosIniciales = async () => {
    try {
      const prods = await getProductos();
      const catsUnicas = Array.from(new Set(prods.map((p: any) => p.categoria))).filter(c => c) as string[];
      setCategorias(catsUnicas);
      consultarVentas();
    } catch (error) {
      console.error("Error al inicializar reportes:", error);
    }
  };

  const consultarVentas = async () => {
    try {
      const data = await getVentasReporte(fechaDesde, fechaHasta, catFiltro);
      setVentas(data);
    } catch (error) {
      showNotification("Error al cargar ventas", true);
    }
  };

  useEffect(() => {
    cargarDatosIniciales();
  }, []);

  const totalGeneral = ventas.reduce((acc, v) => acc + v.total, 0);

  // --- FUNCIÓN PARA REIMPRIMIR ---
  const handleReimprimir = (venta: any) => {
    setDatosTicket({
      items: venta.items,
      total: venta.total,
      metodoPago: venta.metodoPago || venta.metodo_pago,
      pagoCon: venta.pagoCon || 0,
      vuelto: venta.vuelto || 0
    });
    setIsTicketModalOpen(true);
  };

  const datosGrafico = useMemo(() => {
    const dias: any = {};
    ventas.forEach(v => {
      const fechaObj = new Date(v.fecha);
      const diaEtiqueta = fechaObj.toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric' });
      if (!dias[diaEtiqueta]) dias[diaEtiqueta] = { name: diaEtiqueta, total: 0 };
      dias[diaEtiqueta].total += v.total;
    });
    return Object.values(dias);
  }, [ventas]);

  const exportarPDF = () => {
    if (ventas.length === 0) return;
    const doc = new jsPDF();
    doc.text("Reporte de Ventas - Tienda Simona", 105, 15, { align: "center" });
    autoTable(doc, {
      startY: 30,
      head: [['Fecha', 'Productos', 'Total', 'Pago']],
      body: ventas.map(v => [new Date(v.fecha).toLocaleString(), v.items.map((it: any) => it.nombre).join(', '), v.total.toFixed(2), v.metodoPago]),
    });
    doc.save(`Reporte_Simona.pdf`);
  };

  return (
    <div className="reports-layout">
      
      <div className="reports-top-header">
        <h2 className="title-icon"><BarChart3 color="#2C3E50" size={28} /> Reportes</h2>
        <button className="btn-teal-refresh" onClick={consultarVentas}><RefreshCw size={16} /> Actualizar</button>
      </div>

      <div className="reports-filters-bar panel-blanco">
        <div className="filter-group">
          <label>DESDE:</label>
          <input type="date" className="input-main" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} />
        </div>
        <div className="filter-group">
          <label>HASTA:</label>
          <input type="date" className="input-main" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} />
        </div>
        <div className="filter-actions">
          <button className="btn-search-blue" onClick={consultarVentas}><Search size={20} /></button>
          <button className="btn-pdf-red" onClick={exportarPDF}><FileText size={18} /> PDF</button>
        </div>
      </div>

      <div className="reports-visual-section">
        <div className="chart-container panel-blanco">
          <h3 className="chart-title"><Calendar size={18} /> Ventas Diarias (S/.)</h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={datosGrafico}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar dataKey="total" fill="#3498DB" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="kpi-total-card">
          <div className="kpi-label">TOTAL PERIODO</div>
          <div className="kpi-value">S/. {totalGeneral.toFixed(2)}</div>
        </div>
      </div>

      <div className="table-responsive-container">
        <fieldset className="group-box-reports">
          <legend className="group-legend">📋 Detalle de Operaciones</legend>
          <table className="modern-table">
            <thead>
              <tr>
                <th>FECHA</th>
                <th>PRODUCTOS</th>
                <th style={{ textAlign: 'center' }}>CANT</th>
                <th style={{ textAlign: 'right' }}>TOTAL</th>
                <th style={{ textAlign: 'center' }}>PAGO</th>
                <th style={{ textAlign: 'center' }}>TICKET</th> {/* Nueva Columna */}
              </tr>
            </thead>
            <tbody>
              {ventas.map((v) => (
                <tr key={v._id} className="row-hover">
                  <td style={{ fontSize: '11px' }}>{new Date(v.fecha).toLocaleString()}</td>
                  <td className="bold">{v.items.map((it: any) => it.nombre).join(', ')}</td>
                  <td align="center">{v.items.reduce((a: any, b: any) => a + (b.cantidadSeleccionada || 1), 0)}</td>
                  <td className="bold" style={{ textAlign: 'right' }}>S/. {v.total.toFixed(2)}</td>
                  <td style={{ textAlign: 'center' }}>
                    <span className="badge-pago">{v.metodoPago || v.metodo_pago || 'EFECTIVO'}</span>
                  </td>
                  {/* BOTÓN PARA REIMPRIMIR */}
                  <td style={{ textAlign: 'center' }}>
                    <button className="btn-reprint-table" onClick={() => handleReimprimir(v)} title="Reimprimir Ticket">
                        <Printer size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </fieldset>
      </div>

      {/* MODAL DE TICKET (Igual al del POS) */}
      {datosTicket && (
        <TicketPreviewModal 
            isOpen={isTicketModalOpen} 
            onClose={() => setIsTicketModalOpen(false)} 
            items={datosTicket.items} 
            total={datosTicket.total}
            metodoPago={datosTicket.metodoPago}
            pagoCon={datosTicket.pagoCon}
            vuelto={datosTicket.vuelto}
        />
      )}
    </div>
  );
};

export default Reports;