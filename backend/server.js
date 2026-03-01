const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// --- CONEXIÓN A MONGO DB ---
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ Conectado a MongoDB Atlas"))
    .catch(err => console.error("❌ Error de conexión:", err));

// --- MODELOS DE DATOS ---

const Producto = mongoose.model('Producto', new mongoose.Schema({
    nombre: { type: String, required: true },
    precio: { type: Number, default: 0 },
    cantidad: { type: Number, default: 0 },
    unidad: { type: String, default: 'UNIDAD' }
}));

const Venta = mongoose.model('Venta', new mongoose.Schema({
    productos: Array, total: Number, metodoPago: String, fecha: { type: Date, default: Date.now }
}));

const Cliente = mongoose.model('Cliente', new mongoose.Schema({
    nombre: String, deudaTotal: { type: Number, default: 0 }
}));

const MovimientoFiado = mongoose.model('MovimientoFiado', new mongoose.Schema({
    cliente_id: mongoose.Schema.Types.ObjectId, tipo: String, monto: Number, descripcion: String, fecha: { type: Date, default: Date.now }
}));

const Inversion = mongoose.model('Inversion', new mongoose.Schema({
    nombre: String, costo_total: Number, cantidad_comprada: Number, costo_unitario: Number, fecha: { type: Date, default: Date.now }
}));

// --- NUEVOS MODELOS PARA AUDITORÍA ---

const Kardex = mongoose.model('Kardex', new mongoose.Schema({
    nombre_producto: String,
    cantidad: Number,
    motivo: String, // 'VENTA', 'ACTUALIZACIÓN', 'FIADO'
    stock_anterior: Number,
    stock_actual: Number,
    fecha: { type: Date, default: Date.now }
}));

const LogAuditoria = mongoose.model('LogAuditoria', new mongoose.Schema({
    accion: String,
    detalle: String,
    fecha: { type: Date, default: Date.now }
}));

// --- RUTAS DE AUDITORÍA (ESTAS FALTABAN) ---

app.get('/api/auditoria', async (req, res) => {
    try {
        const logs = await LogAuditoria.find().sort({ fecha: -1 }).limit(50);
        res.json(logs);
    } catch (e) { res.status(500).json([]); }
});

app.get('/api/kardex', async (req, res) => {
    try {
        const movs = await Kardex.find().sort({ fecha: -1 }).limit(50);
        res.json(movs);
    } catch (e) { res.status(500).json([]); }
});

// --- RUTAS DE NEGOCIO (CON REGISTRO DE AUDITORÍA) ---

// 1. Ventas (POS)
app.post('/api/ventas', async (req, res) => {
    try {
        const { items, total, metodoPago } = req.body;
        const nuevaVenta = new Venta({ productos: items, total, metodoPago });
        await nuevaVenta.save();

        for (const it of items) {
            if (it._id && !it._id.toString().startsWith('MANUAL')) {
                const prod = await Producto.findById(it._id);
                const stockAnterior = prod.cantidad;
                const stockActual = stockAnterior - Number(it.cantidadSeleccionada);

                await Producto.findByIdAndUpdate(it._id, { $inc: { cantidad: -Number(it.cantidadSeleccionada) } });

                // REGISTRO EN KARDEX
                await new Kardex({
                    nombre_producto: prod.nombre,
                    cantidad: Number(it.cantidadSeleccionada),
                    motivo: 'VENTA',
                    stock_anterior: stockAnterior,
                    stock_actual: stockActual
                }).save();
            }
        }

        await new LogAuditoria({ accion: 'VENTA', detalle: `Venta cobrada por S/. ${total.toFixed(2)} (${metodoPago})` }).save();
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

// 2. Inventario (Actualizar Stock)
app.post('/api/productos', async (req, res) => {
    try {
        const { nombre, precio, cantidad, unidad } = req.body;
        
        const prodExistente = await Producto.findOne({ nombre: new RegExp(`^${nombre}$`, 'i') });
        const stockAnterior = prodExistente ? prodExistente.cantidad : 0;

        const prod = await Producto.findOneAndUpdate(
            { nombre: new RegExp(`^${nombre}$`, 'i') },
            { nombre, precio, cantidad, unidad },
            { upsert: true, new: true }
        );

        // REGISTRO EN KARDEX Y AUDITORÍA
        await new Kardex({
            nombre_producto: nombre,
            cantidad: cantidad - stockAnterior,
            motivo: 'ACTUALIZACIÓN',
            stock_anterior: stockAnterior,
            stock_actual: cantidad
        }).save();

        await new LogAuditoria({ accion: 'INVENTARIO', detalle: `Se actualizó el producto ${nombre.toUpperCase()} (Stock: ${cantidad})` }).save();

        res.json(prod);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 3. Clientes y Abonos
app.post('/api/fiados/abono', async (req, res) => {
    try {
        const { cliente_id, monto } = req.body;
        const cliente = await Cliente.findById(cliente_id);
        
        await new MovimientoFiado({ cliente_id, tipo: 'PAGO', monto, descripcion: 'Abono a cuenta' }).save();
        await Cliente.findByIdAndUpdate(cliente_id, { $inc: { deudaTotal: -monto } });

        await new LogAuditoria({ accion: 'PAGO CLIENTE', detalle: `Abono de S/. ${monto} de ${cliente.nombre}` }).save();
        
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

// Rutas simples (Inversiones, Listar Productos, etc)
app.get('/api/productos', async (req, res) => {
    const prods = await Producto.find().sort({ nombre: 1 });
    res.json(prods);
});

app.get('/api/nombres-inversiones', async (req, res) => {
    const nombres = await Inversion.find().distinct('nombre');
    res.json(nombres);
});

app.get('/api/clientes/deudas', async (req, res) => {
    const c = await Cliente.find().sort({ nombre: 1 });
    res.json(c);
});

app.post('/api/clientes', async (req, res) => {
    const nuevo = new Cliente({ nombre: req.body.nombre });
    await nuevo.save();
    res.json(nuevo);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Servidor con Auditoría en puerto ${PORT}`));