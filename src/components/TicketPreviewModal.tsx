import React from 'react';
import { X, Printer } from 'lucide-react';
import type { CartItem } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  total: number;
  metodoPago?: string;
  pagoCon?: number;
  vuelto?: number;
  saldoPendiente?: number; // <--- NUEVA PROPIEDAD
}

const TicketPreviewModal: React.FC<Props> = ({ 
  isOpen, onClose, items, total, metodoPago = "EFECTIVO", pagoCon = 0, vuelto = 0, saldoPendiente 
}) => {
  if (!isOpen) return null;

  const fecha = new Date().toLocaleString('es-PE');
  
  const montoALetras = (num: number) => {
    const soles = Math.floor(num);
    const centimos = Math.round((num - soles) * 100);
    return `SON ${soles} Y ${centimos.toString().padStart(2, '0')}/100 SOLES`;
  };

  const ejecutarImpresion = () => {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    doc.write(`
      <html>
        <head>
          <title>Ticket</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            @page { margin: 0; size: 58mm auto; }
            body { 
              background: #ffffff !important; 
              width: 48mm; 
              font-family: 'Arial', sans-serif;
              padding: 1mm;
              color: #000;
            }
            .text-center { text-align: center; }
            .bold { font-weight: bold; }
            .header-logo { font-size: 18pt; margin-bottom: 2pt; }
            .biz-name { font-size: 11pt; font-weight: bold; text-transform: uppercase; }
            .info-text { font-size: 8pt; margin: 1pt 0; line-height: 1.1; }
            .doc-title { font-size: 9pt; font-weight: bold; margin: 4pt 0; }
            .divider { border-top: 0.8pt dashed #000; margin: 4pt 0; width: 100%; }
            .table { width: 100%; font-size: 8.5pt; border-collapse: collapse; }
            .table td { padding: 3pt 0; vertical-align: top; }
            .totals-table { width: 100%; font-size: 10pt; margin-top: 4pt; }
            .grand-total { font-size: 12pt; font-weight: bold; }
            .letras-monto { font-size: 7.5pt; margin-top: 4pt; line-height: 1; }
            
            /* ESTILO PARA EL SALDO */
            .saldo-box { 
              margin-top: 6pt; 
              padding: 3pt; 
              border: 1pt solid #000; 
              text-align: center;
              font-size: 9pt;
            }
          </style>
        </head>
        <body>
          <div class="text-center">
            <div class="header-logo">🏪</div>
            <div class="biz-name">TIENDA SIMONA</div>
            <div class="info-text">CALLE PRINCIPAL #123 - LIMA</div>
            <div class="divider"></div>
            <div class="doc-title">COMPROBANTE DE OPERACIÓN</div>
            <div class="info-text">${fecha}</div>
            <div class="divider"></div>
          </div>

          <table class="table">
            <tbody>
              ${items.map(it => `
                <tr>
                  <td style="width:70%">${it.nombre}</td>
                  <td align="right">S/ ${it.subtotal.toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="divider"></div>

          <table class="totals-table">
            <tr class="grand-total">
              <td>TOTAL:</td>
              <td align="right">S/ ${total.toFixed(2)}</td>
            </tr>
          </table>

          <div class="info-text bold letras-monto">${montoALetras(total)}</div>

          <!-- SECCIÓN DE DEUDA DEL CLIENTE -->
          ${saldoPendiente !== undefined ? `
            <div class="saldo-box">
              ${saldoPendiente > 0.1 
                ? `<span class="bold">DEUDA PENDIENTE: S/ ${saldoPendiente.toFixed(2)}</span>` 
                : `<span class="bold">¡ESTADO: AL DÍA!</span>`
              }
            </div>
          ` : ''}

          <div class="divider"></div>
          <div class="text-center info-text" style="font-size: 7.5pt;">¡Gracias por su confianza!</div>
        </body>
      </html>
    `);

    doc.close();
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => document.body.removeChild(iframe), 1000);
    }, 500);
  };

  return (
    <div className="modal-overlay">
      <div className="ticket-modal-wrapper" style={{background: '#333'}}>
        <button onClick={onClose} className="modal-close-x"><X size={20} /></button>

        <div style={{ width: '55mm', background: 'white', padding: '4mm', color: 'black', fontFamily: 'Arial' }}>
          <div style={{textAlign: 'center'}}>
            <h2 style={{margin: 0, fontSize: '14px'}}>TIENDA SIMONA</h2>
            <hr style={{border: '0.5px dashed #ccc', margin: '8px 0'}}/>
          </div>

          <table style={{width: '100%', fontSize: '10px'}}>
            <tbody>
              {items.map((it, i) => (
                <tr key={i}>
                  <td>{it.nombre}</td>
                  <td align="right">S/ {it.subtotal.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <hr style={{border: '0.5px dashed #ccc', margin: '8px 0'}}/>

          <div style={{display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '13px'}}>
            <span>TOTAL</span>
            <span>S/ {total.toFixed(2)}</span>
          </div>

          {saldoPendiente !== undefined && (
            <div style={{marginTop: '10px', padding: '5px', border: '1px solid black', textAlign: 'center', fontSize: '11px', fontWeight: 'bold'}}>
               {saldoPendiente > 0.1 ? `DEUDA PENDIENTE: S/ ${saldoPendiente.toFixed(2)}` : 'ESTADO: AL DÍA'}
            </div>
          )}
        </div>

        <button onClick={ejecutarImpresion} className="btn-thermal-print" style={{marginTop: '20px'}}>
          <Printer size={20} /> IMPRIMIR TICKET
        </button>
      </div>
    </div>
  );
};

export default TicketPreviewModal;