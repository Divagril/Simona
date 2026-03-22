import React, { useState, useEffect } from 'react';
import { 
  Users, Search, RefreshCw, UserPlus, Trash2, DollarSign, Printer, 
  ChevronRight, CreditCard, ShieldCheck, CheckCircle, ArrowLeft, Loader2
} from 'lucide-react';
import { 
  getClientesConDeuda, crearCliente, getMovimientosCliente, 
  registrarAbono, eliminarCliente 
} from '../services/api';
import { useNotification } from '../context/NotificationContext';
import ConfirmModal from '../components/ConfirmModal'; 
import TicketPreviewModal from '../components/TicketPreviewModal'; 
import type { Cliente } from '../types';

import './Clients.css'; 

const Clients: React.FC = () => {
  const { showNotification } = useNotification();
  
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [selectedClient, setSelectedClient] = useState<Cliente | null>(null);
  const [movimientos, setMovimientos] = useState<any[]>([]);
  const [cargando, setCargando] = useState(false);
  const [cargandoMovs, setCargandoMovs] = useState(false);
  const [procesando, setProcesando] = useState(false);

  const [montoAbono, setMontoAbono] = useState('');
  const [metodoPago, setMetodoPago] = useState('EFECTIVO');
  const [nuevoNombre, setNuevoNombre] = useState('');

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [datosTicket, setDatosTicket] = useState<any>(null);

  const cargarClientes = async () => {
    setCargando(true);
    try {
      const data = await getClientesConDeuda();
      setClientes(Array.isArray(data) ? data : []);
      if (selectedClient) {
        const actualizado = data.find((c: any) => c._id === selectedClient._id);
        if (actualizado) setSelectedClient(actualizado);
      }
    } catch (error) {
      showNotification("Error de red", true);
    } finally {
      setTimeout(() => setCargando(false), 500);
    }
  };

  useEffect(() => { cargarClientes(); }, []);

  const seleccionarCliente = async (cliente: Cliente) => {
    setSelectedClient(cliente);
    setMovimientos([]);
    setCargandoMovs(true);
    try {
      const movs = await getMovimientosCliente(cliente._id);
      setMovimientos(movs);
    } catch (e) { showNotification("Error historial", true); }
    finally { setCargandoMovs(false); }
  };

  const handleCrearCliente = async () => {
    if (!nuevoNombre.trim()) return;
    try {
       await crearCliente(nuevoNombre.trim().toUpperCase());
       setNuevoNombre(''); 
       cargarClientes();
       showNotification("✅ Cliente guardado");
    } catch (error) { showNotification("Error", true); }
  };

  const handleAbonar = async () => {
    if (!selectedClient || !montoAbono) return;
    setProcesando(true);
    try {
      await registrarAbono(selectedClient._id, Number(montoAbono), metodoPago); 
      setMontoAbono('');
      showNotification(`✅ S/. ${montoAbono} registrado`);
      await cargarClientes();
      const movs = await getMovimientosCliente(selectedClient._id);
      setMovimientos(movs); 
    } catch (error) { showNotification("Error", true); }
    finally { setProcesando(false); }
  };

  const handleImprimir = (mov: any) => {
    setDatosTicket({
      total: mov.monto,
      saldoPendiente: mov.saldo_al_momento,
      fechaOriginal: mov.fecha,
      items: mov.productos || [{ nombre: 'PAGO DE DEUDA', cantidadSeleccionada: 1, subtotal: mov.monto }],
      metodoPago: mov.metodoPago || 'EFECTIVO'
    });
    setIsTicketModalOpen(true);
  };

  return (
    <div className={`clients-master-wrapper ${selectedClient ? 'show-detail' : 'show-list'}`}>
      
      {/* 1. SIDEBAR IZQUIERDO */}
      <aside className="clients-sidebar">
        <div className="sidebar-header-pro">
          <div className="title-row">
            <div className="main-title"><Users size={20}/> <span>Clientes</span></div>
            <button className={`btn-sync-teal ${cargando ? 'spin' : ''}`} onClick={cargarClientes}>
              <RefreshCw size={18}/>
            </button>
          </div>
          <div className="search-field">
            <Search size={18} className="icon-search"/>
            <input placeholder="Buscar..." value={busqueda} onChange={e => setBusqueda(e.target.value)}/>
          </div>
        </div>

        <div className="clients-list-scroll">
          {clientes.filter(c => c.nombre.toLowerCase().includes(busqueda.toLowerCase())).map(c => (
            <div key={c._id} className={`client-card-item ${selectedClient?._id === c._id ? 'active' : ''}`} onClick={() => seleccionarCliente(c)}>
                <div className="info">
                    <span className="name">{c.nombre}</span>
                    <span className={`status ${c.deudaTotal > 0.1 ? 'debt' : 'clean'}`}>
                        {c.deudaTotal > 0.1 ? `DEBE S/. ${c.deudaTotal.toFixed(2)}` : 'AL DÍA'}
                    </span>
                </div>
                <ChevronRight size={18} className="chevron"/>
            </div>
          ))}
        </div>

        <div className="sidebar-footer-add">
            <div className="input-add-group">
                <input placeholder="Nuevo..." value={nuevoNombre} onChange={e => setNuevoNombre(e.target.value)}/>
                <button onClick={handleCrearCliente}><UserPlus size={18}/></button>
            </div>
        </div>
      </aside>

      {/* 2. CONTENIDO DERECHO */}
      <main className="clients-detail-view">
        {selectedClient ? (
          <div className="detail-scroll">
            <button className="btn-back-mobile" onClick={() => setSelectedClient(null)}>
                <ArrowLeft size={20} /> Directorio
            </button>

            <header className="profile-header-card">
               <div className="profile-left">
                  <div className="avatar-circle">{selectedClient.nombre.charAt(0)}</div>
                  <div className="info">
                    <h1>{selectedClient.nombre}</h1>
                    <button className="btn-delete-pro" onClick={() => setIsDeleteModalOpen(true)}>
                      <Trash2 size={14}/> Eliminar Ficha
                    </button>
                  </div>
               </div>
               <div className="profile-right">
                  <span className="label">SALDO PENDIENTE</span>
                  <span className={`amount ${selectedClient.deudaTotal > 0.1 ? 'text-red' : 'text-green'}`}>
                    S/. {selectedClient.deudaTotal.toFixed(2)}
                  </span>
               </div>
            </header>

            <section className="payment-bar-pro card-white">
                <div className="pay-group">
                    <label className="pay-label-mini">¿CUÁNTO VA A PAGAR?</label>
                    <div className="pay-input-container">
                        <div className="pay-icon-circle"><DollarSign size={20} color="#27ae60"/></div>
                        <input type="number" placeholder="0.00" value={montoAbono} onChange={e => setMontoAbono(e.target.value)}/>
                    </div>
                </div>

                <div className="pay-group">
                    <label className="pay-label-mini">¿CÓMO PAGA?</label>
                    <div className="pay-select-container">
                        <div className="pay-icon-circle"><CreditCard size={18} color="#3b82f6"/></div>
                        <select value={metodoPago} onChange={e => setMetodoPago(e.target.value)}>
                            <option value="EFECTIVO">💵 EFECTIVO</option>
                            <option value="YAPE">🟣 YAPE</option>
                            <option value="PLIN">🔵 PLIN</option>
                        </select>
                    </div>
                </div>

                <button className="btn-register-payment-pro" onClick={handleAbonar} disabled={!montoAbono || procesando}>
                   {procesando ? <Loader2 className="spin" size={20}/> : <CheckCircle size={20}/>}
                   {procesando ? 'GUARDANDO...' : 'REGISTRAR PAGO'}
                </button>
            </section>

            <section className="history-table-pro card-white">
               <div className="history-header">
                  <ShieldCheck size={20} color="#64748b" />
                  <h3>Historial Detallado</h3>
               </div>
               <div className="table-container">
                 <table className="history-table">
                    <thead>
                      <tr>
                        <th className="col-fecha">FECHA</th>
                        <th className="col-concepto">CONCEPTO</th>
                        <th className="col-monto">MONTO</th>
                        <th className="col-ticket">TICKET</th>
                      </tr>
                    </thead>
                    <tbody>
                      {movimientos.map(m => (
                        <tr key={m._id}>
                          <td className="col-fecha">{new Date(m.fecha).toLocaleDateString()}</td>
                          <td className="col-concepto">
                             <strong className={m.tipo === 'DEUDA' ? 'text-orange' : 'text-green'}>
                                {m.tipo === 'DEUDA' ? '🛒 COMPRA' : '💵 PAGO'}
                             </strong>
                             <div className="sub-text">vía {m.metodoPago || 'Efectivo'}</div>
                          </td>
                          <td className="col-monto">S/. {m.monto.toFixed(2)}</td>
                          <td className="col-ticket">
                            <button className="btn-print-mini" onClick={() => handleImprimir(m)}><Printer size={16}/></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                 </table>
               </div>
            </section>
          </div>
        ) : (
          <div className="no-client-selected">
            <Users size={80} color="#cbd5e1"/>
            <h2>Directorio de Clientes</h2>
            <p>Selecciona un cliente para gestionar su cuenta.</p>
          </div>
        )}
      </main>

      <ConfirmModal 
        isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} 
        onConfirm={() => eliminarCliente(selectedClient!._id).then(() => {setSelectedClient(null); cargarClientes();})}
        titulo="¿Borrar Cliente?" mensaje="Esta acción es permanente."
      />
    </div>
  );
};

export default Clients;