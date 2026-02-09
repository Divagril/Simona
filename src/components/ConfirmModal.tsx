import React from 'react';
import { Trash2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  titulo: string;
  mensaje: string;
  colorBoton?: string;
}

const ConfirmModal: React.FC<Props> = ({ isOpen, onClose, onConfirm, titulo, mensaje, colorBoton = "#E74C3C" }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-container-small">
        <div className="confirm-icon-circle" style={{ backgroundColor: `${colorBoton}20` }}>
          <Trash2 size={40} color={colorBoton} />
        </div>
        
        <h3 className="confirm-title">{titulo}</h3>
        <p className="confirm-text">{mensaje}</p>

        <div className="confirm-actions-row">
          <button onClick={onClose} className="btn-confirm-cancel">
            Cancelar
          </button>
          <button 
            onClick={() => { onConfirm(); onClose(); }} 
            className="btn-confirm-ok"
            style={{ backgroundColor: colorBoton }}
          >
            Sí, Eliminar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;