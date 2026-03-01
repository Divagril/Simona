import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Trash2, CheckSquare, Square, Box, Save, 
  Eraser, Search, PackageCheck, ChevronDown, RefreshCw
} from 'lucide-react';

const Inventory: React.FC = () => {
  // --- ESTADOS ---
  const [productos, setProductos] = useState<any[]>([]);
  const [sugerencias, setSugerencias] = useState<string[]>([]); 
  const [form, setForm] = useState({ nombre: '', unidad: 'UNIDAD', precio: '', stock: '' });
  const [seleccionados, setSeleccionados] = useState<string[]>([]); 
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(false);

  // --- DIRECCIÓN DEL SERVIDOR EN RENDER (IMPORTANTE) ---
  const API_URL = 'https://simona-backend.onrender.com/api';

  // --- CARGA DE DATOS ---
  const cargarTodo = async () => {
    try {
      setCargando(true);
      // Traemos productos y nombres de inversiones desde Render
      const resProds = await axios.get(`${API_URL}/productos`);
      const resSugerencias = await axios.get(`${API_URL}/nombres-inversiones`);
      
      setProductos(resProds.data);
      setSugerencias(resSugerencias.data);
    } catch (error) {
      console.error("Error cargando inventario:", error);
      // Nota: Si el backend de Render está "dormido", puede tardar 30 segundos en despertar.
      alert("⚠️ El servidor en la nube está despertando o no responde. Por favor, espera un momento y presiona el botón de recargar.");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { 
    cargarTodo(); 
  }, []);

  // --- LÓGICA DE SELECCIÓN ---
  const toggleSeleccion = (id: string) => {
    setSeleccionados(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleTodos = () => {
    if (seleccionados.length === productos.length) setSeleccionados([]);
    else setSeleccionados(productos.map(p => p._id));
  };

  // --- GUARDAR O ACTUALIZAR ---
  const handleGuardar = async () => {
    if (!form.nombre) return alert("❌ Seleccione un producto de la lista");
    
    try {
      await axios.post(`${API_URL}/productos`, { 
          nombre: form.nombre, 
          precio: Number(form.precio) || 0, 
          cantidad: Number(form.stock) || 0,
          unidad: form.unidad
      });
      
      alert("✅ Producto guardado en la nube");
      setForm({ nombre: '', unidad: 'UNIDAD', precio: '', stock: '' });
      cargarTodo();
    } catch (error) {
      alert("❌ Error al guardar el producto");
    }
  };

  // --- ELIMINACIÓN MASIVA ---
  const handleEliminarMasivo = async () => {
    if (seleccionados.length === 0) return;
    if (window.confirm(`¿Seguro que quieres eliminar ${seleccionados.length} productos?`)) {
      try {
        await axios.post(`${API_URL}/productos/eliminar-masivo`, { ids: seleccionados });
        setSeleccionados([]);
        cargarTodo();
      } catch (error) {
        alert("❌ Error al eliminar");
      }
    }
  };

  const prodsFiltrados = productos.filter(p => 
    p.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="inventory-page-container">
      
      {/* PANEL IZQUIERDO: FORMULARIO */}
      <aside className="inventory-form-aside">
        <div className="inventory-card">
          <h3 className="inventory-title">
            <Box color="#3498db" size={24}/> Gestión de Stock
          </h3>

          <div className="inventory-form-group">
            <label className="inventory-label">SELECCIONAR PRODUCTO DE INVERSIÓN</label>
            <div className="select-wrapper">
              <select 
                className="inventory-select-main"
                value={form.nombre} 
                onChange={e => setForm({...form, nombre: e.target.value})}
              >
                <option value="">-- ELIGE UN PRODUCTO --</option>
                {sugerencias.map((nom, i) => (
                  <option key={i} value={nom}>{nom.toUpperCase()}</option>
                ))}
              </select>
              <ChevronDown className="select-icon" size={18} />
            </div>
            {sugerencias.length === 0 && !cargando && (
              <p style={{ color: '#E74C3C', fontSize: '11px', marginTop: '5px', fontWeight: 'bold' }}>
                ⚠️ No hay compras en la base de datos de la nube
              </p>
            )}
          </div>

          <div className="inventory-form-group">
            <label className="inventory-label">UNIDAD DE MEDIDA</label>
            <select 
              className="inventory-input" 
              value={form.unidad} 
              onChange={e => setForm({...form, unidad: e.target.value})}
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
                  <input type="number" className="inventory-input" placeholder="0.00" value={form.precio} onChange={e => setForm({...form, precio: e.target.value})} />
              </div>
              <div className="inventory-form-group">
                  <label className="inventory-label">STOCK</label>
                  <input type="number" className="inventory-input" placeholder="0" value={form.stock} onChange={e => setForm({...form, stock: e.target.value})} />
              </div>
          </div>

          <div className="inventory-form-actions">
              <button onClick={handleGuardar} className="btn-inventory-save">
                <Save size={18}/> Actualizar Inventario
              </button>
              <button onClick={() => setForm({ nombre: '', unidad: 'UNIDAD', precio: '', stock: '' })} className="btn-inventory-clear">
                <Eraser size={18}/> Limpiar
              </button>
          </div>
        </div>
      </aside>

      {/* PANEL DERECHO: CATÁLOGO */}
      <section className="inventory-table-section">
        <div className="inventory-card">
          <div className="inventory-table-header">
            <h3 className="inventory-title">
              <PackageCheck size={24} color="#3498db" /> Catálogo ({prodsFiltrados.length})
            </h3>
            
            <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={cargarTodo} className="btn-refresh-inventory">
                    <RefreshCw size={18} className={cargando ? 'spin' : ''} />
                </button>
                <div className="inventory-search-wrapper">
                    <Search size={18} className="search-icon" />
                    <input 
                        type="text" 
                        placeholder="Buscar producto..." 
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
                  <th style={{ width: '50px', textAlign: 'center' }}>
                      <button onClick={toggleTodos} className="btn-check-invisible">
                          {seleccionados.length === productos.length && productos.length > 0 ? <CheckSquare size={22} color="#3498db"/> : <Square size={22} color="#bdc3c7"/>}
                      </button>
                  </th>
                  <th>Producto</th>
                  <th>Medida</th>
                  <th style={{ textAlign: 'right' }}>Precio</th>
                  <th style={{ textAlign: 'center' }}>Stock</th>
                </tr>
              </thead>
              <tbody>
                {cargando ? (
                    <tr><td colSpan={5} style={{textAlign: 'center', padding: '30px'}}>Cargando desde Render... (Esto puede tardar si el servidor estaba dormido)</td></tr>
                ) : prodsFiltrados.length === 0 ? (
                    <tr><td colSpan={5} style={{textAlign: 'center', padding: '30px'}}>No hay productos en la base de datos.</td></tr>
                ) : (
                    prodsFiltrados.map((p) => (
                        <tr key={p._id} className={seleccionados.includes(p._id) ? 'row-selected' : ''}>
                          <td style={{ textAlign: 'center' }}>
                            <button onClick={() => toggleSeleccion(p._id)} className="btn-check-invisible">
                                {seleccionados.includes(p._id) ? <CheckSquare size={22} color="#3498db"/> : <Square size={22} color="#dfe6e9"/>}
                            </button>
                          </td>
                          <td style={{ fontWeight: 'bold' }}>{p.nombre.toUpperCase()}</td>
                          <td>{p.unidad}</td>
                          <td style={{ textAlign: 'right', fontWeight: 'bold' }}>S/. {Number(p.precio).toFixed(2)}</td>
                          <td style={{ textAlign: 'center' }}>
                            <span className={`stock-badge ${p.cantidad <= 0 ? 'empty' : 'fine'}`}>
                              {p.cantidad}
                            </span>
                          </td>
                        </tr>
                      ))
                )}
              </tbody>
            </table>
          </div>

          <div className="inventory-table-footer">
             {seleccionados.length > 0 && <span className="selected-count">{seleccionados.length} marcados</span>}
             <button 
               onClick={handleEliminarMasivo}
               disabled={seleccionados.length === 0}
               className="btn-inventory-delete"
             >
               <Trash2 size={18} /> Eliminar Seleccionados
             </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Inventory;