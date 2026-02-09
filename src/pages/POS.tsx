import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Plus, Trash2, CreditCard, 
  History, Eye, Pause, PackageSearch, 
  Keyboard, RefreshCw, Zap
} from 'lucide-react';
import type { Producto, CartItem } from '../types';
import PaymentModal from '../components/PaymentModal';
import ClientSelectModal from '../components/ClientSelectModal';
import ConfirmModal from '../components/ConfirmModal';
import TicketPreviewModal from '../components/TicketPreviewModal';
import { getProductos, registrarVenta, registrarFiadoMasivo } from '../services/api';
import { useNotification } from '../context/NotificationContext';

const POS: React.FC = () => {
  const { showNotification } = useNotification();
  
  // --- ESTADOS ---
  const [productos, setProductos] = useState<Producto[]>([]);
  const [carrito, setCarrito] = useState<CartItem[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [selectedProd, setSelectedProd] = useState<Producto | null>(null);
  const [qty, setQty] = useState<any>('1'); 
  const [indexSeleccionadoCarrito, setIndexSeleccionadoCarrito] = useState<number | null>(null);
  
  const [parkedSales, setParkedSales] = useState<{id: number, items: CartItem[], time: string}[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);

  const [manualDesc, setManualDesc] = useState('');
  const [manualPrice, setManualPrice] = useState<any>('');

  const searchRef = useRef<HTMLInputElement>(null);

  // --- CARGA DE DATOS ---
  const cargarDatos = async () => {
    try {
      const data = await getProductos();
      setProductos(data);
    } catch (error) {
      showNotification("Error al conectar con el servidor", true);
    }
  };

  useEffect(() => {
    cargarDatos();
    searchRef.current?.focus();
  }, []);

  // --- ATAJOS DE TECLADO ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F5') { e.preventDefault(); if(carrito.length > 0) setIsModalOpen(true); }
      if (e.key === 'F6') { e.preventDefault(); holdSale(); }
      if (e.key === 'F7') { e.preventDefault(); restoreLastSale(); }
      if (e.key === 'F8') { e.preventDefault(); if(carrito.length > 0) setIsClientModalOpen(true); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [carrito, parkedSales]);

  // --- FUNCIONES LÓGICAS ---
  const focusScanner = () => searchRef.current?.focus();

  const addToCart = () => {
    if (!selectedProd) return;
    const cantidadAAgregar = Number(qty);

    if (cantidadAAgregar <= 0 || isNaN(cantidadAAgregar)) {
      showNotification("⚠️ Ingrese una cantidad válida", true);
      return;
    }

    const cantidadYaEnCarrito = carrito
      .filter(item => item._id === selectedProd._id)
      .reduce((total, item) => total + item.cantidadSeleccionada, 0);

    if (cantidadYaEnCarrito + cantidadAAgregar > selectedProd.cantidad) {
      showNotification(`⚠️ Stock insuficiente. Máximo: ${selectedProd.cantidad}`, true);
      return;
    }

    const indexExistente = carrito.findIndex(item => item._id === selectedProd._id);

    if (indexExistente !== -1) {
      const nuevoCarrito = [...carrito];
      nuevoCarrito[indexExistente].cantidadSeleccionada += cantidadAAgregar;
      nuevoCarrito[indexExistente].subtotal = nuevoCarrito[indexExistente].cantidadSeleccionada * selectedProd.precio;
      setCarrito(nuevoCarrito);
    } else {
      const newItem: CartItem = {
        ...selectedProd,
        cantidadSeleccionada: cantidadAAgregar,
        subtotal: selectedProd.precio * cantidadAAgregar
      };
      setCarrito([...carrito, newItem]);
    }

    setQty('1'); 
    showNotification(`✅ ${selectedProd.nombre} agregado`);
  };

  const addManualItem = () => {
    if (!manualDesc.trim() || !manualPrice) {
      showNotification("⚠️ Escriba descripción y precio", true);
      return;
    }
    const precioNum = Number(manualPrice);
    if (isNaN(precioNum)) return;

    const newItem: any = {
      _id: `MANUAL-${Date.now()}`, 
      nombre: manualDesc,
      precio: precioNum,
      cantidadSeleccionada: 1,
      subtotal: precioNum,
      categoria: 'MANUAL',
      esManual: true,
      cantidad: 9999,
      unidad: 'UNIDAD'
    };
    setCarrito([...carrito, newItem]);
    setManualDesc('');
    setManualPrice('');
    showNotification(`✅ Agregado: ${manualDesc}`);
  };

  const handleQuitarDelCarrito = () => {
    if (indexSeleccionadoCarrito === null) {
       showNotification("⚠️ Seleccione un producto del ticket", true);
       return;
    }
    const nuevoCarrito = [...carrito];
    nuevoCarrito.splice(indexSeleccionadoCarrito, 1);
    setCarrito(nuevoCarrito);
    setIndexSeleccionadoCarrito(null);
    showNotification("❌ Producto quitado");
  };

  const holdSale = () => {
    if (carrito.length === 0) return;
    setParkedSales([...parkedSales, { id: Date.now(), items: [...carrito], time: new Date().toLocaleTimeString() }]);
    setCarrito([]);
    showNotification("⏸️ Venta enviada a espera");
  };

  const restoreLastSale = () => {
    if (parkedSales.length === 0) {
      showNotification("⚠️ No hay ventas en espera", true);
      return;
    }
    const last = parkedSales[parkedSales.length - 1];
    setCarrito(last.items);
    setParkedSales(parkedSales.slice(0, -1));
    showNotification("📂 Venta recuperada");
  };

  const handleFinalizeVenta = async (datosPago: any) => {
    try {
      const res = await registrarVenta({ items: carrito, total, metodoPago: datosPago.metodo, ...datosPago });
      if (res.success) {
        showNotification(`✅ Venta OK. Vuelto: S/. ${datosPago.vuelto.toFixed(2)}`);
        setCarrito([]);
        setIsModalOpen(false);
        cargarDatos();
        focusScanner();
      }
    } catch (e) { showNotification("Error al cobrar", true); }
  };

  const handleConfirmarFiado = async (cliente: any) => {
    try {
      const res = await registrarFiadoMasivo({ cliente_id: cliente._id, items: carrito, total });
      if (res.success) {
        showNotification(`📝 Fiado guardado para ${cliente.nombre}`);
        setCarrito([]);
        setIsClientModalOpen(false);
        cargarDatos();
        focusScanner();
      }
    } catch (e) { showNotification("Error al registrar fiado", true); }
  };

  const total = carrito.reduce((acc, item) => acc + item.subtotal, 0);

  return (
    <div className="pos-layout">
      {/* --- COLUMNA IZQUIERDA --- */}
      <div className="pos-left">
        <fieldset className="pos-group-box">
          <legend className="pos-legend"><span className="search-icon-emoji" style={{fontSize: '22px'}}>🔍</span> Buscar</legend>
          <div className="search-header-row">
            <button className="btn-recargar-verde" onClick={cargarDatos}>
              <span className="icon-refresh">🔄</span> Recargar Lista
            </button>
          </div>
          <div className="search-inputs-stack">
            <input 
              ref={searchRef}
              type="text" 
              className="input-pos-flat" 
              placeholder="Buscar por nombre del producto..." 
              value={busqueda} 
              onChange={e => setBusqueda(e.target.value)} 
            />
          </div>
        </fieldset>

        <div className="table-container-pos panel-blanco">
          <table className="modern-table">
            <thead>
              <tr>
                <th style={{width:'50%'}}>Producto</th>
                <th style={{width:'25%', textAlign:'center'}}>Stock</th>
                <th style={{width:'25%', textAlign:'right'}}>Precio</th>
              </tr>
            </thead>
            <tbody>
              {productos.filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase())).map(p => (
                <tr key={p._id} onClick={() => { setSelectedProd(p); setQty('1'); }} 
                    className={`row-hover ${Number(p.cantidad) < 10 ? 'low-stock' : ''} ${selectedProd?._id === p._id ? 'selected-row' : ''}`}>
                  <td>{p.nombre}</td>
                  <td style={{textAlign:'center'}}>{p.cantidad}</td>
                  <td style={{textAlign:'right'}}>S/. {Number(p.precio).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className={`selection-bar-modern ${selectedProd ? 'active' : ''}`}>
          <div className="sel-product-details">
            {selectedProd ? (
              <>
                <span className="product-tag">Seleccionado</span>
                <div className="product-name-display">{selectedProd.nombre}</div>
                <div className="product-price-display">S/. {(selectedProd.precio * Number(qty)).toFixed(2)}</div>
              </>
            ) : (
              <div className="no-selection"><PackageSearch size={24} /><span>Seleccione un producto</span></div>
            )}
          </div>
          <div className="sel-controls">
            <div className="qty-wrapper">
              <label>CANTIDAD</label>
              <input type="text" className="qty-input-pos" value={qty} onFocus={(e) => e.target.select()} onChange={e => setQty(e.target.value)} disabled={!selectedProd} />
            </div>
            <button className="btn-add-main" onClick={addToCart} disabled={!selectedProd}>
              <Plus size={20} /> AGREGAR
            </button>
          </div>
        </div>

        <fieldset className="group-box-pos">
          <legend>⚡ Manual</legend>
          <div className="manual-row">
            <input type="text" placeholder="Descripción" className="input-pos-flat" style={{flex:2}} value={manualDesc} onChange={e => setManualDesc(e.target.value)} />
            <input type="text" placeholder="S/." className="input-pos-flat" style={{flex:1}} value={manualPrice} onChange={e => setManualPrice(e.target.value)} />
            <button className="btn-dark-pos" onClick={addManualItem}>Agregar</button>
          </div>
       </fieldset>
      </div>

      <div className="pos-right">
       <div className="panel-ticket-blue">
         <h2 className="ticket-title">🧾 TICKET</h2>
    
         <div className="ticket-table-wrapper">
          <table className="modern-table">
            <thead>
              <tr style={{ background: '#f8f9f9' }}>
                <th style={{ padding: '10px' }}>Producto</th>
                <th style={{ textAlign: 'center' }}>Cant</th>
                <th style={{ textAlign: 'right' }}>Total</th>
              </tr>
            </thead>
            <tbody>
               {carrito.map((item, i) => (
                  <tr 
                    key={i} 
                    onClick={() => setIndexSeleccionadoCarrito(i)} 
                    className={indexSeleccionadoCarrito === i ? 'selected-row-cart' : ''}
                  >
                  <td>{item.nombre}</td>
                  <td style={{ textAlign: 'center' }}>{item.cantidadSeleccionada}</td>
                  <td style={{ textAlign: 'right' }}>{item.subtotal.toFixed(2)}</td>
                </tr>
               ))}
            </tbody>
          </table>
        </div>

        <div className="total-section">
          <span className="total-label">TOTAL:</span>
          <span className="total-amount">S/. {total.toFixed(2)}</span>
        </div>

        <div className="pos-actions-grid">
          <button className="btn-cobrar-big" onClick={() => carrito.length > 0 && setIsModalOpen(true)}>
            <span className="icon-bg-white">✅</span> COBRAR (F5)
          </button>
  
        <div className="btn-row">
          <button className="btn-purple" onClick={() => carrito.length > 0 && setIsClientModalOpen(true)}>
            <span>📝</span> Fiado (F8)
          </button>
          <button className="btn-dark-blue" onClick={() => carrito.length > 0 && setIsTicketModalOpen(true)}>
            <span>👁️</span> Ver Ticket
          </button>
        </div>

        <div className="btn-row">
          <button className="btn-orange" onClick={holdSale}>
            <span>⌛</span> Espera (F6)
          </button>
          <button className="btn-blue" onClick={restoreLastSale}>
             <span>📁</span> Traer (F7)
          </button>
        </div>

        <div className="btn-row">
          <button className="btn-red-solid" onClick={handleQuitarDelCarrito}>
            <span style={{color: '#fff'}}>❌</span> Sacar
          </button>
          <button className="btn-gray-solid" onClick={() => setIsClearModalOpen(true)}>
             <span>🗑️</span> Limpiar
          </button>
        </div>
       </div>
       </div>
     </div>

      {/* MODALES */}
      <PaymentModal isOpen={isModalOpen} total={total} onClose={() => setIsModalOpen(false)} onConfirm={handleFinalizeVenta} />
      <ClientSelectModal isOpen={isClientModalOpen} onClose={() => setIsClientModalOpen(false)} onConfirm={handleConfirmarFiado} />
      <ConfirmModal isOpen={isClearModalOpen} onClose={() => setIsClearModalOpen(false)} onConfirm={() => setCarrito([])} titulo="¿Vaciar Carrito?" mensaje="Se eliminarán todos los productos seleccionados." colorBoton="#95A5A6" />
      <TicketPreviewModal isOpen={isTicketModalOpen} onClose={() => setIsTicketModalOpen(false)} items={carrito} total={total} />
    </div>
  );
};

export default POS;