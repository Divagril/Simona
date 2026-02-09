import React, { useState, useEffect, useRef } from 'react';
import { X, CheckCircle, CreditCard, Banknote } from 'lucide-react';

interface PaymentModalProps {
  isOpen: boolean;
  total: number;
  onClose: () => void;
  onConfirm: (paymentData: any) => void;
}

const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, total, onClose, onConfirm }) => {
  const [metodo, setMetodo] = useState('EFECTIVO');
  const [pagoCon, setPagoCon] = useState<string>(''); 
  const [vuelto, setVuelto] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const montoPagado = pagoCon === '' ? 0 : Number(pagoCon);
    setVuelto(metodo === 'EFECTIVO' ? montoPagado - total : 0);
  }, [pagoCon, total, metodo]);

  useEffect(() => {
    if (isOpen) {
      setMetodo('EFECTIVO');
      setPagoCon('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const esValido = vuelto >= -0.01 || metodo !== 'EFECTIVO';

  return (
    <div className="modal-overlay">
      <div className="modal-container-tall">
        {/* BOTÓN CERRAR X */}
        <button onClick={onClose} className="modal-close-x">
          <X size={20} />
        </button>

        <div className="total-pagar-container">
           <span className="money-bag-emoji">💰</span>
           <span className="total-pagar-text">Total a Pagar:</span>
        </div>
        
        {/* CUADRO BLANCO DEL TOTAL (Mucha sombra y margen) */}
        <div className="total-card-display">
          <span className="label-light">TOTAL A COBRAR</span>
          <div className="amount-highlight">S/. {total.toFixed(2)}</div>
        </div>

        {/* FORMULARIO CON ESPACIADO */}
        <div className="modal-inputs-stack">
          <div className="input-field-modal">
            <label className="modal-label-bold">
                <span className="modal-icon-emoji">💳</span> Método de Pago:
            </label>
            <select 
              value={metodo} 
              onChange={(e) => setMetodo(e.target.value)}
              className="modal-select-modern"
            >
              <option value="EFECTIVO">EFECTIVO</option>
              <option value="YAPE">YAPE</option>
              <option value="PLIN">PLIN</option>
              <option value="TARJETA">TARJETA</option>
            </select>
          </div>

          <div className="input-field-modal">
            <label className="modal-label-bold underline">
               <span className="modal-icon-emoji">💵</span> Paga con:
            </label>
            <input 
              ref={inputRef}
              type="text" 
              placeholder="0.00"
              disabled={metodo !== 'EFECTIVO'}
              value={pagoCon}
              onFocus={(e) => e.target.select()}
              onChange={(e) => setPagoCon(e.target.value.replace(/[^0-9.]/g, ''))}
              className="modal-input-large"
            />
          </div>

          {/* CUADRO DE VUELTO (TAMAÑO GRANDE) */}
          <div className={`vuelto-panel ${vuelto >= 0 ? 'vuelto-success' : 'vuelto-pending'}`}>
            <div className="vuelto-naranja-pos">
               Vuelto: S/. {Math.max(0, vuelto).toFixed(2)}
            </div>
          </div>
        </div>

        {/* BOTONES AL FINAL */}
        <div className="modal-footer-flex">
           <button onClick={onClose} className="btn-cancelar-modal">
             Cancelar
           </button>
  
           <button 
            disabled={!esValido}
            onClick={() => onConfirm({ metodo, pagoCon: Number(pagoCon), vuelto })}
            className="btn-cobrar-modal"
            >
            {/* Este div simula el cuadrito con el check de tu foto */}
            <div className="check-box-icon">✓</div> 
            COBRAR
           </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;