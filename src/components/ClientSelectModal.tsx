import React, { useState, useEffect, useRef } from 'react';
import { getClientesConDeuda, crearCliente } from '../services/api';
import { X, UserPlus, Search, UserCheck } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (cliente: any) => void;
}

const ClientSelectModal: React.FC<Props> = ({ isOpen, onClose, onConfirm }) => {
  // --- ESTADOS ---
  const [clientes, setClientes] = useState<any[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [mostrarConfirmarNuevo, setMostrarConfirmarNuevo] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // --- CARGA DE DATOS ---
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
      // Auto-foco al abrir para escribir de inmediato
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // --- LÓGICA DE BÚSQUEDA ---
  const filtrados = clientes.filter(c => 
    c.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  const handleIntentarConfirmar = () => {
    if (!busqueda.trim()) return;
    
    // Buscar si el nombre escrito ya existe exactamente
    const existente = clientes.find(c => c.nombre.toLowerCase() === busqueda.toLowerCase().trim());
    if (existente) {
      onConfirm(existente);
    } else {
      // Si no existe, activamos la interfaz de confirmación interna
      setMostrarConfirmarNuevo(true);
    }
  };

  const handleCrearNuevoYFiar = async () => {
    try {
      const nuevo = await crearCliente(busqueda.trim());
      onConfirm(nuevo);
      setMostrarConfirmarNuevo(false);
    } catch (error) {
      alert("Error al registrar el nuevo cliente");
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container-client">
        
        {/* VISTA 1: BUSCADOR DE CLIENTES */}
        {!mostrarConfirmarNuevo ? (
          <>
            {/* CABECERA ESTILO VENTANA */}
            <div className="modal-header-gray">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px' }}>👤</span>
                <span className="modal-title-small">Seleccionar Cliente</span>
              </div>
              <button onClick={onClose} className="modal-close-x-small">
                <X size={18} />
              </button>
            </div>

            <div className="modal-body-client">
              
              {/* CAMPO DE BÚSQUEDA CON LUPA INTERNA */}
              <div className="search-container-modal">
                <Search className="icon-s-modal" size={22} /> 
                <input 
                  ref={inputRef}
                  type="text" 
                  placeholder="Buscar o escribir nombre..." 
                  className="input-client-search"
                  value={busqueda} 
                  onChange={(e) => setBusqueda(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleIntentarConfirmar();
                  }}
                />
              </div>

              {/* LISTA DE CLIENTES EXISTENTES */}
              <div className="modal-clients-list">
                {filtrados.length > 0 ? (
                  filtrados.map(cliente => (
                    <div 
                      key={cliente._id} 
                      className="modal-client-card" 
                      onClick={() => onConfirm(cliente)}
                    >
                      <div className="modal-client-info">
                        <span className="modal-client-name">{cliente.nombre}</span>
                        <span className={`modal-client-badge ${cliente.deudaTotal > 0.1 ? 'debt' : 'clean'}`}>
                          {cliente.deudaTotal > 0.1 ? `Debe: S/. ${cliente.deudaTotal.toFixed(2)}` : 'AL DÍA'}
                        </span>
                      </div>
                      <UserCheck size={18} color="#3498DB" style={{ opacity: 0.7 }} />
                    </div>
                  ))
                ) : (
                  busqueda.length > 0 && (
                    <div className="no-results-modal">
                      <p>No se encontró a <strong>"{busqueda}"</strong></p>
                      <button className="btn-create-new-modal" onClick={() => setMostrarConfirmarNuevo(true)}>
                        <UserPlus size={20} /> Crear y Fiar
                      </button>
                    </div>
                  )
                )}
              </div>

              {/* BOTÓN CANCELAR */}
              <div className="modal-footer-btns">
                <button onClick={onClose} className="btn-modal-gray-full">
                  Cancelar
                </button>
              </div>
            </div>
          </>
        ) : (
          /* VISTA 2: INTERFAZ DE CONFIRMACIÓN (REEMPLAZA AL LOCALHOST) */
          <div className="confirm-create-container">
            <div className="confirm-icon-box">
              <UserPlus size={40} color="#3498DB" />
            </div>
            <h3>¿Crear nuevo cliente?</h3>
            <p>El nombre <strong>"{busqueda}"</strong> no está en la lista.</p>
            <p>¿Deseas registrarlo para continuar con el fiado?</p>
            
            <div className="confirm-actions">
              <button onClick={() => setMostrarConfirmarNuevo(false)} className="btn-confirm-no">
                No, Corregir
              </button>
              <button onClick={handleCrearNuevoYFiar} className="btn-confirm-yes">
                Sí, Crear y Fiar
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default ClientSelectModal;