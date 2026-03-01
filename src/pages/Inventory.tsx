import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Trash2, CheckSquare, Square, Box, Save, 
  Eraser, Search, PackageCheck, ChevronDown, RefreshCw
} from 'lucide-react';

const Inventory: React.FC = () => {
  // --- ESTADOS ---
  const [productos, setProductos] = useState<any[]>([]);
  const [sugerencias, setSugerencias] = useState<string[]>([]); // Nombres desde la colección Inversiones
  const [form, setForm] = useState({ nombre: '', unidad: 'UNIDAD', precio: '', stock: '0' });
  const [seleccionados, setSeleccionados] = useState<string[]>([]); 
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(false);

  // URL de producción en Render
  const API_URL = 'https://simona-backend.onrender.com/api';

  // --- CARGA DE DATOS ---
  const cargarTodo = async () => {
    try {
      setCargando(true);
      const [resProds, resSugerencias] = await Promise.all([
        axios.get(`${API_URL}/productos`),
        axios.get(`${API_URL}/nombres-inversiones`) 
      ]);
      setProductos(resProds.data);
      setSugerencias(resSugerencias.data);
    } catch (error) {
      console.error("Error al cargar inventario:", error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargarTodo(); }, []);

  // --- LÓGICA DE FORMULARIO INTELIGENTE ---
  // Al seleccionar un nombre, buscamos si ya existe en el catálogo para traer su stock real
  const handleSelectNombre = (nombre: string) => {
    const existe = productos.find(p => p.nombre.toLowerCase() === nombre.toLowerCase());
    if (existe) {
      setForm({
        nombre: existe.nombre,
        unidad: existe.unidad || 'UNIDAD',
        precio: existe.precio.toString(),
        stock: existe.cantidad.toString()
      });
    } else {
      setForm({ ...form, nombre: nombre, stock: '0' });
    }
  };

  // --- ACCIONES ---
  const handleGuardar = async () => {
    if (!form.nombre) return alert("❌ Debe seleccionar un producto de la lista de inversiones");
    
    try {
      // ENVIAMOS SOLO PRECIO Y UNIDAD. El stock se mantiene intacto en el backend.
      await axios.post(`${API_URL}/productos`, { 
          nombre: form.nombre, 
          unidad: form.unidad, 
          precio: Number(form.precio) || 0
          // No enviamos cantidad aquí para prohibir el stock manual
      });
      alert("✅ Precio y medida actualizados correctamente");
      setForm({ nombre: '', unidad: 'UNIDAD', precio: '', stock: '0' });
      cargarTodo();
    } catch (error) {
      alert("❌ Error al actualizar el producto");
    }
  };

  const toggleSeleccion = (id: string) => {
    setSeleccionados(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleTodos = () => {
    if (seleccionados.length === productos.length) setSeleccionados([]);
    else setSeleccionados(productos.map(p => p._id));
  };

  const handleEliminarMasivo = async () => {
    if (seleccionados.length === 0) return;
    const confirmar = window.confirm(`¿Seguro que quieres eliminar ${seleccionados.length} productos?`);
    if (confirmar) {
      try {
        await axios.post(`${API_URL}/productos/eliminar-masivo`, { ids: seleccionados });
        setSeleccionados([]);
        cargarTodo();
      } catch (error) { alert("❌ Error al eliminar"); }
    }
  };

  const prodsFiltrados = productos.filter(p => 
    p.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="inventory-page-container">
      
      {/* PANEL IZQUIERDO: GESTIÓN (FORMULARIO) */}
      <aside className="inventory-form-aside">
        <div className="inventory-card">
          <h3 className="inventory-title">
            <Box color="#3498db" size={24}/> Gestión de Stock
          </h3>

          <div className="inventory-form-group">
            <label className="inventory-label">PRODUCTO DE COMPRA (INVERSIÓN)</label>
            <div className="select-wrapper">
              <select 
                className="inventory-select-main"
                value={form.nombre} 
                onChange={e => handleSelectNombre(e.target.value)}
              >
                <option value="">-- ELIGE UN PRODUCTO --</option>
                {sugerencias.map((nom, i) => (
                  <option key={i} value={nom}>{nom.toUpperCase()}</option>
                ))}
              </select>
              <ChevronDown className="select-icon" size={18} />
            </div>
            {sugerencias.length === 0 && <small style={{color: 'red'}}>No hay mercadería en Inversiones</small>}
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
                  <label className="inventory-label">PRECIO VENTA (S/.)</label>
                  <input type="number" className="inventory-input" placeholder="0.00" value={form.precio} onChange={e => setForm({...form, precio: e.target.value})} />
              </div>
              <div className="inventory-form-group">
                  <label className="inventory-label">STOCK ACTUAL</label>
                  <input 
                    type="text" 
                    className="inventory-input" 
                    style={{ backgroundColor: '#f4f6f7', color: '#7f8c8d', fontWeight: 'bold', cursor: 'not-allowed' }}
                    value={form.stock} 
                    readOnly 
                  />
              </div>
          </div>
          <p style={{ fontSize: '10px', color: '#3498db', marginTop: '-10px', marginBottom: '15px' }}>
            ℹ️ El stock solo se puede aumentar desde el módulo Inversiones.
          </p>

          <div className="inventory-form-actions">
              <button onClick={handleGuardar} className="btn-inventory-save">
                <Save size={18}/> Actualizar Producto
              </button>
              <button onClick={() => setForm({ nombre: '', unidad: 'UNIDAD', precio: '', stock: '0' })} className="btn-inventory-clear">
                <Eraser size={18}/> Limpiar Campos
              </button>
          </div>
        </div>
      </aside>

      {/* PANEL DERECHO: CATÁLOGO (TABLA) */}
      <section className="inventory-table-section">
        <div className="inventory-card">
          <div className="inventory-table-header">
            <h3 className="inventory-title">
              <PackageCheck size={24} color="#3498db" /> Catálogo Real
            </h3>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={cargarTodo} className="btn-refresh-inventory"><RefreshCw size={18} className={cargando ? 'spin' : ''} /></button>
              <div className="inventory-search-wrapper">
                <Search size={18} className="search-icon" />
                <input 
                  type="text" placeholder="Buscar..." className="inventory-search-input"
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
                          {seleccionados.length === productos.length && productos.length > 0 ? <CheckSquare size={20} color="#3498db"/> : <Square size={20} color="#bdc3c7"/>}
                      </button>
                  </th>
                  <th>Producto</th>
                  <th>Medida</th>
                  <th style={{ textAlign: 'right' }}>P. Venta</th>
                  <th style={{ textAlign: 'center' }}>Stock</th>
                </tr>
              </thead>
              <tbody>
                {prodsFiltrados.map((p) => (
                  <tr key={p._id} className={seleccionados.includes(p._id) ? 'row-selected' : ''}>
                    <td style={{ textAlign: 'center' }}>
                      <button onClick={() => toggleSeleccion(p._id)} className="btn-check-invisible">
                          {seleccionados.includes(p._id) ? <CheckSquare size={20} color="#3498db"/> : <Square size={20} color="#dfe6e9"/>}
                      </button>
                    </td>
                    <td style={{ fontWeight: 'bold' }}>{p.nombre.toUpperCase()}</td>
                    <td>{p.unidad}</td>
                    <td style={{ textAlign: 'right', fontWeight: 'bold' }}>S/. {p.precio.toFixed(2)}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`stock-badge ${p.cantidad <= 0 ? 'empty' : 'fine'}`}>
                        {p.cantidad}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="inventory-table-footer">
             {seleccionados.length > 0 && <span className="selected-count">{seleccionados.length} seleccionados</span>}
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