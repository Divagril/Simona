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
      <div className="ticket-modal-container">
        <button onClick={onClose} className="modal-close-x"><X size={20} /></button>
        
        {/* DISEÑO DEL TICKET (SIMULA PAPEL TÉRMICO) */}
        <div className="thermal-paper">
          <div className="ticket-header">
            <h2 className="shop-name">TIENDA SIMONA</h2>
            <p>--------------------------------</p>
            <p className="bold">BOLETA DE VENTA</p>
            <p>{fecha}</p>
            <p>Cliente: Público General</p>
            <p>--------------------------------</p>
          </div>

          <table className="ticket-table">
            <thead>
              <tr>
                <th align="left">Cant</th>
                <th align="left">Prod</th>
                <th align="right">Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={index}>
                  <td>{item.cantidadSeleccionada}</td>
                  <td>{item.nombre.substring(0, 18)}</td>
                  <td align="right">{item.subtotal.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="ticket-footer">
            <p>---------------------------</p>
            <div className="ticket-total-row">
              <span>TOTAL:</span>
              <span>S/. {total.toFixed(2)}</span>
            </div>
            <p>---------------------------</p>
            <p className="thanks">¡Gracias por su compra!</p>
          </div>
        </div>

        <button onClick={() => window.print()} className="btn-print-ticket">
          <Printer size={18} /> Imprimir Comprobante
        </button>
      </div>
    </div>
  );
};

export default TicketPreviewModal;