import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle, Banknote, Smartphone, DollarSign } from 'lucide-react';
import './PaymentModal.css';

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
    if (isOpen) {
      if (metodo === 'EFECTIVO') {
        setPagoCon('');
        setVuelto(0);
        setTimeout(() => inputRef.current?.focus(), 150);
      } else {
        setPagoCon(total.toFixed(2));
        setVuelto(0);
      }
    }
  }, [metodo, isOpen, total]);

  useEffect(() => {
    const montoRecibido = pagoCon === '' ? 0 : Number(pagoCon);
    if (metodo === 'EFECTIVO') {
      const calculo = montoRecibido - total;
      setVuelto(calculo > 0 ? calculo : 0);
    } else {
      setVuelto(0);
    }
  }, [pagoCon, total, metodo]);

  if (!isOpen) return null;

  const esMontoValido = (Number(pagoCon) >= total - 0.01);

  const handleFinalizar = () => {
    if (esMontoValido) {
      onConfirm({ metodo, pagoCon: Number(pagoCon), vuelto: vuelto });
    }
  };

  return createPortal(
    <div className="pay-fixed-overlay">
      <div className="pay-fixed-card">
        
        <button onClick={onClose} className="pay-btn-close">
          <X size={22} />
        </button>

        <div className="pay-header-section">
          <span className="pay-label-top">TOTAL A COBRAR</span>
          <div className="pay-main-total">S/. {total.toFixed(2)}</div>
        </div>

        <div className="pay-body-content">
          {/* SECCIÓN MÉTODOS */}
          <div className="pay-field-group">
            <label className="pay-label-title">Método de Pago</label>
            <div className="pay-methods-row">
              <button 
                className={`pay-method-item ${metodo === 'EFECTIVO' ? 'active-cash' : ''}`}
                onClick={() => setMetodo('EFECTIVO')}
              >
                <Banknote size={18} /> <span>Efectivo</span>
              </button>
              <button 
                className={`pay-method-item ${metodo === 'YAPE' ? 'active-yape' : ''}`}
                onClick={() => setMetodo('YAPE')}
              >
                <Smartphone size={18} /> <span>Yape</span>
              </button>
              <button 
                className={`pay-method-item ${metodo === 'PLIN' ? 'active-plin' : ''}`}
                onClick={() => setMetodo('PLIN')}
              >
                <Smartphone size={18} /> <span>Plin</span>
              </button>
            </div>
          </div>

          {/* SECCIÓN MONTO RECIBIDO */}
          <div className="pay-field-group">
            <label className="pay-label-title">¿Cuánto paga el cliente? (S/.)</label>
            <div className={`pay-amount-box ${metodo !== 'EFECTIVO' ? 'is-locked' : ''}`}>
              <DollarSign size={24} className="pay-dollar-icon" />
              <input 
                ref={inputRef}
                type="number" 
                placeholder="0.00"
                value={pagoCon}
                disabled={metodo !== 'EFECTIVO'}
                onChange={(e) => setPagoCon(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleFinalizar()}
              />
            </div>
          </div>

          {/* ÁREA DE VUELTO */}
          {metodo === 'EFECTIVO' && (
            <div className="pay-change-banner">
              <span className="v-label">SU VUELTO:</span>
              <span className="v-value">S/. {vuelto.toFixed(2)}</span>
            </div>
          )}
        </div>

        <div className="pay-footer-actions">
          <button onClick={onClose} className="btn-pay-gray">Cancelar</button>
          <button 
            className="btn-pay-green" 
            disabled={!esMontoValido} 
            onClick={handleFinalizar}
          >
            <CheckCircle size={20} /> FINALIZAR VENTA
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
};

export default PaymentModal;