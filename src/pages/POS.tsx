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

  const total = carrito.reduce((acc, item) => acc + item.subtotal, 0);

  const addToCart = () => {
    if (!selectedProd) return;
    const cantidadAAgregar = Number(qty);
    if (cantidadAAgregar <= 0 || isNaN(cantidadAAgregar)) return;

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
    const nombre = manualDesc.trim();
    const precioNum = Number(manualPrice);
    if (!nombre || isNaN(precioNum) || precioNum <= 0) return;
    const newItem: any = {
      _id: `MANUAL-${Date.now()}`, nombre, precio: precioNum, cantidadSeleccionada: 1,
      subtotal: precioNum, categoria: 'MANUAL', esManual: true,
      cantidad: 999, unidad: 'UNIDAD'
    };
    setCarrito([...carrito, newItem]);
    setManualDesc(''); setManualPrice('');
  };

  const handleQuitarDelCarrito = () => {
    if (indexSeleccionadoCarrito === null) return;
    const nuevoCarrito = [...carrito];
    nuevoCarrito.splice(indexSeleccionadoCarrito, 1);
    setCarrito(nuevoCarrito);
    setIndexSeleccionadoCarrito(null);
  };

  const holdSale = () => {
    if (carrito.length === 0) return;
    setParkedSales([...parkedSales, { id: Date.now(), items: [...carrito], total, time: new Date().toLocaleTimeString() }]);
    setCarrito([]);
  };

  const restoreLastSale = () => {
    if (parkedSales.length === 0) return;
    const last = parkedSales[parkedSales.length - 1];
    setCarrito(last.items);
    setParkedSales(parkedSales.slice(0, -1));
  };

  // --- FINALIZAR VENTA NORMAL ---
  const handleFinalizeVenta = async (datosPago: any) => {
    if (carrito.length === 0) return;
    const snapshotVenta = {
      items: [...carrito],
      total: total,
      metodoPago: datosPago.metodo,
      pagoCon: datosPago.pagoCon,
      vuelto: datosPago.vuelto
    };
    try {
      const res = await registrarVenta({ items: carrito, total, metodoPago: datosPago.metodo, pagoCon: datosPago.pagoCon, vuelto: datosPago.vuelto });
      if (res.success) {
        setLastSaleData(snapshotVenta);
        setCarrito([]); setIsModalOpen(false); setIsTicketModalOpen(true);
        cargarDatos();
      }
    } catch (e) { showNotification("Error al cobrar", true); }
  };

  // --- CONFIRMAR FIADO (AQUÍ ESTÁ LA NUEVA REGLA) ---
  const handleConfirmarFiado = async (cliente: any) => {
    if (carrito.length === 0) return;

    // CAPTURAMOS LA NUEVA DEUDA (Anterior + Actual)
    const nuevaDeudaTotal = (cliente.deudaTotal || 0) + total;

    const snapshotFiado = {
        items: [...carrito],
        total: total,
        metodoPago: 'FIADO',
        pagoCon: 0,
        vuelto: 0,
        saldoPendiente: nuevaDeudaTotal // <--- ENVIAMOS EL SALDO ACTUALIZADO AL TICKET
    };

    try {
      const res = await registrarFiadoMasivo({ cliente_id: cliente._id, items: carrito, total });
      if (res.success) {
        showNotification(`📝 Fiado registrado para ${cliente.nombre}`);
        setLastSaleData(snapshotFiado);
        setCarrito([]); 
        setIsClientModalOpen(false); 
        setIsTicketModalOpen(true); // Abrimos ticket con la deuda
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
      <div className="pos-left">
        <fieldset className="pos-group-box">
          <legend className="pos-legend">🔍 Buscar Producto</legend>
          <div style={{display:'flex', justifyContent:'flex-end', marginBottom:'5px'}}>
            <button className="btn-recargar-verde" onClick={cargarDatos}><div className="icon-refresh">🔄</div> Recargar</button>
          </div>
          <input ref={barcodeRef} type="text" className="input-pos-flat" placeholder="Escriba nombre..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
        </fieldset>

        <div className="table-container-pos panel-blanco">
          <table className="modern-table">
            <thead>
              <tr><th>Producto</th><th style={{textAlign:'center'}}>Stock</th><th style={{textAlign:'right'}}>Precio</th></tr>
            </thead>
            <tbody>
              {productos.filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase())).map(p => (
                <tr key={p._id} onClick={() => { setSelectedProd(p); setQty('1'); }} className={`row-hover ${selectedProd?._id === p._id ? 'selected-row' : ''}`}>
                  <td>{p.nombre}</td>
                  <td style={{textAlign:'center'}}>{p.cantidad}</td>
                  <td style={{textAlign:'right'}}>S/. {Number(p.precio).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className={`selection-bar-modern-final ${selectedProd ? 'active' : ''}`}>
          <div className="sel-left-info">
            <span className="sel-badge-blue">SELECCIONADO</span>
            <div className="sel-prod-name">{selectedProd ? selectedProd.nombre : 'Ninguno'}</div>
            <div className="sel-prod-price">S/. {selectedProd ? (Number(selectedProd.precio) * Number(qty)).toFixed(2) : '0.00'}</div>
          </div>
          <div className="sel-right-controls">
            <div className="qty-group">
              <label>CANTIDAD</label>
              <input type="text" className="qty-input-big" value={qty} onFocus={(e) => e.target.select()} onChange={e => setQty(e.target.value)} />
            </div>
            <button className="btn-agregar-orange" onClick={addToCart} disabled={!selectedProd}>+ AGREGAR</button>
          </div>
        </div>

        <fieldset className="group-box-manual">
          <legend className="legend-manual"><span>⚡</span> Manual</legend>
          <div className="manual-inputs-row">
            <input type="text" placeholder="Descripción" className="input-flat-modern" value={manualDesc} onChange={e => setManualDesc(e.target.value)} />
            <input type="text" placeholder="S/." className="input-flat-modern" value={manualPrice} onChange={e => setManualPrice(e.target.value)} />
            <button className="btn-manual-dark" onClick={addManualItem}>Agregar</button>
          </div>
        </fieldset>
      </div>

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
            <div className="btn-row">
              <button className="btn-orange" onClick={holdSale}>⌛ Espera (F6)</button>
              <button className="btn-blue" onClick={restoreLastSale}>📁 Traer ({parkedSales.length})</button>
            </div>
            <div className="btn-row">
              <button className="btn-red-solid" onClick={handleQuitarDelCarrito}>❌ Sacar</button>
              <button className="btn-gray-solid" onClick={() => setIsClearModalOpen(true)}>🗑️ Limpiar</button>
            </div>
          </div>
        </div>
      </div>

      <PaymentModal isOpen={isModalOpen} total={total} onClose={() => setIsModalOpen(false)} onConfirm={handleFinalizeVenta} />
      <ClientSelectModal isOpen={isClientModalOpen} onClose={() => setIsClientModalOpen(false)} onConfirm={handleConfirmarFiado} />
      <ConfirmModal isOpen={isClearModalOpen} onClose={() => setIsClearModalOpen(false)} onConfirm={() => setCarrito([])} titulo="¿Vaciar?" mensaje="Se borrarán los productos." colorBoton="#95A5A6" />
      
      <TicketPreviewModal 
        isOpen={isTicketModalOpen} 
        onClose={() => setIsTicketModalOpen(false)} 
        items={lastSaleData?.items || []} 
        total={lastSaleData?.total || 0}
        metodoPago={lastSaleData?.metodoPago}
        pagoCon={lastSaleData?.pagoCon}
        vuelto={lastSaleData?.vuelto}
        saldoPendiente={lastSaleData?.saldoPendiente} // <--- PROPIEDAD CLAVE
      />
    </div>
  );
};

export default POS;