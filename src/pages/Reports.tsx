import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart3, RefreshCw, FileText, Search, TrendingUp, Calendar, Printer 
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell 
} from 'recharts';
import { getVentasReporte, getProductos } from '../services/api';
import { useNotification } from '../context/NotificationContext';
import TicketPreviewModal from '../components/TicketPreviewModal'; 
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Reports: React.FC = () => {
  const { showNotification } = useNotification();
  
  // --- ESTADOS DE DATOS ---
  const [ventas, setVentas] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<string[]>([]);
  const [fechaDesde, setFechaDesde] = useState(new Date().toISOString().split('T')[0]);
  const [fechaHasta, setFechaHasta] = useState(new Date().toISOString().split('T')[0]);
  const [catFiltro, setCatFiltro] = useState('TODAS');

  // --- ESTADOS PARA EL TICKET (REIMPRESIÓN) ---
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

  // --- FUNCIÓN PARA REIMPRIMIR TICKET CON FECHA ORIGINAL ---
  const handleReimprimir = (venta: any) => {
    setDatosTicket({
      items: venta.items,
      total: venta.total,
      metodoPago: venta.metodoPago || venta.metodo_pago,
      pagoCon: venta.pagoCon || 0,
      vuelto: venta.vuelto || 0,
      fecha: venta.fecha // <--- IMPORTANTE: Captura la fecha real de la base de datos
    });
    setIsTicketModalOpen(true);
  };

  // --- LÓGICA PARA EL GRÁFICO ---
  const datosGrafico = useMemo(() => {
    const dias: any = {};
    ventas.forEach(v => {
      const fechaObj = new Date(v.fecha);
      const diaEtiqueta = fechaObj.toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric' });
      if (!dias[diaEtiqueta]) {
        dias[diaEtiqueta] = { name: diaEtiqueta, total: 0 };
      }
      dias[diaEtiqueta].total += v.total;
    });
    return Object.values(dias);
  }, [ventas]);

  const exportarPDF = () => {
    if (ventas.length === 0) {
      showNotification("⚠️ No hay datos para exportar", true);
      return;
    }
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Reporte de Ventas - Tienda Simona", 105, 15, { align: "center" });
    
    const tableRows = ventas.map(v => [
      new Date(v.fecha).toLocaleString(),
      v.items.map((it: any) => `${it.nombre} (x${it.cantidadSeleccionada || 1})`).join(', '),
      `S/. ${v.total.toFixed(2)}`,
      v.metodoPago || 'EFECTIVO'
    ]);

    autoTable(doc, {
      startY: 25,
      head: [['Fecha / Hora', 'Productos Vendidos', 'Total', 'Pago']],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [44, 62, 80] }
    });

    doc.save(`Reporte_Simona_${Date.now()}.pdf`);
    showNotification("📄 PDF generado con éxito");
  };

  return (
    <div className="reports-layout">
      
      {/* CABECERA SUPERIOR */}
      <div className="reports-top-header">
        <h2 className="title-icon">
          <BarChart3 color="#2C3E50" size={28} /> Reportes de Ventas
        </h2>
        <button className="btn-teal-refresh" onClick={consultarVentas}>
          <RefreshCw size={16} /> Actualizar
        </button>
      </div>

      {/* BARRA DE FILTROS */}
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
          <button className="btn-search-blue" onClick={consultarVentas} title="Buscar Ventas">
            <Search size={20} />
          </button>
          <button className="btn-pdf-red" onClick={exportarPDF}>
            <FileText size={18} /> PDF
          </button>
        </div>
      </div>

      {/* SECCIÓN VISUAL (GRÁFICO + KPI) */}
      <div className="reports-visual-section">
        
        {/* CONTENEDOR DEL GRÁFICO */}
        <div className="chart-container panel-blanco">
          <h3 className="chart-title"><Calendar size={18} /> Resumen de Ingresos Diarios (S/.)</h3>
          <div style={{ width: '100%', height: '100%', minHeight: '250px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={datosGrafico}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `S/${v}`} />
                <Tooltip 
                  cursor={{fill: '#f4f6f7'}} 
                  contentStyle={{borderRadius:'10px', border:'none', boxShadow:'0 4px 12px rgba(0,0,0,0.1)'}} 
                />
                <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                  {datosGrafico.map((_entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#3498DB' : '#2ecc71'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* TARJETA DE TOTAL ACUMULADO */}
        <div className="kpi-total-card">
          <div className="kpi-label"><TrendingUp size={16} /> TOTAL PERIODO</div>
          <div className="kpi-value">S/. {totalGeneral.toFixed(2)}</div>
          <div className="kpi-subtext">{ventas.length} ventas procesadas</div>
        </div>
      </div>

      {/* TABLA DE OPERACIONES DETALLADAS */}
      <div className="table-responsive-container">
        <fieldset className="group-box-reports" style={{border:'none', margin: 0}}>
          <legend className="group-legend">📋 Detalle de Operaciones</legend>
          <table className="modern-table">
            <thead>
              <tr>
                <th>FECHA / HORA</th>
                <th>DETALLE PRODUCTOS</th>
                <th style={{ textAlign: 'right' }}>TOTAL</th>
                <th style={{ textAlign: 'center' }}>PAGO</th>
                <th style={{ textAlign: 'center' }}>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              {ventas.length === 0 ? (
                <tr><td colSpan={5} style={{textAlign:'center', padding:'30px', color:'#bdc3c7'}}>No se encontraron registros en estas fechas</td></tr>
              ) : (
                ventas.map((v) => (
                  <tr key={v._id} className="row-hover">
                    <td style={{ fontSize: '11px', color: '#7f8c8d' }}>
                        {new Date(v.fecha).toLocaleString('es-PE')}
                    </td>
                    <td className="bold">
                        {v.items.map((it: any) => it.nombre).join(', ')}
                    </td>
                    <td className="bold" style={{ textAlign: 'right', paddingRight: '15px' }}>
                        S/. {v.total.toFixed(2)}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="badge-pago">{v.metodoPago || v.metodo_pago || 'EFECTIVO'}</span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button className="btn-reprint-table" onClick={() => handleReimprimir(v)} title="Reimprimir Boleta">
                        <Printer size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </fieldset>
      </div>

      {/* MODAL PARA REIMPRESIÓN DE TICKET */}
      {datosTicket && (
        <TicketPreviewModal 
            isOpen={isTicketModalOpen} 
            onClose={() => setIsTicketModalOpen(false)} 
            items={datosTicket.items} 
            total={datosTicket.total}
            metodoPago={datosTicket.metodoPago}
            pagoCon={datosTicket.pagoCon}
            vuelto={datosTicket.vuelto}
            fechaManual={datosTicket.fecha} // <--- PASAMOS LA FECHA REAL AL MODAL
        />
      )}
    </div>
  );
};

export default Reports;