import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Trash2, CheckSquare, Square, Box, Save, Eraser, Search, ChevronDown, RefreshCw } from 'lucide-react';

const Inventory: React.FC = () => {
  const [productos, setProductos] = useState<any[]>([]);
  const [sugerencias, setSugerencias] = useState<string[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(false);
  const [seleccionados, setSeleccionados] = useState<string[]>([]);
  
  const [form, setForm] = useState({
    nombre: '',
    unidad: 'PAQUETE',
    precio: '',
    conversion: '1', // Unidades por paquete
    stockCalculado: 0
  });

  const API_URL = 'https://simona-backend.onrender.com/api';

  const cargarTodo = async () => {
    setCargando(true);
    const [resProds, resSugs] = await Promise.all([
      axios.get(`${API_URL}/productos`),
      axios.get(`${API_URL}/nombres-inversiones`)
    ]);
    setProductos(resProds.data);
    setSugerencias(resSugs.data);
    setCargando(false);
  };

  useEffect(() => { cargarTodo(); }, []);

  // Lógica para traer el stock de Inversiones y convertirlo
  const handleSelectNombre = (val: string) => {
    const p = productos.find(x => x.nombre.toLowerCase() === val.toLowerCase());
    if (p) {
      setForm({
        ...form,
        nombre: p.nombre,
        unidad: p.unidad,
        precio: p.precio.toString(),
        conversion: p.unidades_por_paquete.toString(),
        stockCalculado: p.unidad === 'UNIDAD' ? p.cantidad * p.unidades_por_paquete : p.cantidad
      });
    } else {
      setForm({ ...form, nombre: val, stockCalculado: 0 });
    }
  };

  const handleGuardar = async () => {
    if (!form.nombre) return alert("Seleccione un producto");
    await axios.post(`${API_URL}/productos`, {
      nombre: form.nombre,
      precio: Number(form.precio),
      unidad: form.unidad,
      unidades_por_paquete: Number(form.conversion)
    });
    alert("✅ Inventario Sincronizado");
    setForm({ nombre: '', unidad: 'PAQUETE', precio: '', conversion: '1', stockCalculado: 0 });
    cargarTodo();
  };

  return (
    <div className="inventory-page-container">
      <aside className="inventory-form-aside">
        <div className="inventory-card">
          <h3 className="inventory-title"><Box color="#3498db" size={24} /> Gestión de Stock</h3>
          
          <div className="inventory-form-group">
            <label className="inventory-label">PRODUCTO DE INVERSIÓN</label>
            <select className="inventory-select-main" value={form.nombre} onChange={e => handleSelectNombre(e.target.value)}>
              <option value="">-- SELECCIONE --</option>
              {sugerencias.map((n, i) => <option key={i} value={n}>{n.toUpperCase()}</option>)}
            </select>
          </div>

          <div className="inventory-form-group">
            <label className="inventory-label">MODO DE VENTA (MEDIDA)</label>
            <select className="inventory-input" value={form.unidad} onChange={e => setForm({...form, unidad: e.target.value})}>
              <option value="PAQUETE">VENDER POR PAQUETE / CAJA</option>
              <option value="UNIDAD">VENDER POR UNIDAD DETALLE</option>
            </select>
          </div>

          {form.unidad === 'UNIDAD' && (
            <div className="inventory-form-group" style={{background: '#fff9db', padding: '10px', borderRadius: '8px'}}>
              <label className="inventory-label">¿CUÁNTAS UNIDADES TRAE 1 PAQUETE?</label>
              <input type="number" className="inventory-input" value={form.conversion} onChange={e => setForm({...form, conversion: e.target.value})} />
            </div>
          )}

          <div className="inventory-grid-inputs">
            <div>
              <label className="inventory-label">PRECIO VENTA</label>
              <input type="number" className="inventory-input" value={form.precio} onChange={e => setForm({...form, precio: e.target.value})} />
            </div>
            <div>
              <label className="inventory-label">STOCK DISPONIBLE</label>
              <input type="text" className="inventory-input input-readonly" value={form.stockCalculado} readOnly />
            </div>
          </div>

          <button onClick={handleGuardar} className="btn-inventory-save" style={{marginTop: '20px'}}>Sincronizar e Inventariar</button>
        </div>
      </aside>

      <section className="inventory-table-section">
        <div className="inventory-card">
          <table className="inventory-table">
            <thead>
              <tr><th>Producto</th><th>Venta por</th><th style={{textAlign: 'right'}}>Precio</th><th style={{textAlign: 'center'}}>Stock</th></tr>
            </thead>
            <tbody>
              {productos.map(p => {
                // Cálculo de stock dinámico para la tabla
                const stockAMostrar = p.unidad === 'UNIDAD' ? p.cantidad * p.unidades_por_paquete : p.cantidad;
                return (
                  <tr key={p._id}>
                    <td className="font-bold">{p.nombre.toUpperCase()}</td>
                    <td>{p.unidad}</td>
                    <td style={{textAlign: 'right'}}>S/. {p.precio.toFixed(2)}</td>
                    <td style={{textAlign: 'center'}}>
                       <span className={`stock-badge ${stockAMostrar <= 0 ? 'empty' : 'fine'}`}>{stockAMostrar}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default Inventory;