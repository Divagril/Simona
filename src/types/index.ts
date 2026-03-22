export interface Producto {
   _id: string;
  nombre: string;
  precio: number;
  stock_actual: number; // <--- AÑADE ESTA LÍNEA
  unidad_venta?: string;
  unidades_por_paquete?: number;
  cantidad: number;
}

export interface CartItem extends Producto {
  cantidadSeleccionada: number;
  subtotal: number;
  esManual?: boolean; // Para los productos agregados sin código
}
// Añade esto a tu archivo types
export interface Cliente {
  _id: string;
  nombre: string;
  deudaTotal: number;
}
export interface Movimiento {
  _id: string;
  cliente_id: string;
  fecha: string;
  tipo: 'DEUDA' | 'PAGO';
  descripcion: string;
  monto: number;
  metodoPago?: string;
  saldo_al_momento?: number;
  productos?: any[]; // <--- ESTA LÍNEA QUITA EL ERROR ROJO
}

export interface VentaRealizada {
  _id: string;
  fecha: string; // ISO String o Formateada
  categoria: string;
  producto: string;
  cantidad: number;
  total: number;
  metodoPago: string;
}

export interface StatsSemanal {
  semana: string;
  total: number;
}
