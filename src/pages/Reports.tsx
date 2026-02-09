import React, { useState, useEffect } from 'react';
import { 
  BarChart3, Calendar, Filter, RefreshCw, 
  FileText, Search, TrendingUp, PieChart 
} from 'lucide-react';
import { getVentasReporte, getStatsSemanales, getProductos } from '../services/api';
import { useNotification } from '../context/NotificationContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Reports: React.FC = () => {
  const { showNotification } = useNotification();
  
  // --- ESTADOS ---
  const [ventas, setVentas] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<string[]>([]);
  const [statsSemanales, setStatsSemanales] = useState<any[]>([]);

  // Filtros Superiores
  const [fechaDesde, setFechaDesde] = useState(new Date().toISOString().split('T')[0]);
  const [fechaHasta, setFechaHasta] = useState(new Date().toISOString().split('T')[0]);
  const [catFiltro, setCatFiltro] = useState('TODAS');

  // Filtros Mensuales (Derecha)
  const [mesSeleccionado, setMesSeleccionado] = useState(new Date().getMonth() + 1);
  const [anioSeleccionado, setAnioSeleccionado] = useState(new Date().getFullYear());

  const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const anios = [2024, 2025, 2026, 2027, 2028];

  const cargarDatosIniciales = async () => {
    try {
      const prods = await getProductos();
      const cats = Array.from(new Set(prods.map(p => p.categoria))).filter(c => c);
      setCategorias(cats);
      consultarVentas();
      consultarStatsSemanales();
    } catch (e) { console.error(e); }
  };

  const consultarVentas = async () => {
    try {
      const data = await getVentasReporte(fechaDesde, fechaHasta, catFiltro);
      setVentas(data);
    } catch (e) { showNotification("Error al cargar ventas", true); }
  };

  const consultarStatsSemanales = async () => {
    try {
      const data = await getStatsSemanales(); 
      setStatsSemanales(data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { cargarDatosIniciales(); }, []);

  const totalGeneral = ventas.reduce((acc, v) => acc + v.total, 0);

  // --- GENERADOR DE PDF CORREGIDO ---
  const exportarPDF = () => {
    if (ventas.length === 0) {
      showNotification("⚠️ No hay datos para exportar", true);
      return;
    }

    const doc = new jsPDF();
    const fechaGen = new Date().toLocaleString();

    doc.setFontSize(18);
    doc.text("Reporte de Ventas - Tienda Simona", 105, 15, { align: "center" });
    
    doc.setFontSize(10);
    doc.text(`Generado: ${fechaGen}`, 105, 22, { align: "center" });

    const tableRows = ventas.map(v => [
      new Date(v.fecha).toLocaleString(),
      v.items.map((it: any) => `${it.nombre} (x${it.cantidadSeleccionada || 1})`).join(', '),
      `S/. ${v.total.toFixed(2)}`,
      v.metodoPago || v.metodo_pago || 'EFECTIVO' // CORRECCIÓN AQUÍ
    ]);

    autoTable(doc, {
      startY: 30,
      head: [['Fecha/Hora', 'Producto', 'Costo (S/.)', 'Método Pago']],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [44, 62, 80], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 85 },
        2: { cellWidth: 35, halign: 'right' },
        3: { cellWidth: 30, halign: 'center' }
      }
    });

    const finalY = (doc as any).lastAutoTable.finalY || 30;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`Total General: S/. ${totalGeneral.toFixed(2)}`, 195, finalY + 10, { align: "right" });

    doc.save(`Reporte_Simona_${Date.now()}.pdf`);
    showNotification("📄 PDF generado correctamente");
  };

  return (
    <div className="reports-layout">
      {/* HEADER SUPERIOR */}
      <div className="reports-header-main">
        <h2 className="title-icon"><BarChart3 color="#2C3E50" /> Reportes</h2>
        <button className="btn-teal-refresh" onClick={cargarDatosIniciales}>
          <RefreshCw size={16} /> Refrescar
        </button>
      </div>

      {/* FILTROS SUPERIORES (ff en Python) */}
      <div className="reports-filters-bar panel-blanco">
        <div className="filter-item">
          <span>Desde:</span>
          <input type="date" className="input-pos-flat" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} />
        </div>
        <div className="filter-item">
          <span>Hasta:</span>
          <input type="date" className="input-pos-flat" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} />
        </div>
        <select className="input-pos-flat select-cat" value={catFiltro} onChange={e => setCatFiltro(e.target.value)}>
          <option value="TODAS">TODAS LAS CATEGORÍAS</option>
          {categorias.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <button className="btn-search-blue" onClick={consultarVentas}>
          <Search size={18} />
        </button>
        <div style={{ flex: 1 }}></div>
        <button className="btn-pdf-red" onClick={exportarPDF}>
          <FileText size={18} /> PDF
        </button>
      </div>

      <div className="reports-content-grid">
        {/* LADO IZQUIERDO: TABLA OPERACIONES */}
        <div className="reports-left">
          <fieldset className="group-box-reports">
            <legend className="group-legend">📋 Operaciones</legend>
            <div className="table-wrapper-reports">
              <table className="modern-table">
                <thead>
                  <tr>
                    <th>FECHA</th>
                    <th>PROD</th>
                    <th style={{ textAlign: 'center' }}>CANT</th>
                    <th style={{ textAlign: 'right' }}>TOTAL</th>
                    <th style={{ textAlign: 'center' }}>PAGO</th>
                  </tr>
                </thead>
                <tbody>
                  {ventas.length === 0 ? (
                    <tr><td colSpan={5} style={{textAlign:'center', padding:'20px', color:'#bdc3c7'}}>No hay registros</td></tr>
                  ) : (
                    ventas.map((v) => (
                      <tr key={v._id}>
                        <td style={{ fontSize: '11px', color: '#7f8c8d' }}>{new Date(v.fecha).toLocaleString()}</td>
                        <td className="bold">{v.items.map((it: any) => it.nombre).join(', ')}</td>
                        <td style={{ textAlign: 'center' }}>{v.items.reduce((a: any, b: any) => a + b.cantidadSeleccionada, 0)}</td>
                        <td className="bold" style={{ textAlign: 'right' }}>S/. {v.total.toFixed(2)}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span className="badge-pago">
                            {/* CORRECCIÓN DE NOMBRE DE VARIABLE AQUÍ TAMBIÉN */}
                            {v.metodoPago || v.metodo_pago || 'EFECTIVO'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </fieldset>
        </div>

        {/* LADO DERECHO: KPI Y MENSUAL */}
        <div className="reports-right">
          <div className="kpi-total-card">
            <span className="kpi-label">VENTAS TOTAL</span>
            <span className="kpi-value">S/. {totalGeneral.toFixed(2)}</span>
          </div>

          <fieldset className="group-box-reports">
              <legend className="group-legend"><PieChart size={16} /> Mensual</legend>
            <div className="mensual-filters">
              <select value={mesSeleccionado} onChange={e => setMesSeleccionado(Number(e.target.value))} className="input-pos-flat">
                {meses.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
              <select value={anioSeleccionado} onChange={e => setAnioSeleccionado(Number(e.target.value))} className="input-pos-flat">
                {anios.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div className="btn-container-center">
              <button className="btn-ver-stats" onClick={consultarStatsSemanales}>
                Ver Reporte Mensual
              </button>
            </div>
            <table className="stats-table">
              <thead>
                <tr>
                  <th>SEMANA</th>
                  <th style={{ textAlign: 'right' }}>TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {statsSemanales.map((s, i) => (
                  <tr key={i}>
                    <td>{s.semana}</td>
                    <td className="bold" style={{ textAlign: 'right' }}>S/. {s.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </fieldset>
        </div>
      </div>
    </div>
  );
};

export default Reports;