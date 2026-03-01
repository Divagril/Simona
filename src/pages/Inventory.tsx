import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
  Trash2, CheckSquare, Square, Box, Save, 
  Eraser, Search, PackageCheck, ChevronDown, 
  RefreshCw, AlertTriangle 
} from 'lucide-react';

const Inventory: React.FC = () => {
  // --- ESTADOS ---
  const [productos, setProductos] = useState<any[]>([]);
  const [sugerencias, setSugerencias] = useState<string[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [seleccionados, setSeleccionados] = useState<string[]>([]);
  
  const [form, setForm] = useState({
    nombre: '',
    unidad: 'UNIDAD',
    precio: '',
    stock: '0'
  });

  const API_URL = 'https://simona-backend.onrender.com/api';

  // --- CARGA DE DATOS ---
  const cargarTodo = async () => {
    try {
      setCargando(true);
      const [resProds, resSugerencias] = await Promise.all([
        axios.get(`${API_URL}/productos`),
        axios.get(`${API_URL}/nombres-inversiones`)
      ]);

      // Validar que sean arrays para evitar errores de .map
      const listaProds = Array.isArray(resProds.data) ? resProds.data : [];
      const listaSugs = Array.isArray(resSugerencias.data) ? resSugerencias.data : [];

      setProductos(listaProds);
      setSugerencias(listaSugs);
    } catch (error) {
      console.error("Error al conectar:", error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarTodo();
  }, []);

  // --- LÓGICA DEL FORMULARIO ---
  const handleSelectNombre = (val: string) => {
    if (!val) {
      setForm({ nombre: '', unidad: 'UNIDAD', precio: '', stock: '0' });
      return;
    }
    
    // Buscar si ya existe en catálogo para autocompletar
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

  const handleGuardar = async () => {
    if (!form.nombre) return alert("⚠️ Seleccione un producto de inversión.");
    
    try {
      await axios.post(`${API_URL}/productos`, {
        nombre: form.nombre.trim(),
        unidad: form.unidad,
        precio: Number(form.precio) || 0
        // NO enviamos cantidad (PROHIBIDO STOCK MANUAL)
      });
      alert("✅ Producto actualizado.");
      setForm({ nombre: '', unidad: 'UNIDAD', precio: '', stock: '0' });
      cargarTodo();
    } catch (error) {
      alert("❌ Error al guardar.");
    }
  };

  // --- ELIMINACIÓN ---
  const handleEliminarMasivo = async () => {
    if (seleccionados.length === 0) return;
    if (!window.confirm(`¿Eliminar ${seleccionados.length} productos?`)) return;
    
    try {
      await axios.post(`${API_URL}/productos/eliminar-masivo`, { ids: seleccionados });
      setSeleccionados([]);
      cargarTodo();
    } catch (error) {
      alert("❌ Error al eliminar.");
    }
  };

  // --- FILTRO ---
  const filtrados = useMemo(() => {
    return productos.filter(p => {
      const nom = (p.nombre || 'SIN NOMBRE').toLowerCase();
      return nom.includes(busqueda.toLowerCase());
    });
  }, [productos, busqueda]);

  return (
    <div className="inventory-page-container">
      
      {/* PANEL IZQUIERDO */}
      <aside className="inventory-form-aside">
        <div className="inventory-card">
          <h3 className="inventory-title"><Box color="#3498db" size={24} /> Gestión de Stock</h3>
          
          <div className="inventory-form-body">
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
                    <option key={i} value={nom}>{nom?.toUpperCase()}</option>
                  ))}
                </select>
                <ChevronDown className="select-icon" size={18} />
              </div>
              {sugerencias.length === 0 && !cargando && (
                <div className="error-small">⚠️ No hay datos en Inversiones.</div>
              )}
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
                <label className="inventory-label">PRECIO VENTA (S/.)</label>
                <input 
                  type="number" className="inventory-input" placeholder="0.00"
                  value={form.precio} onChange={(e) => setForm({...form, precio: e.target.value})}
                />
              </div>
              <div className="inventory-form-group">
                <label className="inventory-label">STOCK (Solo Lectura)</label>
                <input 
                  type="text" className="inventory-input input-readonly"
                  value={form.stock} readOnly
                />
              </div>
            </div>
            
            <div className="info-box-blue">
               <AlertTriangle size={14} />
               <span>El stock se sincroniza solo desde Inversiones.</span>
            </div>
          </div>

          <div className="inventory-form-actions">
            <button onClick={handleGuardar} className="btn-inventory-save"><Save size={18} /> ACTUALIZAR</button>
            <button onClick={() => setForm({nombre:'', unidad:'UNIDAD', precio:'', stock:'0'})} className="btn-inventory-clear"><Eraser size={18} /> LIMPIAR</button>
          </div>
        </div>
      </aside>

      {/* PANEL DERECHO */}
      <section className="inventory-table-section">
        <div className="inventory-card">
          <div className="inventory-table-header">
            <h3 className="inventory-title">Catálogo ({filtrados.length})</h3>
            <div className="inventory-controls">
              <button onClick={cargarTodo} className="btn-refresh-circle"><RefreshCw size={20} className={cargando ? 'spin' : ''} /></button>
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
                {cargando ? (
                  <tr><td colSpan={5} className="table-status-msg">Cargando...</td></tr>
                ) : filtrados.length === 0 ? (
                  <tr><td colSpan={5} className="table-status-msg">Inventario vacío.</td></tr>
                ) : (
                  filtrados.map((p) => (
                    <tr 
                      key={p._id} 
                      className={seleccionados.includes(p._id) ? 'row-selected' : ''}
                      onClick={() => setSeleccionados(prev => prev.includes(p._id) ? prev.filter(i => i !== p._id) : [...prev, p._id])}
                    >
                      <td className="cell-center">
                        <button className="btn-check-invisible">
                          {seleccionados.includes(p._id) ? <CheckSquare size={20} color="#3498db" /> : <Square size={20} color="#dfe6e9" />}
                        </button>
                      </td>
                      <td className="font-bold">
                        {p.nombre ? p.nombre.toUpperCase() : <span style={{color: 'red'}}>⚠️ SIN NOMBRE</span>}
                      </td>
                      <td>{p.unidad || '---'}</td>
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
              onClick={(e) => { e.stopPropagation(); handleEliminarMasivo(); }}
              disabled={seleccionados.length === 0}
              className="btn-inventory-delete"
            >
              <Trash2 size={18} /> ELIMINAR ({seleccionados.length})
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Inventory;