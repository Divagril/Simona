import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Box, Save, RefreshCw, Search, 
  Package, Layers, DollarSign, ArrowRightLeft, Info 
} from 'lucide-react';
import { useNotification } from '../context/NotificationContext';

const Inventory: React.FC = () => {
  const { showNotification } = useNotification();
  const [productos, setProductos] = useState<any[]>([]);
  const [sugerencias, setSugerencias] = useState<any[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(false);
  const [unidadesEnInversion, setUnidadesEnInversion] = useState<number>(0);

  const formatosCompra = ['UNIDAD', 'BOTELLA', 'LATA', 'KG', 'LITRO', 'METRO', 'PAQUETE', 'CAJA', 'GALÓN DE GAS'];

  const [form, setForm] = useState({
    nombre: '',
    formato_compra: 'PAQUETE',
    unidad_venta: 'PAQUETE',
    precio: '',
    conversion: '1'
  });

  const API_URL = 'https://simona-backend.onrender.com/api';

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const resP = await axios.get(`${API_URL}/productos`);
      const resS = await axios.get(`${API_URL}/nombres-inversiones`);
      setProductos(Array.isArray(resP.data) ? resP.data : []);
      setSugerencias(Array.isArray(resS.data) ? resS.data : []);
    } catch (e) {
      showNotification("Error al cargar datos del servidor", true);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargarDatos(); }, []);

  const handleCambioProducto = (nombreElegido: string) => {
    const encontrado = sugerencias.find(s => s.nombre === nombreElegido);
    setForm(prev => ({ ...prev, nombre: nombreElegido }));
    setUnidadesEnInversion(encontrado ? encontrado.total : 0);
  };

  const handleGuardar = async () => {
    if (!form.nombre) return showNotification("Seleccione un producto", true);
    try {
      await axios.post(`${API_URL}/productos`, {
        nombre: form.nombre,
        precio: Number(form.precio),
        unidad_venta: form.unidad_venta,
        unidades_por_paquete: Number(form.conversion) || 1
      });
      showNotification("✅ Guardado correctamente");
      cargarDatos();
      setForm({ nombre: '', formato_compra: 'PAQUETE', unidad_venta: 'PAQUETE', precio: '', conversion: '1' });
      setUnidadesEnInversion(0);
    } catch (e) { showNotification("Error al guardar", true); }
  };

  const prodsFiltrados = productos.filter(p => (p.nombre || '').toLowerCase().includes(busqueda.toLowerCase()));

  return (
    <div style={{ display: 'flex', gap: '20px', padding: '20px', height: '90vh', backgroundColor: '#f8fafc', fontFamily: 'sans-serif' }}>
      
      {/* PANEL IZQUIERDO */}
      <div style={{ flex: '0 0 380px', background: 'white', padding: '25px', borderRadius: '15px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '15px', overflowY: 'auto' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}><Box color="#2563eb" /> Gestión de Venta</h3>
        
        <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b' }}>PRODUCTO DE INVERSIÓN</label>
        <select style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} value={form.nombre} onChange={e => handleCambioProducto(e.target.value)}>
          <option value="">-- SELECCIONE --</option>
          {sugerencias.map((s, i) => <option key={i} value={s.nombre}>{s.nombre?.toUpperCase()}</option>)}
        </select>

        {/* CUADRO DINÁMICO NARANJA/ROJO */}
        {form.nombre && (
          <div style={{ 
            background: unidadesEnInversion > 0 ? '#fffbeb' : '#fee2e2', 
            padding: '12px', 
            borderRadius: '12px', 
            border: unidadesEnInversion > 0 ? '1px solid #f59e0b' : '1px solid #ef4444', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center' 
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: unidadesEnInversion > 0 ? '#b45309' : '#991b1b' }}>
              <Info size={16} />
              <span style={{ fontSize: '10px', fontWeight: 'bold' }}>
                {unidadesEnInversion > 0 ? 'RESTANTE EN FACTURAS:' : 'FACTURA AGOTADA:'}
              </span>
            </div>
            <span style={{ fontSize: '18px', fontWeight: '900', color: unidadesEnInversion > 0 ? '#b45309' : '#991b1b' }}>
              {unidadesEnInversion} unid.
            </span>
          </div>
        )}

        <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b' }}>FORMATO DE COMPRA</label>
        <select style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} value={form.formato_compra} onChange={e => setForm({...form, formato_compra: e.target.value})}>
          {formatosCompra.map(f => <option key={f} value={f}>{f}</option>)}
        </select>

        <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b' }}>MODO DE VENTA</label>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => setForm({...form, unidad_venta: 'PAQUETE', conversion: '1'})} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #2563eb', backgroundColor: form.unidad_venta === 'PAQUETE' ? '#2563eb' : 'white', color: form.unidad_venta === 'PAQUETE' ? 'white' : '#2563eb', cursor: 'pointer', fontWeight: 'bold' }}>Por {form.formato_compra}</button>
          <button onClick={() => setForm({...form, unidad_venta: 'UNIDAD'})} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #2563eb', backgroundColor: form.unidad_venta === 'UNIDAD' ? '#2563eb' : 'white', color: form.unidad_venta === 'UNIDAD' ? 'white' : '#2563eb', cursor: 'pointer', fontWeight: 'bold' }}>Por Unidad</button>
        </div>

        {form.unidad_venta === 'UNIDAD' && (
          <div style={{ background: '#eff6ff', padding: '10px', borderRadius: '10px', border: '1px dashed #2563eb' }}>
            <label style={{ fontSize: '11px', fontWeight: 'bold' }}>¿UNIDADES POR {form.formato_compra}?</label>
            <input type="number" style={{ width: '100%', padding: '8px', marginTop: '5px', borderRadius: '5px', border: '1px solid #bfdbfe' }} value={form.conversion} onChange={e => setForm({...form, conversion: e.target.value})} />
          </div>
        )}

        <label style={{ fontSize: '11px', fontWeight: 'bold' }}>PRECIO VENTA (S/.)</label>
        <input type="number" style={{ padding: '12px', fontSize: '24px', fontWeight: 'bold', border: '2px solid #2563eb', borderRadius: '12px', color: '#2563eb', textAlign: 'center' }} value={form.precio} onChange={e => setForm({...form, precio: e.target.value})} placeholder="0.00" />

        <button onClick={handleGuardar} style={{ marginTop: 'auto', padding: '15px', backgroundColor: '#22c55e', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>SINCRONIZAR</button>
      </div>

      {/* TABLA DERECHA */}
      <div style={{ flex: 1, background: 'white', padding: '25px', borderRadius: '15px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
          <h3 style={{ margin: 0 }}>Catálogo de Ventas ({prodsFiltrados.length})</h3>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input type="text" placeholder="Buscar..." style={{ padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1' }} value={busqueda} onChange={e => setBusqueda(e.target.value)} />
            <button onClick={cargarDatos} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><RefreshCw size={20} className={cargando ? 'spin' : ''}/></button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #f1f5f9', borderRadius: '10px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#f8fafc', textAlign: 'left', position: 'sticky', top: 0 }}>
              <tr>
                <th style={{ padding: '12px' }}>PRODUCTO</th>
                <th style={{ padding: '12px' }}>MODO</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>PRECIO</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>STOCK</th>
              </tr>
            </thead>
            <tbody>
              {prodsFiltrados.map(p => (
                <tr key={p._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px', fontWeight: 'bold' }}>{p.nombre?.toUpperCase()}</td>
                  <td style={{ padding: '12px' }}><span style={{ fontSize: '10px', background: '#f1f5f9', padding: '4px 8px', borderRadius: '5px' }}>{p.unidad_venta}</span></td>
                  <td style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold' }}>S/. {p.precio?.toFixed(2)}</td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <div style={{ background: p.stock_actual > 0 ? '#dcfce7' : '#fee2e2', color: p.stock_actual > 0 ? '#166534' : '#991b1b', padding: '5px', borderRadius: '8px', fontWeight: 'bold' }}>{p.stock_actual}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Inventory;