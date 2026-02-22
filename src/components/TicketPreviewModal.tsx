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

  // --- FUNCIÓN DE IMPRESIÓN CON CIERRE AUTOMÁTICO ---
  const ejecutarImpresion = () => {
    const ventanaPrint = window.open('', '_blank');
    if (!ventanaPrint) {
      alert("Por favor, permite las ventanas emergentes");
      return;
    }

    ventanaPrint.document.write(`
      <html>
        <head>
          <title>Imprimiendo...</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            @page { margin: 0; size: 58mm auto; }

            /* Mensaje para que no se vea blanco total mientras carga */
            @media screen {
              body { 
                display: flex; 
                justify-content: center; 
                align-items: center; 
                height: 100vh; 
                font-family: Arial; 
                color: #888;
                background: #fff;
              }
              .no-print { display: block; }
              .ticket { display: none; }
            }

            /* Estilo real de la boleta */
            @media print {
              .no-print { display: none; }
              body { 
                display: block;
                width: 52mm; 
                font-family: Arial, sans-serif;
                padding: 2mm;
                color: #000;
              }
              .ticket { display: block; }
            }

            .text-center { text-align: center; }
            .bold { font-weight: bold; }
            .biz-name { font-size: 14pt; font-weight: bold; text-transform: uppercase; }
            .info-text { font-size: 10pt; margin: 2pt 0; line-height: 1.2; }
            .doc-title { font-size: 11pt; font-weight: bold; margin: 8pt 0; }
            .divider { border-top: 1pt dashed #000; margin: 8pt 0; width: 100%; }
            .table { width: 100%; font-size: 10pt; border-collapse: collapse; }
            .table td { padding: 4pt 0; vertical-align: top; }
            .grand-total { font-size: 13pt; font-weight: bold; margin-top: 8pt; display: flex; justify-content: space-between; }
            .letras { font-size: 9pt; margin-top: 6pt; font-weight: bold; }
            .saldo-box { margin-top: 10pt; padding: 5pt; border: 1pt solid #000; text-align: center; font-size: 11pt; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="no-print">Procesando ticket...</div>

          <div class="ticket">
            <div class="text-center">
              <div class="biz-name">TIENDA SIMONA</div>
              <div class="info-text bold">RUC: 10XXXXXXXXX</div>
              <div class="info-text">CALLE PRINCIPAL #123 - LIMA</div>
              <div class="divider"></div>
              <div class="doc-title">BOLETA DE VENTA</div>
              <div class="info-text">${fecha}</div>
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

            <div class="divider" style="margin-top:10pt;"></div>
            <div class="text-center info-text" style="font-size: 8pt;">¡Gracias por su compra!</div>
          </div>
          
          <script>
            window.onload = function() {
              window.print();
            };
            // --- ESTO CIERRA LA PANTALLA BLANCA AL TERMINAR ---
            window.onafterprint = function() {
              window.close();
            };
            // Fallback por si el celular no detecta onafterprint
            setTimeout(function() {
              window.close();
            }, 3000);
          </script>
        </body>
      </html>
    `);

    ventanaPrint.document.close();
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