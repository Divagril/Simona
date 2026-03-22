import React, { useState, useEffect } from 'react';
import { getProductos } from '../services/api';
import axios from 'axios';
import { Trash2, CheckSquare, Square, Search, Box } from 'lucide-react';
import { useNotification } from '../context/NotificationContext';
import './Catalogo.css'; // Importación de estilos

const Catalogo: React.FC = () => {
  const { showNotification } = useNotification();
  
  const [productos, setProductos] = useState<any[]>([]);
  const [seleccionados, setSeleccionados] = useState<string[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(false);

  const API_URL = 'https://simona-backend.onrender.com/api';

  const cargar = async () => {
    setCargando(true);
    try {
      const res = await getProductos();
      setProductos(Array.isArray(res) ? res : []);
      setSeleccionados([]); // Limpiar selección al recargar
    } catch (error) {
      showNotification("Error al cargar catálogo", true);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  // Alternar selección individual
  const toggleUno = (id: string) => {
    setSeleccionados(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // Seleccionar o deseleccionar todos los visibles
  const toggleTodos = () => {
    const visibles = productos.filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase()));
    if (seleccionados.length === visibles.length) {
      setSeleccionados([]);
    } else {
      setSeleccionados(visibles.map(p => p._id));
    }
  };

  const eliminarMasivo = async () => {
    if (seleccionados.length === 0) return;
    if (window.confirm(`¿Está seguro de eliminar ${seleccionados.length} productos?`)) {
      try {
        await axios.post(`${API_URL}/productos/eliminar-masivo`, { ids: seleccionados });
        showNotification(`✅ Se eliminaron ${seleccionados.length} productos`);
        cargar();
      } catch (error) {
        showNotification("No se pudo completar la eliminación", true);
      }
    }
  };

  const filtrados = productos.filter(p => 
    p.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="catalogo-layout">
      
      {/* HEADER */}
      <header className="catalogo-header">
        <h2><Box size={32} color="#3b82f6" /> Catálogo Maestro</h2>
        <div className="search-pill-wrapper">
          <Search className="icon-lupa" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por nombre de producto..." 
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
      </header>

      {/* TABLA */}
      <div className="table-card">
        <div className="table-responsive">
          <table className="modern-table">
            <thead>
              <tr>
                <th className="col-check">
                  <button onClick={toggleTodos} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                    {seleccionados.length > 0 && seleccionados.length === filtrados.length 
                      ? <CheckSquare size={22} color="#3b82f6" /> 
                      : <Square size={22} color="#94a3b8" />
                    }
                  </button>
                </th>
                <th>COD</th>
                <th>PRODUCTO</th>
                <th>UNIDAD</th>
                <th>PRECIO</th>
                <th style={{ textAlign: 'center' }}>STOCK</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '50px', color: '#94a3b8' }}>No se encontraron productos.</td></tr>
              ) : (
                filtrados.map((p) => (
                  <tr 
                    key={p._id} 
                    onClick={() => toggleUno(p._id)}
                    className={`row-hover ${seleccionados.includes(p._id) ? 'row-selected' : ''} ${p.stock_actual <= 0 ? 'row-no-stock' : ''}`}
                  >
                    <td className="col-check">
                      {seleccionados.includes(p._id) 
                        ? <CheckSquare size={20} color="#3b82f6" /> 
                        : <Square size={20} color="#cbd5e1" />
                      }
                    </td>
                    <td className="col-cod">{p._id.substring(0, 8).toUpperCase()}</td>
                    <td className="col-prod">{p.nombre}</td>
                    <td>{p.unidad_venta || 'UNIDAD'}</td>
                    <td className="bold">S/. {Number(p.precio).toFixed(2)}</td>
                    <td className={`col-stock text-center ${p.stock_actual <= 0 ? 'text-red' : 'text-blue'}`}>
                      {p.stock_actual}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* BOTÓN FLOTANTE ELIMINAR */}
      {seleccionados.length > 0 && (
        <button className="floating-delete-btn" onClick={eliminarMasivo}>
          <Trash2 size={22} /> ELIMINAR SELECCIONADOS ({seleccionados.length})
        </button>
      )}

    </div>
  );
};

export default Catalogo;