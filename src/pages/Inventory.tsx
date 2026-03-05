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
      setSeleccionados([]);
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
    <div className="inventory-page-wrapper">
      
      {/* PANEL IZQUIERDO: GESTIÓN */}
      <div className="inventory-form-aside">
        <div className="card-pro">
          <h2 className="title-with-icon"><Box color="#2563eb" /> Gestión</h2>

          <div className="input-group">
            <label>PRODUCTO DE INVERSIÓN</label>
            <select className="main-input" value={form.nombre} onChange={e => handleCambioProducto(e.target.value)}>
              <option value="">-- SELECCIONE --</option>
              {sugerencias.map((s, i) => <option key={i} value={s.nombre}>{s.nombre}</option>)}
            </select>
          </div>

          {form.nombre && (
            <div className={`status-box ${unidadesEnInversion > 0 ? 'orange' : 'red'}`}>
              <span>EN FACTURAS:</span>
              <strong>{unidadesEnInversion} unid.</strong>
            </div>
          )}

          <div className="input-group">
            <label>FORMATO COMPRA</label>
            <select className="main-input" value={form.formato_compra} onChange={e => handleCambioFormato(e.target.value)}>
              {formatosCompra.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>

          {esDetallable && (
            <div className="mode-toggle-row">
              <button className={`btn-mode ${form.unidad_venta === 'PAQUETE' ? 'active' : ''}`} onClick={() => setForm({...form, unidad_venta: 'PAQUETE'})}>Por {form.formato_compra}</button>
              <button className={`btn-mode ${form.unidad_venta === 'UNIDAD' ? 'active' : ''}`} onClick={() => setForm({...form, unidad_venta: 'UNIDAD'})}>Por Unidad</button>
            </div>
          )}

          <div className="input-group">
            <label>PRECIO VENTA</label>
            <input type="number" className="main-input price-input" value={form.precio} onChange={e => setForm({...form, precio: e.target.value})} placeholder="0.00" />
          </div>

          <button className="btn-save-pro" onClick={handleGuardar}>SINCRONIZAR</button>
        </div>
      </div>

      {/* PANEL DERECHO: TABLA */}
      <div className="inventory-table-section">
        <div className="card-pro">
          <div className="header-table">
            <h3>Catálogo ({prodsFiltrados.length})</h3>
            <div className="search-wrapper">
               <input type="text" placeholder="Buscar..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
               <button onClick={cargarDatos} className="refresh-btn"><RefreshCw className={cargando ? 'spin' : ''} /></button>
            </div>
          </div>

          <div className="table-responsive-container">
            <table className="pro-table">
              <thead>
                <tr>
                  <th style={{width: '40px'}}><button onClick={() => setSeleccionados(seleccionados.length === productos.length ? [] : productos.map(p => p._id))} className="btn-check-all">{seleccionados.length === productos.length && productos.length > 0 ? <CheckSquare size={18} color="#2563eb" /> : <Square size={18} />}</button></th>
                  <th>PRODUCTO</th>
                  <th style={{textAlign: 'center'}}>STOCK</th>
                </tr>
              </thead>
              <tbody>
                {prodsFiltrados.map(p => (
                  <tr key={p._id}>
                    <td style={{textAlign: 'center'}}><button onClick={() => toggleSeleccion(p._id)} className="btn-check-item">{seleccionados.includes(p._id) ? <CheckSquare size={18} color="#2563eb" /> : <Square size={18} />}</button></td>
                    <td><strong>{p.nombre?.toUpperCase()}</strong><br/><small>{p.unidad_venta}</small></td>
                    <td style={{textAlign: 'center'}}><span className={`stock-label ${p.stock_actual > 0 ? 'green' : 'red'}`}>{p.stock_actual}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {seleccionados.length > 0 && (
            <button onClick={eliminarMasivo} className="btn-delete-floating">
              <Trash2 size={18} /> Eliminar ({seleccionados.length})
            </button>
          )}
        </div>
      </div>

      <style>{`
        .inventory-page-wrapper {
          display: flex;
          gap: 20px;
          padding: 20px;
          background-color: #f8fafc;
          min-height: 100vh;
        }

        .card-pro {
          background: white;
          padding: 20px;
          border-radius: 15px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 4px 6px rgba(0,0,0,0.02);
          display: flex;
          flex-direction: column;
          height: 100%;
        }

        .inventory-form-aside { flex: 0 0 350px; }
        .inventory-table-section { flex: 1; min-width: 0; }

        .main-input { width: 100%; padding: 12px; border-radius: 10px; border: 1px solid #cbd5e1; outline: none; margin-top: 5px; }
        .price-input { font-size: 20px; font-weight: bold; text-align: center; border: 2px solid #2563eb; color: #2563eb; }
        
        .status-box { padding: 12px; border-radius: 10px; display: flex; justify-content: space-between; margin: 10px 0; font-size: 13px; }
        .status-box.orange { background: #fffbeb; border: 1px solid #f59e0b; color: #b45309; }
        .status-box.red { background: #fee2e2; border: 1px solid #ef4444; color: #991b1b; }

        .btn-mode { flex: 1; padding: 10px; border: 1px solid #cbd5e1; background: white; border-radius: 8px; cursor: pointer; }
        .btn-mode.active { background: #2563eb; color: white; border-color: #2563eb; }
        .mode-toggle-row { display: flex; gap: 10px; margin: 10px 0; }

        .btn-save-pro { background: #22c55e; color: white; padding: 15px; border: none; border-radius: 10px; font-weight: bold; cursor: pointer; margin-top: 20px; }

        .header-table { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; flex-wrap: wrap; gap: 10px; }
        .search-wrapper { display: flex; gap: 10px; }
        .search-wrapper input { padding: 8px 15px; border-radius: 20px; border: 1px solid #cbd5e1; outline: none; }
        
        .table-responsive-container { flex: 1; overflow-y: auto; overflow-x: auto; }
        .pro-table { width: 100%; border-collapse: collapse; min-width: 400px; }
        .pro-table th { background: #f8fafc; padding: 12px; text-align: left; font-size: 12px; color: #64748b; position: sticky; top: 0; }
        .pro-table td { padding: 12px; border-bottom: 1px solid #f1f5f9; }

        .stock-label { padding: 4px 12px; border-radius: 20px; font-weight: bold; font-size: 12px; }
        .stock-label.green { background: #dcfce7; color: #166534; }
        .stock-label.red { background: #fee2e2; color: #991b1b; }

        .btn-delete-floating { margin-top: 15px; background: #ef4444; color: white; padding: 12px; border-radius: 10px; border: none; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; }

        .btn-check-all, .btn-check-item { background: none; border: none; cursor: pointer; padding: 0; }

        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        /* MEDIA QUERY PARA RESPONSIVE */
        @media (max-width: 900px) {
          .inventory-page-wrapper { flex-direction: column; height: auto; }
          .inventory-form-aside { flex: none; width: 100%; }
          .inventory-table-section { flex: none; width: 100%; height: 600px; }
        }
      `}</style>
    </div>
  );
};

export default Inventory;