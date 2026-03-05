import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Box, RefreshCw, Search, Package, Layers, DollarSign, Info, Trash2, CheckSquare, Square } from 'lucide-react';
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
  
  // --- CAMBIO AQUÍ: USAR LA URL DE RENDER ---
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

  const esDetallable = form.formato_compra === 'PAQUETE' || form.formato_compra === 'CAJA';

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
        setSeleccionados([]);
        cargarDatos();
        showNotification("Eliminado con éxito");
    } catch (e) { showNotification("Error al eliminar", true); }
  };

  return (
    <div className="inventory-layout" style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', padding: '20px', backgroundColor: '#f8fafc' }}>
      
      {/* PANEL IZQUIERDO */}
      <div style={{ flex: '1 1 350px', background: 'white', padding: '20px', borderRadius: '15px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}><Box color="#2563eb" /> Gestión</h2>

        <div>
          <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b' }}>PRODUCTO DE INVERSIÓN</label>
          <select style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '2px solid #e2e8f0' }} value={form.nombre} onChange={e => handleCambioProducto(e.target.value)}>
            <option value="">-- SELECCIONE --</option>
            {sugerencias.map((item, i) => <option key={i} value={item.nombre}>{item.nombre}</option>)}
          </select>
        </div>

        {form.nombre && (
          <div style={{ background: unidadesEnInversion > 0 ? '#fffbeb' : '#fee2e2', padding: '12px', borderRadius: '10px', border: `1px solid ${unidadesEnInversion > 0 ? '#f59e0b' : '#ef4444'}`, display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '10px', fontWeight: 'bold' }}>DISPONIBLE:</span>
            <span style={{ fontWeight: '900' }}>{unidadesEnInversion} unid.</span>
          </div>
        )}

        <label style={{ fontSize: '11px', fontWeight: 'bold' }}>FORMATO COMPRA</label>
        <select style={{ width: '100%', padding: '10px', border: '1px solid #ddd' }} value={form.formato_compra} onChange={e => handleCambioFormato(e.target.value)}>
          {formatosCompra.map(f => <option key={f} value={f}>{f}</option>)}
        </select>

        {esDetallable && (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => setForm({...form, unidad_venta: 'PAQUETE'})} style={{ flex: 1, padding: '10px', background: form.unidad_venta === 'PAQUETE' ? '#2563eb' : 'white', color: form.unidad_venta === 'PAQUETE' ? 'white' : '#2563eb', border: '1px solid #2563eb', borderRadius: '8px', cursor: 'pointer' }}>Por {form.formato_compra}</button>
            <button onClick={() => setForm({...form, unidad_venta: 'UNIDAD'})} style={{ flex: 1, padding: '10px', background: form.unidad_venta === 'UNIDAD' ? '#2563eb' : 'white', color: form.unidad_venta === 'UNIDAD' ? 'white' : '#2563eb', border: '1px solid #2563eb', borderRadius: '8px', cursor: 'pointer' }}>Por Unidad</button>
          </div>
        )}

        <label style={{ fontSize: '11px', fontWeight: 'bold' }}>PRECIO VENTA</label>
        <input type="number" style={{ padding: '15px', fontSize: '20px', textAlign: 'center', border: '2px solid #2563eb', borderRadius: '10px' }} value={form.precio} onChange={e => setForm({...form, precio: e.target.value})} placeholder="0.00" />

        <button onClick={handleGuardar} style={{ padding: '15px', background: '#22c55e', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>SINCRONIZAR</button>
      </div>

      {/* TABLA DERECHA */}
      <div style={{ flex: '2 1 500px', background: 'white', padding: '20px', borderRadius: '15px', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
          <h3 style={{ margin: 0 }}>Catálogo ({productos.length})</h3>
          <button onClick={cargarDatos} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><RefreshCw size={20}/></button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#f8fafc' }}>
              <tr>
                <th><button onClick={() => setSeleccionados(seleccionados.length === productos.length ? [] : productos.map(p => p._id))} style={{ border: 'none', background: 'none' }}><Square size={18}/></button></th>
                <th style={{ padding: '10px', textAlign: 'left' }}>PRODUCTO</th>
                <th style={{ padding: '10px' }}>PRECIO</th>
                <th style={{ padding: '10px' }}>STOCK</th>
              </tr>
            </thead>
            <tbody>
              {productos.map(p => (
                <tr key={p._id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ textAlign: 'center' }}><button onClick={() => toggleSeleccion(p._id)} style={{ border: 'none', background: 'none' }}>{seleccionados.includes(p._id) ? <CheckSquare size={18} color="#2563eb"/> : <Square size={18}/>}</button></td>
                  <td style={{ padding: '10px' }}>{p.nombre}</td>
                  <td style={{ padding: '10px', textAlign: 'center' }}>S/. {p.precio?.toFixed(2)}</td>
                  <td style={{ padding: '10px', textAlign: 'center' }}>{p.stock_actual}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {seleccionados.length > 0 && <button onClick={eliminarMasivo} style={{ marginTop: '10px', background: '#ef4444', color: 'white', padding: '10px', borderRadius: '8px', border: 'none', width: '100%', cursor: 'pointer' }}>Eliminar Seleccionados ({seleccionados.length})</button>}
      </div>
    </div>
  );
};

export default Inventory;