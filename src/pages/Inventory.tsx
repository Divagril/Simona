import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Box, RefreshCw, Search, Package, Layers, 
  DollarSign, Info, Trash2, CheckSquare, Square 
} from 'lucide-react';
import { useNotification } from '../context/NotificationContext';

const Inventory: React.FC = () => {
  const { showNotification } = useNotification();
  const [productos, setProductos] = useState<any[]>([]);
  const [sugerencias, setSugerencias] = useState<{nombre: string, total: number}[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(false);
  const [unidadesEnInversion, setUnidadesEnInversion] = useState<number>(0);
  const [seleccionados, setSeleccionados] = useState<string[]>([]);

  const [form, setForm] = useState({
    nombre: '',
    formato_compra: 'PAQUETE',
    unidad_venta: 'PAQUETE',
    precio: '',
    conversion: '1'
  });

  const formatosCompra = ['UNIDAD', 'BOTELLA', 'LATA', 'KG', 'LITRO', 'METRO', 'PAQUETE', 'CAJA', 'GALÓN DE GAS'];
  
  // URL CENTRALIZADA (Cambia a localhost si estás probando en tu PC)
  const API_URL = 'https://simona-backend.onrender.com/api';

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const [resP, resS] = await Promise.all([
        axios.get(`${API_URL}/productos`),
        axios.get(`${API_URL}/nombres-inversiones`)
      ]);
      setProductos(Array.isArray(resP.data) ? resP.data : []);
      setSugerencias(Array.isArray(resS.data) ? resS.data : []);
      setSeleccionados([]);
    } catch (e) {
      showNotification("Error de conexión con el servidor", true);
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

  const handleCambioFormato = (nuevoFormato: string) => {
    const esPaqueteria = nuevoFormato === 'PAQUETE' || nuevoFormato === 'CAJA';
    setForm({ 
      ...form, 
      formato_compra: nuevoFormato, 
      unidad_venta: esPaqueteria ? 'PAQUETE' : nuevoFormato, 
      conversion: '1' 
    });
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
      showNotification("✅ Producto sincronizado");
      cargarDatos();
      setForm({ nombre: '', formato_compra: 'PAQUETE', unidad_venta: 'PAQUETE', precio: '', conversion: '1' });
      setUnidadesEnInversion(0);
    } catch (e) { showNotification("Error al guardar", true); }
  };

  const eliminarMasivo = async () => {
    if (seleccionados.length === 0) return;
    if (!window.confirm(`¿Eliminar ${seleccionados.length} productos?`)) return;
    try {
      await axios.post(`${API_URL}/productos/eliminar-masivo`, { ids: seleccionados });
      showNotification(`🗑️ ${seleccionados.length} productos eliminados`);
      cargarDatos();
    } catch (e) { showNotification("Error al eliminar", true); }
  };

  const prodsFiltrados = productos.filter(p => (p.nombre || '').toLowerCase().includes(busqueda.toLowerCase()));

  return (
    <div style={{ display: 'flex', gap: '20px', padding: '20px', height: 'calc(100vh - 60px)', backgroundColor: '#f8fafc', overflow: 'hidden' }}>
      
      {/* PANEL IZQUIERDO: GESTIÓN */}
      <div style={{ flex: '0 0 380px', background: 'white', padding: '25px', borderRadius: '15px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '15px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Box color="#2563eb" /> Gestión de Inventario
        </h2>

        <div>
          <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '5px' }}>PRODUCTO DE INVERSIÓN</label>
          <select style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '2px solid #e2e8f0', outline: 'none' }} value={form.nombre} onChange={e => handleCambioProducto(e.target.value)}>
            <option value="">-- SELECCIONE --</option>
            {sugerencias.map((item, i) => <option key={i} value={item.nombre}>{item.nombre}</option>)}
          </select>
        </div>

        {form.nombre && (
          <div style={{ background: unidadesEnInversion > 0 ? '#fffbeb' : '#fee2e2', padding: '12px', borderRadius: '10px', border: `1px solid ${unidadesEnInversion > 0 ? '#f59e0b' : '#ef4444'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '10px', fontWeight: 'bold', color: unidadesEnInversion > 0 ? '#b45309' : '#991b1b' }}>RESTANTE EN FACTURAS:</span>
            <span style={{ fontWeight: '900', fontSize: '18px', color: unidadesEnInversion > 0 ? '#b45309' : '#991b1b' }}>{unidadesEnInversion} unid.</span>
          </div>
        )}

        <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b' }}>FORMATO DE COMPRA</label>
        <select style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '2px solid #e2e8f0' }} value={form.formato_compra} onChange={e => handleCambioFormato(e.target.value)}>
          {formatosCompra.map(f => <option key={f} value={f}>{f}</option>)}
        </select>

        {(form.formato_compra === 'PAQUETE' || form.formato_compra === 'CAJA') ? (
          <div>
            <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b' }}>MODO DE VENTA</label>
            <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
              <button onClick={() => setForm({...form, unidad_venta: 'PAQUETE', conversion: '1'})} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '2px solid #2563eb', cursor: 'pointer', background: form.unidad_venta === 'PAQUETE' ? '#2563eb' : 'white', color: form.unidad_venta === 'PAQUETE' ? 'white' : '#2563eb', fontWeight: 'bold' }}>Por {form.formato_compra}</button>
              <button onClick={() => setForm({...form, unidad_venta: 'UNIDAD'})} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '2px solid #2563eb', cursor: 'pointer', background: form.unidad_venta === 'UNIDAD' ? '#2563eb' : 'white', color: form.unidad_venta === 'UNIDAD' ? 'white' : '#2563eb', fontWeight: 'bold' }}>Por Unidad</button>
            </div>
          </div>
        ) : (
           <div style={{ padding: '12px', background: '#f1f5f9', borderRadius: '10px', textAlign: 'center', color: '#64748b', fontSize: '12px', fontWeight: 'bold' }}>Venta fijada por {form.formato_compra}</div>
        )}

        {form.unidad_venta === 'UNIDAD' && (form.formato_compra === 'PAQUETE' || form.formato_compra === 'CAJA') && (
          <div style={{ background: '#eff6ff', padding: '10px', borderRadius: '10px', border: '1px dashed #2563eb' }}>
            <label style={{ fontSize: '11px', fontWeight: 'bold' }}>¿UNIDADES POR {form.formato_compra}?</label>
            <input type="number" style={{ width: '100%', padding: '8px', marginTop: '5px', borderRadius: '5px', border: '1px solid #bfdbfe' }} value={form.conversion} onChange={e => setForm({...form, conversion: e.target.value})} />
          </div>
        )}

        <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b' }}>PRECIO VENTA (S/.)</label>
        <input type="number" style={{ padding: '15px', fontSize: '24px', fontWeight: 'bold', border: '2px solid #2563eb', borderRadius: '12px', color: '#2563eb', textAlign: 'center', outline: 'none' }} value={form.precio} onChange={e => setForm({...form, precio: e.target.value})} placeholder="0.00" />

        <button onClick={handleGuardar} style={{ marginTop: 'auto', padding: '18px', background: '#22c55e', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px', boxShadow: '0 4px 10px rgba(34, 197, 94, 0.2)' }}>SINCRONIZAR</button>
      </div>

      {/* PANEL DERECHO: CATÁLOGO */}
      <div style={{ flex: 1, background: 'white', padding: '25px', borderRadius: '15px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', position: 'relative', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3 style={{ margin: 0 }}>Catálogo de Ventas ({prodsFiltrados.length})</h3>
          <div style={{ display: 'flex', gap: '10px' }}>
             <input type="text" placeholder="Buscar..." style={{ padding: '8px 15px', borderRadius: '20px', border: '1px solid #cbd5e1', outline: 'none', width: '200px' }} value={busqueda} onChange={e => setBusqueda(e.target.value)} />
             <button onClick={cargarDatos} style={{ background: '#f1f5f9', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}><RefreshCw size={20} className={cargando ? 'spin' : ''}/></button>
          </div>
        </div>

        {/* CONTENEDOR DE TABLA CON SCROLL */}
        <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #f1f5f9', borderRadius: '10px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#f8fafc', position: 'sticky', top: 0, zIndex: 10 }}>
              <tr>
                <th style={{ padding: '15px', width: '50px' }}>
                  <button onClick={() => setSeleccionados(seleccionados.length === prodsFiltrados.length ? [] : prodsFiltrados.map(p => p._id))} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                    {seleccionados.length === prodsFiltrados.length && prodsFiltrados.length > 0 ? <CheckSquare size={20} color="#2563eb" /> : <Square size={20} color="#cbd5e1" />}
                  </button>
                </th>
                <th style={{ padding: '15px', textAlign: 'left', fontSize: '12px', color: '#64748b' }}>PRODUCTO</th>
                <th style={{ padding: '15px', textAlign: 'center', fontSize: '12px', color: '#64748b' }}>MODO</th>
                <th style={{ padding: '15px', textAlign: 'right', fontSize: '12px', color: '#64748b' }}>PRECIO</th>
                <th style={{ padding: '15px', textAlign: 'center', fontSize: '12px', color: '#64748b' }}>STOCK</th>
              </tr>
            </thead>
            <tbody>
              {prodsFiltrados.map(p => (
                <tr key={p._id} style={{ borderBottom: '1px solid #f1f5f9', background: seleccionados.includes(p._id) ? '#f0f7ff' : 'transparent' }}>
                  <td style={{ padding: '15px', textAlign: 'center' }}>
                    <button onClick={() => setSeleccionados(prev => prev.includes(p._id) ? prev.filter(i => i !== p._id) : [...prev, p._id])} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                      {seleccionados.includes(p._id) ? <CheckSquare size={20} color="#2563eb" /> : <Square size={20} color="#cbd5e1" />}
                    </button>
                  </td>
                  <td style={{ padding: '15px' }}><strong>{p.nombre}</strong></td>
                  <td style={{ textAlign: 'center' }}><span style={{ fontSize: '10px', background: '#f1f5f9', padding: '4px 8px', borderRadius: '5px', fontWeight: 'bold' }}>{p.unidad_venta}</span></td>
                  <td style={{ textAlign: 'right', fontWeight: 'bold' }}>S/. {p.precio?.toFixed(2)}</td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'inline-block', padding: '5px 12px', borderRadius: '8px', fontWeight: 'bold', background: p.stock_actual > 0 ? '#dcfce7' : '#fee2e2', color: p.stock_actual > 0 ? '#166534' : '#991b1b' }}>{p.stock_actual}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* BOTÓN ELIMINAR MASIVO (FIJO AL FONDO DE LA TABLA) */}
        {seleccionados.length > 0 && (
          <div style={{ padding: '15px 0 0 0', display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={eliminarMasivo} style={{ background: '#ef4444', color: 'white', padding: '12px 25px', borderRadius: '50px', border: 'none', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)' }}>
              <Trash2 size={18} /> Eliminar Seleccionados ({seleccionados.length})
            </button>
          </div>
        )}
      </div>

      <style>{`.spin { animation: spin 1s linear infinite; } @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default Inventory;