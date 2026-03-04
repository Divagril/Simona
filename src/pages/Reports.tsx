import React, { useState, useEffect, useMemo } from 'react';
import { BarChart3, RefreshCw, FileText, Search, TrendingUp, Calendar, Printer, DollarSign, Wallet } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
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

  const consultarVentas = async () => {
    try {
      // getVentasReporte ya debe estar configurada en api.ts con la URL de Render
      const res = await getVentasReporte(fechaDesde, fechaHasta, 'TODAS');
      
      if (res) {
        setReporteData({
            ventas: res.ventas || [],
            abonos: res.abonos || [],
            totalGananciaReal: res.totalGananciaReal || 0,
            totalFiadoPeriodo: res.totalFiadoPeriodo || 0
        });
      }
    } catch (error) {
      console.error(error);
      showNotification("Error al conectar con el servidor", true);
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
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><BarChart3 color="#1e293b"/> Reporte de Caja</h2>
        <button onClick={consultarVentas} style={{ padding: '10px 20px', borderRadius: '10px', cursor: 'pointer' }}><RefreshCw size={16} /> Actualizar</button>
      </div>

      <div style={{ display: 'flex', gap: '20px', background: 'white', padding: '20px', borderRadius: '15px', border: '1px solid #e2e8f0' }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: '12px', fontWeight: 'bold' }}>DESDE</label>
          <input type="date" style={{ width: '100%', padding: '10px' }} value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: '12px', fontWeight: 'bold' }}>HASTA</label>
          <input type="date" style={{ width: '100%', padding: '10px' }} value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} />
        </div>
        <button onClick={consultarVentas} style={{ alignSelf: 'flex-end', padding: '12px 25px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer' }}>CONSULTAR</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div style={{ background: 'white', padding: '30px', borderRadius: '15px', borderTop: '6px solid #22c55e', textAlign: 'center' }}>
          <div style={{ color: '#64748b', fontSize: '12px', fontWeight: 'bold' }}>DINERO TOTAL EN CAJA</div>
          <div style={{ fontSize: '40px', fontWeight: '900', color: '#16a34a' }}>S/. {(reporteData?.totalGananciaReal || 0).toFixed(2)}</div>
        </div>
        <div style={{ background: 'white', padding: '30px', borderRadius: '15px', borderTop: '6px solid #f59e0b', textAlign: 'center' }}>
          <div style={{ color: '#64748b', fontSize: '12px', fontWeight: 'bold' }}>PLATA POR COBRAR (FIADOS)</div>
          <div style={{ fontSize: '40px', fontWeight: '900', color: '#d97706' }}>S/. {(reporteData?.totalFiadoPeriodo || 0).toFixed(2)}</div>
        </div>
      </div>

      <div style={{ background: 'white', padding: '20px', borderRadius: '15px', height: '300px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={datosGrafico}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" fontSize={12} />
            <YAxis fontSize={12} />
            <Tooltip />
            <Bar dataKey="total" fill="#2563eb" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ background: 'white', borderRadius: '15px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: '#f8fafc' }}>
            <tr>
              <th style={{ padding: '15px', textAlign: 'left' }}>FECHA</th>
              <th style={{ padding: '15px', textAlign: 'left' }}>CONCEPTO</th>
              <th style={{ padding: '15px', textAlign: 'right' }}>INGRESO</th>
              <th style={{ padding: '15px', textAlign: 'center' }}>TICKET</th>
            </tr>
          </thead>
          <tbody>
            {(reporteData?.ventas || []).map((v: any) => (
              <tr key={v._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '15px', fontSize: '12px' }}>{new Date(v.fecha).toLocaleString()}</td>
                <td style={{ padding: '15px' }}>
                  <div style={{ fontWeight: 'bold' }}>{v.metodoPago === 'FIADO' ? '📝 VENTA AL FIADO' : '🛒 VENTA DIRECTA'}</div>
                  <small style={{ color: '#64748b' }}>{v.metodoPago}</small>
                </td>
                <td style={{ padding: '15px', textAlign: 'right', fontWeight: 'bold', color: v.metodoPago === 'FIADO' ? '#94a3b8' : '#16a34a' }}>S/. {v.total.toFixed(2)}</td>
                <td style={{ padding: '15px', textAlign: 'center' }}>
                  <button onClick={() => handleReimprimir(v, false)} style={{ background: '#f1f5f9', border: 'none', padding: '5px 10px', borderRadius: '5px', cursor: 'pointer' }}><Printer size={14} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {datosTicket && (
        <TicketPreviewModal 
            isOpen={isTicketModalOpen} onClose={() => setIsTicketModalOpen(false)} 
            items={datosTicket.items} total={datosTicket.total}
            metodoPago={datosTicket.metodoPago} fechaManual={datosTicket.fecha} 
        />
      )}
    </div>
  );
};

export default Reports;