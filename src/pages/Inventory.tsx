import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Trash2, CheckSquare, Square, Box, Save, Search, RefreshCw, ChevronDown } from 'lucide-react';

const Inventory: React.FC = () => {
  const [productos, setProductos] = useState<any[]>([]);
  const [sugerencias, setSugerencias] = useState<string[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(false);
  const [seleccionados, setSeleccionados] = useState<string[]>([]);
  
  const [form, setForm] = useState({
    nombre: '',
    unidad_venta: 'PAQUETE',
    precio: '',
    conversion: '1'
  });

  const API_URL = 'https://simona-backend.onrender.com/api';

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const [resP, resS] = await Promise.all([
        axios.get(`${API_URL}/productos`),
        axios.get(`${API_URL}/nombres-inversiones`)
      ]);
      setProductos(resP.data);
      setSugerencias(resS.data);
    } catch (e) { console.error(e); }
    finally { setCargando(false); }
  };

  useEffect(() => { cargarDatos(); }, []);

  const handleGuardar = async () => {
    if (!form.nombre) return alert("Seleccione un producto");
    try {
      await axios.post(`${API_URL}/productos`, {
        nombre: form.nombre,
        precio: Number(form.precio) || 0,
        unidad_venta: form.unidad_venta,
        unidades_por_paquete: Number(form.conversion) || 1
      });
      alert("✅ Producto actualizado");
      cargarDatos();
    } catch (e) { alert("Error al guardar"); }
  };

  const prodsFiltrados = productos.filter(p => (p.nombre || '').toLowerCase().includes(busqueda.toLowerCase()));

  return (
    <div className="inventory-page-container" style={{display: 'flex', gap: '20px', padding: '20px'}}>
      
      {/* FORMULARIO */}
      <div className="inventory-card" style={{flex: '0 0 350px', background: 'white', padding: '20px', borderRadius: '15px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)'}}>
        <h3 style={{display: 'flex', alignItems: 'center', gap: '10px'}}><Box color="#3498db"/> Gestión</h3>
        
        <label className="inventory-label">PRODUCTO DE INVERSIÓN</label>
        <select className="inventory-input" style={{width:'100%', marginBottom:'15px'}} value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})}>
          <option value="">-- SELECCIONE --</option>
          {sugerencias.map((n, i) => <option key={i} value={n}>{n.toUpperCase()}</option>)}
        </select>

        <label className="inventory-label">¿CÓMO LO VENDES?</label>
        <select className="inventory-input" style={{width:'100%', marginBottom:'15px'}} value={form.unidad_venta} onChange={e => setForm({...form, unidad_venta: e.target.value})}>
          <option value="PAQUETE">POR PAQUETE / CAJA</option>
          <option value="UNIDAD">POR UNIDAD (DETALLE)</option>
        </select>

        {form.unidad_venta === 'UNIDAD' && (
          <div style={{background: '#e3f2fd', padding: '10px', borderRadius: '8px', marginBottom: '15px'}}>
            <label className="inventory-label">¿CUÁNTAS UNIDADES TRAE EL PAQUETE?</label>
            <input type="number" className="inventory-input" value={form.conversion} onChange={e => setForm({...form, conversion: e.target.value})} />
          </div>
        )}

        <label className="inventory-label">PRECIO VENTA (S/.)</label>
        <input type="number" className="inventory-input" style={{width:'100%', marginBottom:'20px'}} value={form.precio} onChange={e => setForm({...form, precio: e.target.value})} placeholder="0.00" />

        <button onClick={handleGuardar} className="btn-inventory-save" style={{width:'100%', padding:'15px', background:'#27ae60', color:'white', border:'none', borderRadius:'10px', fontWeight:'bold', cursor:'pointer'}}>
          SINCRONIZAR E INVENTARIAR
        </button>
      </div>

      {/* TABLA */}
      <div className="inventory-card" style={{flex: 1, background: 'white', padding: '20px', borderRadius: '15px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)'}}>
        <div style={{display:'flex', justifyContent:'space-between', marginBottom:'15px'}}>
          <h3>Catálogo ({prodsFiltrados.length})</h3>
          <button onClick={cargarDatos} style={{border:'none', background:'none', cursor:'pointer'}}><RefreshCw className={cargando ? 'spin' : ''}/></button>
        </div>

        <div style={{maxHeight: '500px', overflowY: 'auto', border: '1px solid #eee', borderRadius: '10px'}}>
          <table style={{width: '100%', borderCollapse: 'collapse'}}>
            <thead style={{background: '#f8f9fa', position: 'sticky', top: 0}}>
              <tr>
                <th style={{padding: '12px', textAlign: 'left'}}>PRODUCTO</th>
                <th style={{padding: '12px'}}>VENTA</th>
                <th style={{padding: '12px', textAlign: 'right'}}>PRECIO</th>
                <th style={{padding: '12px', textAlign: 'center'}}>STOCK</th>
              </tr>
            </thead>
            <tbody>
              {prodsFiltrados.map(p => (
                <tr key={p._id} style={{borderBottom: '1px solid #eee'}}>
                  <td style={{padding: '12px', fontWeight: 'bold'}}>{(p.nombre || 'SIN NOMBRE').toUpperCase()}</td>
                  <td style={{padding: '12px', textAlign: 'center'}}><span style={{fontSize:'10px', background:'#eee', padding:'2px 6px', borderRadius:'4px'}}>{p.unidad_venta}</span></td>
                  <td style={{padding: '12px', textAlign: 'right'}}>S/. {(p.precio || 0).toFixed(2)}</td>
                  <td style={{padding: '12px', textAlign: 'center'}}>
                    <b style={{color: p.stock_actual > 0 ? '#27ae60' : '#e74c3c'}}>{p.stock_actual}</b>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Inventory;