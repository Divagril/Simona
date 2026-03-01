const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ Conectado a MongoDB Atlas - Tienda Simo"))
    .catch(err => console.error("❌ Error de conexión:", err));

// --- MODELOS ---

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
    nombre: { type: String, required: true },
    deudaTotal: { type: Number, default: 0 }
}));

const Movimiento = mongoose.model('Movimiento', new mongoose.Schema({
    cliente_id: mongoose.Schema.Types.ObjectId,
    tipo: String, 
    monto: Number,
    descripcion: String,
    saldo_al_momento: Number,
    fecha: { type: Date, default: Date.now }
}));

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

const Inversion = mongoose.model('Inversion', new mongoose.Schema({
    nombre: String, costo_total: Number, cantidad_comprada: Number, costo_unitario: Number, fecha: { type: Date, default: Date.now }
}));

// --- RUTAS DE AUDITORÍA (LISTAR HISTORIAL) ---

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

// --- RUTAS DE OPERACIONES (CON AUTO-REGISTRO EN KARDEX) ---

// 1. VENTAS POS (EFECTIVO/YAPE)
app.post('/api/ventas', async (req, res) => {
    try {
        const { items, total, metodoPago } = req.body;
        const v = new Venta({ productos: items, total, metodoPago });
        await v.save();

        for (const it of items) {
            if (it._id && !it._id.toString().startsWith('MANUAL')) {
                const prod = await Producto.findById(it._id);
                const sAnt = prod.cantidad;
                const sAct = sAnt - Number(it.cantidadSeleccionada);

                await Producto.findByIdAndUpdate(it._id, { cantidad: sAct });

                // REGISTRO EN KARDEX
                await new Kardex({
                    nombre_producto: prod.nombre,
                    cantidad: Number(it.cantidadSeleccionada),
                    motivo: 'VENTA',
                    stock_anterior: sAnt,
                    stock_actual: sAct
                }).save();
            }
        }
        await new LogAuditoria({ accion: 'VENTA', detalle: `Venta POS: S/. ${total.toFixed(2)} (${metodoPago})` }).save();
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

// 2. ACTUALIZAR INVENTARIO
app.post('/api/productos', async (req, res) => {
    try {
        const { nombre, precio, cantidad, unidad } = req.body;
        const prodExistente = await Producto.findOne({ nombre: new RegExp(`^${nombre}$`, 'i') });
        const stockAnt = prodExistente ? prodExistente.cantidad : 0;

        const prod = await Producto.findOneAndUpdate(
            { nombre: new RegExp(`^${nombre}$`, 'i') },
            { nombre, precio, cantidad, unidad },
            { upsert: true, new: true }
        );

        // REGISTRO EN KARDEX
        await new Kardex({
            nombre_producto: nombre,
            cantidad: cantidad - stockAnt,
            motivo: 'ACTUALIZACIÓN',
            stock_anterior: stockAnt,
            stock_actual: cantidad
        }).save();

        await new LogAuditoria({ accion: 'INVENTARIO', detalle: `Actualizado: ${nombre} (Stock final: ${cantidad})` }).save();
        res.json(prod);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 3. REGISTRAR FIADO (COMPRA AL CRÉDITO)
app.post('/api/fiados/masivo', async (req, res) => {
    try {
        const { cliente_id, items, total } = req.body;
        const cliente = await Cliente.findById(cliente_id);
        const nuevoSaldo = cliente.deudaTotal + total;

        const mov = new Movimiento({ 
            cliente_id: new mongoose.Types.ObjectId(cliente_id), 
            tipo: 'DEUDA', monto: total, descripcion: 'Compra al fiado',
            saldo_al_momento: nuevoSaldo
        });
        await mov.save();

        await Cliente.findByIdAndUpdate(cliente_id, { $inc: { deudaTotal: total } });

        for (const it of items) {
            if (it._id && !it._id.toString().startsWith('MANUAL')) {
                const prod = await Producto.findById(it._id);
                const sAnt = prod.cantidad;
                const sAct = sAnt - Number(it.cantidadSeleccionada);

                await Producto.findByIdAndUpdate(it._id, { cantidad: sAct });

                // ESTO ES LO QUE FALTABA: EL FIADO TAMBIÉN VA AL KARDEX
                await new Kardex({
                    nombre_producto: prod.nombre,
                    cantidad: Number(it.cantidadSeleccionada),
                    motivo: 'FIADO',
                    stock_anterior: sAnt,
                    stock_actual: sAct
                }).save();
            }
        }
        await new LogAuditoria({ accion: 'FIADO', detalle: `S/. ${total} fiados a ${cliente.nombre}` }).save();
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

// 4. REGISTRAR ABONO (PAGO DE CLIENTE)
app.post('/api/fiados/abono', async (req, res) => {
    try {
        const { cliente_id, monto } = req.body;
        const cliente = await Cliente.findById(cliente_id);
        const nuevoSaldo = cliente.deudaTotal - monto;

        const mov = new Movimiento({ 
            cliente_id: new mongoose.Types.ObjectId(cliente_id), 
            tipo: 'PAGO', monto: monto, descripcion: 'Abono a cuenta',
            saldo_al_momento: nuevoSaldo
        });
        await mov.save();

        await Cliente.findByIdAndUpdate(cliente_id, { $inc: { deudaTotal: -monto } });
        await new LogAuditoria({ accion: 'ABONO', detalle: `Abono de S/. ${monto} de ${cliente.nombre}` }).save();
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

// --- OTRAS RUTAS (INVERSIONES, REPORTES, ETC) ---

app.get('/api/productos', async (req, res) => {
    const p = await Producto.find().sort({ nombre: 1 });
    res.json(p);
});

app.get('/api/clientes/deudas', async (req, res) => {
    const c = await Cliente.find().sort({ nombre: 1 });
    res.json(c);
});

app.post('/api/clientes', async (req, res) => {
    const c = new Cliente({ nombre: req.body.nombre });
    await c.save();
    res.json(c);
});

app.get('/api/clientes/:id/movimientos', async (req, res) => {
    try {
        const movs = await Movimiento.find({ cliente_id: new mongoose.Types.ObjectId(req.params.id) }).sort({ fecha: -1 });
        res.json(movs);
    } catch (e) { res.status(500).json([]); }
});

app.get('/api/reportes/ventas', async (req, res) => {
    const { desde, hasta } = req.query;
    const fI = new Date(desde); fI.setHours(0,0,0,0);
    const fF = new Date(hasta); fF.setHours(23,59,59,999);
    const ventas = await Venta.find({ fecha: { $gte: fI, $lte: fF } }).sort({ fecha: -1 });
    res.json(ventas.map(v => ({ ...v._doc, items: v.productos })));
});

app.get('/api/nombres-inversiones', async (req, res) => {
    const nombres = await Inversion.find().distinct('nombre');
    res.json(nombres);
});

app.delete('/api/clientes/:id', async (req, res) => {
    await Cliente.findByIdAndDelete(req.params.id);
    await Movimiento.deleteMany({ cliente_id: req.params.id });
    res.json({ success: true });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Puerto ${PORT} con Auditoría Completa`));