const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// --- MIDDLEWARES ---
app.use(cors());
app.use(express.json());

// --- CONEXIÓN A MONGO DB ---
// Asegúrate de que en Render o en tu .env la variable MONGO_URI sea correcta
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ Conectado a MongoDB Atlas (Base de datos: sistema_pos_v5)"))
    .catch(err => console.error("❌ Error de conexión:", err));

// --- MODELOS DE DATOS ---

// 1. Modelo para Inventario (Productos)
const Producto = mongoose.model('Producto', new mongoose.Schema({
    nombre: { type: String, required: true },
    precio: { type: Number, default: 0 },
    cantidad: { type: Number, default: 0 },
    unidad: { type: String, default: 'UNIDAD' },
    precio_compra: { type: Number, default: 0 }
}));

// 2. Modelo para Ventas Realizadas (Efectivo/Yape/etc)
const Venta = mongoose.model('Venta', new mongoose.Schema({
    productos: Array,
    total: Number,
    metodoPago: { type: String, default: 'EFECTIVO' },
    fecha: { type: Date, default: Date.now }
}));

// 3. Modelo para Clientes
const Cliente = mongoose.model('Cliente', new mongoose.Schema({
    nombre: { type: String, required: true },
    deudaTotal: { type: Number, default: 0 }
}));

// 4. Modelo para Historial de Movimientos (Fiados y Pagos)
const Movimiento = mongoose.model('Movimiento', new mongoose.Schema({
    cliente_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Cliente' },
    tipo: { type: String, enum: ['DEUDA', 'PAGO'] },
    monto: Number,
    descripcion: String,
    fecha: { type: Date, default: Date.now }
}));

// 5. Modelo para Compras/Inversiones (Para el desplegable de Inventario)
const Inversion = mongoose.model('Inversion', new mongoose.Schema({
    nombre: String,
    costo_total: Number,
    cantidad_comprada: Number,
    costo_unitario: Number,
    fecha: { type: Date, default: Date.now }
}));

// --- RUTAS DEL SISTEMA ---

// --- SECCIÓN 1: INVENTARIO ---

// Obtener todos los productos
app.get('/api/productos', async (req, res) => {
    try {
        const prods = await Producto.find().sort({ nombre: 1 });
        res.json(prods);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Obtener nombres únicos de la tabla inversiones (para el select del inventario)
app.get('/api/nombres-inversiones', async (req, res) => {
    try {
        const nombres = await Inversion.find().distinct('nombre');
        res.json(nombres);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Guardar o Actualizar producto (Upsert)
app.post('/api/productos', async (req, res) => {
    try {
        const { nombre, precio, cantidad, unidad } = req.body;
        const prod = await Producto.findOneAndUpdate(
            { nombre: new RegExp(`^${nombre}$`, 'i') },
            { nombre, precio, cantidad, unidad },
            { upsert: true, new: true }
        );
        res.json(prod);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Eliminar productos de forma masiva
app.post('/api/productos/eliminar-masivo', async (req, res) => {
    try {
        const { ids } = req.body;
        await Producto.deleteMany({ _id: { $in: ids } });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- SECCIÓN 2: PUNTO DE VENTA (POS) ---

// Registrar una Venta y descontar Stock
app.post('/api/ventas', async (req, res) => {
    try {
        const { items, total, metodoPago } = req.body;

        // 1. Guardar la boleta
        const nuevaVenta = new Venta({ productos: items, total, metodoPago });
        await nuevaVenta.save();

        // 2. Descontar Stock (Solo si no es venta manual)
        for (const it of items) {
            if (it._id && !it._id.toString().startsWith('MANUAL')) {
                await Producto.findByIdAndUpdate(it._id, { 
                    $inc: { cantidad: -Number(it.cantidadSeleccionada) } 
                });
            }
        }
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// --- SECCIÓN 3: CLIENTES Y FIADOS ---

// Listar clientes con sus deudas
app.get('/api/clientes/deudas', async (req, res) => {
    try {
        const clientes = await Cliente.find().sort({ nombre: 1 });
        res.json(clientes);
    } catch (e) { res.status(500).json([]); }
});

// Crear un nuevo cliente
app.post('/api/clientes', async (req, res) => {
    try {
        const nuevo = new Cliente({ nombre: req.body.nombre, deudaTotal: 0 });
        await nuevo.save();
        res.json(nuevo);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Obtener historial de movimientos de un cliente específico
app.get('/api/clientes/:id/movimientos', async (req, res) => {
    try {
        const movs = await Movimiento.find({ cliente_id: req.params.id }).sort({ fecha: -1 });
        res.json(movs);
    } catch (e) { res.status(500).json([]); }
});

// Registrar un fiado (Venta al crédito)
app.post('/api/fiados/masivo', async (req, res) => {
    try {
        const { cliente_id, items, total } = req.body;

        // 1. Registrar Deuda en historial
        const mov = new Movimiento({ 
            cliente_id, tipo: 'DEUDA', monto: total, descripcion: 'Compra al fiado' 
        });
        await mov.save();

        // 2. Aumentar deuda del cliente
        await Cliente.findByIdAndUpdate(cliente_id, { $inc: { deudaTotal: total } });

        // 3. Descontar stock
        for (const it of items) {
            if (it._id && !it._id.toString().startsWith('MANUAL')) {
                await Producto.findByIdAndUpdate(it._id, { 
                    $inc: { cantidad: -Number(it.cantidadSeleccionada) } 
                });
            }
        }
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

// Registrar un Abono (El cliente paga su deuda)
app.post('/api/fiados/abono', async (req, res) => {
    try {
        const { cliente_id, monto } = req.body;
        const mov = new Movimiento({ 
            cliente_id, tipo: 'PAGO', monto, descripcion: 'Abono a cuenta' 
        });
        await mov.save();

        // Restar deuda del cliente
        await Cliente.findByIdAndUpdate(cliente_id, { $inc: { deudaTotal: -monto } });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

// Eliminar un cliente y su historial
app.delete('/api/clientes/:id', async (req, res) => {
    try {
        await Cliente.findByIdAndDelete(req.params.id);
        await Movimiento.deleteMany({ cliente_id: req.params.id });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

// --- SECCIÓN 4: REPORTES ---

// Obtener ventas filtradas por fecha
app.get('/api/reportes/ventas', async (req, res) => {
    try {
        const { desde, hasta } = req.query;
        const fInicio = new Date(desde); fInicio.setHours(0,0,0,0);
        const fFin = new Date(hasta); fFin.setHours(23,59,59,999);

        const ventas = await Venta.find({
            fecha: { $gte: fInicio, $lte: fFin }
        }).sort({ fecha: -1 });

        // Formatear para que el frontend reciba "items"
        const data = ventas.map(v => ({
            _id: v._id, total: v.total, metodoPago: v.metodoPago, fecha: v.fecha, items: v.productos
        }));
        res.json(data);
    } catch (e) { res.status(500).json([]); }
});

// --- INICIO DEL SERVIDOR ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor Tienda Simo corriendo en puerto ${PORT}`);
});