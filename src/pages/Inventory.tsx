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
      setTimeout(() => setCargando(false), 500); // Pequeño delay para UX
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
      showNotification("✅ Guardado");
      cargarDatos();
      setForm({ nombre: '', formato_compra: 'PAQUETE', unidad_venta: 'PAQUETE', precio: '', conversion: '1' });
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
    <div className="inventory-container">
      
      {/* PANEL GESTIÓN */}
      <div className="aside-form">
        <div className="pro-card">
          <h2 className="pro-title"><Box size={22} color="#2563eb" /> Gestión</h2>
          
          <div className="field">
            <label>PRODUCTO DE INVERSIÓN</label>
            <select className="pro-input" value={form.nombre} onChange={e => handleCambioProducto(e.target.value)}>
              <option value="">-- SELECCIONE --</option>
              {sugerencias.map((s, i) => <option key={i} value={s.nombre}>{s.nombre}</option>)}
            </select>
          </div>

          {form.nombre && (
            <div className={`stock-status-box ${unidadesEnInversion > 0 ? 'ok' : 'empty'}`}>
              <span>EN FACTURAS:</span>
              <strong>{unidadesEnInversion} unid.</strong>
            </div>
          )}

          <div className="field">
            <label>PRECIO VENTA (S/.)</label>
            <input type="number" className="pro-input price-display" value={form.precio} onChange={e => setForm({...form, precio: e.target.value})} placeholder="0.00" />
          </div>

          <button className="btn-sync" onClick={handleGuardar}>SINCRONIZAR</button>
        </div>
      </div>

      {/* PANEL CATÁLOGO */}
      <div className="main-catalog">
        <div className="pro-card">
          <div className="catalog-header">
            <h3>Catálogo de Ventas ({prodsFiltrados.length})</h3>
            <div className="catalog-actions">
              <div className="search-bar">
                <Search size={18} />
                <input type="text" placeholder="Buscar..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
              </div>
              <button 
                onClick={cargarDatos} 
                className={`btn-refresh ${cargando ? 'spinning' : ''}`}
                title="Actualizar lista"
              >
                <RefreshCw size={20} />
              </button>
            </div>
          </div>

          <div className="table-scroll">
            <table className="modern-table">
              <thead>
                <tr>
                  <th style={{ width: '50px' }}>
                    <button onClick={() => setSeleccionados(seleccionados.length === prodsFiltrados.length ? [] : prodsFiltrados.map(p => p._id))} className="btn-ghost">
                      {seleccionados.length === prodsFiltrados.length && prodsFiltrados.length > 0 ? <CheckSquare size={20} color="#2563eb" /> : <Square size={20} color="#cbd5e1" />}
                    </button>
                  </th>
                  <th>PRODUCTO</th>
                  <th style={{ textAlign: 'center' }}>STOCK</th>
                </tr>
              </thead>
              <tbody>
                {prodsFiltrados.map(p => (
                  <tr key={p._id} className={seleccionados.includes(p._id) ? 'row-selected' : ''}>
                    <td>
                      <button onClick={() => toggleSeleccion(p._id)} className="btn-ghost">
                        {seleccionados.includes(p._id) ? <CheckSquare size={20} color="#2563eb" /> : <Square size={20} color="#cbd5e1" />}
                      </button>
                    </td>
                    <td>
                      <div className="name-cell">
                        <strong>{p.nombre?.toUpperCase()}</strong>
                        <span>{p.unidad_venta}</span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`badge-stock ${p.stock_actual > 0 ? 'green' : 'red'}`}>
                        {p.stock_actual}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {seleccionados.length > 0 && (
            <button onClick={eliminarMasivo} className="btn-delete-pro">
              <Trash2 size={18} /> Eliminar Seleccionados ({seleccionados.length})
            </button>
          )}
        </div>
      </div>

      <style>{`
        .inventory-container { display: flex; gap: 20px; padding: 20px; background: #f8fafc; min-height: 100vh; flex-wrap: wrap; }
        .aside-form { flex: 0 0 350px; }
        .main-catalog { flex: 1; min-width: 400px; }
        
        .pro-card { background: white; padding: 25px; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px rgba(0,0,0,0.02); display: flex; flex-direction: column; height: 100%; }
        .pro-title { display: flex; align-items: center; gap: 10px; font-size: 1.2rem; margin-bottom: 20px; }
        
        .field { margin-bottom: 15px; }
        .field label { font-size: 11px; font-weight: 800; color: #64748b; margin-bottom: 6px; display: block; }
        .pro-input { width: 100%; padding: 12px; border-radius: 10px; border: 1px solid #cbd5e1; outline: none; }
        .price-display { font-size: 22px; font-weight: 900; text-align: center; color: #2563eb; border: 2px solid #2563eb; }

        .btn-sync { background: #22c55e; color: white; padding: 15px; border: none; border-radius: 12px; font-weight: bold; cursor: pointer; margin-top: auto; }
        
        /* HEADER TABLA */
        .catalog-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .catalog-actions { display: flex; gap: 12px; align-items: center; }
        
        .search-bar { display: flex; align-items: center; gap: 10px; background: #f1f5f9; padding: 8px 15px; border-radius: 25px; border: 1px solid #e2e8f0; }
        .search-bar input { background: transparent; border: none; outline: none; width: 150px; }

        /* BOTON ACTUALIZAR TEAL */
        .btn-refresh { 
          background: #1abc9c; 
          color: white; 
          border: none; 
          width: 42px; 
          height: 42px; 
          border-radius: 10px; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          cursor: pointer; 
          box-shadow: 0 4px 0 #16a085;
          transition: all 0.2s;
        }
        .btn-refresh:active { transform: translateY(2px); box-shadow: 0 2px 0 #16a085; }
        .spinning { animation: spin 1s linear infinite; }

        /* TABLA MODERNA */
        .table-scroll { flex: 1; overflow-y: auto; border: 1px solid #f1f5f9; border-radius: 12px; }
        .modern-table { width: 100%; border-collapse: collapse; }
        .modern-table th { background: #f8fafc; padding: 15px; text-align: left; font-size: 12px; color: #64748b; position: sticky; top: 0; }
        .modern-table td { padding: 15px; border-bottom: 1px solid #f1f5f9; }
        
        .name-cell { display: flex; flex-direction: column; }
        .name-cell span { font-size: 10px; color: #94a3b8; font-weight: bold; text-transform: uppercase; }

        .badge-stock { padding: 4px 12px; border-radius: 20px; font-weight: 800; font-size: 13px; }
        .green { background: #dcfce7; color: #166534; }
        .red { background: #fee2e2; color: #991b1b; }

        .btn-ghost { background: none; border: none; cursor: pointer; padding: 0; display: flex; align-items: center; }
        .row-selected { background: #f0f7ff; }

        .btn-delete-pro { background: #ef4444; color: white; padding: 12px; border-radius: 10px; border: none; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; margin-top: 15px; }

        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        @media (max-width: 900px) {
          .inventory-container { flex-direction: column; }
          .aside-form, .main-catalog { flex: 1 1 100%; }
          .main-catalog { height: 500px; }
        }
      `}</style>
    </div>
  );
};

export default Inventory;