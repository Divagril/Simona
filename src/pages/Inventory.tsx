import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { 
  Trash2, CheckSquare, Square, Box, Save, 
  Eraser, Search, PackageCheck, ChevronDown, 
  RefreshCw, AlertCircle 
} from 'lucide-react';

const Inventory: React.FC = () => {
  const [productos, setProductos] = useState<any[]>([]);
  const [sugerencias, setSugerencias] = useState<string[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(false);
  const [seleccionados, setSeleccionados] = useState<string[]>([]);
  
  const [form, setForm] = useState({
    nombre: '',
    unidad: 'UNIDAD',
    precio: '',
    stock: '0'
  });

  const API_URL = 'https://simona-backend.onrender.com/api';

  // --- CARGA DE DATOS (Memorizada para evitar bucles) ---
  const cargarTodo = useCallback(async () => {
    try {
      setCargando(true);
      const [resProds, resSugerencias] = await Promise.all([
        axios.get(`${API_URL}/productos`),
        axios.get(`${API_URL}/nombres-inversiones`)
      ]);

      if (resProds.data) setProductos(resProds.data);
      if (resSugerencias.data) setSugerencias(resSugerencias.data);
    } catch (error) {
      console.error("Error al cargar:", error);
    } finally {
      setCargando(false);
    }
  }, [API_URL]);

  useEffect(() => {
    cargarTodo();
  }, [cargarTodo]);

  // --- FORMULARIO ---
  const handleSelectNombre = (val: string) => {
    if (!val) {
      setForm({ nombre: '', unidad: 'UNIDAD', precio: '', stock: '0' });
      return;
    }
    const existe = productos.find(p => p.nombre && p.nombre.toLowerCase() === val.toLowerCase());
    if (existe) {
      setForm({
        nombre: existe.nombre,
        unidad: existe.unidad || 'UNIDAD',
        precio: (existe.precio || 0).toString(),
        stock: (existe.cantidad || 0).toString()
      });
    } else {
      setForm({ nombre: val, unidad: 'UNIDAD', precio: '', stock: '0' });
    }
  };

  // --- GUARDAR (Corregido para actualización instantánea) ---
  const handleGuardar = async () => {
    if (!form.nombre) return alert("⚠️ Seleccione un producto.");
    
    try {
      const response = await axios.post(`${API_URL}/productos`, {
        nombre: form.nombre.trim(),
        unidad: form.unidad,
        precio: Number(form.precio) || 0
      });

      if (response.data) {
        alert("✅ Producto actualizado en el catálogo.");
        setForm({ nombre: '', unidad: 'UNIDAD', precio: '', stock: '0' });
        // Recarga completa para asegurar que el catálogo refleje la realidad
        await cargarTodo(); 
      }
    } catch (error) {
      alert("❌ Error al guardar.");
    }
  };

  // --- ELIMINAR ---
  const handleEliminarMasivo = async () => {
    if (seleccionados.length === 0) return;
    if (!window.confirm(`¿Borrar ${seleccionados.length} productos?`)) return;
    
    try {
      await axios.post(`${API_URL}/productos/eliminar-masivo`, { ids: seleccionados });
      setSeleccionados([]);
      await cargarTodo();
    } catch (error) {
      alert("❌ Error al eliminar.");
    }
  };

  // --- FILTRO DINÁMICO ---
  const filtrados = productos.filter(p => {
    const busq = busqueda.toLowerCase();
    const nom = (p.nombre || '').toLowerCase();
    return nom.includes(busq);
  });

  return (
    <div className="inventory-page-container">
      
      {/* PANEL IZQUIERDO */}
      <aside className="inventory-form-aside">
        <div className="inventory-card">
          <h3 className="inventory-title"><Box color="#3498db" size={24} /> Gestión de Stock</h3>
          
          <div className="inventory-form-body">
            <div className="inventory-form-group">
              <label className="inventory-label">PRODUCTO DE INVERSIÓN</label>
              <div className="select-wrapper">
                <select 
                  className="inventory-select-main"
                  value={form.nombre}
                  onChange={(e) => handleSelectNombre(e.target.value)}
                >
                  <option value="">-- SELECCIONE PRODUCTO --</option>
                  {sugerencias.map((nom, i) => (
                    <option key={i} value={nom}>{nom?.toUpperCase()}</option>
                  ))}
                </select>
                <ChevronDown className="select-icon" size={18} />
              </div>
            </div>

            <div className="inventory-form-group">
              <label className="inventory-label">UNIDAD DE MEDIDA</label>
              <select 
                className="inventory-input"
                value={form.unidad}
                onChange={(e) => setForm({...form, unidad: e.target.value})}
              >
                <option value="UNIDAD">UNIDAD</option>
                <option value="CAJA">CAJA</option>
                <option value="PAQUETE">PAQUETE</option>
                <option value="KILO">KILO</option>
              </select>
            </div>

            <div className="inventory-grid-inputs">
              <div className="inventory-form-group">
                <label className="inventory-label">PRECIO VENTA</label>
                <input 
                  type="number" className="inventory-input" placeholder="0.00"
                  value={form.precio} onChange={(e) => setForm({...form, precio: e.target.value})}
                />
              </div>
              <div className="inventory-form-group">
                <label className="inventory-label">STOCK (Lectura)</label>
                <input 
                  type="text" className="inventory-input input-readonly"
                  value={form.stock} readOnly
                />
              </div>
            </div>
            
            <div className="info-box-blue">
               <AlertCircle size={14} />
               <span>El stock aumenta solo desde Inversiones.</span>
            </div>
          </div>

          <div className="inventory-form-actions">
            <button onClick={handleGuardar} className="btn-inventory-save">
                <Save size={18} /> ACTUALIZAR PRODUCTO
            </button>
            <button onClick={() => setForm({nombre:'', unidad:'UNIDAD', precio:'', stock:'0'})} className="btn-inventory-clear">
                <Eraser size={18} /> LIMPIAR
            </button>
          </div>
        </div>
      </aside>

      {/* PANEL DERECHO */}
      <section className="inventory-table-section">
        <div className="inventory-card">
          <div className="inventory-table-header">
            <h3 className="inventory-title">Catálogo ({filtrados.length})</h3>
            <div className="inventory-controls">
              <button onClick={cargarTodo} className="btn-refresh-circle">
                <RefreshCw size={20} className={cargando ? 'spin' : ''} />
              </button>
              <div className="inventory-search-wrapper">
                <Search size={18} className="search-icon" />
                <input 
                  type="text" placeholder="Buscar..." className="inventory-search-input"
                  value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="inventory-table-responsive">
            <table className="inventory-table">
              <thead>
                <tr>
                  <th style={{width: '50px'}} className="cell-center">
                    <button 
                      onClick={() => setSeleccionados(seleccionados.length === filtrados.length ? [] : filtrados.map(p => p._id))}
                      className="btn-check-invisible"
                    >
                      {seleccionados.length === filtrados.length && filtrados.length > 0 ? <CheckSquare size={22} color="#3498db" /> : <Square size={22} color="#bdc3c7" />}
                    </button>
                  </th>
                  <th>PRODUCTO</th>
                  <th>MEDIDA</th>
                  <th className="cell-right">PRECIO</th>
                  <th className="cell-center">STOCK</th>
                </tr>
              </thead>
              <tbody>
                {cargando && productos.length === 0 ? (
                  <tr><td colSpan={5} className="table-status-msg">Cargando datos...</td></tr>
                ) : (
                  filtrados.map((p) => (
                    <tr 
                      key={p._id || Math.random()} 
                      className={seleccionados.includes(p._id) ? 'row-selected' : ''}
                    >
                      <td className="cell-center">
                        <button 
                          onClick={() => setSeleccionados(prev => prev.includes(p._id) ? prev.filter(i => i !== p._id) : [...prev, p._id])}
                          className="btn-check-invisible"
                        >
                          {seleccionados.includes(p._id) ? <CheckSquare size={20} color="#3498db" /> : <Square size={20} color="#dfe6e9" />}
                        </button>
                      </td>
                      <td className="font-bold">{(p.nombre || 'SIN NOMBRE').toUpperCase()}</td>
                      <td>{p.unidad || 'UNIDAD'}</td>
                      <td className="cell-right font-bold">S/. {(Number(p.precio) || 0).toFixed(2)}</td>
                      <td className="cell-center">
                        <span className={`stock-badge ${(p.cantidad || 0) <= 0 ? 'empty' : 'fine'}`}>
                          {p.cantidad || 0}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="inventory-table-footer">
            <button 
              onClick={handleEliminarMasivo}
              disabled={seleccionados.length === 0}
              className="btn-inventory-delete"
            >
              <Trash2 size={18} /> ELIMINAR SELECCIONADOS ({seleccionados.length})
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Inventory;