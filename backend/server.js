const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// --- MIDDLEWARES ---
app.use(cors());
app.use(express.json());

// --- CONEXIÓN A MONGO DB ---
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ Conectado a MongoDB Atlas (Tienda Simona)"))
    .catch(err => console.error("❌ Error de conexión:", err));

// --- MODELOS DE DATOS ---

// 1. Inventario
const Producto = mongoose.model('Producto', new mongoose.Schema({
    nombre: { type: String, required: true },
    precio: { type: Number, default: 0 },
    cantidad: { type: Number, default: 0 },
    unidad: { type: String, default: 'UNIDAD' },
    precio_compra: { type: Number, default: 0 }
}));

// 2. Ventas
const Venta = mongoose.model('Venta', new mongoose.Schema({
    productos: Array,
    total: Number,
    metodoPago: String,
    fecha: { type: Date, default: Date.now }
}));

// 3. Clientes
const Cliente = mongoose.model('Cliente', new mongoose.Schema({
    nombre: { type: String, required: true },
    deudaTotal: { type: Number, default: 0 }
}));

// 4. Historial de Fiados/Abonos
const MovimientoFiado = mongoose.model('MovimientoFiado', new mongoose.Schema({
    cliente_id: mongoose.Schema.Types.ObjectId,
    tipo: String, // 'DEUDA' o 'PAGO'
    monto: Number,
    descripcion: String,
    fecha: { type: Date, default: Date.now }
}));

// 5. Inversiones (Desplegable)
const Inversion = mongoose.model('Inversion', new mongoose.Schema({
    nombre: String,
    costo_total: Number,
    cantidad_comprada: Number,
    costo_unitario: Number,
    fecha: { type: Date, default: Date.now }
}));

// 6. Kardex (Movimientos de Stock)
const Kardex = mongoose.model('Kardex', new mongoose.Schema({
    nombre_producto: String,
    cantidad: Number,
    motivo: String, // 'VENTA', 'ACTUALIZACIÓN', 'FIADO'
    stock_anterior: Number,
    stock_actual: Number,
    fecha: { type: Date, default: Date.now }
}));

// 7. Auditoría (Acciones del usuario)
const LogAuditoria = mongoose.model('LogAuditoria', new mongoose.Schema({
    accion: String,
    detalle: String,
    fecha: { type: Date, default: Date.now }
}));

// --- RUTAS DEL SISTEMA ---

// --- SECCIÓN: AUDITORÍA Y KARDEX (Para la página que te daba error) ---
app.get('/api/auditoria', async (req, res) => {
    try {
        const logs = await LogAuditoria.find().sort({ fecha: -1 }).limit(100);
        res.json(logs);
    } catch (e) { res.status(500).json([]); }
});

app.get('/api/kardex', async (req, res) => {
    try {
        const movs = await Kardex.find().sort({ fecha: -1 }).limit(100);
        res.json(movs);
    } catch (e) { res.status(500).json([]); }
});

// --- SECCIÓN: INVENTARIO ---
app.get('/api/productos', async (req, res) => {
    try {
        const prods = await Producto.find().sort({ nombre: 1 });
        res.json(prods);
    } catch (e) { res.status(500).json([]); }
});

app.post('/api/productos', async (req, res) => {
    try {
        const { nombre, precio, cantidad, unidad } = req.body;
        const prodAntiguo = await Producto.findOne({ nombre: new RegExp(`^${nombre}$`, 'i') });
        const stockAnterior = prodAntiguo ? prodAntiguo.cantidad : 0;

        const prod = await Producto.findOneAndUpdate(
            { nombre: new RegExp(`^${nombre}$`, 'i') },
            { nombre, precio, cantidad, unidad },
            { upsert: true, new: true }
        );

        // Registro de Kardex y Auditoría
        await new Kardex({
            nombre_producto: nombre,
            cantidad: cantidad - stockAnterior,
            motivo: 'ACTUALIZACIÓN',
            stock_anterior: stockAnterior,
            stock_actual: cantidad
        }).save();

        await new LogAuditoria({ accion: 'INVENTARIO', detalle: `Actualizado: ${nombre} a stock ${cantidad}` }).save();

        res.json(prod);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/productos/eliminar-masivo', async (req, res) => {
    try {
        const { ids } = req.body;
        await Producto.deleteMany({ _id: { $in: ids } });
        await new LogAuditoria({ accion: 'ELIMINACIÓN', detalle: `Eliminados ${ids.length} productos` }).save();
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- SECCIÓN: PUNTO DE VENTA (POS) ---
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

                await new Kardex({
                    nombre_producto: prod.nombre,
                    cantidad: Number(it.cantidadSeleccionada),
                    motivo: 'VENTA',
                    stock_anterior: stockAnterior,
                    stock_actual: stockActual
                }).save();
            }
        }
        await new LogAuditoria({ accion: 'VENTA', detalle: `Cobro: S/. ${total.toFixed(2)} (${metodoPago})` }).save();
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

// --- SECCIÓN: CLIENTES Y FIADOS ---
app.get('/api/clientes/deudas', async (req, res) => {
    try {
        const clientes = await Cliente.find().sort({ nombre: 1 });
        res.json(clientes);
    } catch (e) { res.status(500).json([]); }
});

app.post('/api/clientes', async (req, res) => {
    try {
        const nuevo = new Cliente({ nombre: req.body.nombre });
        await nuevo.save();
        await new LogAuditoria({ accion: 'CLIENTE', detalle: `Nuevo cliente: ${req.body.nombre}` }).save();
        res.json(nuevo);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/clientes/:id/movimientos', async (req, res) => {
    try {
        const movs = await MovimientoFiado.find({ cliente_id: req.params.id }).sort({ fecha: -1 });
        res.json(movs);
    } catch (e) { res.status(500).json([]); }
});

app.post('/api/fiados/masivo', async (req, res) => {
    try {
        const { cliente_id, items, total } = req.body;
        const cliente = await Cliente.findById(cliente_id);
        
        await new MovimientoFiado({ cliente_id, tipo: 'DEUDA', monto: total, descripcion: 'Compra al fiado' }).save();
        await Cliente.findByIdAndUpdate(cliente_id, { $inc: { deudaTotal: total } });

        for (const it of items) {
            if (it._id && !it._id.toString().startsWith('MANUAL')) {
                const prod = await Producto.findById(it._id);
                const stockAnt = prod.cantidad;
                await Producto.findByIdAndUpdate(it._id, { $inc: { cantidad: -Number(it.cantidadSeleccionada) } });
                await new Kardex({ nombre_producto: prod.nombre, cantidad: it.cantidadSeleccionada, motivo: 'FIADO', stock_anterior: stockAnt, stock_actual: stockAnt - it.cantidadSeleccionada }).save();
            }
        }
        await new LogAuditoria({ accion: 'FIADO', detalle: `Fiado de S/. ${total} a ${cliente.nombre}` }).save();
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.post('/api/fiados/abono', async (req, res) => {
    try {
        const { cliente_id, monto } = req.body;
        const cliente = await Cliente.findById(cliente_id);
        await new MovimientoFiado({ cliente_id, tipo: 'PAGO', monto, descripcion: 'Abono a cuenta' }).save();
        await Cliente.findByIdAndUpdate(cliente_id, { $inc: { deudaTotal: -monto } });
        await new LogAuditoria({ accion: 'ABONO', detalle: `Abono de S/. ${monto} de ${cliente.nombre}` }).save();
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.delete('/api/clientes/:id', async (req, res) => {
    try {
        const c = await Cliente.findById(req.params.id);
        await Cliente.findByIdAndDelete(req.params.id);
        await MovimientoFiado.deleteMany({ cliente_id: req.params.id });
        await new LogAuditoria({ accion: 'CLIENTE', detalle: `Eliminado cliente: ${c.nombre}` }).save();
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

// --- SECCIÓN: REPORTES ---
app.get('/api/reportes/ventas', async (req, res) => {
    try {
        const { desde, hasta } = req.query;
        const fI = new Date(desde); fI.setHours(0,0,0,0);
        const fF = new Date(hasta); fF.setHours(23,59,59,999);
        const ventas = await Venta.find({ fecha: { $gte: fI, $lte: fF } }).sort({ fecha: -1 });
        res.json(ventas.map(v => ({ ...v._doc, items: v.productos })));
    } catch (e) { res.status(500).json([]); }
});

app.get('/api/nombres-inversiones', async (req, res) => {
    try {
        const nombres = await Inversion.find().distinct('nombre');
        res.json(nombres);
    } catch (e) { res.status(500).json([]); }
});

// --- INICIO ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Servidor Tienda Simona v2 listo en puerto ${PORT}`));