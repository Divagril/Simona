// src/types/types.ts
export interface Producto {
   _id: string;
  nombre: string;
  precio: number;
  stock_actual: number; // <--- AÑADE ESTA LÍNEA
  unidad_venta?: string;
  unidades_por_paquete?: number;
  cantidad: number;
}