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
}

const TicketPreviewModal: React.FC<Props> = ({ 
  isOpen, onClose, items, total, metodoPago = "EFECTIVO", pagoCon = 0, vuelto = 0 
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

    const opGravada = (total / 1.18).toFixed(2);
    const igv = (total - Number(opGravada)).toFixed(2);

    doc.write(`
      <html>
        <head>
          <title>Ticket</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            
            @page { 
              margin: 0; 
              size: 58mm auto; /* Forzamos medida más estrecha para evitar cortes */
            }

            body { 
              background: #ffffff !important; 
              width: 52mm; /* ANCHO CORREGIDO PARA QUE NO SE CORTE A LA DERECHA */
              font-family: 'Arial', sans-serif;
              padding: 2mm;
              color: #000;
            }

            .text-center { text-align: center; }
            .bold { font-weight: bold; }
            
            /* Ajuste de tamaños para que quepa en el nuevo ancho */
            .header-logo { font-size: 22pt; margin-bottom: 2pt; }
            .biz-name { font-size: 12pt; font-weight: bold; text-transform: uppercase; }
            .info-text { font-size: 9pt; margin: 2pt 0; line-height: 1.1; }
            .doc-title { font-size: 10pt; font-weight: bold; margin: 5pt 0; }
            
            .divider { border-top: 1pt dashed #000; margin: 5pt 0; width: 100%; }
            
            .table { width: 100%; font-size: 9pt; border-collapse: collapse; }
            .table th { border-bottom: 1pt solid #000; padding: 3pt 0; }
            .table td { padding: 4pt 0; vertical-align: top; }
            
            .totals-table { width: 100%; font-size: 10pt; margin-top: 5pt; }
            .grand-total { font-size: 11pt; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="text-center">
            <div class="header-logo">🏪</div>
            <div class="biz-name">TIENDA SIMONA</div>
            <div class="info-text bold">RUC: 10XXXXXXXXX</div>
            <div class="info-text">CALLE PRINCIPAL #123 - LIMA</div>
            
            <div class="divider"></div>
            <div class="doc-title">BOLETA DE VENTA ELECTRÓNICA<br/>B001-000${Math.floor(Math.random() * 10000)}</div>
            <div class="divider"></div>
          </div>

          <div class="info-text">
            <span class="bold">FECHA:</span> ${fecha}<br/>
            <span class="bold">CLIENTE:</span> PÚBLICO GENERAL
          </div>

          <div class="divider"></div>

          <table class="table">
            <thead>
              <tr>
                <th align="left">DESC.</th>
                <th align="center">P/U</th>
                <th align="right">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              ${items.map(it => `
                <tr>
                  <td style="width:50%">${it.nombre}</td>
                  <td align="center">${it.precio.toFixed(2)}</td>
                  <td align="right">${it.subtotal.toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="divider"></div>

          <table class="totals-table">
            <tr>
              <td>OP. GRAVADA</td>
              <td align="right">S/ ${opGravada}</td>
            </tr>
            <tr>
              <td>I.G.V. 18%</td>
              <td align="right">S/ ${igv}</td>
            </tr>
            <tr class="grand-total">
              <td>TOTAL</td>
              <td align="right">S/ ${total.toFixed(2)}</td>
            </tr>
          </table>

          <div class="info-text bold" style="margin-top:5pt; font-size: 8pt;">
            ${montoALetras(total)}
          </div>

          <div class="divider"></div>
          <div class="text-center info-text" style="font-size: 8pt;">¡Gracias por su compra!</div>
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
        <button onClick={onClose} className="modal-close-x">
          <X size={20} />
        </button>

        <div style={{ 
          width: '60mm', /* Vista previa más delgada */
          background: 'white', 
          padding: '5mm', 
          color: 'black',
          boxShadow: '0 0 15px rgba(0,0,0,0.5)',
          fontFamily: 'Arial'
        }}>
          <div style={{textAlign: 'center'}}>
            <h2 style={{margin: 0, fontSize: '16px'}}>TIENDA SIMONA</h2>
            <hr style={{border: '0.5px dashed #ccc', margin: '10px 0'}}/>
          </div>

          <table style={{width: '100%', fontSize: '11px'}}>
            <tbody>
              {items.map((it, i) => (
                <tr key={i}>
                  <td>{it.cantidadSeleccionada}x {it.nombre}</td>
                  <td align="right">S/ {it.subtotal.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <hr style={{border: '0.5px dashed #ccc', margin: '10px 0'}}/>

          <div style={{display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '14px'}}>
            <span>TOTAL</span>
            <span>S/ {total.toFixed(2)}</span>
          </div>
        </div>

        <button onClick={ejecutarImpresion} className="btn-thermal-print" style={{marginTop: '25px'}}>
          <Printer size={20} /> LANZAR IMPRESIÓN
        </button>
      </div>
    </div>
  );
};

export default TicketPreviewModal;