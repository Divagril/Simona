import React, { useState, useEffect } from 'react';
import { getProductos } from '../services/api';
import axios from 'axios';
import { Trash2, CheckSquare, Square, Search, Box } from 'lucide-react';

const Catalogo: React.FC = () => {
  const [productos, setProductos] = useState<any[]>([]);
  const [seleccionados, setSeleccionados] = useState<string[]>([]);
  const [busqueda, setBusqueda] = useState('');

  const cargar = async () => {
    const res = await getProductos();
    setProductos(res);
  };

  useEffect(() => { cargar(); }, []);

  // Seleccionar uno por uno
  const toggleUno = (id: string) => {
    setSeleccionados(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // Seleccionar TODOS
  const toggleTodos = () => {
    if (seleccionados.length === productos.length) setSeleccionados([]);
    else setSeleccionados(productos.map(p => p._id));
  };

  const eliminarMasivo = async () => {
    if (seleccionados.length === 0) return;
    if (window.confirm(`¿Eliminar ${seleccionados.length} productos?`)) {
      await axios.post('http://localhost:5000/api/productos/eliminar-masivo', { ids: seleccionados });
      setSeleccionados([]);
      cargar();
    }
  };

  const filtrados = productos.filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase()));

  return (
    <div style={{ padding: '30px', backgroundColor: '#f4f7f6', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><Box /> Catálogo de Productos</h2>
        <input 
          type="text" placeholder="🔍 Buscar producto..." 
          style={{ padding: '10px', borderRadius: '10px', border: '1px solid #ccc', width: '300px' }}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

      <div style={{ background: 'white', borderRadius: '15px', overflow: 'hidden', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: '#ebedef', color: '#666', fontSize: '13px' }}>
            <tr>
              <th style={{ padding: '15px', width: '50px' }}>
                <button onClick={toggleTodos} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                  {seleccionados.length === productos.length ? <CheckSquare size={20} color="#2563eb" /> : <Square size={20} />}
                </button>
              </th>
              <th style={{ padding: '15px', textAlign: 'left' }}>COD</th>
              <th style={{ padding: '15px', textAlign: 'left' }}>PROD</th>
              <th style={{ padding: '15px', textAlign: 'left' }}>UNI</th>
              <th style={{ padding: '15px', textAlign: 'left' }}>PRE</th>
              <th style={{ padding: '15px', textAlign: 'left' }}>STK</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((p) => (
              <tr 
                key={p._id} 
                onClick={() => toggleUno(p._id)}
                style={{ 
                  borderBottom: '1px solid #eee', 
                  cursor: 'pointer',
                  backgroundColor: seleccionados.includes(p._id) ? '#f0f7ff' : (p.cantidad === 0 ? '#fff5f5' : 'white') 
                }}
              >
                <td style={{ padding: '15px', textAlign: 'center' }}>
                  {seleccionados.includes(p._id) ? <CheckSquare size={20} color="#2563eb" /> : <Square size={20} color="#ccc" />}
                </td>
                <td style={{ padding: '15px', fontSize: '12px', color: '#999' }}>{p._id.substring(0,8)}</td>
                <td style={{ padding: '15px', fontWeight: 'bold' }}>{p.nombre.toUpperCase()}</td>
                <td style={{ padding: '15px' }}>{p.unidad || 'UNIDAD'}</td>
                <td style={{ padding: '15px' }}>S/. {p.precio?.toFixed(2)}</td>
                <td style={{ padding: '15px', fontWeight: 'bold', color: p.cantidad === 0 ? 'red' : 'black' }}>{p.cantidad}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* BOTÓN FLOTANTE: Solo sale si hay algo marcado */}
      {seleccionados.length > 0 && (
        <button 
          onClick={(e) => { e.stopPropagation(); eliminarMasivo(); }}
          style={{ 
            position: 'fixed', bottom: '30px', right: '30px', 
            backgroundColor: '#ef4444', color: 'white', padding: '15px 30px', 
            borderRadius: '50px', border: 'none', fontWeight: 'bold', cursor: 'pointer',
            boxShadow: '0 5px 15px rgba(239, 68, 68, 0.4)', display: 'flex', alignItems: 'center', gap: '10px'
          }}
        >
          <Trash2 size={20} /> Eliminar Seleccionados ({seleccionados.length})
        </button>
      )}
    </div>
  );
};

export default Catalogo;