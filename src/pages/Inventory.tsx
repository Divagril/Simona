import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import { 
  Trash2, 
  CheckSquare, 
  Square, 
  Box, 
  Save, 
  Eraser, 
  Search, 
  PackageCheck, 
  ChevronDown, 
  RefreshCw,
  AlertTriangle,
  Info,
  Layers,
  ArrowRightLeft
} from 'lucide-react';

// Interfaces para TypeScript
interface Producto {
  _id: string;
  nombre: string;
  precio: number;
  cantidad_base: number; // Siempre en paquetes/cajas
  unidades_por_paquete: number;
  unidad_venta: 'PAQUETE' | 'UNIDAD';
}

const Inventory: React.FC = () => {
  // --- ESTADOS ---
  const [productos, setProductos] = useState<Producto[]>([]);
  const [sugerencias, setSugerencias] = useState<string[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [seleccionados, setSeleccionados] = useState<string[]>([]);
  
  // Estado del Formulario
  const [form, setForm] = useState({
    nombre: '',
    unidad_venta: 'PAQUETE',
    precio: '',
    conversion: '1',
    stock_paquetes: 0 // Informativo de Inversiones
  });

  const API_URL = 'https://simona-backend.onrender.com/api';

  // --- CARGA DE DATOS ---
  const cargarTodo = useCallback(async () => {
    try {
      setCargando(true);
      const [resProds, resSugerencias] = await Promise.all([
        axios.get(`${API_URL}/productos`),
        axios.get(`${API_URL}/nombres-inversiones`)
      ]);

      setProductos(Array.isArray(resProds.data) ? resProds.data : []);
      setSugerencias(Array.isArray(resSugerencias.data) ? resSugerencias.data : []);
      
    } catch (error) {
      console.error("Error en la carga de inventario:", error);
    } finally {
      setCargando(false);
    }
  }, [API_URL]);

  useEffect(() => {
    cargarTodo();
  }, [cargarTodo]);

  // --- LÓGICA DE SELECCIÓN DE PRODUCTO ---
  const handleSelectNombre = (val: string) => {
    if (!val) {
      setForm({ nombre: '', unidad_venta: 'PAQUETE', precio: '', conversion: '1', stock_paquetes: 0 });
      return;
    }

    const existe = productos.find(p => p.nombre && p.nombre.toLowerCase() === val.toLowerCase());

    if (existe) {
      setForm({
        nombre: existe.nombre,
        unidad_venta: existe.unidad_venta || 'PAQUETE',
        precio: (existe.precio || 0).toString(),
        conversion: (existe.unidades_por_paquete || 1).toString(),
        stock_paquetes: existe.cantidad_base || 0
      });
    } else {
      // Si el nombre viene de inversiones pero no está en catálogo aún
      setForm({
        nombre: val,
        unidad_venta: 'PAQUETE',
        precio: '',
        conversion: '1',
        stock_paquetes: 0 // El backend lo calculará al guardar
      });
    }
  };

  // --- GUARDADO SINCRONIZADO ---
  const handleGuardar = async () => {
    if (!form.nombre) return alert("⚠️ Seleccione un producto de la lista.");
    if (Number(form.precio) <= 0) return alert("⚠️ Ingrese un precio de venta válido.");

    try {
      setCargando(true);
      const res = await axios.post(`${API_URL}/productos`, {
        nombre: form.nombre,
        precio: Number(form.precio),
        unidad_venta: form.unidad_venta,
        unidades_por_paquete: Number(form.conversion) || 1
      });

      if (res.data) {
        alert("✅ Producto sincronizado con éxito.");
        setForm({ nombre: '', unidad_venta: 'PAQUETE', precio: '', conversion: '1', stock_paquetes: 0 });
        await cargarTodo();
      }
    } catch (error) {
      alert("❌ Error al sincronizar el inventario.");
    } finally {
      setCargando(false);
    }
  };

  // --- ELIMINACIÓN MASIVA ---
  const handleEliminarMasivo = async () => {
    if (seleccionados.length === 0) return;
    if (window.confirm(`¿Desea eliminar los ${seleccionados.length} productos marcados?`)) {
      try {
        await axios.post(`${API_URL}/productos/eliminar-masivo`, { ids: seleccionados });
        setSeleccionados([]);
        await cargarTodo();
      } catch (error) {
        alert("❌ Error al eliminar.");
      }
    }
  };

  // --- FILTRO Y CÁLCULO DE STOCK EN TABLA ---
  const filtrados = useMemo(() => {
    return productos.filter(p => 
      (p.nombre || '').toLowerCase().includes(busqueda.toLowerCase())
    );
  }, [productos, busqueda]);

  const toggleSeleccion = (id: string) => {
    setSeleccionados(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  return (
    <div className="inventory-page-container">
      
      {/* SECCIÓN LATERAL: CONFIGURACIÓN DE VENTA */}
      <aside className="inventory-form-aside">
        <div className="inventory-card shadow-lg">
          <div className="inventory-header-compact">
            <Layers className="text-blue-500" size={28} />
            <div>
              <h2 className="title-main">Gestión de Stock</h2>
              <p className="subtitle">Sincronización con Inversiones</p>
            </div>
          </div>

          <div className="inventory-form-body">
            {/* SELECT PRODUCTO */}
            <div className="inventory-form-group">
              <label className="inventory-label">PRODUCTO PROVENIENTE DE COMPRA</label>
              <div className="select-wrapper">
                <select 
                  className="inventory-select-main"
                  value={form.nombre}
                  onChange={(e) => handleSelectNombre(e.target.value)}
                >
                  <option value="">-- ELIGE UN PRODUCTO --</option>
                  {sugerencias.map((nom, i) => (
                    <option key={`opt-${i}`} value={nom}>{(nom || '').toUpperCase()}</option>
                  ))}
                </select>
                <ChevronDown className="select-icon" />
              </div>
            </div>

            {/* MODO DE VENTA */}
            <div className="inventory-form-group">
              <label className="inventory-label">¿CÓMO SE VENDE ESTE PRODUCTO?</label>
              <div className="radio-group-modern">
                 <button 
                   className={`radio-btn ${form.unidad_venta === 'PAQUETE' ? 'active' : ''}`}
                   onClick={() => setForm({...form, unidad_venta: 'PAQUETE'})}
                 >
                   Caja / Paquete
                 </button>
                 <button 
                   className={`radio-btn ${form.unidad_venta === 'UNIDAD' ? 'active' : ''}`}
                   onClick={() => setForm({...form, unidad_venta: 'UNIDAD'})}
                 >
                   Unidad (Detalle)
                 </button>
              </div>
            </div>

            {/* FACTOR DE CONVERSIÓN (SOLO SI ES UNIDAD) */}
            {form.unidad_venta === 'UNIDAD' && (
              <div className="inventory-form-group animate-fade-in">
                <div className="info-banner-yellow">
                  <ArrowRightLeft size={16} />
                  <span>Si 1 paquete trae varias unidades, indica cuántas:</span>
                </div>
                <input 
                  type="number" 
                  className="inventory-input highlight-input"
                  placeholder="Ej: 12"
                  value={form.conversion}
                  onChange={(e) => setForm({...form, conversion: e.target.value})}
                />
              </div>
            )}

            {/* PRECIO DE VENTA */}
            <div className="inventory-form-group">
              <label className="inventory-label">PRECIO DE VENTA AL PÚBLICO (S/.)</label>
              <input 
                type="number" 
                className="inventory-input price-field"
                placeholder="0.00"
                value={form.precio}
                onChange={(e) => setForm({...form, precio: e.target.value})}
              />
            </div>

            {/* VISTA PREVIA DEL STOCK */}
            <div className="stock-preview-box">
              <div className="preview-item">
                <span className="p-label">Stock en Inversiones:</span>
                <span className="p-value">{form.stock_paquetes} pqtes.</span>
              </div>
              <div className="preview-item total">
                <span className="p-label">Stock para la venta:</span>
                <span className="p-value">
                  {form.unidad_venta === 'UNIDAD' 
                    ? (form.stock_paquetes * Number(form.conversion)) 
                    : form.stock_paquetes}
                </span>
              </div>
            </div>
          </div>

          <div className="inventory-form-actions">
            <button onClick={handleGuardar} disabled={cargando} className="btn-inventory-save">
              <Save size={20} /> {cargando ? 'Sincronizando...' : 'SINCRONIZAR STOCK'}
            </button>
            <button 
              onClick={() => setForm({nombre:'', unidad_venta:'PAQUETE', precio:'', conversion:'1', stock_paquetes:0})} 
              className="btn-inventory-clear"
            >
              <Eraser size={18} /> LIMPIAR
            </button>
          </div>
        </div>
      </aside>

      {/* SECCIÓN DERECHA: TABLA DINÁMICA */}
      <section className="inventory-table-section">
        <div className="inventory-card">
          <div className="inventory-table-header">
            <div className="title-row">
              <PackageCheck size={28} className="text-blue-600" />
              <h2 className="title-main">Catálogo de Productos ({filtrados.length})</h2>
            </div>
            
            <div className="inventory-controls">
              <button onClick={cargarTodo} className="btn-refresh-circle">
                <RefreshCw size={20} className={cargando ? 'spin' : ''} />
              </button>
              <div className="inventory-search-wrapper">
                <Search size={18} className="search-icon" />
                <input 
                  type="text" 
                  className="inventory-search-input"
                  placeholder="Buscar en el catálogo..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="inventory-table-responsive">
            <table className="inventory-table">
              <thead>
                <tr>
                  <th className="cell-center" style={{width: '60px'}}>
                    <button 
                      onClick={() => setSeleccionados(seleccionados.length === filtrados.length ? [] : filtrados.map(p => p._id))}
                      className="btn-check-invisible"
                    >
                      {seleccionados.length === filtrados.length && filtrados.length > 0 
                        ? <CheckSquare size={22} color="#3498db" /> 
                        : <Square size={22} color="#bdc3c7" />
                      }
                    </button>
                  </th>
                  <th>PRODUCTO</th>
                  <th className="cell-center">UNIDAD VENTA</th>
                  <th className="cell-right">P. VENTA</th>
                  <th className="cell-center">STOCK CALCULADO</th>
                </tr>
              </thead>
              <tbody>
                {cargando && productos.length === 0 ? (
                  <tr><td colSpan={5} className="table-status-msg">Actualizando inventario...</td></tr>
                ) : filtrados.length === 0 ? (
                  <tr><td colSpan={5} className="table-status-msg">No hay productos sincronizados.</td></tr>
                ) : (
                  filtrados.map((p) => {
                    // CÁLCULO DE STOCK SEGÚN UNIDAD DE VENTA
                    const stockFinal = p.unidad_venta === 'UNIDAD' 
                      ? (p.cantidad_base * p.unidades_por_paquete) 
                      : p.cantidad_base;

                    return (
                      <tr 
                        key={p._id || Math.random()} 
                        className={`row-hover ${seleccionados.includes(p._id) ? 'row-selected' : ''}`}
                        onClick={() => toggleSeleccion(p._id)}
                      >
                        <td className="cell-center">
                          <button className="btn-check-invisible">
                            {seleccionados.includes(p._id) 
                              ? <CheckSquare size={20} color="#3498db" /> 
                              : <Square size={20} color="#dfe6e9" />
                            }
                          </button>
                        </td>
                        <td className="font-bold">{(p.nombre || 'SIN NOMBRE').toUpperCase()}</td>
                        <td className="cell-center">
                          <span className={`unit-badge ${p.unidad_venta}`}>
                            {p.unidad_venta}
                          </span>
                        </td>
                        <td className="cell-right font-bold text-blue-600">S/. {(p.precio || 0).toFixed(2)}</td>
                        <td className="cell-center">
                          <div className="stock-container">
                            <span className={`stock-badge ${stockFinal <= 0 ? 'empty' : 'fine'}`}>
                              {stockFinal}
                            </span>
                            {p.unidad_venta === 'UNIDAD' && (
                              <small className="stock-detail">{p.cantidad_base} pqts x {p.unidades_por_paquete}</small>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="inventory-table-footer">
            <div className="footer-legend">
              <Info size={14} />
              <span>El stock se basa en el acumulado de la colección Inversiones.</span>
            </div>
            <button 
              onClick={(e) => { e.stopPropagation(); handleEliminarMasivo(); }}
              disabled={seleccionados.length === 0}
              className="btn-inventory-delete"
            >
              <Trash2 size={18} /> ELIMINAR SELECCIONADOS
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Inventory;