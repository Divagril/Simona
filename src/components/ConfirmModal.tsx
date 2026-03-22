import React from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import './ConfirmModal.css'; // Importación de estilos

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  titulo: string;
  mensaje: string;
  colorBoton?: string; // Color opcional para el botón de acción (por defecto rojo)
}

const ConfirmModal: React.FC<Props> = ({ 
  isOpen, onClose, onConfirm, titulo, mensaje, colorBoton = "#E74C3C" 
}) => {
  if (!isOpen) return null;

  return (
    <div className="confirm-overlay">
      <div className="confirm-container">
        
        {/* ICONO DINÁMICO (Si es rojo asume eliminación, sino advertencia) */}
        <div 
          className="confirm-icon-circle" 
          style={{ backgroundColor: `${colorBoton}20` }}
        >
          {colorBoton === "#E74C3C" ? (
            <Trash2 size={40} color={colorBoton} />
          ) : (
            <AlertTriangle size={40} color={colorBoton} />
          )}
        </div>

        <h3 className="confirm-title">{titulo}</h3>
        <p className="confirm-text">{mensaje}</p>

        <div className="confirm-actions-row">
          <button onClick={onClose} className="btn-confirm-cancel">
            No, Cancelar
          </button>
          
          <button 
            onClick={() => { onConfirm(); onClose(); }} 
            className="btn-confirm-ok"
            style={{ backgroundColor: colorBoton }}
          >
            Sí, Continuar
          </button>
        </div>

      </div>
    </div>
  );
};

export default ConfirmModal;