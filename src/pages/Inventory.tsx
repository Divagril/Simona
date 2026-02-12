import React, { useState, useEffect } from 'react';
import { Search, RefreshCw, FilePenLine } from 'lucide-react';
import { getProductos, addProducto, updateProducto, eliminarProducto } from '../services/api';
import { useNotification } from '../context/NotificationContext';
import ConfirmModal from '../components/ConfirmModal';
import type { Producto } from '../types';

const Inventory: React.FC = () => {
  const { showNotification } = useNotification();
  
  // --- ESTADOS ---
  const [productos, setProductos] = useState<Producto[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Estado inicial limpio
  const estadoInicial: any = {
    codigo_barra: '',
    nombre: '',
    precio: '',
    cantidad: '',
    unidad: 'UNIDAD'
  };

  const [form, setForm] = useState<any>(estadoInicial);

  // --- CARGA DE DATOS ---
  const cargarInventario = async () => {
    try {
      const data = await getProductos();
      setProductos(data);
    } catch (error) {
      showNotification("Error al conectar con el servidor", true);
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
    if (!form.nombre.trim()) {
      showNotification("⚠️ El nombre es obligatorio", true);
      return;
    }

    // Lógica de Código Automático
    let codigoFinal = form.codigo_barra.trim();
    if (!codigoFinal) {
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
        // ACTUALIZAR
        await updateProducto(form._id, datosParaEnviar);
        showNotification("✅ Producto actualizado con éxito");
      } else {
        // GUARDAR NUEVO
        await addProducto(datosParaEnviar);
        showNotification(`✅ Guardado con código: ${codigoFinal}`);
      }
      limpiarForm();
      cargarInventario();
    } catch (error) {
      showNotification("❌ Error al procesar la solicitud", true);
    }
  };

  const ejecutarEliminacionReal = async () => {
    if (!form._id) return;
    try {
      await eliminarProducto(form._id);
      showNotification(`🗑️ "${form.nombre}" eliminado`);
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
        
        {/* CABECERA: TÍTULO + BOTÓN REFRESCAR CUADRADO */}
        <div className="header-row">
          <h2 className="title-icon">
            <FilePenLine size={24} strokeWidth={2.5} /> Producto
          </h2>
          <button className="btn-refresh-square" onClick={cargarInventario} title="Refrescar">
            <RefreshCw size={20} />
          </button>
        </div>

        <div className="input-field">
          <label className="input-label-bold">Código:</label>
          <input 
            type="text" 
            className="input-main" 
            placeholder="Automático si se deja vacío..."
            value={form.codigo_barra} 
            onChange={e => setForm({...form, codigo_barra: e.target.value})}
          />
        </div>

        <fieldset className="group-box" style={{ padding: '15px', margin: '15px 0' }}>
          <legend>Datos</legend>
          
          <div className="input-field">
            <label className="input-label-bold">Nombre del Producto:</label>
            <input 
              type="text" 
              className="input-main" 
              value={form.nombre} 
              onChange={e => setForm({...form, nombre: e.target.value})}
            />
          </div>

          <div className="input-field">
            <label className="input-label-bold">Uni:</label>
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
              <option value="METRO">METRO</option>
              <option value="PAQUETE">PAQUETE</option>
            </select>
          </div>

          <div className="grid-row">
            <div className="input-field">
              <label className="input-label-bold">Precio:</label>
              <input 
                type="text" 
                className="input-main" 
                value={form.precio} 
                placeholder="0.00"
                onFocus={(e) => e.target.select()}
                onChange={(e) => setForm({...form, precio: e.target.value})} 
              />
            </div>
            <div className="input-field">
              <label className="input-label-bold">Stock:</label>
              <input 
                type="text" 
                className="input-main" 
                value={form.cantidad} 
                placeholder="0"
                onFocus={(e) => e.target.select()}
                onChange={(e) => setForm({...form, cantidad: e.target.value})} 
              />
            </div>
          </div>
        </fieldset>

        {/* BOTONES ORDENADOS */}
        <div className="form-footer">
          <div className="buttons-row">
            <button 
              className="btn-guardar" 
              onClick={handleGuardar}
              disabled={!!form._id} 
              style={{ opacity: form._id ? 0.5 : 1 }}
            >
              Guardar
            </button>
            <button 
              className="btn-editar" 
              onClick={handleGuardar}
              disabled={!form._id}
              style={{ opacity: !form._id ? 0.5 : 1 }}
            >
              Editar
            </button>
          </div>
          
          <button className="btn-limpiar" onClick={limpiarForm}>
            Limpiar
          </button>
        </div>
      </div>

      {/* PANEL DERECHO: CATÁLOGO */}
      <div className="catalog-container">
        <div className="catalog-header">
          <h2 className="title-icon">
             📦 Catálogo
          </h2>
          <div className="catalog-search-box">
            <Search className="lupa-inventario" size={18} color="#7F8C8D" />
            <input 
              type="text" 
              placeholder="Buscar por nombre..." 
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
                <th style={{ width: '25%' }}>COD</th>
                <th style={{ width: '40%' }}>PROD</th>
                <th style={{ width: '15%', textAlign: 'center' }}>UNI</th>
                <th style={{ width: '10%', textAlign: 'right' }}>PRE</th>
                <th style={{ width: '10%', textAlign: 'center' }}>STK</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 ? (
                <tr>
                   <td colSpan={5} style={{textAlign:'center', padding:'30px', color:'#95a5a6'}}>
                      No hay productos que coincidan.
                   </td>
                </tr>
              ) : (
                filtrados.map(p => (
                  <tr 
                    key={p._id} 
                    onClick={() => seleccionarParaEditar(p)} 
                    className={`row-hover ${Number(p.cantidad) < 10 ? 'low-stock' : ''} ${form._id === p._id ? 'selected-row' : ''}`}
                  >
                    <td style={{ fontSize: '12px', color: '#7f8c8d' }}>{p.codigo_barra}</td>
                    <td style={{ fontWeight: 'bold' }}>{p.nombre}</td>
                    <td style={{ textAlign: 'center' }}>{p.unidad}</td>
                    <td style={{ textAlign: 'right' }}>S/. {Number(p.precio).toFixed(2)}</td>
                    <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{p.cantidad}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* BOTÓN ELIMINAR FLOTANTE A LA DERECHA */}
        <div className="footer-row">
          <button 
            className="btn-eliminar-moderno" 
            onClick={() => form._id ? setIsDeleteModalOpen(true) : showNotification("⚠️ Seleccione un producto primero", true)}
          >
            <span>🗑️</span> Eliminar
          </button>
        </div>
      </div>

      {/* MODAL DE CONFIRMACIÓN */}
      <ConfirmModal 
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={ejecutarEliminacionReal}
        titulo="¿Eliminar Producto?"
        mensaje={form.nombre ? "¿Estás seguro de eliminar permanentemente " + form.nombre + "?" : ""}
      />
    </div>
  );
};

export default Inventory;