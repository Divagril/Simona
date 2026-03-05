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
      setSeleccionados([]); // Limpiar selección al recargar
    } catch (e) {
      showNotification("Error de conexión", true);
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
    } catch (e) { showNotification("Error al guardar", true); }
  };

  const toggleSeleccion = (id: string) => {
    setSeleccionados(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const eliminarMasivo = async () => {
    if (seleccionados.length === 0) return;
    if (!window.confirm(`¿Eliminar ${seleccionados.length} productos?`)) return;
    try {
      await axios.post(`${API_URL}/productos/eliminar-masivo`, { ids: seleccionados });
      showNotification("🗑️ Eliminados con éxito");
      cargarDatos();
    } catch (e) { showNotification("Error al eliminar", true); }
  };

  const prodsFiltrados = productos.filter(p => (p.nombre || '').toLowerCase().includes(busqueda.toLowerCase()));

  return (
    <div style={{ display: 'flex', gap: '20px', padding: '20px', height: 'calc(100vh - 50px)', backgroundColor: '#f8fafc', overflow: 'hidden' }}>
      
      {/* PANEL IZQUIERDO: GESTIÓN */}
      <div style={{ flex: '0 0 350px', background: 'white', padding: '20px', borderRadius: '15px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '15px', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}><Box color="#2563eb"/> Gestión</h3>
        
        <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b' }}>PRODUCTO DE INVERSIÓN</label>
        <select style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} value={form.nombre} onChange={e => handleCambioProducto(e.target.value)}>
          <option value="">-- SELECCIONE --</option>
          {sugerencias.map((s, i) => <option key={i} value={s.nombre}>{s.nombre}</option>)}
        </select>

        {form.nombre && (
          <div style={{ background: '#fffbeb', padding: '10px', borderRadius: '8px', border: '1px solid #f59e0b', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: 'bold' }}>EN FACTURAS:</span>
            <span style={{ fontWeight: 'bold', color: '#b45309' }}>{unidadesEnInversion} unid.</span>
          </div>
        )}

        <label style={{ fontSize: '11px', fontWeight: 'bold' }}>FORMATO COMPRA</label>
        <select style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} value={form.formato_compra} onChange={e => setForm({...form, formato_compra: e.target.value})}>
          {formatosCompra.map(f => <option key={f} value={f}>{f}</option>)}
        </select>

        <label style={{ fontSize: '11px', fontWeight: 'bold' }}>PRECIO VENTA (S/.)</label>
        <input type="number" style={{ padding: '12px', fontSize: '20px', fontWeight: 'bold', border: '2px solid #2563eb', borderRadius: '10px', textAlign: 'center' }} value={form.precio} onChange={e => setForm({...form, precio: e.target.value})} placeholder="0.00" />

        <button onClick={handleGuardar} style={{ marginTop: 'auto', padding: '15px', background: '#22c55e', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>SINCRONIZAR</button>
      </div>

      {/* PANEL DERECHO: CATÁLOGO */}
      <div style={{ flex: 1, background: 'white', padding: '20px', borderRadius: '15px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3 style={{ margin: 0 }}>Catálogo ({prodsFiltrados.length})</h3>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input type="text" placeholder="Buscar..." style={{ padding: '8px 15px', borderRadius: '20px', border: '1px solid #cbd5e1', outline: 'none' }} value={busqueda} onChange={e => setBusqueda(e.target.value)} />
            <button onClick={cargarDatos} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><RefreshCw className={cargando ? 'spin' : ''}/></button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #f1f5f9', borderRadius: '10px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#f8fafc', position: 'sticky', top: 0 }}>
              <tr>
                <th style={{ padding: '12px', width: '50px' }}>
                  <button onClick={() => setSeleccionados(seleccionados.length === prodsFiltrados.length ? [] : prodsFiltrados.map(p => p._id))} style={{ background: 'none', border: 'none' }}>
                    {seleccionados.length === prodsFiltrados.length && productos.length > 0 ? <CheckSquare size={20} color="#2563eb" /> : <Square size={20} color="#cbd5e1" />}
                  </button>
                </th>
                <th style={{ padding: '12px', textAlign: 'left' }}>PRODUCTO</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>STOCK</th>
              </tr>
            </thead>
            <tbody>
              {prodsFiltrados.map(p => (
                <tr key={p._id} style={{ borderBottom: '1px solid #f1f5f9', background: seleccionados.includes(p._id) ? '#f0f7ff' : 'transparent' }}>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <button onClick={() => toggleSeleccion(p._id)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                      {seleccionados.includes(p._id) ? <CheckSquare size={20} color="#2563eb" /> : <Square size={20} color="#cbd5e1" />}
                    </button>
                  </td>
                  <td style={{ padding: '12px' }}><strong>{p.nombre?.toUpperCase()}</strong></td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <span style={{ padding: '4px 12px', borderRadius: '10px', background: p.stock_actual > 0 ? '#dcfce7' : '#fee2e2', color: p.stock_actual > 0 ? '#166534' : '#991b1b', fontWeight: 'bold' }}>
                      {p.stock_actual}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* BOTÓN ELIMINAR (Solo aparece si hay algo seleccionado) */}
        {seleccionados.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '15px' }}>
            <button 
              onClick={eliminarMasivo}
              style={{ background: '#ef4444', color: 'white', padding: '12px 25px', borderRadius: '50px', border: 'none', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 4px 10px rgba(239, 68, 68, 0.3)' }}
            >
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