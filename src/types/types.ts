// src/types/types.ts
export interface Producto {
  _id?: string;
  codigo_barra: string;
  nombre: string;
  categoria: string;
  precio: number;
  cantidad: number;
  unidad: string;
}