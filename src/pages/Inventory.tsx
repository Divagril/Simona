import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Box, RefreshCw, Search, Package, Layers, 
  DollarSign, Info, Trash2, CheckSquare, Square 
} from 'lucide-react';
import { useNotification } from '../context/NotificationContext';

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
      
      {/* 1. SECCIÓN DE GESTIÓN (IZQUIERDA / ARRIBA) */}
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

          {esDetallable && (
            <div className="toggle-container">
              <button className={`btn-tgl ${form.unidad_venta === 'PAQUETE' ? 'on' : ''}`} onClick={() => setForm({...form, unidad_venta: 'PAQUETE'})}>Por {form.formato_compra}</button>
              <button className={`btn-tgl ${form.unidad_venta === 'UNIDAD' ? 'on' : ''}`} onClick={() => setForm({...form, unidad_venta: 'UNIDAD'})}>Por Unidad</button>
            </div>
          )}

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

      {/* 2. SECCIÓN DE TABLA (DERECHA / ABAJO) */}
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

      <style>{`
        /* --- LAYOUT BASE (MOBILE FIRST) --- */
        .inventory-responsive-container {
          display: flex;
          flex-direction: column;
          gap: 20px;
          padding: 15px;
          background-color: #f1f5f9;
          min-height: 100vh;
        }

        .card-glass {
          background: white;
          padding: 20px;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 4px 6px rgba(0,0,0,0.02);
          display: flex;
          flex-direction: column;
        }

        .h-full { height: 100%; }

        /* --- PANELES --- */
        .management-panel { width: 100%; }
        .table-panel { width: 100%; flex: 1; min-height: 500px; }

        /* --- FORMULARIO --- */
        .panel-title { display: flex; align-items: center; gap: 10px; font-size: 1.1rem; margin-bottom: 20px; font-weight: 800; }
        .form-item { margin-bottom: 15px; }
        .form-item label { font-size: 10px; font-weight: 800; color: #64748b; margin-bottom: 5px; display: block; }
        .input-field { width: 100%; padding: 12px; border-radius: 10px; border: 1px solid #cbd5e1; outline: none; }
        
        .price-input-wrapper { display: flex; align-items: center; background: #f8fafc; border: 2px solid #2563eb; border-radius: 12px; overflow: hidden; }
        .currency { padding: 0 15px; font-weight: 900; color: #2563eb; }
        .price-input { flex: 1; padding: 12px; border: none; background: transparent; font-size: 1.5rem; font-weight: 800; color: #2563eb; outline: none; }

        .btn-main-save { margin-top: 10px; background: #22c55e; color: white; padding: 16px; border: none; border-radius: 12px; font-weight: 800; cursor: pointer; box-shadow: 0 4px 10px rgba(34, 197, 94, 0.2); }

        .status-info-bar { display: flex; justify-content: space-between; align-items: center; padding: 10px 15px; border-radius: 10px; margin-bottom: 15px; font-size: 12px; }
        .yellow { background: #fffbeb; border: 1px solid #f59e0b; color: #b45309; }
        .red { background: #fee2e2; border: 1px solid #ef4444; color: #991b1b; }

        .toggle-container { display: flex; gap: 8px; margin-bottom: 15px; }
        .btn-tgl { flex: 1; padding: 10px; border: 1px solid #cbd5e1; background: white; border-radius: 8px; font-size: 11px; font-weight: 700; cursor: pointer; }
        .btn-tgl.on { background: #2563eb; color: white; border-color: #2563eb; }

        /* --- TABLA --- */
        .table-header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; flex-wrap: wrap; gap: 10px; }
        .actions-wrapper { display: flex; gap: 10px; align-items: center; width: 100%; justify-content: space-between; }
        .search-pill { flex: 1; display: flex; align-items: center; gap: 8px; background: #f1f5f9; padding: 8px 15px; border-radius: 20px; border: 1px solid #e2e8f0; }
        .search-pill input { background: transparent; border: none; outline: none; width: 100%; font-size: 14px; }
        
        .refresh-square { background: #1abc9c; color: white; border: none; width: 40px; height: 40px; border-radius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 3px 0 #16a085; }
        .refresh-square:active { transform: translateY(2px); box-shadow: none; }

        .scrollable-table-wrapper { flex: 1; overflow-y: auto; overflow-x: auto; border: 1px solid #f1f5f9; border-radius: 12px; }
        .inventory-table { width: 100%; border-collapse: collapse; min-width: 450px; }
        .inventory-table th { background: #f8fafc; padding: 12px; text-align: left; font-size: 11px; color: #64748b; position: sticky; top: 0; z-index: 5; }
        .inventory-table td { padding: 12px; border-bottom: 1px solid #f1f5f9; }
        
        .prod-name-cell { display: flex; flex-direction: column; gap: 2px; }
        .mode-badge { font-size: 9px; color: #94a3b8; font-weight: 800; text-transform: uppercase; }
        
        .stock-badge { padding: 4px 12px; border-radius: 12px; font-weight: 900; font-size: 12px; }
        .in { background: #dcfce7; color: #166534; }
        .out { background: #fee2e2; color: #991b1b; }

        .footer-delete { display: flex; justify-content: flex-end; padding-top: 15px; }
        .btn-delete-pro { background: #ef4444; color: white; padding: 12px 20px; border-radius: 12px; border: none; font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 10px rgba(239, 68, 68, 0.2); }

        .check-btn { background: none; border: none; cursor: pointer; padding: 0; display: flex; align-items: center; }
        .active-row { background: #f0f7ff; }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        /* --- MEDIA QUERIES PARA PC --- */
        @media (min-width: 900px) {
          .inventory-responsive-container { flex-direction: row; height: calc(100vh - 40px); overflow: hidden; }
          .management-panel { flex: 0 0 350px; }
          .table-panel { min-height: auto; }
          .actions-wrapper { width: auto; }
          .search-pill { width: 200px; }
        }
      `}</style>
    </div>
  );
};

export default Inventory;