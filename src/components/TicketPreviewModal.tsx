import React from 'react';
import { createPortal } from 'react-dom';
import { X, Printer } from 'lucide-react';
import './TicketPreviewModal.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  items?: any[];
  total?: number;
  metodoPago?: string;
  saldoPendiente?: number; 
  fechaManual?: string;
}

const TicketPreviewModal: React.FC<Props> = ({ 
  isOpen, onClose, items = [], total = 0, metodoPago = "EFECTIVO", saldoPendiente, fechaManual 
}) => {
  if (!isOpen) return null;

  const safeTotal = Number(total) || 0;
  const safeItems = Array.isArray(items) ? items : [];
  const fechaParaMostrar = fechaManual ? new Date(fechaManual).toLocaleString('es-PE') : new Date().toLocaleString('es-PE');
  
  const montoALetras = (num: number) => {
    const soles = Math.floor(num);
    const centimos = Math.round((num - soles) * 100);
    return `SON ${soles} Y ${centimos.toString().padStart(2, '0')}/100 SOLES`;
  };

  const ejecutarImpresion = () => {
    let iframe = document.getElementById('iframe-p') as HTMLIFrameElement;
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = 'iframe-p';
      iframe.style.position = 'fixed';
      iframe.style.width = '0px'; iframe.style.height = '0px';
      document.body.appendChild(iframe);
    }
    const doc = iframe.contentWindow?.document;
    if (!doc) return;
    doc.open();
    doc.write(`<html><body onload="window.print()"><h2 style="text-align:center">TIENDA SIMO</h2><p style="text-align:center">${fechaParaMostrar}</p></body></html>`);
    doc.close();
  };

  return createPortal(
    <div className="ticket-global-overlay">
      <div className="ticket-modal-card">
        <button onClick={onClose} className="ticket-btn-close">
          <X size={24} strokeWidth={3} />
        </button>

        <div className="paper-receipt">
          <div className="receipt-header">
            <h2>TIENDA SIMO</h2>
            <p>{fechaParaMostrar}</p>
            {/* LÍNEA ELIMINADA AQUÍ */}
          </div>

          <table className="receipt-table">
            <tbody>
              {safeItems.map((it, i) => (
                <tr key={i}>
                  <td>
                    <span className="name">{it.nombre || 'Producto'}</span>
                    <span className="qty">{it.cantidadSeleccionada || 1} x S/ {(Number(it.precio) || 0).toFixed(2)}</span>
                  </td>
                  <td className="subtotal">S/ {(Number(it.subtotal) || 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* LÍNEA ELIMINADA AQUÍ */}
          
          <div className="receipt-total">
            <span>TOTAL A PAGAR</span>
            <span className="amount">S/ {safeTotal.toFixed(2)}</span>
          </div>

          <span className="letters">{montoALetras(safeTotal)}</span>
          <div className="method"><strong>Método:</strong> {metodoPago}</div>

          {saldoPendiente !== undefined && (
            <div className="debt-box">
               <div className="label">Saldo Restante:</div>
               <div className="val">S/ {Number(saldoPendiente).toFixed(2)}</div>
            </div>
          )}
        </div>

        <button onClick={ejecutarImpresion} className="btn-launch-print">
          <Printer size={22} /> LANZAR IMPRESIÓN
        </button>
      </div>
    </div>,
    document.body
  );
};

export default TicketPreviewModal;