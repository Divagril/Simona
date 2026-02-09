// src/services/api.ts
import axios from 'axios';
import type { Producto } from '../types';

const API_URL = 'https://simona-backend.onrender.com/api';


export const getProductos = async () => {
    const res = await axios.get(`${API_URL}/productos`);
    return res.data;
};

export const addProducto = async (prod: any) => {
    const res = await axios.post(`${API_URL}/productos`, prod);
    return res.data;
};

export const updateProducto = async (id: string, prod: any) => {
    const res = await axios.put(`${API_URL}/productos/${id}`, prod);
    return res.data;
};

export const eliminarProducto = async (id: string) => {
    const res = await axios.delete(`${API_URL}/productos/${id}`);
    return res.data;
};

export const registrarVenta = async (datos: any) => {
    const res = await axios.post(`${API_URL}/ventas`, datos);
    return res.data;
};

export const getClientesConDeuda = async () => {
    const res = await axios.get(`${API_URL}/clientes/deudas`);
    return res.data;
};

export const crearCliente = async (nombre: string) => {
    const res = await axios.post(`${API_URL}/clientes`, { nombre });
    return res.data;
};

export const getMovimientosCliente = async (id: string) => {
    const res = await axios.get(`${API_URL}/clientes/${id}/movimientos`);
    return res.data;
};

export const registrarAbono = async (cliente_id: string, monto: number) => {
    const res = await axios.post(`${API_URL}/fiados/abono`, { cliente_id, monto });
    return res.data;
};

export const registrarFiadoMasivo = async (datos: any) => {
    const res = await axios.post(`${API_URL}/fiados/masivo`, datos);
    return res.data;
};

export const getVentasReporte = async (desde: string, hasta: string, categoria: string) => {
    const res = await axios.get(`${API_URL}/reportes/ventas`, { params: { desde, hasta, categoria } });
    return res.data;
};

export const getStatsSemanales = async () => {
    const res = await axios.get(`${API_URL}/reportes/stats`);
    return res.data;
};

export const getClientes = async () => {
  const res = await axios.get(`${API_URL}/clientes`);
  return res.data;
};

export const eliminarCliente = async (id: string) => {
  return await axios.delete(`${API_URL}/clientes/${id}`);
};
