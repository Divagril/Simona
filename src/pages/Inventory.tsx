import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Box, RefreshCw, Search, CheckSquare, Square, Info, Trash2, Edit3, XCircle 
} from 'lucide-react';
import { useNotification } from '../context/NotificationContext';
import './Inventory.css'; 

const Inventory: React.FC = () => {
  const { showNotification } = useNotification();
  
  const [productos, setProductos] = useState<any[]>([]);
  const [sugerencias, setSugerencias] = useState<{nombre: string, total: number}[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(false);
  const [unidadesEnInversion, setUnidadesEnInversion] = useState<number>(0);
  const [seleccionados, setSeleccionados] = useState<string[]>([]);
  
  // ESTADO PARA EDICIÓN
  const [editando, setEditando] = useState(false);

  const [form, setForm] = useState({
    nombre: '',
    formato_compra: 'UNIDAD',
    unidad_venta: 'UNIDAD',
    precio: '',
    conversion: '1'
  });

  const formatosCompra = ['UNIDAD', 'BOTELLA', 'LATA', 'KG', 'LITRO', 'METRO', 'PAQUETE', 'CAJA', 'SACO', 'PLANCHA', 'TIRA', 'BOLSA', 'GALÓN DE GAS'];
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
      showNotification("Error de conexión", true);
    } finally {
      setTimeout(() => setCargando(false), 500);
    }
  };

  useEffect(() => { cargarDatos(); }, []);

  // FUNCIÓN PARA CARGAR DATOS EN EL FORMULARIO
  const prepararEdicion = (prod: any) => {
    setEditando(true);
    setForm({
      nombre: prod.nombre,
      formato_compra: prod.unidad_venta || 'UNIDAD',
      unidad_venta: prod.unidad_venta || 'UNIDAD',
      precio: prod.precio.toString(),
      conversion: '1'
    });
    // Buscar stock restante de la inversión original
    const inv = sugerencias.find(s => s.nombre === prod.nombre);
    setUnidadesEnInversion(inv ? inv.total : 0);
    showNotification("✏️ Producto cargado para editar");
  };

  const cancelarEdicion = () => {
    setEditando(false);
    setForm({ nombre: '', formato_compra: 'UNIDAD', unidad_venta: 'UNIDAD', precio: '', conversion: '1' });
    setUnidadesEnInversion(0);
  };

  const handleGuardar = async () => {
    if (!form.nombre) return showNotification("Seleccione un producto", true);
    try {
      await axios.post(`${API_URL}/productos`, {
        nombre: form.nombre,
        precio: Number(form.precio),
        unidad_venta: form.formato_compra,
        unidades_por_paquete: 1
      });
      showNotification(editando ? "✅ Actualizado" : "✅ Guardado");
      cargarDatos();
      cancelarEdicion();
    } catch (e) { showNotification("Error al guardar", true); }
  };

  const eliminarMasivo = async () => {
    if (seleccionados.length === 0) return;
    if (!window.confirm(`¿Eliminar ${seleccionados.length} productos?`)) return;
    try {
      await axios.post(`${API_URL}/productos/eliminar-masivo`, { ids: seleccionados });
      showNotification(`🗑️ Eliminados`);
      setSeleccionados([]);
      cargarDatos();
    } catch (e) { showNotification("Error al eliminar", true); }
  };

  const prodsFiltrados = productos.filter(p => (p.nombre || '').toLowerCase().includes(busqueda.toLowerCase()));

  return (
    <div className="inventory-responsive-container">
      
      <div className="management-panel">
        <div className={`card-glass fill-height ${editando ? 'edit-mode-border' : ''}`}>
          <h2 className="panel-title">
            {editando ? <Edit3 size={20} color="#f59e0b" /> : <Box size={20} color="#2563eb" />}
            {editando ? 'Editando Producto' : 'Gestión de Inventario'}
          </h2>
          
          <div className="form-item">
            <label>PRODUCTO</label>
            <select 
                className="input-field" 
                value={form.nombre} 
                onChange={e => {
                    const encontrado = sugerencias.find(s => s.nombre === e.target.value);
                    setForm({...form, nombre: e.target.value});
                    setUnidadesEnInversion(encontrado ? encontrado.total : 0);
                }}
                disabled={editando} // No cambiar nombre mientras se edita para evitar duplicados
            >
              <option value="">-- SELECCIONE --</option>
              {sugerencias.map((s, i) => <option key={i} value={s.nombre}>{s.nombre}</option>)}
            </select>
          </div>

          {form.nombre && (
            <div className={`stock-info-bar ${unidadesEnInversion > 0 ? 'yellow' : 'red'}`}>
              <Info size={16} />
              <span>RESTANTE EN INVERSIÓN: <strong>{unidadesEnInversion}</strong></span>
            </div>
          )}

          <div className="form-item">
            <label>FORMATO VENTA</label>
            <select className="input-field" value={form.formato_compra} onChange={e => setForm({...form, formato_compra: e.target.value, unidad_venta: e.target.value})}>
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

          <div className="btn-group-vertical">
            <button className={`btn-main-save ${editando ? 'btn-update' : ''}`} onClick={handleGuardar}>
                {editando ? 'ACTUALIZAR PRODUCTO' : 'SINCRONIZAR E INVENTARIAR'}
            </button>
            
            {editando && (
                <button className="btn-cancel-edit" onClick={cancelarEdicion}>
                    <XCircle size={18} /> CANCELAR EDICIÓN
                </button>
            )}
          </div>
        </div>
      </div>

      <div className="table-panel">
        <div className="card-glass fill-height">
          <div className="table-header-row">
            <h3>Catálogo Actual ({prodsFiltrados.length})</h3>
            <div className="actions-wrapper">
              <div className="search-pill">
                <Search size={16} />
                <input type="text" placeholder="Buscar..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
              </div>
              <button onClick={cargarDatos} className="refresh-square"><RefreshCw size={20} /></button>
            </div>
          </div>

          <div className="scrollable-table-wrapper">
            <table className="inventory-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}></th>
                  <th>PRODUCTO</th>
                  <th style={{ textAlign: 'center' }}>STOCK</th>
                  <th style={{ width: '50px' }}></th>
                </tr>
              </thead>
              <tbody>
                {prodsFiltrados.map(p => (
                  <tr key={p._id} className={seleccionados.includes(p._id) ? 'active-row' : ''}>
                    <td style={{ textAlign: 'center' }}>
                      <button onClick={() => setSeleccionados(prev => prev.includes(p._id) ? prev.filter(i => i !== p._id) : [...prev, p._id])} className="check-btn">
                        {seleccionados.includes(p._id) ? <CheckSquare size={18} color="#2563eb" /> : <Square size={18} />}
                      </button>
                    </td>
                    <td onClick={() => prepararEdicion(p)} style={{cursor: 'pointer'}}>
                      <div className="prod-name-cell">
                        <strong>{p.nombre?.toUpperCase()}</strong>
                        <span className="mode-badge">{p.unidad_venta} • S/. {p.precio.toFixed(2)}</span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`stock-badge ${p.stock_actual > 0 ? 'in' : 'out'}`}>{p.stock_actual}</span>
                    </td>
                    <td>
                        <button className="btn-table-edit" onClick={() => prepararEdicion(p)}>
                            <Edit3 size={16} />
                        </button>
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