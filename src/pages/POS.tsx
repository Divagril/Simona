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
  
  // Estados para la Selección Dinámica
  const [qty, setQty] = useState<string>('1'); 
  const [manualPrice, setManualPrice] = useState<string>('0'); 

  const [showCartMobile, setShowCartMobile] = useState(false); 
  const [lastSaleData, setLastSaleData] = useState<any>(null);

  // --- MODALES ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);

  const barcodeRef = useRef<HTMLInputElement>(null);

  // 1. Cargar productos al iniciar
  const cargarDatos = async () => {
    try {
      const data = await getProductos();
      setProductos(Array.isArray(data) ? data : []);
    } catch (error) {
      showNotification("Error de conexión", true);
    }
  };

  useEffect(() => {
    cargarDatos();
    barcodeRef.current?.focus();
  }, []);

  // 2. LÓGICA: Calcular precio sugerido automáticamente cuando cambia la cantidad
  useEffect(() => {
    if (selectedProd) {
        const nQty = Number(qty);
        const calculoSugerido = (nQty * selectedProd.precio).toFixed(2);
        setManualPrice(calculoSugerido);
    }
  }, [qty, selectedProd]);

  const total = carrito.reduce((acc, item) => acc + item.subtotal, 0);

  // 3. LÓGICA: Agregar al carrito usando el PRECIO ESCRITO (Manual)
  const addToCart = () => {
    if (!selectedProd) return;
    const nQty = Number(qty);
    const nPrice = Number(manualPrice); // Usamos el precio que está en el cuadro verde

    if (isNaN(nQty) || nQty <= 0) {
      showNotification("⚠️ Cantidad inválida", true);
      return;
    }

    if (nPrice <= 0) {
        showNotification("⚠️ El precio no puede ser 0", true);
        return;
    }

    // Validación de Stock
    if (nQty > selectedProd.stock_actual) {
      showNotification(`❌ Stock insuficiente: ${selectedProd.stock_actual}`, true);
      return;
    }

    const index = carrito.findIndex(it => it._id === selectedProd._id);
    if (index !== -1) {
      const newC = [...carrito];
      newC[index].cantidadSeleccionada += nQty;
      newC[index].subtotal += nPrice; // Sumamos el nuevo monto manual al acumulado
      setCarrito(newC);
    } else {
      setCarrito([...carrito, { 
        ...selectedProd, 
        cantidadSeleccionada: nQty, 
        subtotal: nPrice, // Guardamos exactamente lo que escribió el usuario
        cantidad: selectedProd.stock_actual
      }]);
    }
    
    // Resetear selección
    setQty('1'); 
    setManualPrice('0');
    setSelectedProd(null);
    showNotification(`✅ Agregado: S/. ${nPrice.toFixed(2)}`);
  };

  // --- PROCESAR VENTA ---
  const handleFinalizeVenta = async (datosPago: any) => {
    if (carrito.length === 0) return;
    try {
      const res = await registrarVenta({ items: carrito, total, metodoPago: datosPago.metodo });
      if (res.success) {
        setLastSaleData({ items: [...carrito], total, metodoPago: datosPago.metodo });
        setCarrito([]); setIsModalOpen(false); setShowCartMobile(false);
        setTimeout(async () => {
          await cargarDatos();
          setIsTicketModalOpen(true);
          showNotification("✅ Venta cobrada con éxito");
        }, 300);
      }
    } catch (e) { showNotification("Error al procesar cobro", true); }
  };

  // --- PROCESAR FIADO ---
  const handleConfirmarFiado = async (cliente: any) => {
    if (carrito.length === 0) return;
    try {
      const res = await registrarFiadoMasivo({ cliente_id: cliente._id, items: carrito, total });
      if (res.success) {
        setLastSaleData({ 
          items: [...carrito], 
          total, 
          metodoPago: 'FIADO', 
          saldoPendiente: (cliente.deudaTotal || 0) + total 
        });
        setCarrito([]); setIsClientModalOpen(false); setShowCartMobile(false);
        setTimeout(async () => {
          await cargarDatos();
          setIsTicketModalOpen(true);
          showNotification(`📝 Fiado registrado para ${cliente.nombre}`);
        }, 300);
      }
    } catch (e) { showNotification("Error al procesar fiado", true); }
  };

  return (
    <div className={`pos-master-container ${showCartMobile ? 'mobile-cart-active' : 'mobile-list-active'}`}>
      
      {/* PANEL IZQUIERDO: PRODUCTOS */}
      <div className="pos-panel-products">
        <header className="pos-header-search">
            <div className="search-row-pro">
                <div className="search-input-wrapper">
                    <Search size={18} color="#94a3b8" />
                    <input ref={barcodeRef} placeholder="Buscar producto..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
                </div>
                <button className="btn-sync-teal" onClick={cargarDatos}><RefreshCw size={18}/></button>
            </div>
        </header>

        <div className="pos-table-scroll">
            <table className="pos-table-pro">
                <thead>
                    <tr>
                        <th className="col-name">Producto</th>
                        <th className="col-stock">Stock</th>
                        <th className="col-price">Precio Base</th>
                    </tr>
                </thead>
                <tbody>
                    {productos.filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase())).map(p => (
                        <tr key={p._id} onClick={() => setSelectedProd(p)} className={selectedProd?._id === p._id ? 'selected' : ''}>
                            <td className="col-name p-bold">{p.nombre}</td>
                            <td className={`col-stock p-bold ${p.stock_actual < 5 ? 'text-red' : 'text-green'}`}>{p.stock_actual}</td>
                            <td className="col-price p-bold">S/. {p.precio.toFixed(2)} <small style={{fontSize:'10px', color:'#94a3b8'}}>{p.unidad_venta}</small></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>

        {/* BARRA DE SELECCIÓN FLOTANTE (EDITABLE KG Y PRECIO) */}
        {selectedProd && (
            <div className="pos-selection-bar">
                <div className="sel-info">
                    <span className="sel-name">{selectedProd.nombre}</span>
                    
                    <div className="sel-inputs-row">
                        {/* INPUT DE CANTIDAD / KG */}
                        <div className="input-group-pos">
                            <label>{selectedProd.unidad_venta === 'KG' ? 'PESO (KG)' : 'CANTIDAD'}</label>
                            <input 
                                type="number" 
                                step="0.001"
                                value={qty} 
                                onChange={e => setQty(e.target.value)} 
                                onFocus={(e) => e.target.select()}
                            />
                        </div>

                        {/* INPUT DE PRECIO TOTAL (MANUAL) */}
                        <div className="input-group-pos">
                            <label>TOTAL A COBRAR (S/.)</label>
                            <input 
                                type="number" 
                                step="0.10"
                                value={manualPrice} 
                                onChange={e => setManualPrice(e.target.value)} 
                                onFocus={(e) => e.target.select()}
                                className="price-override"
                            />
                        </div>
                    </div>
                </div>

                <div className="sel-controls">
                    {/* AYUDANTES DE PESO SOLO SI ES KG */}
                    {selectedProd.unidad_venta === 'KG' && (
                        <div className="weight-helpers">
                            <button onClick={() => setQty("0.250")}>1/4</button>
                            <button onClick={() => setQty("0.500")}>1/2</button>
                            <button onClick={() => setQty("0.750")}>3/4</button>
                        </div>
                    )}
                    <button className="btn-add-pro" onClick={addToCart}>AGREGAR</button>
                    <button className="btn-close-pro" onClick={() => setSelectedProd(null)}><X size={20}/></button>
                </div>
            </div>
        )}

        {/* BOTÓN MÓVIL (SOLO SI NO HAY SELECCIÓN PARA QUE NO ESTORBE) */}
        {carrito.length > 0 && !showCartMobile && !selectedProd && (
            <button className="btn-float-mobile" onClick={() => setShowCartMobile(true)}>
                <ShoppingCart size={24} />
                <span>VER PEDIDO (S/. {total.toFixed(2)})</span>
            </button>
        )}
      </div>

      {/* PANEL DERECHO: TICKET */}
      <div className="pos-panel-right">
        <header className="ticket-header-pro">
            <button className="btn-back-pro" onClick={() => setShowCartMobile(false)}><ArrowLeft size={18}/> VOLVER</button>
            <div className="ticket-title"><ShoppingCart size={20}/> <span>DETALLE PEDIDO</span></div>
        </header>

        <div className="ticket-items-pro">
            {carrito.map((it, i) => (
                <div key={i} className="ticket-item-card">
                    <div className="item-row">
                        <span className="item-name">{it.nombre}</span>
                        <span className="item-subtotal">S/. {it.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="item-row-sub">
                        <span>{it.cantidadSeleccionada} {it.unidad_venta} x S/. {it.precio.toFixed(2)}</span>
                        <button className="btn-remove-pro" onClick={() => {
                            const n = [...carrito]; n.splice(i, 1); setCarrito(n);
                        }}><Trash2 size={14}/></button>
                    </div>
                </div>
            ))}
        </div>

        <footer className="ticket-footer-pro">
            <div className="total-display">
                <span className="total-label">TOTAL A COBRAR</span>
                <div className="total-val">S/. {total.toFixed(2)}</div>
            </div>
            <div className="actions-grid">
                <button className="btn-cobrar-pro" onClick={() => setIsModalOpen(true)}>
                   <CheckCircle size={22}/> COBRAR (F5)
                </button>
                <div className="sub-grid">
                    <button className="btn-fiado-pro" onClick={() => setIsClientModalOpen(true)}><Users size={18}/> FIADO</button>
                    <button className="btn-clear-pro" onClick={() => setIsClearModalOpen(true)}><Trash2 size={18}/> LIMPIAR</button>
                </div>
            </div>
        </footer>
      </div>

      {/* MODALES */}
      <PaymentModal isOpen={isModalOpen} total={total} onClose={() => setIsModalOpen(false)} onConfirm={handleFinalizeVenta} />
      <ClientSelectModal isOpen={isClientModalOpen} onClose={() => setIsClientModalOpen(false)} onConfirm={handleConfirmarFiado} />
      <ConfirmModal isOpen={isClearModalOpen} onClose={() => setIsClearModalOpen(false)} onConfirm={() => setCarrito([])} titulo="¿Limpiar?" mensaje="Se vaciará el carrito." />
      {isTicketModalOpen && lastSaleData && (
        <TicketPreviewModal isOpen={isTicketModalOpen} onClose={() => setIsTicketModalOpen(false)} items={lastSaleData.items} total={lastSaleData.total} metodoPago={lastSaleData.metodoPago} saldoPendiente={lastSaleData.saldoPendiente} />
      )}
    </div>
  );
};

export default POS;