import React, { useState, useEffect } from 'react';
import { Search, RefreshCw, Trash2, Package, PlusCircle, CheckCircle } from 'lucide-react';
import { getProductos, addProducto, updateProducto, eliminarProducto } from '../services/api';
import { useNotification } from '../context/NotificationContext';
import ConfirmModal from '../components/ConfirmModal';
import type { Producto } from '../types';

const Inventory: React.FC = () => {
  const { showNotification } = useNotification();
  
  // --- ESTADOS ---
  const estadoInicial: any = {
    codigo_barra: '',
    nombre: '',
    precio: '',
    cantidad: '', // Representa el STOCK en la interfaz
    unidad: 'UNIDAD'
  };

  const [productos, setProductos] = useState<Producto[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [form, setForm] = useState<any>(estadoInicial);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // --- CARGA DE DATOS ---
  const cargarInventario = async () => {
    try {
      const data = await getProductos();
      setProductos(data);
    } catch (error) {
      showNotification("Error al cargar inventario", true);
    }
  };

  useEffect(() => {
    cargarInventario();
  }, []);

  // --- FUNCIONES LÓGICAS ---
  const limpiarForm = () => setForm(estadoInicial);

  const seleccionarParaEditar = (prod: Producto) => {
    setForm(prod);
  };

  const handleGuardar = async () => {
    if (!form.nombre) {
      showNotification("⚠️ El nombre es obligatorio", true);
      return;
    }

    // Lógica de Código Automático (Solo si es nuevo y el campo está vacío)
    let codigoFinal = form.codigo_barra.trim();
    if (!form._id && !codigoFinal) {
      codigoFinal = "MAN-" + Date.now().toString().slice(-10);
    }

    const datosParaEnviar = {
      ...form,
      codigo_barra: codigoFinal,
      precio: Number(form.precio) || 0,
      cantidad: Number(form.cantidad) || 0
    };

    try {
      if (form._id) {
        await updateProducto(form._id, datosParaEnviar);
        showNotification("✅ Producto actualizado");
      } else {
        await addProducto(datosParaEnviar);
        showNotification(`✅ Guardado con código: ${codigoFinal}`);
      }
      limpiarForm();
      cargarInventario();
    } catch (error) {
      showNotification("❌ Error al guardar", true);
    }
  };

  const ejecutarEliminacionReal = async () => {
    if (!form._id) return;
    try {
      await eliminarProducto(form._id);
      showNotification("🗑️ Producto eliminado");
      limpiarForm();
      cargarInventario();
    } catch (error) {
      showNotification("Error al eliminar", true);
    }
  };

  const filtrados = productos.filter(p => 
    p.nombre.toLowerCase().includes(busqueda.toLowerCase()) || 
    p.codigo_barra.includes(busqueda)
  );

  return (
    <div className="inventory-layout">
      
      {/* PANEL IZQUIERDO: FORMULARIO */}
      <div className="form-container">
        <div className="header-row">
          <h2 className="title-icon">📝 Producto</h2>
          <button className="btn-icon-refresh" onClick={cargarInventario}>
            <RefreshCw size={16} />
          </button>
        </div>

        <div className="input-field">
          <label>Código:</label>
          <input 
            type="text" 
            className="input-main" 
            placeholder="Automático si se deja vacío..."
            value={form.codigo_barra} 
            onChange={e => setForm({...form, codigo_barra: e.target.value})}
          />
        </div>

        <fieldset className="group-box">
          <legend>Datos</legend>
          
          <div className="input-field">
            <label>Nombre:</label>
            <input 
              type="text" 
              className="input-main" 
              value={form.nombre} 
              onChange={e => setForm({...form, nombre: e.target.value})}
            />
          </div>

          <div className="input-field">
            <label>Uni:</label>
            <select 
              className="input-main" 
              value={form.unidad} 
              onChange={e => setForm({...form, unidad: e.target.value})}
            >
              <option value="UNIDAD">UNIDAD</option>
              <option value="BOTELLA">BOTELLA</option>
              <option value="LATA">LATA</option>
              <option value="KG">KG</option>
              <option value="LITRO">LITRO</option>
              <option value="PAQUETE">PAQUETE</option>
            </select>
          </div>

          <div className="grid-row">
            <div className="input-field">
              <label>Precio:</label>
              <input 
                type="text" 
                className="input-main" 
                value={form.precio} 
                onFocus={(e) => e.target.select()}
                onChange={(e) => setForm({...form, precio: e.target.value})} 
              />
            </div>
            <div className="input-field">
              <label>Stock:</label>
              <input 
                type="text" 
                className="input-main" 
                value={form.cantidad} 
                onFocus={(e) => e.target.select()}
                onChange={(e) => setForm({...form, cantidad: e.target.value})} 
              />
            </div>
          </div>
        </fieldset>

        <div className="action-buttons" style={{ display: 'flex', gap: '10px' }}>
          <button className="btn-guardar" style={{flex:1}} onClick={handleGuardar}>Guardar</button>
          <button className="btn-editar" style={{flex:1}} onClick={handleGuardar}>Editar</button>
        </div>
        <button className="btn-limpiar" style={{width:'100%', marginTop:'8px'}} onClick={limpiarForm}>Limpiar</button>
      </div>

      {/* PANEL DERECHO: CATÁLOGO */}
      <div className="catalog-container">
        <div className="catalog-header">
          <h2 className="title-icon">📦 Catálogo</h2>
          <div className="catalog-search-box">
            <span className="lupa-inventario">🔍</span>
            <input 
              type="text" 
              placeholder="Buscar..." 
              className="input-busqueda-inventario" 
              value={busqueda} 
              onChange={e => setBusqueda(e.target.value)} 
            />
          </div>
        </div>

        <div className="table-wrapper">
          <table className="modern-table">
            <thead>
              <tr>
                <th>COD</th>
                <th>PROD</th>
                <th>UNI</th>
                <th style={{ textAlign: 'right' }}>PRE</th>
                <th style={{ textAlign: 'center' }}>STK</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map(p => (
                <tr 
                  key={p._id} 
                  onClick={() => seleccionarParaEditar(p)} 
                  className={`row-hover ${Number(p.cantidad) < 10 ? 'low-stock' : ''} ${form._id === p._id ? 'selected-row' : ''}`}
                >
                  <td style={{ fontSize: '12px', color: '#7f8c8d' }}>{p.codigo_barra}</td>
                  <td className="bold">{p.nombre}</td>
                  <td>{p.unidad}</td>
                  <td style={{ textAlign: 'right' }}>S/. {Number(p.precio).toFixed(2)}</td>
                  <td className="bold" style={{ textAlign: 'center' }}>{p.cantidad}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="footer-row">
          <button className="btn-eliminar-moderno" onClick={() => form._id ? setIsDeleteModalOpen(true) : showNotification("Seleccione un producto", true)}>
            <span className="icon-trash">🗑️</span> Eliminar
          </button>
        </div>
      </div>

      <ConfirmModal 
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={ejecutarEliminacionReal}
        titulo="¿Eliminar Producto?"
        mensaje={form.nombre ? "¿Estás seguro de eliminar " + form.nombre + "?" : ""}
      />
    </div>
  );
};

export default Inventory;