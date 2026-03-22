import React, { useState, useEffect, useRef } from 'react';
import { getClientesConDeuda, crearCliente } from '../services/api';
import { X, UserPlus, Search, UserCheck } from 'lucide-react';
import './ClientSelectModal.css'; // Importación de estilos

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (cliente: any) => void;
}

const ClientSelectModal: React.FC<Props> = ({ isOpen, onClose, onConfirm }) => {
  const [clientes, setClientes] = useState<any[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [mostrarConfirmarNuevo, setMostrarConfirmarNuevo] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const cargarLista = async () => {
    try {
      const data = await getClientesConDeuda();
      setClientes(data);
    } catch (error) {
      console.error("Error al cargar clientes:", error);
    }
  };

  useEffect(() => {
    if (isOpen) {
      cargarLista();
      setBusqueda('');
      setMostrarConfirmarNuevo(false);
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filtrados = clientes.filter(c => 
    c.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  const handleIntentarConfirmar = () => {
    if (!busqueda.trim()) return;
    const existente = clientes.find(c => c.nombre.toLowerCase() === busqueda.toLowerCase().trim());
    if (existente) {
      onConfirm(existente);
    } else {
      setMostrarConfirmarNuevo(true);
    }
  };

  const handleCrearNuevoYFiar = async () => {
    try {
      const nuevo = await crearCliente(busqueda.trim());
      onConfirm(nuevo);
      setMostrarConfirmarNuevo(false);
    } catch (error) {
      alert("Error al registrar cliente");
    }
  };

  return (
    <div className="client-modal-overlay">
      <div className="client-modal-container">
        
        {!mostrarConfirmarNuevo ? (
          <>
            {/* CABECERA */}
            <div className="client-modal-header">
              <div className="header-title">
                <Users size={20} color="#3b82f6" />
                <span>Seleccionar Cliente</span>
              </div>
              <button onClick={onClose} className="btn-close-circle">
                <X size={18} />
              </button>
            </div>

            <div className="client-modal-body">
              {/* BUSCADOR */}
              <div className="client-search-wrapper">
                <Search className="search-icon" size={20} /> 
                <input 
                  ref={inputRef}
                  type="text" 
                  placeholder="Escriba nombre del cliente..." 
                  value={busqueda} 
                  onChange={(e) => setBusqueda(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleIntentarConfirmar()}
                />
              </div>

              {/* LISTADO */}
              <div className="client-results-list">
                {filtrados.length > 0 ? (
                  filtrados.map(c => (
                    <div 
                      key={c._id} 
                      className="client-selection-card" 
                      onClick={() => onConfirm(c)}
                    >
                      <div className="client-info">
                        <span className="client-name">{c.nombre}</span>
                        <span className={`client-status-badge ${c.deudaTotal > 0.1 ? 'debt' : 'clean'}`}>
                          {c.deudaTotal > 0.1 ? `Debe S/. ${c.deudaTotal.toFixed(2)}` : 'AL DÍA'}
                        </span>
                      </div>
                      <UserCheck size={18} className="check-icon" />
                    </div>
                  ))
                ) : (
                  busqueda.length > 0 && (
                    <div className="client-not-found">
                      <p>No existe el cliente <strong>"{busqueda}"</strong></p>
                      <button className="btn-create-instant" onClick={() => setMostrarConfirmarNuevo(true)}>
                        <UserPlus size={18} /> Crear y Continuar
                      </button>
                    </div>
                  )
                )}
              </div>
            </div>

            <div className="client-modal-footer">
                <button onClick={onClose} className="btn-cancel-modal">Cerrar</button>
            </div>
          </>
        ) : (
          /* VISTA CONFIRMACIÓN CREACIÓN */
          <div className="confirm-create-view">
            <div className="icon-circle-blue">
              <UserPlus size={40} color="#3b82f6" />
            </div>
            <h3>¿Registrar nuevo cliente?</h3>
            <p>El cliente <strong>"{busqueda}"</strong> no está en el sistema.</p>
            
            <div className="confirm-buttons">
              <button onClick={() => setMostrarConfirmarNuevo(false)} className="btn-back">Corregir Nombre</button>
              <button onClick={handleCrearNuevoYFiar} className="btn-confirm-create">Sí, Crear y Fiar</button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

// Icono local para consistencia
const Users = ({ size, color }: any) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
);

export default ClientSelectModal;