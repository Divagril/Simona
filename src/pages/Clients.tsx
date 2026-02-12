import React, { useState, useEffect } from 'react';
import { 
  Users, Search, RefreshCw, UserPlus, 
  Trash2, DollarSign, History, X 
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
  
  // Estado para la notificación de VUELTO (Lado Izquierdo)
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

  // Crear cliente con validación anti-duplicados
  const handleCrearCliente = async () => {
    const nombreLimpio = nuevoNombre.trim();
    if (!nombreLimpio) {
       showNotification("⚠️ Escriba un nombre para el cliente", true);
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
       showNotification(`✅ Cliente registrado`);
       cargarClientes();
    } catch (error) {
       showNotification("❌ Error al guardar cliente", true);
    }
  };

  // Registrar pago con lógica de vuelto
  const handleAbonar = async () => {
    if (!selectedClient || !montoAbono) return;
    const montoPago = Number(montoAbono);
    const deudaActual = selectedClient.deudaTotal;

    try {
      if (montoPago > deudaActual) {
        const vueltoCalculado = montoPago - deudaActual;
        setVueltoAlert(vueltoCalculado); 
        setTimeout(() => setVueltoAlert(null), 60000); // Se cierra en 1 min

        await registrarAbono(selectedClient._id, deudaActual);
      } else {
        await registrarAbono(selectedClient._id, montoPago);
        showNotification("✅ Pago registrado correctamente");
      }
      
      setMontoAbono('');
      
      const res = await getClientesConDeuda();
      setClientes(res);
      const actualizado = res.find((c: any) => c._id === selectedClient._id);
      if (actualizado) {
        setSelectedClient(actualizado);
        const movs = await getMovimientosCliente(actualizado._id);
        setMovimientos(movs);
      }
    } catch (error) {
      showNotification("❌ Error al procesar el abono", true);
    }
  };

  const ejecutarEliminacionReal = async () => {
    if (!selectedClient) return;
    try {
      await eliminarCliente(selectedClient._id);
      showNotification(`🗑️ Cliente eliminado`);
      setSelectedClient(null);
      cargarClientes();
    } catch (error) {
      showNotification("No se pudo eliminar el cliente", true);
    }
  };

  const clientesFiltrados = clientes.filter(c => 
    c.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="clients-container">
      
      {/* PANEL IZQUIERDO: LISTA */}
      <div className="panel-blanco" style={{ width: '350px', display: 'flex', flexDirection: 'column', padding: '15px' }}>
        <div className="clients-header-row">
          <h3 style={{margin: 0}}><Users size={20} /> Clientes</h3>
          <button className="btn-icon-refresh-teal" onClick={cargarClientes}>
            <RefreshCw size={16} />
          </button>
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
              className={`modal-client-card ${selectedClient?._id === cliente._id ? 'selected-row' : ''}`}
            >
              <div className="modal-client-info">
                <span className="modal-client-name">{cliente.nombre}</span>
                <div className={`status-badge ${cliente.deudaTotal > 0.1 ? 'debt' : 'clean'}`}>
                    {cliente.deudaTotal > 0.1 ? `S/. ${cliente.deudaTotal.toFixed(2)}` : 'AL DÍA'}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="create-client-footer">
          <div className="input-with-btn">
            <input 
               type="text" placeholder="Nuevo cliente..." className="input-main"
               value={nuevoNombre} onChange={e => setNuevoNombre(e.target.value)}
               onKeyDown={(e) => e.key === 'Enter' && handleCrearCliente()}
            />
            <button className="btn-add-client-green" onClick={handleCrearCliente}>
              <UserPlus size={20} />
            </button>
         </div>
        </div>
      </div>

      {/* PANEL DERECHO: DETALLES */}
      <div className="pos-right" style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        
        <div className="panel-blanco panel-header-cliente" style={{ padding: '20px' }}>
          {selectedClient ? (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
              <div>
                <h1 style={{ margin: 0, fontSize: '28px' }}>{selectedClient.nombre}</h1>
                <button onClick={() => setIsDeleteModalOpen(true)} className="btn-delete-link">
                   <Trash2 size={14} /> Eliminar Cliente
                </button>
              </div>
              <div style={{ textAlign: 'right' }}>
                   <div style={{ fontWeight: 'bold', color: '#7F8C8D', fontSize: '12px' }}>DEUDA TOTAL</div>
                   <div className={`deuda-header-valor ${(selectedClient?.deudaTotal || 0) <= 0.1 ? 'text-verde' : 'text-rojo'}`}>
                    {(selectedClient?.deudaTotal || 0) <= 0.1 ? 'AL DÍA' : `S/. ${selectedClient.deudaTotal.toFixed(2)}`}
                   </div>
              </div>
            </div>
          ) : (
            <div style={{ color: '#BDC3C7', textAlign: 'center', width: '100%' }}>Seleccione un cliente</div>
          )}
        </div>

        {selectedClient && (
          <>
            {/* PANEL DE ABONO CON $ ALINEADO */}
            <div className="panel-blanco input-abono-group">
              <div className="abono-input-container">
                <DollarSign size={24} color="#27AE60" style={{ flexShrink: 0 }} />
                <input 
                  type="number" 
                  placeholder={selectedClient.deudaTotal <= 0.1 ? "Sin deuda" : "Monto abono..."} 
                  className="input-main" 
                  style={{ flex: 1, fontSize: '18px' }}
                  value={montoAbono} 
                  onChange={e => setMontoAbono(e.target.value)}
                  disabled={selectedClient.deudaTotal <= 0.1} 
                />
              </div>

              <button 
                className="btn-registrar-pago-pro" 
                onClick={handleAbonar} 
                disabled={selectedClient.deudaTotal <= 0.1}
              >
                <span className="icon-pago">💵</span> REGISTRAR PAGO
              </button>
            </div>

            {/* TABLA DE REGISTROS */}
            <div className="table-history-wrapper">
              <table className="modern-table">
                <thead style={{ background: '#F8F9F9', position: 'sticky', top: 0 }}>
                  <tr>
                    <th style={{ padding: '15px' }}>FECHA</th>
                    <th>CONCEPTO</th>
                    <th style={{ textAlign: 'right', paddingRight: '20px' }}>MONTO (S/.)</th>
                  </tr>
                </thead>
                <tbody>
                  {movimientos.map(mov => (
                    <tr key={mov._id}>
                      <td style={{ fontSize: '12px', color: '#7F8C8D' }}>{new Date(mov.fecha).toLocaleString()}</td>
                      <td>
                        <span style={{ fontWeight: 'bold', color: mov.tipo === 'DEUDA' ? '#E67E22' : '#27AE60' }}>
                          {mov.tipo === 'DEUDA' ? '🛒 COMPRA' : '💵 PAGO'}
                        </span>
                        <div style={{fontSize: '11px', color: '#7F8C8D'}}>{mov.descripcion}</div>
                      </td>
                      <td style={{ textAlign: 'right', paddingRight: '20px', fontWeight: 'bold' }}>S/. {mov.monto.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* NOTIFICACIÓN LATERAL IZQUIERDA (VUELTO) */}
      {vueltoAlert !== null && (
        <div className="vuelto-left-alert">
          <div className="left-alert-content">
            <div className="left-alert-icon">💰</div>
            <div className="left-alert-text">
              <span className="left-alert-title">DAR VUELTO</span>
              <span className="left-alert-amount">S/. {vueltoAlert.toFixed(2)}</span>
            </div>
            <button className="left-alert-close" onClick={() => setVueltoAlert(null)}><X size={16} /></button>
          </div>
          <div className="left-alert-progress"></div>
        </div>
      )}

      {/* MODAL ELIMINAR */}
      <ConfirmModal 
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={ejecutarEliminacionReal}
        titulo="¿Eliminar Cliente?"
        mensaje={selectedClient ? "¿Deseas borrar permanentemente a " + selectedClient.nombre + "?" : ""}
        colorBoton="#E74C3C" 
      />
    </div>
  );
};

export default Clients;