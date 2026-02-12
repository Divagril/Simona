import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface PaymentModalProps {
  isOpen: boolean;
  total: number;
  onClose: () => void;
  onConfirm: (paymentData: any) => void;
}

const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, total, onClose, onConfirm }) => {
  const [metodo, setMetodo] = useState('EFECTIVO');
  // Usamos string para que el campo empiece vacío y sea fácil de escribir
  const [pagoCon, setPagoCon] = useState<string>(''); 
  const [vuelto, setVuelto] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Calcular el vuelto automáticamente
  useEffect(() => {
    const montoPagado = pagoCon === '' ? 0 : Number(pagoCon);
    if (metodo === 'EFECTIVO') {
      setVuelto(montoPagado - total);
    } else {
      setVuelto(0);
    }
  }, [pagoCon, total, metodo]);

  // Resetear estados al abrir el modal
  useEffect(() => {
    if (isOpen) {
      setMetodo('EFECTIVO');
      setPagoCon('');
      // Auto-foco en el input de pago
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Validar si el pago es suficiente
  const esValido = vuelto >= -0.01 || metodo !== 'EFECTIVO';

  return (
    <div className="modal-overlay">
      <div className="modal-container-tall">
        {/* BOTÓN CERRAR SUPERIOR */}
        <button onClick={onClose} className="modal-close-x">
          <X size={20} />
        </button>

        {/* ETIQUETA TOTAL A PAGAR (Icono bolsa + Texto azul oscuro) */}
        <div className="total-pagar-container">
          <span className="money-bag-emoji">💰</span>
          <span className="total-pagar-text">Total a Pagar:</span>
        </div>
        
        {/* CUADRO BLANCO CON MONTO GRANDE VERDE */}
        <div className="total-card-display">
          <div className="total-amount-big">S/. {total.toFixed(2)}</div>
        </div>

        <div className="modal-inputs-stack">
          {/* SELECCIÓN MÉTODO DE PAGO */}
          <div className="input-group-modal">
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
              <option value="TRANSFERENCIA">TRANSFERENCIA</option>
            </select>
          </div>

          {/* INPUT PAGA CON (Subrayado y Negrita) */}
          <div className="input-group-modal">
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
              onChange={(e) => {
                const val = e.target.value;
                // Validar que solo entren números y un punto
                if (val === '' || /^[0-9.]*$/.test(val)) setPagoCon(val);
              }}
              onKeyDown={(e) => { 
                if(e.key === 'Enter' && esValido) onConfirm({ metodo, pagoCon: Number(pagoCon), vuelto }); 
              }}
              className="modal-input-large"
            />
          </div>
        </div>

        {/* TEXTO VUELTO NARANJA A LA DERECHA */}
        <div className="vuelto-naranja-pos">
          Vuelto: S/. {Math.max(0, vuelto).toFixed(2)}
        </div>

        {/* BOTONES DE ACCIÓN (Rojo y Verde) */}
        <div className="modal-footer-flex">
          <button onClick={onClose} className="btn-cancelar-modal">
            Cancelar
          </button>
          
          <button 
            disabled={!esValido}
            onClick={() => onConfirm({ metodo, pagoCon: Number(pagoCon), vuelto })}
            className="btn-cobrar-modal"
          >
            <div className="check-box-icon">✓</div> 
            COBRAR
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;