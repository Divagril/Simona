import React, { useState, useEffect, useRef } from 'react';
import { X, CheckCircle } from 'lucide-react';

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

  // --- LÓGICA DE CÁLCULO AUTOMÁTICO ---
  useEffect(() => {
    if (isOpen) {
      if (metodo === 'EFECTIVO') {
        // En efectivo empezamos vacío para que el cajero escriba
        setPagoCon('');
        setVuelto(0);
        // Auto-foco para escribir rápido
        setTimeout(() => inputRef.current?.focus(), 150);
      } else {
        // Si es YAPE/PLIN/TARJETA, asume pago exacto automáticamente
        setPagoCon(total.toFixed(2));
        setVuelto(0);
      }
    }
  }, [metodo, isOpen, total]);

  // Calcular el vuelto cada vez que cambia lo que el cliente entrega
  useEffect(() => {
    const montoPagado = pagoCon === '' ? 0 : Number(pagoCon);
    if (metodo === 'EFECTIVO') {
      setVuelto(montoPagado - total);
    } else {
      setVuelto(0);
    }
  }, [pagoCon, total, metodo]);

  if (!isOpen) return null;

  // --- VALIDACIÓN PARA HABILITAR EL BOTÓN ---
  // Se habilita si: es efectivo y el vuelto es >= 0, O si es otro método (ya está auto-rellenado)
  const esValido = (metodo === 'EFECTIVO' && Number(pagoCon) >= total - 0.01) || (metodo !== 'EFECTIVO');

  const handleConfirmar = () => {
    if (esValido) {
      onConfirm({ 
        metodo, 
        pagoCon: Number(pagoCon), 
        vuelto: Math.max(0, vuelto) 
      });
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container-tall">
        {/* BOTÓN CERRAR X (Borde Rojo) */}
        <button onClick={onClose} className="modal-close-x">
          <X size={22} strokeWidth={3} />
        </button>

        {/* HEADER: TOTAL */}
        <div className="total-pagar-container">
          <span className="money-bag-emoji">💰</span>
          <span className="total-pagar-text">Total a Pagar:</span>
        </div>
        
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
              <option value="EFECTIVO">💵 EFECTIVO</option>
              <option value="YAPE">🟣 YAPE</option>
              <option value="PLIN">🔵 PLIN</option>
              <option value="TARJETA">💳 TARJETA</option>
              <option value="TRANSFERENCIA">🏦 TRANSFERENCIA</option>
            </select>
          </div>

          {/* INPUT PAGA CON */}
          <div className="input-group-modal">
            <label className="modal-label-bold underline">
              <span className="modal-icon-emoji">💸</span> Paga con:
            </label>
            <input 
              ref={inputRef}
              type="number" 
              placeholder="0.00"
              step="0.10"
              disabled={metodo !== 'EFECTIVO'}
              value={pagoCon}
              onFocus={(e) => e.target.select()}
              onChange={(e) => setPagoCon(e.target.value)}
              onKeyDown={(e) => { 
                if(e.key === 'Enter') handleConfirmar(); 
              }}
              className="modal-input-large"
            />
          </div>
        </div>

        {/* TEXTO VUELTO NARANJA */}
        <div className="vuelto-naranja-pos">
          Vuelto: S/. {vuelto > 0 ? vuelto.toFixed(2) : "0.00"}
        </div>

        {/* BOTONES DE ACCIÓN */}
        <div className="modal-footer-flex">
          <button onClick={onClose} className="btn-cancelar-modal">
            Cancelar
          </button>
          
          <button 
            disabled={!esValido}
            onClick={handleConfirmar}
            className="btn-cobrar-modal"
          >
            <div className="check-box-icon">
                <CheckCircle size={16} />
            </div> 
            COBRAR
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;