import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Trash2, CheckSquare, Square, Box, Save, 
  Eraser, Search, PackageCheck, ChevronDown, RefreshCw
} from 'lucide-react';

const Inventory: React.FC = () => {
  const [productos, setProductos] = useState<any[]>([]);
  const [sugerencias, setSugerencias] = useState<string[]>([]);
  const [form, setForm] = useState({ nombre: '', unidad: 'UNIDAD', precio: '', stock: '0' });
  const [seleccionados, setSeleccionados] = useState<string[]>([]); 
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(false);

  const API_URL = 'https://simona-backend.onrender.com/api';

  const cargarTodo = async () => {
    try {
      setCargando(true);
      const [resProds, resSugerencias] = await Promise.all([
        axios.get(`${API_URL}/productos`),
        axios.get(`${API_URL}/nombres-inversiones`) 
      ]);
      setProductos(Array.isArray(resProds.data) ? resProds.data : []);
      setSugerencias(Array.isArray(resSugerencias.data) ? resSugerencias.data : []);
    } catch (error) {
      console.error("Error al cargar:", error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargarTodo(); }, []);

  const handleSelectNombre = (nombre: string) => {
    if (!nombre) {
        setForm({ nombre: '', unidad: 'UNIDAD', precio: '', stock: '0' });
        return;
    }
    const existe = productos.find(p => p.nombre && p.nombre.toLowerCase() === nombre.toLowerCase());
    if (existe) {
      setForm({
        nombre: existe.nombre,
        unidad: existe.unidad || 'UNIDAD',
        precio: (existe.precio || 0).toString(),
        stock: (existe.cantidad || 0).toString()
      });
    } else {
      setForm({ nombre, unidad: 'UNIDAD', precio: '', stock: '0' });
    }
  };

  const handleGuardar = async () => {
    if (!form.nombre) return alert("❌ Seleccione un producto");
    
    try {
      await axios.post(`${API_URL}/productos`, { 
          nombre: form.nombre, 
          unidad: form.unidad, 
          precio: Number(form.precio) || 0
      });
      alert("✅ Actualizado con éxito");
      // RESETEAR FORMULARIO ANTES DE CARGAR PARA EVITAR COLISIONES
      setForm({ nombre: '', unidad: 'UNIDAD', precio: '', stock: '0' });
      await cargarTodo();
    } catch (error) {
      alert("❌ Error al guardar");
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
    if (!window.confirm(`¿Seguro que quieres eliminar ${seleccionados.length} productos?`)) return;
    try {
      await axios.post(`${API_URL}/productos/eliminar-masivo`, { ids: seleccionados });
      setSeleccionados([]);
      await cargarTodo();
    } catch (error) { alert("❌ Error al eliminar"); }
  };

  const prodsFiltrados = productos.filter(p => 
    (p.nombre || '').toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="inventory-page-container">
      <aside className="inventory-form-aside">
        <div className="inventory-card">
          <h3 className="inventory-title"><Box color="#3498db" size={24}/> Gestión de Stock</h3>
          <div className="inventory-form-group">
            <label className="inventory-label">PRODUCTO DE INVERSIÓN</label>
            <div className="select-wrapper">
              <select className="inventory-select-main" value={form.nombre} onChange={e => handleSelectNombre(e.target.value)}>
                <option value="">-- ELIGE UN PRODUCTO --</option>
                {sugerencias.map((nom, i) => <option key={i} value={nom}>{nom.toUpperCase()}</option>)}
              </select>
              <ChevronDown className="select-icon" size={18} />
            </div>
          </div>
          <div className="inventory-form-group">
            <label className="inventory-label">UNIDAD DE MEDIDA</label>
            <select className="inventory-input" value={form.unidad} onChange={e => setForm({...form, unidad: e.target.value})}>
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
                  <label className="inventory-label">STOCK ACTUAL</label>
                  <input type="text" className="inventory-input" style={{ backgroundColor: '#f4f6f7', cursor: 'not-allowed' }} value={form.stock} readOnly />
              </div>
          </div>
          <div className="inventory-form-actions">
              <button onClick={handleGuardar} className="btn-inventory-save"><Save size={18}/> Actualizar Producto</button>
              <button onClick={() => setForm({ nombre: '', unidad: 'UNIDAD', precio: '', stock: '0' })} className="btn-inventory-clear"><Eraser size={18}/> Limpiar</button>
          </div>
        </div>
      </aside>

      <section className="inventory-table-section">
        <div className="inventory-card">
          <div className="inventory-table-header">
            <h3 className="inventory-title"><PackageCheck size={24} color="#3498db" /> Catálogo</h3>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={cargarTodo} className="btn-refresh-inventory"><RefreshCw size={18} className={cargando ? 'spin' : ''} /></button>
              <div className="inventory-search-wrapper">
                <Search size={18} className="search-icon" />
                <input type="text" placeholder="Buscar..." className="inventory-search-input" onChange={(e) => setBusqueda(e.target.value)} />
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
                    <td style={{ fontWeight: 'bold' }}>{(p.nombre || 'SIN NOMBRE').toUpperCase()}</td>
                    <td>{p.unidad || 'UNIDAD'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 'bold' }}>S/. {(Number(p.precio) || 0).toFixed(2)}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`stock-badge ${(p.cantidad || 0) <= 0 ? 'empty' : 'fine'}`}>
                        {p.cantidad || 0}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="inventory-table-footer">
             <button onClick={handleEliminarMasivo} disabled={seleccionados.length === 0} className="btn-inventory-delete"><Trash2 size={18} /> Eliminar Seleccionados ({seleccionados.length})</button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Inventory;