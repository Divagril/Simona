const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ MongoDB Conectado"))
    .catch(err => console.error("❌ Error:", err));

// --- MODELOS ---
const Producto = mongoose.model('Producto', new mongoose.Schema({
    nombre: String, precio: Number, cantidad: Number, unidad: String
}));

const Venta = mongoose.model('Venta', new mongoose.Schema({
    productos: Array, total: Number, metodoPago: String, fecha: { type: Date, default: Date.now }
}));

const Cliente = mongoose.model('Cliente', new mongoose.Schema({
    nombre: { type: String, required: true },
    deudaTotal: { type: Number, default: 0 }
}));

const Movimiento = mongoose.model('Movimiento', new mongoose.Schema({
    cliente_id: mongoose.Types.ObjectId,
    tipo: String, // 'DEUDA' o 'PAGO'
    monto: Number,
    descripcion: String,
    fecha: { type: Date, default: Date.now }
}));

// --- RUTAS DE CLIENTES ---

// A. Obtener movimientos de un cliente (ESTA FALTABA)
app.get('/api/clientes/:id/movimientos', async (req, res) => {
    try {
        const movs = await Movimiento.find({ cliente_id: req.params.id }).sort({ fecha: -1 });
        res.json(movs);
    } catch (e) { res.status(500).json([]); }
});

// B. Registrar un Pago/Abono
app.post('/api/fiados/abono', async (req, res) => {
    try {
        const { cliente_id, monto } = req.body;
        const mov = new Movimiento({ cliente_id, tipo: 'PAGO', monto, descripcion: 'Abono a cuenta' });
        await mov.save();
        await Cliente.findByIdAndUpdate(cliente_id, { $inc: { deudaTotal: -monto } });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

// C. Eliminar cliente
app.delete('/api/clientes/:id', async (req, res) => {
    try {
        await Cliente.findByIdAndDelete(req.params.id);
        await Movimiento.deleteMany({ cliente_id: req.params.id });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

// D. Crear cliente y listar deudas (Ya las tenías)
app.post('/api/clientes', async (req, res) => {
    const c = new Cliente({ nombre: req.body.nombre });
    await c.save();
    res.json(c);
});
app.get('/api/clientes/deudas', async (req, res) => {
    const c = await Cliente.find().sort({ nombre: 1 });
    res.json(c);
});

// --- RUTAS DE VENTAS Y PRODUCTOS ---
app.get('/api/productos', async (req, res) => {
    const p = await Producto.find().sort({ nombre: 1 });
    res.json(p);
});

app.post('/api/ventas', async (req, res) => {
    const { items, total, metodoPago } = req.body;
    const v = new Venta({ productos: items, total, metodoPago });
    await v.save();
    for (const it of items) {
        if (it._id && !it._id.toString().startsWith('MANUAL')) {
            await Producto.findByIdAndUpdate(it._id, { $inc: { cantidad: -Number(it.cantidadSeleccionada) } });
        }
    }
    res.json({ success: true });
});

// Registro de Fiado Masivo
app.post('/api/fiados/masivo', async (req, res) => {
    const { cliente_id, items, total } = req.body;
    const mov = new Movimiento({ cliente_id, tipo: 'DEUDA', monto: total, descripcion: 'Compra al fiado' });
    await mov.save();
    await Cliente.findByIdAndUpdate(cliente_id, { $inc: { deudaTotal: total } });
    for (const it of items) {
        if (it._id && !it._id.toString().startsWith('MANUAL')) {
            await Producto.findByIdAndUpdate(it._id, { $inc: { cantidad: -Number(it.cantidadSeleccionada) } });
        }
    }
    res.json({ success: true });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Puerto ${PORT}`));