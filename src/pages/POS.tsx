import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Plus, Trash2, RefreshCw, 
  ShoppingCart, AlertTriangle, Eye 
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
  const [qty, setQty] = useState<string>('1'); 
  const [indexSeleccionadoCarrito, setIndexSeleccionadoCarrito] = useState<number | null>(null);
  const [lastSaleData, setLastSaleData] = useState<any>(null);

  // --- MODALES ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);

  // --- VENTA MANUAL ---
  const [manualDesc, setManualDesc] = useState('');
  const [manualPrice, setManualPrice] = useState<string>('');

  const barcodeRef = useRef<HTMLInputElement>(null);

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
    barcodeRef.current?.focus();
  }, []);

  const total = carrito.reduce((acc, item) => acc + item.subtotal, 0);

  // --- LÓGICA AGREGAR AL CARRITO ---
  const addToCart = () => {
    if (!selectedProd) return;
    const cantidadAAgregar = Number(qty);

    if (isNaN(cantidadAAgregar) || cantidadAAgregar <= 0) {
      showNotification("⚠️ Ingrese una cantidad válida", true);
      return;
    }

    // 1. Validar Stock Real
    const cantidadEnTicket = carrito
      .filter(item => item._id === selectedProd._id)
      .reduce((acc, item) => acc + item.cantidadSeleccionada, 0);

    if ((cantidadEnTicket + cantidadAAgregar) > selectedProd.stock_actual) {
      showNotification(
        `❌ STOCK INSUFICIENTE. Quedan ${selectedProd.stock_actual} unidades.`, 
        true
      );
      return;
    }

    // 2. Agregar o Sumar
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
        subtotal: selectedProd.precio * cantidadAAgregar,
        cantidad: selectedProd.stock_actual // Mapping para compatibilidad con CartItem
      };
      setCarrito([...carrito, newItem]);
    }
    
    setQty('1'); 
    showNotification(`✅ ${selectedProd.nombre} agregado`);
  };
  const abrirTicketManual = () => {
    if (carrito.length > 0) {
        // Creamos un borrador con lo que hay actualmente en el carrito
        setLastSaleData({ 
            items: [...carrito], 
            total: total, 
            metodoPago: 'VISTA PREVIA' 
        });
        setIsTicketModalOpen(true);
    } else if (lastSaleData) {
        // Si el carrito está vacío, muestra la última venta real que se cobró
        setIsTicketModalOpen(true);
    } else {
        showNotification("El carrito está vacío", true);
    }
   };
  // En src/pages/POS.tsx busca handleFinalizeVenta
   const handleFinalizeVenta = async (datosPago: any) => {
     if (carrito.length === 0) return;

     try {
       // Llamamos a la API
       const res = await registrarVenta({ 
         items: carrito, 
         total: total, 
         metodoPago: datosPago.metodo 
       });

       // SI EL SERVIDOR RESPONDIÓ OK:
       if (res.success) {
         // Guardamos una copia para el ticket antes de borrar el carrito
         setLastSaleData({ 
           items: [...carrito], 
           total: total, 
           metodoPago: datosPago.metodo 
         });

         setCarrito([]);           // Vaciamos el carrito
         setIsModalOpen(false);    // Cerramos el modal de cobro
         setIsTicketModalOpen(true); // ¡ABRIMOS EL TICKET!
      
         cargarDatos(); // Recargamos el stock para que baje en la lista
         showNotification("✅ Venta realizada con éxito");
       } else {
         showNotification("❌ El servidor rechazó la venta", true);
       }
     } catch (e) { 
       console.error(e);
       showNotification("❌ Error de red: El servidor no responde", true); 
        }
   };

  const handleConfirmarFiado = async (cliente: any) => {
    if (carrito.length === 0) return;
    try {
      // ENVIAMOS: id del cliente, los productos (items) y el total
      const res = await registrarFiadoMasivo({ 
          cliente_id: cliente._id, 
          items: carrito, // <--- ESTO ES VITAL
          total: total 
      });

      if (res.success) {
        setLastSaleData({ items: [...carrito], total, metodoPago: 'FIADO' });
        setCarrito([]); setIsClientModalOpen(false); setIsTicketModalOpen(true);
        cargarDatos();
      }
    } catch (e) { console.error(e); }
 };

  return (
    <div className="pos-layout">
      {/* PANEL IZQUIERDO */}
      <div className="pos-left">
        <fieldset className="pos-group-box">
          <legend className="pos-legend">🔍 Buscador de Productos</legend>
          <div style={{display:'flex', justifyContent:'flex-end', marginBottom:'5px'}}>
            <button className="btn-recargar-verde" onClick={cargarDatos}><RefreshCw size={14}/> Recargar</button>
          </div>
          <input 
            ref={barcodeRef} type="text" className="input-pos-flat" 
            placeholder="Buscar por nombre..." value={busqueda} 
            onChange={e => setBusqueda(e.target.value)} 
          />
        </fieldset>

        <div className="table-container-pos panel-blanco">
          <table className="modern-table">
            <thead>
              <tr><th>Producto</th><th style={{textAlign:'center'}}>Stock</th><th style={{textAlign:'right'}}>Precio</th></tr>
            </thead>
            <tbody>
              {productos.filter(p => (p.nombre || '').toLowerCase().includes(busqueda.toLowerCase())).map(p => (
                <tr 
                  key={p._id} 
                  onClick={() => { setSelectedProd(p); setQty('1'); }} 
                  className={`row-hover ${p.stock_actual <= 0 ? 'out-of-stock' : ''} ${selectedProd?._id === p._id ? 'selected-row' : ''}`}
                >
                  <td className="bold">{p.nombre} {p.stock_actual <= 0 ? '(SIN STOCK)' : ''}</td>
                  <td style={{textAlign:'center'}} className={p.stock_actual < 5 ? 'text-rojo bold' : ''}>
                    {p.stock_actual}
                  </td>
                  <td style={{textAlign:'right'}}>S/. {Number(p.precio).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* BARRA DE SELECCIÓN */}
        <div className={`selection-bar-modern-final ${selectedProd ? 'active' : ''} ${selectedProd && selectedProd.stock_actual <= 0 ? 'blocked' : ''}`}>
          <div className="sel-left-info">
            <span className="sel-badge-blue">SELECCIONADO</span>
            <div className="sel-prod-name">{selectedProd ? selectedProd.nombre : 'Ninguno'}</div>
            <div className="sel-prod-price">S/. {selectedProd ? (Number(selectedProd.precio) * Number(qty)).toFixed(2) : '0.00'}</div>
          </div>
          <div className="sel-right-controls">
            <div className="qty-group">
              <label>CANTIDAD</label>
              <input 
                type="number" className="qty-input-big" value={qty} 
                disabled={!selectedProd || selectedProd.stock_actual <= 0}
                onChange={e => setQty(e.target.value)} 
              />
            </div>
            <button 
              className="btn-agregar-orange" 
              onClick={addToCart} 
              disabled={!selectedProd || selectedProd.stock_actual <= 0}
            >
              {selectedProd && selectedProd.stock_actual <= 0 ? 'SIN STOCK' : '+ AGREGAR'}
            </button>
          </div>
        </div>

        {/* VENTA MANUAL */}
        <fieldset className="group-box-manual">
          <legend className="legend-manual">⚡ Venta Libre</legend>
          <div className="manual-inputs-row">
            <input type="text" placeholder="Descripción" className="input-flat-modern" value={manualDesc} onChange={e => setManualDesc(e.target.value)} />
            <input type="number" placeholder="Precio S/." className="input-flat-modern" value={manualPrice} onChange={e => setManualPrice(e.target.value)} />
            <button className="btn-manual-dark" onClick={() => {
                 const pNum = Number(manualPrice);
                 if (manualDesc && pNum > 0) {
                     const newItem: any = { _id: `MANUAL-${Date.now()}`, nombre: manualDesc, precio: pNum, cantidadSeleccionada: 1, subtotal: pNum, stock_actual: 999 };
                     setCarrito([...carrito, newItem]); setManualDesc(''); setManualPrice('');
                 }
            }}>Agregar</button>
          </div>
        </fieldset>
      </div>

      {/* PANEL DERECHO (TICKET) */}
      <div className="pos-right">
        <div className="panel-ticket-blue">
          <h2 className="ticket-title">🧾 TICKET DE VENTA</h2>
          <div className="ticket-table-wrapper">
            <table className="modern-table">
              <thead><tr style={{background:'#f8f9f9'}}><th>Producto</th><th style={{textAlign:'center'}}>Cant</th><th style={{textAlign:'right'}}>Subtotal</th></tr></thead>
              <tbody>
                {carrito.map((it, i) => (
                  <tr key={i} onClick={() => setIndexSeleccionadoCarrito(i)} className={indexSeleccionadoCarrito === i ? 'selected-row-cart' : ''}>
                    <td>{it.nombre}</td>
                    <td style={{textAlign:'center'}}>{it.cantidadSeleccionada}</td>
                    <td style={{textAlign:'right'}}>{it.subtotal.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="total-section-pos" style={{ textAlign: 'right', padding: '20px 0', borderTop: '2px solid #eee' }}>
            <span style={{ fontWeight: 800, color: '#7f8c8d' }}>TOTAL:</span>
            <div className="total-amount" style={{ fontSize: '50px', fontWeight: 900, color: '#e74c3c' }}>S/. {total.toFixed(2)}</div>
          </div>

          <div className="pos-actions-grid">
            <button className="btn-cobrar-big" onClick={() => carrito.length > 0 && setIsModalOpen(true)}>✅ COBRAR (F5)</button>
            <div className="btn-row">
              <button className="btn-purple" onClick={() => carrito.length > 0 && setIsClientModalOpen(true)}>📝 Fiado (F8)</button>
              <button className="btn-dark-blue" onClick={() => (carrito.length > 0 || lastSaleData) && setIsTicketModalOpen(true)}>👁️ Ver Ticket</button>
            </div>
            <button className="btn-red-solid" onClick={() => {
                if (indexSeleccionadoCarrito !== null) {
                    const n = [...carrito]; n.splice(indexSeleccionadoCarrito, 1); setCarrito(n); setIndexSeleccionadoCarrito(null);
                }
            }}>❌ Quitar Producto</button>
            <button className="btn-gray-solid" onClick={() => setIsClearModalOpen(true)}>🗑️ Limpiar Todo</button>
          </div>
        </div>
      </div>

      {/* COMPONENTES MODALES */}
      <PaymentModal isOpen={isModalOpen} total={total} onClose={() => setIsModalOpen(false)} onConfirm={handleFinalizeVenta} />
      <ClientSelectModal isOpen={isClientModalOpen} onClose={() => setIsClientModalOpen(false)} onConfirm={handleConfirmarFiado} />
      <ConfirmModal isOpen={isClearModalOpen} onClose={() => setIsClearModalOpen(false)} onConfirm={() => setCarrito([])} titulo="¿Vaciar Ticket?" mensaje="Se eliminarán todos los productos del ticket actual." colorBoton="#95A5A6" />
      <TicketPreviewModal isOpen={isTicketModalOpen} onClose={() => setIsTicketModalOpen(false)} items={lastSaleData?.items || carrito} total={lastSaleData?.total || total} metodoPago={lastSaleData?.metodoPago} saldoPendiente={lastSaleData?.saldoPendiente} />
    </div>
  );
};

export default POS;