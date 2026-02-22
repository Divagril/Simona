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

  const ejecutarImpresion = () => {
    const esMovil = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    // Abrimos ventana nueva
    const ventanaPrint = window.open('', '_blank', 'width=400,height=600');
    if (!ventanaPrint) {
      alert("Por favor, permite las ventanas emergentes");
      return;
    }

    ventanaPrint.document.write(`
      <html>
        <head>
          <title>Imprimir Comprobante</title>
          <style>
            /* Reset general */
            * { margin: 0; padding: 0; box-sizing: border-box; }
            
            /* CONFIGURACIÓN DE PÁGINA */
            @page { 
              margin: 0; 
              size: 58mm auto; 
            }

            /* TRUCO: Ocultar en pantalla para evitar el duplicado de fondo */
            @media screen {
              body { display: none; } 
            }

            /* MOSTRAR SOLO AL IMPRIMIR */
            @media print {
              body { 
                display: block;
                background: #ffffff; 
                width: 45mm; /* Medida segura para que no se corte nada */
                font-family: Arial, sans-serif;
                padding: 1mm;
                color: #000;
              }
            }

            .text-center { text-align: center; }
            .bold { font-weight: bold; }
            .biz-name { font-size: 11pt; font-weight: bold; text-transform: uppercase; }
            .info-text { font-size: 8.5pt; margin: 1pt 0; line-height: 1.1; }
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
              margin-top: 8pt; padding: 4pt; border: 1pt solid #000; 
              text-align: center; font-size: 8.5pt; font-weight: bold;
            }
          </style>
        </head>
        <body>
          <div class="text-center">
            <div class="biz-name">TIENDA SIMONA</div>
            <div class="info-text bold">RUC: 10XXXXXXXXX</div>
            <div class="info-text">CALLE PRINCIPAL #123 - LIMA</div>
            <div class="divider"></div>
            <div class="info-text bold" style="font-size:9pt;">BOLETA DE VENTA</div>
            <div class="info-text">${fecha}</div>
          </div>

          <div class="anuncio">"Gracias por su preferencia"</div>

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
          <div class="text-center info-text" style="font-size: 7pt;">Tienda Simona v1.0.2</div>
          
          <script>
            window.onload = function() {
              window.print();
              // Si no es móvil, cerramos la ventana tras imprimir
              if (!${esMovil}) {
                setTimeout(function() { window.close(); }, 500);
              }
            };
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
            <p style={{fontSize: '10px', color: '#666', margin: 0}}>{fecha}</p>
            <hr style={{border: '0.5px dashed #ccc', margin: '8px 0'}}/>
          </div>

          <div style={{ border: '1px solid #eee', padding: '5px', textAlign: 'center', fontSize: '10px', fontStyle: 'italic', marginBottom: '10px' }}>
            "Gracias por su preferencia. ¡Vuelva pronto!"
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

          {saldoPendiente !== undefined && (
            <div style={{ marginTop: '12px', padding: '8px', border: '1.5px solid black', textAlign: 'center', fontSize: '11px', fontWeight: 'bold' }}>
               {saldoPendiente > 0.1 ? `DEUDA PENDIENTE: S/ ${saldoPendiente.toFixed(2)}` : '¡ESTADO: AL DÍA!'}
            </div>
          )}
          
          <p style={{fontSize: '9px', marginTop: '10px', fontWeight: 'bold', textAlign: 'center'}}>{montoALetras(total)}</p>
        </div>

        <button onClick={ejecutarImpresion} className="btn-thermal-print">
          <Printer size={22} /> LANZAR IMPRESIÓN
        </button>
      </div>
    </div>
  );
};

export default TicketPreviewModal;