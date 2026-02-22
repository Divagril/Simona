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

  // --- FUNCIÓN DE IMPRESIÓN SIN ABRIR PESTAÑAS ---
  const ejecutarImpresion = () => {
    // 1. Creamos o buscamos un marco invisible en la página actual
    let iframe = document.getElementById('print-iframe') as HTMLIFrameElement;
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = 'print-iframe';
      // Lo hacemos invisible pero presente para que el celular no lo bloquee
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = 'none';
      iframe.style.opacity = '0';
      document.body.appendChild(iframe);
    }

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    // 2. Escribimos el ticket con tus medidas originales
    doc.open();
    doc.write(`
      <html>
        <head>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            @page { margin: 0; size: 58mm auto; }
            body { 
              background: #fff; 
              width: 52mm; 
              font-family: Arial, sans-serif;
              padding: 2mm;
              color: #000;
            }
            .text-center { text-align: center; }
            .bold { font-weight: bold; }
            .biz-name { font-size: 14pt; font-weight: bold; text-transform: uppercase; }
            .info-text { font-size: 10pt; margin: 2pt 0; line-height: 1.2; }
            .doc-title { font-size: 11pt; font-weight: bold; margin: 6pt 0; }
            .divider { border-top: 1pt dashed #000; margin: 8pt 0; width: 100%; }
            .table { width: 100%; font-size: 10pt; border-collapse: collapse; }
            .table td { padding: 4pt 0; vertical-align: top; }
            .grand-total { font-size: 13pt; font-weight: bold; margin-top: 8pt; display: flex; justify-content: space-between; }
            .letras { font-size: 9pt; margin-top: 6pt; font-weight: bold; }
            .saldo-box { margin-top: 10pt; padding: 5pt; border: 1pt solid #000; text-align: center; font-size: 11pt; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="text-center">
            <div class="biz-name">TIENDA SIMONA</div>
            <div class="info-text bold">RUC: 10XXXXXXXXX</div>
            <div class="info-text">CALLE PRINCIPAL #123 - LIMA</div>
            <div class="divider"></div>
            <div class="doc-title">BOLETA DE VENTA</div>
            <div class="info-text">${fecha}</div>
            <div class="divider"></div>
          </div>
          <table class="table">
            <tbody>
              ${items.map(it => `
                <tr>
                  <td style="width:70%">${it.nombre} ${it.cantidadSeleccionada > 1 ? `x${it.cantidadSeleccionada}` : ''}</td>
                  <td align="right">S/ ${it.subtotal.toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="divider"></div>
          <div class="grand-total"><span>TOTAL:</span><span>S/ ${total.toFixed(2)}</span></div>
          <div class="letras">${montoALetras(total)}</div>
          ${saldoPendiente !== undefined ? `
            <div class="saldo-box">
              ${saldoPendiente > 0.1 ? `DEUDA PENDIENTE: S/ ${saldoPendiente.toFixed(2)}` : `¡ESTADO: AL DÍA!`}
            </div>
          ` : ''}
          <div class="divider" style="margin-top:15pt;"></div>
          <div class="text-center info-text" style="font-size: 8pt;">¡Gracias por su compra!</div>
        </body>
      </html>
    `);
    doc.close();

    // 3. Lanzamos la impresión desde el marco invisible
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    }, 500);
  };

  return (
    <div className="modal-overlay">
      <div className="ticket-modal-wrapper">
        <button onClick={onClose} className="modal-close-x" title="Cerrar">
          <X size={24} strokeWidth={3} />
        </button>

        <div className="thermal-paper-sheet">
          <div style={{textAlign: 'center'}}>
            <h2 style={{margin: 0, fontSize: '16px', fontWeight: 900}}>TIENDA SIMONA</h2>
            <p style={{fontSize: '9px', color: '#666', margin: 0}}>{fecha}</p>
            <hr style={{border: '0.5px dashed #ccc', margin: '8px 0'}}/>
          </div>

          <table style={{width: '100%', fontSize: '11px', borderCollapse: 'collapse'}}>
            <tbody>
              {items.map((it, i) => (
                <tr key={i}>
                  <td style={{padding: '3px 0'}}>{it.nombre} {it.cantidadSeleccionada > 1 ? `x${it.cantidadSeleccionada}` : ''}</td>
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

          <p style={{fontSize: '9px', marginTop: '10px', fontWeight: 'bold', textAlign: 'center'}}>{montoALetras(total)}</p>

          {saldoPendiente !== undefined && (
            <div style={{ marginTop: '12px', padding: '8px', border: '1.5px solid black', textAlign: 'center', fontSize: '11px', fontWeight: 'bold' }}>
               {saldoPendiente > 0.1 ? `DEUDA PENDIENTE: S/ ${saldoPendiente.toFixed(2)}` : '¡ESTADO: AL DÍA!'}
            </div>
          )}
        </div>

        <button onClick={ejecutarImpresion} className="btn-thermal-print">
          <Printer size={22} /> LANZAR IMPRESIÓN
        </button>
      </div>
    </div>
  );
};

export default TicketPreviewModal;