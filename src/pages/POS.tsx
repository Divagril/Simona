import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Plus, Trash2, CreditCard, 
  History, Eye, Pause, PackageSearch, 
  Keyboard, RefreshCw, Zap, AlertTriangle
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
  const [parkedSales, setParkedSales] = useState<any[]>([]);
  const [lastSaleData, setLastSaleData] = useState<any>(null);

  // --- MODALES ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);

  // --- VENTA MANUAL ---
  const [manualDesc, setManualDesc] = useState('');
  const [manualPrice, setManualPrice] = useState<any>('');

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

  // --- REGLA DE SEGURIDAD: AGREGAR AL CARRITO ---
  const addToCart = () => {
    if (!selectedProd) return;
    const cantidadAAgregar = Number(qty);

    if (isNaN(cantidadAAgregar) || cantidadAAgregar <= 0) {
      showNotification("⚠️ Ingrese una cantidad válida", true);
      return;
    }

    // 1. Calcular cuánto de este producto YA hay en el ticket actual
    const cantidadEnTicket = carrito
      .filter(item => item._id === selectedProd._id)
      .reduce((acc, item) => acc + item.cantidadSeleccionada, 0);

    // 2. Comparar (Lo que hay en ticket + Lo que quiero agregar) vs Stock Real
    if ((cantidadEnTicket + cantidadAAgregar) > selectedProd.cantidad) {
      showNotification(
        `❌ STOCK INSUFICIENTE. Solo quedan ${selectedProd.cantidad} unidades de ${selectedProd.nombre}.`, 
        true
      );
      return;
    }

    // 3. Si pasa la validación, procedemos a agregar o sumar
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

  const handleFinalizeVenta = async (datosPago: any) => {
    if (carrito.length === 0) return;
    const snapshotVenta = {
      items: [...carrito], total, metodoPago: datosPago.metodo,
      pagoCon: datosPago.pagoCon, vuelto: datosPago.vuelto
    };
    try {
      const res = await registrarVenta({ items: carrito, total, metodoPago: datosPago.metodo, pagoCon: datosPago.pagoCon, vuelto: datosPago.vuelto });
      if (res.success) {
        setLastSaleData(snapshotVenta);
        setCarrito([]); setIsModalOpen(false); setIsTicketModalOpen(true);
        cargarDatos(); // Recargamos para ver el stock actualizado
      }
    } catch (e) { showNotification("Error al cobrar", true); }
  };

  const handleConfirmarFiado = async (cliente: any) => {
    if (carrito.length === 0) return;
    const nuevaDeudaTotal = (cliente.deudaTotal || 0) + total;
    const snapshotFiado = {
        items: [...carrito], total, metodoPago: 'FIADO',
        pagoCon: 0, vuelto: 0, saldoPendiente: nuevaDeudaTotal
    };
    try {
      const res = await registrarFiadoMasivo({ cliente_id: cliente._id, items: carrito, total });
      if (res.success) {
        setLastSaleData(snapshotFiado);
        setCarrito([]); setIsClientModalOpen(false); setIsTicketModalOpen(true);
        cargarDatos();
      }
    } catch (e) { showNotification("Error al registrar fiado", true); }
  };

  const abrirTicketManual = () => {
    if (carrito.length > 0) {
        setLastSaleData({ items: [...carrito], total, metodoPago: 'VISTA PREVIA', pagoCon: 0, vuelto: 0 });
        setIsTicketModalOpen(true);
    } else if (lastSaleData) {
        setIsTicketModalOpen(true);
    }
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
              {productos.filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase())).map(p => (
                <tr 
                  key={p._id} 
                  onClick={() => { setSelectedProd(p); setQty('1'); }} 
                  className={`row-hover ${p.cantidad <= 0 ? 'out-of-stock' : ''} ${selectedProd?._id === p._id ? 'selected-row' : ''}`}
                >
                  <td className="bold">{p.nombre} {p.cantidad <= 0 ? '(SIN STOCK)' : ''}</td>
                  <td style={{textAlign:'center'}} className={p.cantidad < 5 ? 'text-rojo bold' : ''}>{p.cantidad}</td>
                  <td style={{textAlign:'right'}}>S/. {Number(p.precio).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* BARRA DE SELECCIÓN CON BLOQUEO */}
        <div className={`selection-bar-modern-final ${selectedProd ? 'active' : ''} ${selectedProd && selectedProd.cantidad <= 0 ? 'blocked' : ''}`}>
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
                disabled={!selectedProd || selectedProd.cantidad <= 0}
                onChange={e => setQty(e.target.value)} 
              />
            </div>
            <button 
              className="btn-agregar-orange" 
              onClick={addToCart} 
              disabled={!selectedProd || selectedProd.cantidad <= 0}
            >
              {selectedProd && selectedProd.cantidad <= 0 ? 'SIN STOCK' : '+ AGREGAR'}
            </button>
          </div>
        </div>

        <fieldset className="group-box-manual">
          <legend className="legend-manual">⚡ Venta Libre / Manual</legend>
          <div className="manual-inputs-row">
            <input type="text" placeholder="Descripción" className="input-flat-modern" value={manualDesc} onChange={e => setManualDesc(e.target.value)} />
            <input type="number" placeholder="S/." className="input-flat-modern" value={manualPrice} onChange={e => setManualPrice(e.target.value)} />
            <button className="btn-manual-dark" onClick={() => {
                 const precioNum = Number(manualPrice);
                 if (manualDesc && precioNum > 0) {
                     const newItem: any = { _id: `MANUAL-${Date.now()}`, nombre: manualDesc, precio: precioNum, cantidadSeleccionada: 1, subtotal: precioNum, esManual: true, cantidad: 999 };
                     setCarrito([...carrito, newItem]); setManualDesc(''); setManualPrice('');
                 }
            }}>Agregar</button>
          </div>
        </fieldset>
      </div>

      {/* TICKET (Derecha) */}
      <div className="pos-right">
        <div className="panel-ticket-blue">
          <h2 className="ticket-title">🧾 TICKET</h2>
          <div className="ticket-table-wrapper">
            <table className="modern-table">
              <thead><tr style={{background:'#f8f9f9'}}><th>Producto</th><th style={{textAlign:'center'}}>Cant</th><th style={{textAlign:'right'}}>Total</th></tr></thead>
              <tbody>
                {carrito.map((it, i) => (
                  <tr key={i} onClick={() => setIndexSeleccionadoCarrito(i)} className={indexSeleccionadoCarrito === i ? 'selected-row-cart' : ''}>
                    <td>{it.nombre}</td><td style={{textAlign:'center'}}>{it.cantidadSeleccionada}</td><td style={{textAlign:'right'}}>{it.subtotal.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="total-section">
            <span style={{fontWeight:800, color:'#7f8c8d'}}>TOTAL:</span>
            <div className="total-amount">S/. {total.toFixed(2)}</div>
          </div>
          <div className="pos-actions-grid">
            <button className="btn-cobrar-big" onClick={() => carrito.length > 0 && setIsModalOpen(true)}>✅ COBRAR (F5)</button>
            <div className="btn-row">
              <button className="btn-purple" onClick={() => carrito.length > 0 && setIsClientModalOpen(true)}>📝 Fiado (F8)</button>
              <button className="btn-dark-blue" onClick={abrirTicketManual}>👁️ Ver Ticket</button>
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

      <PaymentModal isOpen={isModalOpen} total={total} onClose={() => setIsModalOpen(false)} onConfirm={handleFinalizeVenta} />
      <ClientSelectModal isOpen={isClientModalOpen} onClose={() => setIsClientModalOpen(false)} onConfirm={handleConfirmarFiado} />
      <ConfirmModal isOpen={isClearModalOpen} onClose={() => setIsClearModalOpen(false)} onConfirm={() => setCarrito([])} titulo="¿Vaciar?" mensaje="Se borrarán los productos." colorBoton="#95A5A6" />
      <TicketPreviewModal isOpen={isTicketModalOpen} onClose={() => setIsTicketModalOpen(false)} items={lastSaleData?.items || []} total={lastSaleData?.total || 0} metodoPago={lastSaleData?.metodoPago} saldoPendiente={lastSaleData?.saldoPendiente} />
    </div>
  );
};

export default POS;