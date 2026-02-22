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
  saldoPendiente?: number; 
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

  // --- FUNCIÓN DE IMPRESIÓN RECOMPUESTA ---
  const ejecutarImpresion = () => {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    doc.write(`
      <html>
        <head>
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
            
            .anuncio {
              margin: 5pt 0;
              padding: 3pt;
              border: 0.5pt solid #000;
              font-size: 7.5pt;
              text-align: center;
              font-style: italic;
            }

            .table { width: 100%; font-size: 8.5pt; border-collapse: collapse; }
            .table td { padding: 2pt 0; vertical-align: top; }
            
            .grand-total { font-size: 10pt; font-weight: bold; margin-top: 5pt; display: flex; justify-content: space-between; }
            .letras { font-size: 7.5pt; margin-top: 4pt; font-weight: bold; }
            
            .saldo-box { 
              margin-top: 8pt; 
              padding: 4pt; 
              border: 1pt solid #000; 
              text-align: center; 
              font-size: 8.5pt; 
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          <div class="text-center">
            <div class="biz-name">TIENDA SIMONA</div>
            <div class="info-text bold">RUC: 10XXXXXXXXX</div>
            <div class="info-text">CALLE PRINCIPAL #123 - LIMA</div>
            <div class="divider"></div>
            <div class="doc-title">BOLETA DE VENTA ELECTRÓNICA<br/>B001-000${Math.floor(Math.random() * 10000)}</div>
            <div class="info-text">${fecha}</div>
          </div>

          <div class="anuncio">
            "Gracias por su preferencia. <br/> ¡Vuelva pronto!"
          </div>

          <table class="table">
            <tbody>
              ${items.map(it => `
                <tr>
                  <td style="width:70%">${it.nombre} ${it.cantidadSeleccionada > 1 ? `(x${it.cantidadSeleccionada})` : ''}</td>
                  <td align="right">S/ ${it.subtotal.toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="divider"></div>

          <div class="grand-total">
            <span>TOTAL:</span>
            <span>S/ ${total.toFixed(2)}</span>
          </div>

          <div class="letras">${montoALetras(total)}</div>

          ${saldoPendiente !== undefined ? `
            <div class="saldo-box">
              ${saldoPendiente > 0.1 
                ? `DEUDA PENDIENTE: S/ ${saldoPendiente.toFixed(2)}` 
                : `¡ESTADO: AL DÍA!`
              }
            </div>
          ` : ''}

          <div class="divider" style="margin-top:10pt;"></div>
          <div class="text-center info-text" style="font-size: 7pt;">¡Gracias por su compra!</div>
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
      <div className="ticket-modal-wrapper">
        <button onClick={onClose} className="modal-close-x">
          <X size={24} strokeWidth={3} />
        </button>

        <div className="thermal-paper-sheet">
          <div style={{textAlign: 'center'}}>
            <h2 style={{margin: 0, fontSize: '16px', fontWeight: 900}}>TIENDA SIMONA</h2>
            <p style={{fontSize: '9px', color: '#666', margin: 0}}>{fecha}</p>
            <hr style={{border: '0.5px dashed #ccc', margin: '8px 0'}}/>
          </div>

          <div style={{ border: '1px solid #eee', padding: '5px', textAlign: 'center', fontSize: '10px', fontStyle: 'italic', marginBottom: '10px' }}>
            "Gracias por su preferencia. <br/> ¡Vuelva pronto!"
          </div>

          <table style={{width: '100%', fontSize: '11px', borderCollapse: 'collapse'}}>
            <tbody>
              {items.map((it, i) => (
                <tr key={i}>
                  <td style={{padding: '3px 0'}}>{it.nombre} {it.cantidadSeleccionada > 1 ? `(x${it.cantidadSeleccionada})` : ''}</td>
                  <td align="right">S/ {it.subtotal.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <hr style={{border: '0.5px dashed #ccc', margin: '8px 0'}}/>

          <div style={{display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '14px'}}>
            <span>TOTAL</span>
            <span>S/ {total.toFixed(2)}</span>
          </div>

          <p style={{fontSize: '9px', marginTop: '5px', fontWeight: 'bold'}}>{montoALetras(total)}</p>

          {saldoPendiente !== undefined && (
            <div style={{ marginTop: '12px', padding: '6px', border: '1.5px solid black', textAlign: 'center', fontSize: '11px', fontWeight: 'bold' }}>
               {saldoPendiente > 0.1 ? `DEUDA PENDIENTE: S/ ${saldoPendiente.toFixed(2)}` : '¡ESTADO: AL DÍA!'}
            </div>
          )}
        </div>

        <button onClick={ejecutarImpresion} className="btn-thermal-print">
          <Printer size={20} /> LANZAR IMPRESIÓN
        </button>
      </div>
    </div>
  );
};

export default TicketPreviewModal;