import React, { useState, useEffect, useMemo } from 'react';
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
  AlertCircle
} from 'lucide-react';

const Inventory: React.FC = () => {
  // --- ESTADOS INICIALES ---
  const [productos, setProductos] = useState<any[]>([]);
  const [sugerencias, setSugerencias] = useState<string[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [seleccionados, setSeleccionados] = useState<string[]>([]);
  
  // Estado del Formulario
  const [form, setForm] = useState({
    nombre: '',
    unidad: 'UNIDAD',
    precio: '',
    stock: '0'
  });

  const API_URL = 'https://simona-backend.onrender.com/api';

  // --- FUNCIÓN DE CARGA SEGURA ---
  const cargarTodo = async () => {
    try {
      setCargando(true);
      const [resProds, resSugerencias] = await Promise.all([
        axios.get(`${API_URL}/productos`),
        axios.get(`${API_URL}/nombres-inversiones`)
      ]);

      // Validamos que la respuesta sea un Array antes de guardar
      setProductos(Array.isArray(resProds.data) ? resProds.data : []);
      setSugerencias(Array.isArray(resSugerencias.data) ? resSugerencias.data : []);
      
    } catch (error) {
      console.error("Error crítico de carga:", error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarTodo();
  }, []);

  // --- LÓGICA DE SELECCIÓN DE PRODUCTO ---
  const handleSelectNombre = (nombreSeleccionado: string) => {
    if (!nombreSeleccionado) {
      setForm({ nombre: '', unidad: 'UNIDAD', precio: '', stock: '0' });
      return;
    }

    // Buscamos si el producto ya existe en el catálogo para jalar su stock e info
    const prodExistente = productos.find(
      (p) => p && p.nombre && p.nombre.toLowerCase() === nombreSeleccionado.toLowerCase()
    );

    if (prodExistente) {
      setForm({
        nombre: prodExistente.nombre || '',
        unidad: prodExistente.unidad || 'UNIDAD',
        precio: (prodExistente.precio || 0).toString(),
        stock: (prodExistente.cantidad || 0).toString()
      });
    } else {
      // Si no existe en catálogo pero sí en inversiones
      setForm({
        nombre: nombreSeleccionado,
        unidad: 'UNIDAD',
        precio: '',
        stock: '0'
      });
    }
  };

  // --- GUARDADO SIN STOCK MANUAL ---
  const handleGuardar = async () => {
    if (!form.nombre) {
      alert("⚠️ Por favor, seleccione un producto de la lista de Inversiones.");
      return;
    }

    try {
      // Solo enviamos nombre, precio y unidad. El stock NO se toca aquí.
      await axios.post(`${API_URL}/productos`, {
        nombre: form.nombre,
        unidad: form.unidad,
        precio: Number(form.precio) || 0
      });

      alert("✅ Datos actualizados correctamente.");
      setForm({ nombre: '', unidad: 'UNIDAD', precio: '', stock: '0' });
      await cargarTodo();
    } catch (error) {
      alert("❌ Error al guardar los cambios.");
    }
  };

  // --- GESTIÓN DE SELECCIÓN MÚLTIPLE ---
  const toggleSeleccion = (id: string) => {
    if (!id) return;
    setSeleccionados((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleTodos = () => {
    if (seleccionados.length === prodsFiltrados.length) {
      setSeleccionados([]);
    } else {
      const ids = prodsFiltrados.map((p) => p._id).filter((id) => id);
      setSeleccionados(ids);
    }
  };

  // --- ELIMINACIÓN SEGURA ---
  const handleEliminarMasivo = async () => {
    if (seleccionados.length === 0) return;
    
    if (window.confirm(`¿Está seguro de eliminar ${seleccionados.length} productos del catálogo?`)) {
      try {
        await axios.post(`${API_URL}/productos/eliminar-masivo`, { ids: seleccionados });
        setSeleccionados([]);
        await cargarTodo();
      } catch (error) {
        alert("❌ Error al procesar la eliminación.");
      }
    }
  };

  // --- FILTRO DINÁMICO (Optimizado con useMemo) ---
  const prodsFiltrados = useMemo(() => {
    return productos.filter((p) =>
      p && p.nombre && p.nombre.toLowerCase().includes(busqueda.toLowerCase())
    );
  }, [productos, busqueda]);

  return (
    <div className="inventory-page-container">
      
      {/* PANEL IZQUIERDO: FORMULARIO */}
      <aside className="inventory-form-aside">
        <div className="inventory-card shadow-lg">
          <h3 className="inventory-title">
            <Box color="#3498db" size={24} /> Gestión de Stock
          </h3>

          <div className="inventory-form-body">
            {/* SELECT DE PRODUCTOS DESDE INVERSIONES */}
            <div className="inventory-form-group">
              <label className="inventory-label">PRODUCTO PROVENIENTE DE INVERSIÓN</label>
              <div className="select-wrapper">
                <select 
                  className="inventory-select-main"
                  value={form.nombre}
                  onChange={(e) => handleSelectNombre(e.target.value)}
                >
                  <option value="">-- SELECCIONE PRODUCTO --</option>
                  {sugerencias.map((nom, i) => (
                    <option key={`sug-${i}`} value={nom}>
                      {(nom || '').toUpperCase()}
                    </option>
                  ))}
                </select>
                <ChevronDown className="select-icon" size={18} />
              </div>
              {!cargando && sugerencias.length === 0 && (
                <div className="error-small">
                   <AlertCircle size={12} /> No hay productos registrados en Compras/Inversiones.
                </div>
              )}
            </div>

            {/* UNIDAD DE MEDIDA */}
            <div className="inventory-form-group">
              <label className="inventory-label">UNIDAD DE MEDIDA</label>
              <select 
                className="inventory-input"
                value={form.unidad}
                onChange={(e) => setForm({ ...form, unidad: e.target.value })}
              >
                <option value="UNIDAD">UNIDAD</option>
                <option value="CAJA">CAJA</option>
                <option value="PAQUETE">PAQUETE</option>
                <option value="KILO">KILO</option>
                <option value="LITRO">LITRO</option>
              </select>
            </div>

            {/* PRECIO Y STOCK BLOQUEADO */}
            <div className="inventory-grid-inputs">
              <div className="inventory-form-group">
                <label className="inventory-label">PRECIO VENTA (S/.)</label>
                <input 
                  type="number"
                  className="inventory-input"
                  placeholder="0.00"
                  value={form.precio}
                  onChange={(e) => setForm({ ...form, precio: e.target.value })}
                />
              </div>
              <div className="inventory-form-group">
                <label className="inventory-label">STOCK ACTUAL (Lectura)</label>
                <input 
                  type="text"
                  className="inventory-input input-readonly"
                  value={form.stock}
                  readOnly
                />
              </div>
            </div>

            <div className="info-box-blue">
               <AlertCircle size={16} />
               <span>El stock solo aumenta mediante el módulo de Inversiones. No se permite edición manual.</span>
            </div>
          </div>

          <div className="inventory-form-actions">
            <button onClick={handleGuardar} className="btn-inventory-save">
              <Save size={18} /> ACTUALIZAR PRODUCTO
            </button>
            <button 
              onClick={() => setForm({ nombre: '', unidad: 'UNIDAD', precio: '', stock: '0' })} 
              className="btn-inventory-clear"
            >
              <Eraser size={18} /> LIMPIAR
            </button>
          </div>
        </div>
      </aside>

      {/* PANEL DERECHO: TABLA DEL CATÁLOGO */}
      <section className="inventory-table-section">
        <div className="inventory-card">
          <div className="inventory-table-header">
            <div className="title-with-count">
               <PackageCheck size={26} color="#3498db" />
               <h3 className="inventory-title">Catálogo de Productos ({prodsFiltrados.length})</h3>
            </div>
            
            <div className="inventory-controls">
              <button onClick={cargarTodo} className="btn-refresh-circle" title="Refrescar datos">
                <RefreshCw size={20} className={cargando ? 'spin' : ''} />
              </button>
              <div className="inventory-search-wrapper">
                <Search size={18} className="search-icon" />
                <input 
                  type="text"
                  placeholder="Buscar en el catálogo..."
                  className="inventory-search-input"
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
                  <th className="cell-center">
                    <button onClick={toggleTodos} className="btn-check-invisible">
                      {seleccionados.length === prodsFiltrados.length && prodsFiltrados.length > 0 
                        ? <CheckSquare size={22} color="#3498db" /> 
                        : <Square size={22} color="#bdc3c7" />
                      }
                    </button>
                  </th>
                  <th>PRODUCTO</th>
                  <th>MEDIDA</th>
                  <th className="cell-right">P. VENTA</th>
                  <th className="cell-center">STOCK</th>
                </tr>
              </thead>
              <tbody>
                {cargando ? (
                  <tr><td colSpan={5} className="table-status-msg">Cargando catálogo...</td></tr>
                ) : prodsFiltrados.length === 0 ? (
                  <tr><td colSpan={5} className="table-status-msg">No hay productos que coincidan.</td></tr>
                ) : (
                  prodsFiltrados.map((p) => (
                    <tr 
                      key={p?._id || Math.random()} 
                      className={seleccionados.includes(p?._id) ? 'row-selected' : ''}
                      onClick={() => toggleSeleccion(p?._id)}
                    >
                      <td className="cell-center">
                        <button className="btn-check-invisible">
                          {seleccionados.includes(p?._id) 
                            ? <CheckSquare size={20} color="#3498db" /> 
                            : <Square size={20} color="#dfe6e9" />
                          }
                        </button>
                      </td>
                      <td className="font-bold">{(p?.nombre || 'SIN NOMBRE').toUpperCase()}</td>
                      <td>{p?.unidad || 'UNIDAD'}</td>
                      <td className="cell-right font-bold">S/. {(Number(p?.precio) || 0).toFixed(2)}</td>
                      <td className="cell-center">
                        <span className={`stock-badge ${(p?.cantidad || 0) <= 0 ? 'empty' : 'fine'}`}>
                          {p?.cantidad || 0}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="inventory-table-footer">
            <div className="footer-info">
              {seleccionados.length > 0 && (
                <span className="selected-badge">{seleccionados.length} elementos marcados</span>
              )}
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