import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Box, RefreshCw, Search, CheckSquare, Square, Info, Trash2 
} from 'lucide-react';
import { useNotification } from '../context/NotificationContext';
import './Inventory.css'; // Importación de los estilos

const Inventory: React.FC = () => {
  const { showNotification } = useNotification();
  
  // --- ESTADOS ---
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
      setSeleccionados([]);
    } catch (e) {
      showNotification("Error de conexión", true);
    } finally {
      setTimeout(() => setCargando(false), 500);
    }
  };

  useEffect(() => { cargarDatos(); }, []);

  const handleCambioProducto = (nombreElegido: string) => {
    const encontrado = sugerencias.find(s => s.nombre === nombreElegido);
    setForm(prev => ({ ...prev, nombre: nombreElegido }));
    setUnidadesEnInversion(encontrado ? encontrado.total : 0);
  };

  const handleCambioFormato = (nuevoFormato: string) => {
    setForm({ 
      ...form, 
      formato_compra: nuevoFormato, 
      unidad_venta: nuevoFormato, // Ahora siempre coinciden
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
      showNotification("✅ Guardado");
      cargarDatos();
      setForm({ nombre: '', formato_compra: 'PAQUETE', unidad_venta: 'PAQUETE', precio: '', conversion: '1' });
      setUnidadesEnInversion(0);
    } catch (e) { showNotification("Error al guardar", true); }
  };

  const toggleSeleccion = (id: string) => {
    setSeleccionados(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const eliminarMasivo = async () => {
    if (seleccionados.length === 0) return;
    if (!window.confirm(`¿Eliminar ${seleccionados.length} productos?`)) return;
    try {
      await axios.post(`${API_URL}/productos/eliminar-masivo`, { ids: seleccionados });
      showNotification(`🗑️ Eliminados`);
      cargarDatos();
    } catch (e) { showNotification("Error al eliminar", true); }
  };

  const prodsFiltrados = productos.filter(p => (p.nombre || '').toLowerCase().includes(busqueda.toLowerCase()));

  return (
    <div className="inventory-responsive-container">
      
      {/* 1. SECCIÓN DE GESTIÓN */}
      <div className="management-panel">
        <div className="card-glass">
          <h2 className="panel-title"><Box size={20} color="#2563eb" /> Gestión</h2>
          
          <div className="form-item">
            <label>PRODUCTO DE INVERSIÓN</label>
            <select className="input-field" value={form.nombre} onChange={e => handleCambioProducto(e.target.value)}>
              <option value="">-- SELECCIONE --</option>
              {sugerencias.map((s, i) => <option key={i} value={s.nombre}>{s.nombre}</option>)}
            </select>
          </div>

          {form.nombre && (
            <div className={`stock-info-bar ${unidadesEnInversion > 0 ? 'yellow' : 'red'}`}>
              <Info size={16} />
              <span>RESTANTE: <strong>{unidadesEnInversion} unid.</strong></span>
            </div>
          )}

          <div className="form-item">
            <label>FORMATO COMPRA</label>
            <select className="input-field" value={form.formato_compra} onChange={e => handleCambioFormato(e.target.value)}>
              {formatosCompra.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>

          <div className="form-item">
            <label>PRECIO VENTA</label>
            <div className="price-input-wrapper">
              <span className="currency">S/.</span>
              <input type="number" className="price-input" value={form.precio} onChange={e => setForm({...form, precio: e.target.value})} placeholder="0.00" />
            </div>
          </div>

          <button className="btn-main-save" onClick={handleGuardar}>SINCRONIZAR E INVENTARIAR</button>
        </div>
      </div>

      {/* 2. SECCIÓN DE TABLA */}
      <div className="table-panel">
        <div className="card-glass h-full">
          <div className="table-header-row">
            <h3>Catálogo ({prodsFiltrados.length})</h3>
            <div className="actions-wrapper">
              <div className="search-pill">
                <Search size={16} />
                <input type="text" placeholder="Buscar..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
              </div>
              <button onClick={cargarDatos} className={`refresh-square ${cargando ? 'spin' : ''}`}>
                <RefreshCw size={20} />
              </button>
            </div>
          </div>

          <div className="scrollable-table-wrapper">
            <table className="inventory-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>
                    <button onClick={() => setSeleccionados(seleccionados.length === prodsFiltrados.length ? [] : prodsFiltrados.map(p => p._id))} className="check-btn">
                      {seleccionados.length === prodsFiltrados.length && productos.length > 0 ? <CheckSquare size={18} color="#2563eb" /> : <Square size={18} />}
                    </button>
                  </th>
                  <th>PRODUCTO</th>
                  <th style={{ textAlign: 'center' }}>STOCK</th>
                </tr>
              </thead>
              <tbody>
                {prodsFiltrados.map(p => (
                  <tr key={p._id} className={seleccionados.includes(p._id) ? 'active-row' : ''}>
                    <td style={{ textAlign: 'center' }}>
                      <button onClick={() => toggleSeleccion(p._id)} className="check-btn">
                        {seleccionados.includes(p._id) ? <CheckSquare size={18} color="#2563eb" /> : <Square size={18} />}
                      </button>
                    </td>
                    <td>
                      <div className="prod-name-cell">
                        <strong>{p.nombre?.toUpperCase()}</strong>
                        <span className="mode-badge">{p.unidad_venta}</span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`stock-badge ${p.stock_actual > 0 ? 'in' : 'out'}`}>{p.stock_actual}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {seleccionados.length > 0 && (
            <div className="footer-delete">
              <button onClick={eliminarMasivo} className="btn-delete-pro">
                <Trash2 size={16} /> Eliminar Seleccionados ({seleccionados.length})
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Inventory;