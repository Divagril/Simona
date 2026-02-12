import React, { useState, useEffect } from 'react';
import { 
  BarChart3, RefreshCw, FileText, Search, TrendingUp 
} from 'lucide-react';
import { getVentasReporte, getProductos } from '../services/api';
import { useNotification } from '../context/NotificationContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Reports: React.FC = () => {
  const { showNotification } = useNotification();
  
  // --- ESTADOS ---
  const [ventas, setVentas] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<string[]>([]);
  
  // Filtros
  const [fechaDesde, setFechaDesde] = useState(new Date().toISOString().split('T')[0]);
  const [fechaHasta, setFechaHasta] = useState(new Date().toISOString().split('T')[0]);
  const [catFiltro, setCatFiltro] = useState('TODAS');

  // --- CARGA DE DATOS ---
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

  // Calculamos el total directamente de la lista de ventas
  const totalGeneral = ventas.reduce((acc, v) => acc + v.total, 0);

  // --- GENERADOR DE PDF ---
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
      v.metodoPago || v.metodo_pago || 'EFECTIVO'
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
      <div className="reports-top-header" style={{ 
        display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', 
        alignItems: 'center', marginBottom: '15px', gap: '10px' 
      }}>
        <h2 className="title-icon" style={{ margin: 0 }}>
          <BarChart3 color="#2C3E50" /> Reportes
        </h2>
        <button className="btn-teal-refresh" onClick={cargarDatosIniciales}>
          <RefreshCw size={16} /> Refrescar
        </button>
      </div>

      {/* FILTROS SUPERIORES */}
      <div className="reports-filters-bar panel-blanco">
        <div className="filter-group">
          <label>DESDE:</label>
          <input type="date" className="input-main" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} />
        </div>
        <div className="filter-group">
          <label>HASTA:</label>
          <input type="date" className="input-main" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} />
        </div>
        <div className="filter-group">
          <label>CATEGORÍA:</label>
          <select className="input-main" value={catFiltro} onChange={e => setCatFiltro(e.target.value)}>
            <option value="TODAS">TODAS LAS CATEGORÍAS</option>
            {categorias.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="filter-actions">
          <button className="btn-search-blue" onClick={consultarVentas} title="Buscar">
            <Search size={20} />
          </button>
          <button className="btn-pdf-red" onClick={exportarPDF}>
            <FileText size={18} /> PDF
          </button>
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL */}
      <div className="reports-grid">
        
        {/* LADO IZQUIERDO: TABLA DE OPERACIONES */}
        <div className="table-responsive-container">
          <fieldset className="group-box-reports" style={{ border: 'none', margin: 0 }}>
            <legend className="group-legend">📋 Operaciones</legend>
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
                  <tr><td colSpan={5} style={{textAlign:'center', padding:'20px', color:'#bdc3c7'}}>No hay registros en este rango</td></tr>
                ) : (
                  ventas.map((v) => (
                    <tr key={v._id} className="row-hover">
                      <td style={{ fontSize: '11px', color: '#7f8c8d' }}>{new Date(v.fecha).toLocaleString()}</td>
                      <td className="bold">{v.items.map((it: any) => it.nombre).join(', ')}</td>
                      <td align="center">{v.items.reduce((a: any, b: any) => a + (b.cantidadSeleccionada || 1), 0)}</td>
                      <td className="bold" style={{ textAlign: 'right' }}>S/. {v.total.toFixed(2)}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="badge-pago">
                          {v.metodoPago || v.metodo_pago || 'EFECTIVO'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </fieldset>
        </div>

        {/* LADO DERECHO: SOLO KPI (TOTAL) */}
        <div className="reports-sidebar">
          <div className="kpi-total-card">
            <div className="kpi-label"><TrendingUp size={16} style={{marginRight:'5px'}}/> VENTAS TOTAL</div>
            <div className="kpi-value">S/. {totalGeneral.toFixed(2)}</div>
          </div>
          {/* AQUÍ ELIMINAMOS LA SECCIÓN DE REPORTE MENSUAL QUE NO QUERÍAS */}
        </div>

      </div>
    </div>
  );
};

export default Reports;