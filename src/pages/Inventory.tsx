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
  const API_URL = 'http://localhost:5000/api';

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const [resP, resS] = await Promise.all([
        axios.get(`${API_URL}/productos`),
        axios.get(`${API_URL}/nombres-inversiones`)
      ]);
      setProductos(Array.isArray(resP.data) ? resP.data : []);
      setSugerencias(Array.isArray(resS.data) ? resS.data : []);
    } catch (e) { showNotification("Error de conexión", true); }
    finally { setCargando(false); }
  };

  useEffect(() => { cargarDatos(); }, []);

  const handleCambioProducto = (nombreElegido: string) => {
    const encontrado = sugerencias.find(s => s.nombre === nombreElegido);
    setForm(prev => ({ ...prev, nombre: nombreElegido }));
    setUnidadesEnInversion(encontrado ? encontrado.total : 0);
  };

  // --- LÓGICA DE INTERFAZ INTELIGENTE ---
  const handleCambioFormato = (nuevoFormato: string) => {
    // Si NO es paquete ni caja, obligamos a que la venta sea en el mismo formato
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
    await axios.post(`${API_URL}/productos/eliminar-masivo`, { ids: seleccionados });
    setSeleccionados([]);
    cargarDatos();
  };

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
          <div style={{ background: unidadesEnInversion > 0 ? '#fffbeb' : '#fee2e2', padding: '12px', borderRadius: '10px', border: `1px solid ${unidadesEnInversion > 0 ? '#f59e0b' : '#ef4444'}`, display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '10px', fontWeight: 'bold' }}>RESTANTE EN FACTURAS:</span>
            <span style={{ fontWeight: '900' }}>{unidadesEnInversion} unid.</span>
          </div>
        )}

        <label style={{ fontSize: '11px', fontWeight: 'bold' }}>FORMATO DE COMPRA</label>
        <select style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '2px solid #e2e8f0' }} value={form.formato_compra} onChange={e => handleCambioFormato(e.target.value)}>
          {formatosCompra.map(f => <option key={f} value={f}>{f}</option>)}
        </select>

        {/* MODO DE VENTA: SOLO APARECE SI ES DETALLABLE */}
        {esDetallable ? (
          <div>
            <label style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b' }}>MODO DE VENTA</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setForm({...form, unidad_venta: 'PAQUETE', conversion: '1'})} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '2px solid #2563eb', cursor: 'pointer', background: form.unidad_venta === 'PAQUETE' ? '#2563eb' : 'white', color: form.unidad_venta === 'PAQUETE' ? 'white' : '#2563eb', fontWeight: 'bold' }}>Por {form.formato_compra}</button>
              <button onClick={() => setForm({...form, unidad_venta: 'UNIDAD'})} style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '2px solid #2563eb', cursor: 'pointer', background: form.unidad_venta === 'UNIDAD' ? '#2563eb' : 'white', color: form.unidad_venta === 'UNIDAD' ? 'white' : '#2563eb', fontWeight: 'bold' }}>Por Unidad</button>
            </div>
          </div>
        ) : (
          <div style={{ padding: '12px', background: '#f1f5f9', borderRadius: '10px', textAlign: 'center', color: '#64748b', fontSize: '13px', fontWeight: 'bold', border: '1px solid #e2e8f0' }}>
            Venta fijada por {form.formato_compra}
          </div>
        )}

        {form.unidad_venta === 'UNIDAD' && esDetallable && (
          <div style={{ background: '#eff6ff', padding: '10px', borderRadius: '10px', border: '1px dashed #2563eb' }}>
            <label style={{ fontSize: '11px', fontWeight: 'bold' }}>¿UNIDADES POR {form.formato_compra}?</label>
            <input type="number" style={{ width: '100%', padding: '8px', marginTop: '5px', borderRadius: '5px', border: '1px solid #bfdbfe' }} value={form.conversion} onChange={e => setForm({...form, conversion: e.target.value})} />
          </div>
        )}

        <label style={{ fontSize: '11px', fontWeight: 'bold' }}>PRECIO VENTA</label>
        <input type="number" style={{ padding: '15px', fontSize: '24px', fontWeight: 'bold', border: '2px solid #2563eb', borderRadius: '12px', color: '#2563eb', textAlign: 'center' }} value={form.precio} onChange={e => setForm({...form, precio: e.target.value})} placeholder="0.00" />

        <button onClick={handleGuardar} style={{ marginTop: 'auto', padding: '15px', background: '#22c55e', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>SINCRONIZAR</button>
      </div>

      {/* TABLA DERECHA */}
      <div style={{ flex: 1, background: 'white', padding: '25px', borderRadius: '15px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
          <h3 style={{ margin: 0 }}>Catálogo ({productos.length})</h3>
          <div style={{ display: 'flex', gap: '15px' }}>
            <input type="text" placeholder="Buscar..." style={{ padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1' }} value={busqueda} onChange={e => setBusqueda(e.target.value)} />
            <button onClick={cargarDatos} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><RefreshCw size={20}/></button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #f1f5f9', borderRadius: '10px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#f8fafc', position: 'sticky', top: 0 }}>
              <tr>
                <th style={{ padding: '15px', width: '50px' }}><button onClick={() => setSeleccionados(seleccionados.length === productos.length ? [] : productos.map(p => p._id))} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>{seleccionados.length === productos.length && productos.length > 0 ? <CheckSquare size={20} color="#2563eb" /> : <Square size={20} color="#cbd5e1" />}</button></th>
                <th style={{ padding: '15px', textAlign: 'left' }}>PRODUCTO</th>
                <th style={{ padding: '15px', textAlign: 'center' }}>MODO</th>
                <th style={{ padding: '15px', textAlign: 'right' }}>PRECIO</th>
                <th style={{ padding: '15px', textAlign: 'center' }}>STOCK</th>
              </tr>
            </thead>
            <tbody>
              {productos.filter(p => (p.nombre || '').toLowerCase().includes(busqueda.toLowerCase())).map(p => (
                <tr key={p._id} style={{ borderBottom: '1px solid #f1f5f9', background: seleccionados.includes(p._id) ? '#f0f7ff' : 'transparent' }}>
                  <td style={{ padding: '15px', textAlign: 'center' }}><button onClick={() => setSeleccionados(prev => prev.includes(p._id) ? prev.filter(i => i !== p._id) : [...prev, p._id])} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>{seleccionados.includes(p._id) ? <CheckSquare size={20} color="#2563eb" /> : <Square size={20} color="#cbd5e1" />}</button></td>
                  <td style={{ padding: '15px' }}><strong>{p.nombre}</strong></td>
                  <td style={{ textAlign: 'center' }}><span style={{ fontSize: '10px', background: '#f1f5f9', padding: '4px 8px', borderRadius: '5px' }}>{p.unidad_venta}</span></td>
                  <td style={{ textAlign: 'right', fontWeight: 'bold' }}>S/. {p.precio?.toFixed(2)}</td>
                  <td style={{ textAlign: 'center' }}><div style={{ display: 'inline-block', padding: '5px 12px', borderRadius: '8px', fontWeight: 'bold', background: p.stock_actual > 0 ? '#dcfce7' : '#fee2e2', color: p.stock_actual > 0 ? '#166534' : '#991b1b' }}>{p.stock_actual}</div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {seleccionados.length > 0 && <button onClick={eliminarMasivo} style={{ position: 'absolute', bottom: '30px', right: '30px', background: '#ef4444', color: 'white', padding: '15px 25px', borderRadius: '50px', border: 'none', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 15px rgba(239, 68, 68, 0.4)' }}><Trash2 size={20} /> Eliminar Seleccionados ({seleccionados.length})</button>}
      </div>
    </div>
  );
};

export default Inventory;