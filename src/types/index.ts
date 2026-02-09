export interface Producto {
  _id?: string;
  codigo_barra: string;
  nombre: string;
  categoria: string;
  precio: number;
  cantidad: number;
  unidad: string;
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
