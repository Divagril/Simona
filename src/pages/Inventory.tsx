import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Box, Save, RefreshCw, Search, Package, Layers, 
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
  
  // --- ESTADO PARA MULTI-ELIMINACIÓN ---
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
      const resP = await axios.get(`${API_URL}/productos`);
      const resS = await axios.get(`${API_URL}/nombres-inversiones`);
      setProductos(Array.isArray(resP.data) ? resP.data : []);
      setSugerencias(Array.isArray(resS.data) ? resS.data : []);
      setSeleccionados([]); // Limpiar selección al recargar
    } catch (e) {
      showNotification("Error de conexión local", true);
    } finally { setCargando(false); }
  };

  useEffect(() => { cargarDatos(); }, []);

  // --- LÓGICA DE SELECCIÓN ---
  const toggleSeleccion = (id: string) => {
    setSeleccionados(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const seleccionarTodos = () => {
    if (seleccionados.length === prodsFiltrados.length) {
      setSeleccionados([]);
    } else {
      setSeleccionados(prodsFiltrados.map(p => p._id));
    }
  };

  const eliminarMasivo = async () => {
    if (seleccionados.length === 0) return;
    if (!window.confirm(`¿Eliminar ${seleccionados.length} productos seleccionados?`)) return;

    try {
      await axios.post(`${API_URL}/productos/eliminar-masivo`, { ids: seleccionados });
      showNotification(`🗑️ ${seleccionados.length} productos eliminados`);
      cargarDatos();
    } catch (e) {
      showNotification("Error al eliminar", true);
    }
  };

  const handleCambioProducto = (nombreElegido: string) => {
    // Buscamos ignorando espacios y mayúsculas
    const encontrado = sugerencias.find(s => 
        s.nombre.trim().toLowerCase() === nombreElegido.trim().toLowerCase()
    );
    setForm(prev => ({ ...prev, nombre: nombreElegido }));
    setUnidadesEnInversion(encontrado ? encontrado.total : 0);
  };

  const handleCambioFormato = (nuevoFormato: string) => {
    if (nuevoFormato === 'UNIDAD') {
      setForm({ ...form, formato_compra: nuevoFormato, unidad_venta: 'UNIDAD', conversion: '1' });
    } else {
      setForm({ ...form, formato_compra: nuevoFormato });
    }
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
      showNotification("✅ Producto actualizado");
      cargarDatos();
      setForm({ nombre: '', formato_compra: 'PAQUETE', unidad_venta: 'PAQUETE', precio: '', conversion: '1' });
      setUnidadesEnInversion(0);
    } catch (e) { showNotification("Error al guardar", true); }
  };

  const prodsFiltrados = productos.filter(p => (p.nombre || '').toLowerCase().includes(busqueda.toLowerCase()));

  return (
    <div style={{ display: 'flex', gap: '20px', padding: '20px', height: '90vh', backgroundColor: '#f8fafc', overflow: 'hidden' }}>
      
      {/* PANEL IZQUIERDO */}
      <div style={{ flex: '0 0 380px', background: 'white', padding: '25px', borderRadius: '15px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '15px', overflowY: 'auto' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}><Box color="#2563eb" /> Gestión</h2>

        <div>
          <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b' }}>PRODUCTO DE INVERSIÓN</label>
          <select style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '2px solid #e2e8f0' }} value={form.nombre} onChange={e => handleCambioProducto(e.target.value)}>
            <option value="">-- SELECCIONE --</option>
            {sugerencias.map((item, i) => <option key={i} value={item.nombre}>{item.nombre}</option>)}
          </select>
        </div>

        {form.nombre && (
          <div style={{ background: '#fffbeb', padding: '12px', borderRadius: '10px', border: '1px solid #f59e0b', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#b45309' }}>EN INVERSIONES:</span>
            <span style={{ fontWeight: '900', color: '#b45309' }}>{unidadesEnInversion} unid.</span>
          </div>
        )}

        <label style={{ fontSize: '11px', fontWeight: 'bold' }}>FORMATO COMPRA</label>
        <select style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '2px solid #e2e8f0' }} value={form.formato_compra} onChange={e => handleCambioFormato(e.target.value)}>
          {formatosCompra.map(f => <option key={f} value={f}>{f}</option>)}
        </select>

        {form.formato_compra !== 'UNIDAD' && (
          <div>
            <label style={{ fontSize: '11px', fontWeight: 'bold' }}>MODO VENTA</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setForm({...form, unidad_venta: 'PAQUETE', conversion: '1'})} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '2px solid #2563eb', cursor: 'pointer', background: form.unidad_venta === 'PAQUETE' ? '#2563eb' : 'white', color: form.unidad_venta === 'PAQUETE' ? 'white' : '#2563eb' }}>Por {form.formato_compra}</button>
              <button onClick={() => setForm({...form, unidad_venta: 'UNIDAD'})} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '2px solid #2563eb', cursor: 'pointer', background: form.unidad_venta === 'UNIDAD' ? '#2563eb' : 'white', color: form.unidad_venta === 'UNIDAD' ? 'white' : '#2563eb' }}>Por Unidad</button>
            </div>
          </div>
        )}

        {form.unidad_venta === 'UNIDAD' && form.formato_compra !== 'UNIDAD' && (
          <div style={{ background: '#eff6ff', padding: '10px', borderRadius: '10px', border: '1px dashed #2563eb' }}>
            <label style={{ fontSize: '11px', fontWeight: 'bold' }}>¿UNIDADES POR {form.formato_compra}?</label>
            <input type="number" style={{ width: '100%', padding: '8px', marginTop: '5px' }} value={form.conversion} onChange={e => setForm({...form, conversion: e.target.value})} />
          </div>
        )}

        <label style={{ fontSize: '11px', fontWeight: 'bold' }}>PRECIO VENTA</label>
        <input type="number" style={{ width: '100%', padding: '15px', fontSize: '24px', fontWeight: 'bold', border: '2px solid #2563eb', borderRadius: '12px', textAlign: 'center' }} value={form.precio} onChange={e => setForm({...form, precio: e.target.value})} placeholder="0.00" />

        <button onClick={handleGuardar} style={{ marginTop: 'auto', padding: '18px', background: '#22c55e', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>SINCRONIZAR</button>
      </div>

      {/* TABLA DERECHA */}
      <div style={{ flex: 1, background: 'white', padding: '25px', borderRadius: '15px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
          <h3 style={{ margin: 0 }}>Catálogo de Ventas ({prodsFiltrados.length})</h3>
          <div style={{ display: 'flex', gap: '15px' }}>
            <input type="text" placeholder="Buscar..." style={{ padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1' }} value={busqueda} onChange={e => setBusqueda(e.target.value)} />
            <button onClick={cargarDatos} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><RefreshCw size={20} className={cargando ? 'spin' : ''}/></button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #f1f5f9', borderRadius: '10px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#f8fafc', position: 'sticky', top: 0, zIndex: 5 }}>
              <tr>
                <th style={{ padding: '15px', width: '50px', textAlign: 'center' }}>
                  <button onClick={seleccionarTodos} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
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
                    <button onClick={() => toggleSeleccion(p._id)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                      {seleccionados.includes(p._id) ? <CheckSquare size={20} color="#2563eb" /> : <Square size={20} color="#cbd5e1" />}
                    </button>
                  </td>
                  <td style={{ padding: '15px' }}><strong>{p.nombre}</strong></td>
                  <td style={{ textAlign: 'center' }}><span style={{ fontSize: '10px', background: '#f1f5f9', padding: '4px 8px', borderRadius: '5px' }}>{p.unidad_venta}</span></td>
                  <td style={{ textAlign: 'right', fontWeight: 'bold' }}>S/. {p.precio?.toFixed(2)}</td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'inline-block', padding: '5px 12px', borderRadius: '8px', fontWeight: 'bold', background: p.stock_actual > 0 ? '#dcfce7' : '#fee2e2', color: p.stock_actual > 0 ? '#166534' : '#991b1b' }}>{p.stock_actual}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* BOTÓN ELIMINAR MASIVO (SOLO APARECE SI HAY ALGO SELECCIONADO) */}
        {seleccionados.length > 0 && (
          <button 
            onClick={eliminarMasivo}
            style={{ 
              position: 'absolute', bottom: '30px', right: '30px', 
              background: '#ef4444', color: 'white', padding: '15px 25px', 
              borderRadius: '50px', border: 'none', fontWeight: 'bold', 
              display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(239, 68, 68, 0.4)', zIndex: 10
            }}
          >
            <Trash2 size={20} /> Eliminar Seleccionados ({seleccionados.length})
          </button>
        )}
      </div>
    </div>
  );
};

export default Inventory;