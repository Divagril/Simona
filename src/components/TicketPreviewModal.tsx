import React from 'react';
import { X, Printer } from 'lucide-react';
import type { CartItem } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  total: number;
}

const TicketPreviewModal: React.FC<Props> = ({ isOpen, onClose, items, total }) => {
  if (!isOpen) return null;

  const fecha = new Date().toLocaleString();

  return (
    <div className="modal-overlay">
      <div className="ticket-modal-wrapper">
        {/* BOTÓN CERRAR */}
        <button onClick={onClose} className="modal-close-x">
          <X size={20} />
        </button>

        {/* EL PAPEL TÉRMICO */}
        <div className="thermal-paper-sheet">
          <div className="thermal-header">
            <h2 className="thermal-title">TIENDA SIMONA</h2>
            <div className="thermal-divider"></div>
            <p className="thermal-bold">BOLETA DE VENTA</p>
            <p>{fecha}</p>
            <p>Cliente: Público General</p>
            <div className="thermal-divider"></div>
          </div>

          <table className="thermal-table">
            <thead>
              <tr>
                <th align="left">Cant</th>
                <th align="left">Producto</th>
                <th align="right">Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={index}>
                  <td>{item.cantidadSeleccionada}</td>
                  <td className="thermal-prod-name">{item.nombre}</td>
                  <td align="right">{item.subtotal.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="thermal-footer">
            <div className="thermal-divider"></div>
            <div className="thermal-total-row">
              <span>TOTAL:</span>
              <span>S/. {total.toFixed(2)}</span>
            </div>
            <div className="thermal-divider"></div>
            <p className="thermal-thanks">¡Gracias por su compra!</p>
          </div>
        </div>

        {/* BOTÓN IMPRIMIR FUERA DEL PAPEL */}
        <button onClick={() => window.print()} className="btn-thermal-print">
          <Printer size={18} /> Imprimir Comprobante
        </button>
      </div>
    </div>
  );
};

export default TicketPreviewModal;