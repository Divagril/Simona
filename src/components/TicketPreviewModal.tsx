import React from 'react';
import { X, Printer } from 'lucide-react';
import type { CartItem } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  items: any[]; // Cambiado a any para mayor flexibilidad con ventas manuales
  total: number;
  metodoPago?: string;
  pagoCon?: number;
  vuelto?: number;
  saldoPendiente?: number; 
  fechaManual?: string;
}

const TicketPreviewModal: React.FC<Props> = ({ 
  isOpen, onClose, items, total, metodoPago = "EFECTIVO", pagoCon = 0, vuelto = 0, saldoPendiente, fechaManual 
}) => {
  if (!isOpen) return null;

  // Formatear fecha actual o la guardada
  const fechaParaMostrar = fechaManual 
    ? new Date(fechaManual).toLocaleString('es-PE') 
    : new Date().toLocaleString('es-PE');
  
  // Convertir monto a letras (Simple)
  const montoALetras = (num: number) => {
    const soles = Math.floor(num);
    const centimos = Math.round((num - soles) * 100);
    return `SON ${soles} Y ${centimos.toString().padStart(2, '0')}/100 SOLES`;
  };

  // --- FUNCIÓN DE IMPRESIÓN MAESTRA ---
  const ejecutarImpresion = () => {
    let iframe = document.getElementById('iframe-impresion-simona') as HTMLIFrameElement;
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = 'iframe-impresion-simona';
      iframe.style.position = 'fixed';
      iframe.style.width = '0px';
      iframe.style.height = '0px';
      iframe.style.border = 'none';
      document.body.appendChild(iframe);
    }

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(`
      <html>
        <head>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Courier New', Courier, monospace; }
            @page { margin: 0; size: 58mm auto; }
            body { width: 48mm; padding: 2mm; color: #000; background: #fff; }
            .text-center { text-align: center; }
            .bold { font-weight: bold; }
            .divider { border-top: 1px dashed #000; margin: 5px 0; }
            table { width: 100%; font-size: 9pt; border-collapse: collapse; }
            .total-row { font-size: 11pt; font-weight: bold; margin-top: 10px; display: flex; justify-content: space-between; }
            .footer { font-size: 8pt; margin-top: 15px; text-align: center; }
          </style>
        </head>
        <body>
          <div class="text-center">
            <h2 style="font-size: 14pt;">TIENDA SIMO</h2>
            <p style="font-size: 8pt;">${fechaParaMostrar}</p>
            <div class="divider"></div>
          </div>
          <table>
            <tbody>
              ${items.map(it => `
                <tr>
                  <td style="padding: 2px 0;">${it.nombre} ${it.cantidadSeleccionada > 1 ? `x${it.cantidadSeleccionada}` : ''}</td>
                  <td align="right">S/ ${it.subtotal.toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="divider"></div>
          <div class="total-row">
            <span>TOTAL:</span>
            <span>S/ ${total.toFixed(2)}</span>
          </div>
          <p style="font-size: 7pt; margin-top: 5px;">${montoALetras(total)}</p>
          <p style="font-size: 8pt; margin-top: 5px;">M. Pago: ${metodoPago}</p>
          ${saldoPendiente !== undefined ? `
            <div style="border: 1px solid #000; padding: 4px; margin-top: 10px; text-align: center; font-weight: bold; font-size: 10pt;">
              DEUDA TOTAL: S/ ${saldoPendiente.toFixed(2)}
            </div>
          ` : ''}
          <div class="footer">¡Gracias por su preferencia!</div>
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    }, 500);
  };

  return (
    <div className="modal-overlay">
      <div className="ticket-modal-wrapper">
        {/* BOTÓN CERRAR */}
        <button onClick={onClose} className="modal-close-x">
          <X size={24} strokeWidth={3} />
        </button>

        {/* VISTA PREVIA DEL PAPEL TÉRMICO */}
        <div className="thermal-paper-sheet">
          <div style={{ textAlign: 'center', marginBottom: '10px' }}>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 900 }}>TIENDA SIMO</h2>
            <p style={{ fontSize: '10px', color: '#666', margin: '2px 0' }}>{fechaParaMostrar}</p>
            <div style={{ borderTop: '1px dashed #ccc', margin: '10px 0' }}></div>
          </div>

          {/* LISTA DE PRODUCTOS REALES */}
          <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
            <tbody>
              {items.map((it, i) => (
                <tr key={i}>
                  <td style={{ padding: '4px 0', verticalAlign: 'top' }}>
                    <div style={{ fontWeight: 'bold' }}>{it.nombre}</div>
                    <div style={{ fontSize: '10px', color: '#666' }}>
                      {it.cantidadSeleccionada} x S/ {(it.precio || (it.subtotal / it.cantidadSeleccionada)).toFixed(2)}
                    </div>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 'bold', verticalAlign: 'top' }}>
                    S/ {it.subtotal.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ borderTop: '1px dashed #ccc', margin: '10px 0' }}></div>

          {/* TOTALES */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 800, fontSize: '14px' }}>TOTAL A PAGAR</span>
            <span style={{ fontWeight: 900, fontSize: '18px' }}>S/ {total.toFixed(2)}</span>
          </div>

          <p style={{ fontSize: '9px', marginTop: '10px', textAlign: 'center', fontStyle: 'italic' }}>
            {montoALetras(total)}
          </p>

          <div style={{ marginTop: '10px', fontSize: '11px' }}>
            <strong>Metodo:</strong> {metodoPago}
          </div>

          {/* SALDO SI ES FIADO */}
          {saldoPendiente !== undefined && (
            <div style={{ 
              marginTop: '15px', 
              padding: '10px', 
              border: '2px solid black', 
              textAlign: 'center', 
              background: '#f9f9f9' 
            }}>
               <div style={{ fontSize: '10px', textTransform: 'uppercase' }}>Deuda Pendiente Actual:</div>
               <div style={{ fontSize: '16px', fontWeight: 900 }}>S/ {saldoPendiente.toFixed(2)}</div>
            </div>
          )}
          
          <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '10px', color: '#999' }}>
            *** COMPROBANTE NO FISCAL ***
          </div>
        </div>

        {/* BOTÓN IMPRIMIR */}
        <button onClick={ejecutarImpresion} className="btn-thermal-print">
          <Printer size={22} /> LANZAR IMPRESIÓN
        </button>
      </div>
    </div>
  );
};

export default TicketPreviewModal;