import React, { useState, useEffect } from 'react';
import { 
  Users, Search, RefreshCw, UserPlus, 
  Trash2, DollarSign, History, ShoppingBag, 
  X // <--- ESTO ES IMPORTANTE PARA QUE NO SALGA PANTALLA BLANCA
} from 'lucide-react';
import { 
  getClientesConDeuda, 
  crearCliente, 
  getMovimientosCliente, 
  registrarAbono, 
  eliminarCliente 
} from '../services/api';
import { useNotification } from '../context/NotificationContext';
import ConfirmModal from '../components/ConfirmModal'; 
import type { Cliente, Movimiento } from '../types';

const Clients: React.FC = () => {
  const { showNotification } = useNotification();
  
  // --- ESTADOS ---
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [selectedClient, setSelectedClient] = useState<Cliente | null>(null);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [montoAbono, setMontoAbono] = useState('');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Estado para la notificación de VUELTO lateral
  const [vueltoAlert, setVueltoAlert] = useState<number | null>(null);

  // --- CARGA DE DATOS ---
  const cargarClientes = async () => {
    try {
      const data = await getClientesConDeuda();
      setClientes(data);
    } catch (error) {
      console.error("Error al cargar clientes");
    }
  };

  useEffect(() => {
    cargarClientes();
  }, []);

  // --- FUNCIONES LÓGICAS ---
  const seleccionarCliente = async (cliente: Cliente) => {
    setSelectedClient(cliente);
    try {
      const movs = await getMovimientosCliente(cliente._id);
      setMovimientos(movs);
    } catch (error) {
      showNotification("Error al cargar movimientos", true);
    }
  };

  const handleCrearCliente = async () => {
    const nombreLimpio = nuevoNombre.trim();
    if (!nombreLimpio) {
       showNotification("⚠️ Escriba un nombre", true);
       return;
    }
    const existe = clientes.some((c) => c.nombre.toLowerCase() === nombreLimpio.toLowerCase());
    if (existe) {
      showNotification(`⚠️ El cliente "${nombreLimpio}" ya existe`, true);
      return;
    }
    try {
       await crearCliente(nombreLimpio);
       setNuevoNombre(''); 
       showNotification(`✅ Cliente "${nombreLimpio}" registrado`);
       cargarClientes();
    } catch (error) {
       showNotification("❌ Error al guardar", true);
    }
  };

  const handleAbonar = async () => {
    if (!selectedClient || !montoAbono) return;
    const montoPago = Number(montoAbono);
    const deudaActual = selectedClient.deudaTotal;

    try {
      if (montoPago > deudaActual) {
        const vuelto = montoPago - deudaActual;
        
        // ACTIVAMOS LA NOTIFICACIÓN LATERAL
        setVueltoAlert(vuelto);
        // Se cerrará sola en 1 minuto
        setTimeout(() => setVueltoAlert(null), 60000);

        await registrarAbono(selectedClient._id, deudaActual);
      } else {
        await registrarAbono(selectedClient._id, montoPago);
        showNotification("✅ Abono registrado");
      }
      
      setMontoAbono('');
      
      // Refrescamos la lista y el cliente actual
      const res = await getClientesConDeuda();
      setClientes(res);
      const actualizado = res.find((c: any) => c._id === selectedClient._id);
      if (actualizado) {
        setSelectedClient(actualizado);
        const movs = await getMovimientosCliente(actualizado._id);
        setMovimientos(movs);
      }
    } catch (error) {
      showNotification("Error en el pago", true);
    }
  };

  const abrirConfirmarEliminacion = () => {
    if (!selectedClient) return;
    setIsDeleteModalOpen(true);
  };

  const ejecutarEliminacionReal = async () => {
    if (!selectedClient) return;
    try {
      await eliminarCliente(selectedClient._id);
      showNotification(`🗑️ Cliente eliminado`);
      setSelectedClient(null);
      cargarClientes();
    } catch (error) {
      showNotification("No se pudo eliminar", true);
    }
  };

  const clientesFiltrados = clientes.filter(c => 
    c.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="clients-container" style={{ display: 'flex', gap: '20px', height: 'calc(100vh - 120px)' }}>
      
      {/* PANEL IZQUIERDO */}
      <div className="panel-blanco" style={{ width: '350px', display: 'flex', flexDirection: 'column', padding: '15px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
          <h3 style={{margin: 0}}><Users size={20} /> Clientes</h3>
          <button className="btn-icon-refresh" onClick={cargarClientes}><RefreshCw size={16} /></button>
        </div>

        <input 
          type="text" placeholder="🔍 Buscar cliente..." 
          className="input-main" style={{ width: '100%', marginBottom: '10px' }}
          value={busqueda} onChange={e => setBusqueda(e.target.value)}
        />

        <div style={{ flexGrow: 1, overflowY: 'auto', backgroundColor: '#F0F3F4', borderRadius: '8px', padding: '10px' }}>
          {clientesFiltrados.map(cliente => (
            <div 
              key={cliente._id}
              onClick={() => seleccionarCliente(cliente)}
              style={{
                backgroundColor: 'white', padding: '12px', borderRadius: '10px',
                marginBottom: '10px', cursor: 'pointer', 
                border: selectedClient?._id === cliente._id ? '2px solid #3498DB' : '1px solid #D5DBDB',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}
            >
              <span style={{ fontWeight: 'bold' }}>{cliente.nombre}</span>
              <div style={{
                fontSize: '11px', fontWeight: 'bold', padding: '4px 8px', borderRadius: '5px',
                backgroundColor: cliente.deudaTotal > 0.1 ? '#FADBD8' : '#D5F5E3',
                color: cliente.deudaTotal > 0.1 ? '#C0392B' : '#239B56'
              }}>
                {cliente.deudaTotal > 0.1 ? `S/. ${cliente.deudaTotal.toFixed(2)}` : 'AL DÍA'}
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #eee' }}>
          <div className="create-client-container">
            <input 
               type="text" placeholder="Nuevo cliente..." className="input-main create-input"
               value={nuevoNombre} onChange={e => setNuevoNombre(e.target.value)}
               onKeyDown={(e) => e.key === 'Enter' && handleCrearCliente()}
             />
           <button className="btn-add-client-green" onClick={handleCrearCliente}><UserPlus size={20} /></button>
         </div>
        </div>
      </div>

      {/* PANEL DERECHO */}
      <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div className="panel-blanco" style={{ padding: '20px', borderBottom: '4px solid #BDC3C7', display: 'flex', justifyContent: 'space-between' }}>
          {selectedClient ? (
            <>
              <div>
                <h1 style={{ margin: 0 }}>{selectedClient.nombre}</h1>
                <button onClick={abrirConfirmarEliminacion} style={{color: '#E74C3C', background: 'none', border: 'none', cursor: 'pointer', marginTop: '5px', display: 'flex', alignItems:'center', gap: '5px'}}>
                   <Trash2 size={14} /> Eliminar Cliente
                </button>
              </div>
              <div style={{ textAlign: 'right' }}>
                   <div style={{ fontWeight: 'bold', color: '#7F8C8D' }}>DEUDA TOTAL</div>
                   <div style={{ fontSize: '42px', fontWeight: '900', color: selectedClient.deudaTotal <= 0.1 ? '#27AE60' : '#E74C3C' }}>
                   {selectedClient.deudaTotal <= 0.1 ? 'AL DÍA' : `S/. ${selectedClient.deudaTotal.toFixed(2)}`}
                   </div>
              </div>
            </>
          ) : (
            <div style={{ color: '#BDC3C7', fontSize: '18px' }}>Seleccione un cliente para ver su historial</div>
          )}
        </div>

        {selectedClient && (
          <>
            <div className="panel-blanco" style={{ padding: '15px', display: 'flex', gap: '15px', alignItems: 'center' }}>
              <DollarSign size={24} color="#27AE60" />
              <input 
                type="number" 
                placeholder={selectedClient.deudaTotal <= 0.1 ? "Sin deuda" : "Monto..."} 
                className="input-main" style={{ width: '200px', fontSize: '18px' }}
                value={montoAbono} onChange={e => setMontoAbono(e.target.value)}
                disabled={selectedClient.deudaTotal <= 0.1} 
              />
              <button 
                className="btn-registrar-pago-pro" 
                onClick={handleAbonar} 
                disabled={selectedClient.deudaTotal <= 0.1}
              >
                <span className="icon-pago">💵</span> REGISTRAR PAGO
              </button>
            </div>

            <div className="panel-blanco" style={{ flexGrow: 1, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ background: '#F8F9F9', textAlign: 'left' }}>
                  <tr>
                    <th style={{ padding: '12px' }}>FECHA</th>
                    <th style={{ padding: '12px' }}>CONCEPTO</th>
                    <th style={{ padding: '12px', textAlign: 'right' }}>MONTO (S/.)</th>
                  </tr>
                </thead>
                <tbody>
                  {movimientos.map(mov => (
                    <tr key={mov._id} style={{ borderBottom: '1px solid #ECF0F1' }}>
                      <td style={{ padding: '12px', fontSize: '12px' }}>{new Date(mov.fecha).toLocaleString()}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ fontWeight: 'bold', color: mov.tipo === 'DEUDA' ? '#E67E22' : '#27AE60' }}>
                          {mov.tipo === 'DEUDA' ? '🛒 COMPRA' : '💵 ABONO'}
                        </span>
                        <div style={{fontSize: '11px', color: '#7F8C8D'}}>{mov.descripcion}</div>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold' }}>S/. {mov.monto.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* NOTIFICACIÓN LATERAL DE VUELTO */}
      {vueltoAlert !== null && (
        <div className="vuelto-side-alert">
          <div className="side-alert-content">
            <div className="side-alert-icon">💰</div>
            <div className="side-alert-text">
              <span className="side-alert-title">DAR VUELTO</span>
              <span className="side-alert-amount">S/. {vueltoAlert.toFixed(2)}</span>
            </div>
            <button className="side-alert-close" onClick={() => setVueltoAlert(null)}>
              <X size={18} />
            </button>
          </div>
          <div className="side-alert-progress"></div>
        </div>
      )}

      {/* MODAL DE ELIMINACIÓN */}
      <ConfirmModal 
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={ejecutarEliminacionReal}
        titulo="¿Eliminar Cliente?"
        mensaje={selectedClient ? "¿Seguro de eliminar a " + selectedClient.nombre + "?" : ""}
        colorBoton="#E74C3C" 
      />
    </div>
  );
};

export default Clients;