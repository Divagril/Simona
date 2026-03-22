import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Plus, Trash2, RefreshCw, ShoppingCart, Eye, 
  X, CreditCard, CheckCircle, Users, ArrowLeft 
} from 'lucide-react';
import type { Producto, CartItem } from '../types';
import PaymentModal from '../components/PaymentModal';
import ClientSelectModal from '../components/ClientSelectModal';
import ConfirmModal from '../components/ConfirmModal';
import TicketPreviewModal from '../components/TicketPreviewModal';
import { getProductos, registrarVenta, registrarFiadoMasivo } from '../services/api';
import { useNotification } from '../context/NotificationContext';
import './POS.css'; 

const POS: React.FC = () => {
  const { showNotification } = useNotification();
  
  // --- ESTADOS ---
  const [productos, setProductos] = useState<Producto[]>([]);
  const [carrito, setCarrito] = useState<CartItem[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [selectedProd, setSelectedProd] = useState<Producto | null>(null);
  const [qty, setQty] = useState<string>('1'); 
  const [showCartMobile, setShowCartMobile] = useState(false); 
  const [lastSaleData, setLastSaleData] = useState<any>(null);

  // --- MODALES ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);

  const barcodeRef = useRef<HTMLInputElement>(null);

  const cargarDatos = async () => {
    try {
      const data = await getProductos();
      setProductos(Array.isArray(data) ? data : []);
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
    const nQty = Number(qty);

    if (isNaN(nQty) || nQty <= 0) {
      showNotification("⚠️ Cantidad inválida", true);
      return;
    }

    if (nQty > selectedProd.stock_actual) {
      showNotification(`❌ Solo quedan ${selectedProd.stock_actual} unid.`, true);
      return;
    }

    const index = carrito.findIndex(it => it._id === selectedProd._id);
    if (index !== -1) {
      const newC = [...carrito];
      newC[index].cantidadSeleccionada += nQty;
      newC[index].subtotal = newC[index].cantidadSeleccionada * selectedProd.precio;
      setCarrito(newC);
    } else {
      setCarrito([...carrito, { 
        ...selectedProd, 
        cantidadSeleccionada: nQty, 
        subtotal: selectedProd.precio * nQty,
        cantidad: selectedProd.stock_actual
      }]);
    }
    
    setQty('1'); 
    setSelectedProd(null);
    showNotification(`✅ Agregado`);
  };

  const removeFromCart = (index: number) => {
    const newC = [...carrito];
    newC.splice(index, 1);
    setCarrito(newC);
  };

  // --- FINALIZAR PROCESOS ---
  const handleFinalizeVenta = async (datosPago: any) => {
    try {
      const res = await registrarVenta({ items: carrito, total, metodoPago: datosPago.metodo });
      if (res.success) {
        setLastSaleData({ items: [...carrito], total, metodoPago: datosPago.metodo });
        setCarrito([]); setIsModalOpen(false); setShowCartMobile(false);
        setTimeout(async () => {
          await cargarDatos();
          setIsTicketModalOpen(true);
          showNotification("✅ Venta cobrada");
        }, 300);
      }
    } catch (e) { showNotification("Error al procesar cobro", true); }
  };

  const handleConfirmarFiado = async (cliente: any) => {
    try {
      const res = await registrarFiadoMasivo({ cliente_id: cliente._id, items: carrito, total });
      if (res.success) {
        setLastSaleData({ items: [...carrito], total, metodoPago: 'FIADO', saldoPendiente: (cliente.deudaTotal || 0) + total });
        setCarrito([]); setIsClientModalOpen(false); setShowCartMobile(false);
        setTimeout(async () => {
          await cargarDatos();
          setIsTicketModalOpen(true);
          showNotification(`📝 Fiado para ${cliente.nombre}`);
        }, 300);
      }
    } catch (e) { showNotification("Error al procesar fiado", true); }
  };

  return (
    <div className={`pos-master-container ${showCartMobile ? 'mobile-cart-active' : 'mobile-list-active'}`}>
      
      {/* 1. PANEL IZQUIERDO: PRODUCTOS */}
      <div className="pos-panel-products">
        <header className="pos-search-bar">
            <div className="search-inner">
                <Search size={18} color="#94a3b8" />
                <input ref={barcodeRef} placeholder="Buscar producto..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
            </div>
            <button className="btn-sync-teal" onClick={cargarDatos}><RefreshCw size={18}/></button>
        </header>

        <div className="pos-scroll-area">
            <table className="pos-main-table">
                <thead>
                    <tr>
                        <th className="col-name">Producto</th>
                        <th className="col-stock">Stock</th>
                        <th className="col-price">Precio</th>
                    </tr>
                </thead>
                <tbody>
                    {productos.filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase())).map(p => (
                        <tr key={p._id} onClick={() => {setSelectedProd(p); setQty('1');}} className={selectedProd?._id === p._id ? 'selected' : ''}>
                            <td className="col-name p-bold">{p.nombre}</td>
                            <td className={`col-stock p-bold ${p.stock_actual < 5 ? 'text-red' : 'text-green'}`}>{p.stock_actual}</td>
                            <td className="col-price p-bold">S/. {p.precio.toFixed(2)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>

        {/* BARRA DE SELECCIÓN FLOTANTE */}
        {selectedProd && (
            <div className="selection-floating-bar">
                <div className="info">
                    <span className="name">{selectedProd.nombre}</span>
                    <span className="price">S/. {(selectedProd.precio * Number(qty)).toFixed(2)}</span>
                </div>
                <div className="actions">
                    <input type="number" value={qty} onChange={e => setQty(e.target.value)} onFocus={(e) => e.target.select()}/>
                    <button className="btn-add-final" onClick={addToCart}>AGREGAR</button>
                    <button className="btn-close-sel" onClick={() => setSelectedProd(null)}><X size={20}/></button>
                </div>
            </div>
        )}

        {/* BOTÓN MÓVIL PARA VER CARRITO */}
        {carrito.length > 0 && !showCartMobile && (
            <button className="btn-float-cart" onClick={() => setShowCartMobile(true)}>
                <ShoppingCart size={24} />
                <span>VER PEDIDO (S/. {total.toFixed(2)})</span>
            </button>
        )}
      </div>

      {/* 2. PANEL DERECHO: TICKET */}
      <div className="pos-panel-ticket">
        <header className="ticket-header-pro">
            <button className="btn-back-pos" onClick={() => setShowCartMobile(false)}><ArrowLeft size={18}/> VOLVER</button>
            <div className="ticket-title"><ShoppingCart size={20}/> <span>DETALLE DEL PEDIDO</span></div>
        </header>

        <div className="ticket-items-scroll">
            {carrito.map((it, i) => (
                <div key={i} className="ticket-item-card">
                    <div className="item-row">
                        <span className="item-name">{it.nombre}</span>
                        <span className="item-sub">S/. {it.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="item-row secondary">
                        <span>{it.cantidadSeleccionada} x S/. {it.precio.toFixed(2)}</span>
                        <button className="btn-remove-item" onClick={() => removeFromCart(i)}><Trash2 size={14}/> Quitar</button>
                    </div>
                </div>
            ))}
        </div>

        <footer className="ticket-footer-pro">
            <div className="total-display-box">
                <span className="label">TOTAL A COBRAR</span>
                <div className="val">S/. {total.toFixed(2)}</div>
            </div>
            <div className="footer-actions">
                <button className="btn-pay-main" onClick={() => setIsModalOpen(true)}>
                   <CheckCircle size={22}/> COBRAR (F5)
                </button>
                <div className="actions-grid-sub">
                    <button className="btn-fiado-sub" onClick={() => setIsClientModalOpen(true)}><Users size={18}/> FIADO</button>
                    <button className="btn-clear-sub" onClick={() => setIsClearModalOpen(true)}><Trash2 size={18}/> LIMPIAR</button>
                </div>
            </div>
        </footer>
      </div>

      {/* MODALES */}
      <PaymentModal isOpen={isModalOpen} total={total} onClose={() => setIsModalOpen(false)} onConfirm={handleFinalizeVenta} />
      <ClientSelectModal isOpen={isClientModalOpen} onClose={() => setIsClientModalOpen(false)} onConfirm={handleConfirmarFiado} />
      <ConfirmModal isOpen={isClearModalOpen} onClose={() => setIsClearModalOpen(false)} onConfirm={() => setCarrito([])} titulo="¿Vaciar?" mensaje="Se eliminarán todos los productos." />
      {lastSaleData && (
        <TicketPreviewModal isOpen={isTicketModalOpen} onClose={() => setIsTicketModalOpen(false)} items={lastSaleData.items} total={lastSaleData.total} metodoPago={lastSaleData.metodoPago} saldoPendiente={lastSaleData.saldoPendiente} />
      )}
    </div>
  );
};

export default POS;