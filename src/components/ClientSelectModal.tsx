import React, { useState, useEffect } from 'react';
import { getClientesConDeuda, crearCliente } from '../services/api';
import { X, UserPlus, Search, UserCheck } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (cliente: any) => void;
}

const ClientSelectModal: React.FC<Props> = ({ isOpen, onClose, onConfirm }) => {
  const [clientes, setClientes] = useState<any[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [mostrarConfirmarNuevo, setMostrarConfirmarNuevo] = useState(false);

  // Cargamos todos los clientes apenas se abre el modal
  const cargarLista = async () => {
    const data = await getClientesConDeuda();
    setClientes(data);
  };

  useEffect(() => {
    if (isOpen) {
      cargarLista();
      setBusqueda('');
      setMostrarConfirmarNuevo(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Filtramos la lista según lo que escribes
  const filtrados = clientes.filter(c => 
    c.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  // Si escribes un nombre y no hay coincidencias exactas
  const existeExacto = clientes.some(c => c.nombre.toLowerCase() === busqueda.toLowerCase().trim());

  const handleCrearYNuevo = async () => {
    const nuevo = await crearCliente(busqueda);
    onConfirm(nuevo);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container-client">
        <div className="modal-header-gray">
          <span className="modal-title-small">👤 Seleccionar Cliente para Fiado</span>
          <button onClick={onClose} className="btn-close-x"><X size={18} /></button>
        </div>

        <div className="modal-body-client">
          {/* BUSCADOR PRINCIPAL */}
          <div className="search-container-modal">
            <Search className="icon-s-modal" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por nombre o crear nuevo..." 
              className="input-client-search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              autoFocus
            />
          </div>

          {/* LISTA DE CLIENTES EXISTENTES (Igual a tu página de clientes) */}
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
                    <span className={`modal-client-badge ${cliente.deudaTotal > 0 ? 'debt' : 'clean'}`}>
                      {cliente.deudaTotal > 0 ? `Debe: S/. ${cliente.deudaTotal.toFixed(2)}` : 'AL DÍA'}
                    </span>
                  </div>
                  <UserCheck size={18} color="#3498DB" />
                </div>
              ))
            ) : (
              busqueda.length > 0 && (
                <div className="no-results-modal">
                  <p>No se encontró a <strong>"{busqueda}"</strong></p>
                  <button className="btn-create-new-modal" onClick={handleCrearYNuevo}>
                    <UserPlus size={18} /> Crear "{busqueda}" y fiar ahora
                  </button>
                </div>
              )
            )}
          </div>

          {/* BOTÓN SI ESCRIBISTE UN NOMBRE NUEVO PERO HAY OTROS SIMILARES */}
          {!existeExacto && busqueda.length > 2 && filtrados.length > 0 && (
             <button className="btn-create-alternate" onClick={handleCrearYNuevo}>
                + Crear como nuevo cliente: "{busqueda}"
             </button>
          )}

          <div className="modal-footer-btns">
            <button onClick={onClose} className="btn-modal-gray-light" style={{width: '100%'}}>
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientSelectModal;