const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ Conectado a MongoDB Atlas"))
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

// ESQUEMA CORREGIDO: saldo_al_momento es obligatorio
const Movimiento = mongoose.model('Movimiento', new mongoose.Schema({
    cliente_id: mongoose.Schema.Types.ObjectId,
    tipo: String, 
    monto: Number,
    descripcion: String,
    saldo_al_momento: Number, // <--- AQUÍ SE GUARDA LA FOTO DE LA DEUDA
    fecha: { type: Date, default: Date.now }
}));

const Inversion = mongoose.model('Inversion', new mongoose.Schema({
    nombre: String, costo_total: Number, cantidad_comprada: Number, costo_unitario: Number, fecha: { type: Date, default: Date.now }
}));

const Kardex = mongoose.model('Kardex', new mongoose.Schema({
    nombre_producto: String, cantidad: Number, motivo: String, stock_anterior: Number, stock_actual: Number, fecha: { type: Date, default: Date.now }
}));

const LogAuditoria = mongoose.model('LogAuditoria', new mongoose.Schema({
    accion: String, detalle: String, fecha: { type: Date, default: Date.now }
}));

// --- RUTAS ---

app.get('/api/productos', async (req, res) => {
    const prods = await Producto.find().sort({ nombre: 1 });
    res.json(prods);
});

app.post('/api/ventas', async (req, res) => {
    try {
        const { items, total, metodoPago } = req.body;
        const v = new Venta({ productos: items, total, metodoPago });
        await v.save();
        for (const it of items) {
            if (it._id && !it._id.toString().startsWith('MANUAL')) {
                await Producto.findByIdAndUpdate(it._id, { $inc: { cantidad: -Number(it.cantidadSeleccionada) } });
            }
        }
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
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

// OBTENER MOVIMIENTOS
app.get('/api/clientes/:id/movimientos', async (req, res) => {
    try {
        const movs = await Movimiento.find({ cliente_id: new mongoose.Types.ObjectId(req.params.id) }).sort({ fecha: -1 });
        res.json(movs);
    } catch (e) { res.status(500).json([]); }
});

// --- RUTA CORREGIDA: REGISTRAR FIADO (COMPRA) ---
app.post('/api/fiados/masivo', async (req, res) => {
    try {
        const { cliente_id, items, total } = req.body;
        const cliente = await Cliente.findById(cliente_id);

        // CALCULO HISTÓRICO
        const nuevoSaldo = cliente.deudaTotal + total;

        const mov = new Movimiento({ 
            cliente_id: new mongoose.Types.ObjectId(cliente_id), 
            tipo: 'DEUDA', 
            monto: total, 
            descripcion: 'Compra al fiado',
            saldo_al_momento: nuevoSaldo // SE GRABA EL SALDO RESULTANTE
        });
        await mov.save();

        await Cliente.findByIdAndUpdate(cliente_id, { $inc: { deudaTotal: total } });

        for (const it of items) {
            if (it._id && !it._id.toString().startsWith('MANUAL')) {
                await Producto.findByIdAndUpdate(it._id, { $inc: { cantidad: -Number(it.cantidadSeleccionada) } });
            }
        }
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

// --- RUTA CORREGIDA: REGISTRAR ABONO (PAGO) ---
app.post('/api/fiados/abono', async (req, res) => {
    try {
        const { cliente_id, monto } = req.body;
        const cliente = await Cliente.findById(cliente_id);

        // CALCULO HISTÓRICO
        const nuevoSaldo = cliente.deudaTotal - monto;

        const mov = new Movimiento({ 
            cliente_id: new mongoose.Types.ObjectId(cliente_id), 
            tipo: 'PAGO', 
            monto: monto, 
            descripcion: 'Abono a cuenta',
            saldo_al_momento: nuevoSaldo // SE GRABA EL SALDO RESULTANTE
        });
        await mov.save();

        await Cliente.findByIdAndUpdate(cliente_id, { $inc: { deudaTotal: -monto } });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.delete('/api/clientes/:id', async (req, res) => {
    await Cliente.findByIdAndDelete(req.params.id);
    await Movimiento.deleteMany({ cliente_id: req.params.id });
    res.json({ success: true });
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

app.get('/api/auditoria', async (req, res) => {
    const logs = await LogAuditoria.find().sort({ fecha: -1 }).limit(50);
    res.json(logs);
});

app.get('/api/kardex', async (req, res) => {
    const movs = await Kardex.find().sort({ fecha: -1 }).limit(50);
    res.json(movs);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Servidor en puerto ${PORT}`));