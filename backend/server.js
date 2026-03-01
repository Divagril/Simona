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

const Movimiento = mongoose.model('Movimiento', new mongoose.Schema({
    cliente_id: mongoose.Schema.Types.ObjectId,
    tipo: String, monto: Number, descripcion: String, saldo_al_momento: Number, fecha: { type: Date, default: Date.now }
}));

const Kardex = mongoose.model('Kardex', new mongoose.Schema({
    nombre_producto: String, cantidad: Number, motivo: String, stock_anterior: Number, stock_actual: Number, fecha: { type: Date, default: Date.now }
}));

const LogAuditoria = mongoose.model('LogAuditoria', new mongoose.Schema({
    accion: String, detalle: String, fecha: { type: Date, default: Date.now }
}));

const Inversion = mongoose.model('Inversion', new mongoose.Schema({
    nombre: String, costo_total: Number, cantidad_comprada: Number, costo_unitario: Number, fecha: { type: Date, default: Date.now }
}));

// --- RUTA CORREGIDA: ELIMINAR MASIVO ---
app.post('/api/productos/eliminar-masivo', async (req, res) => {
    try {
        const { ids } = req.body;
        
        if (!ids || ids.length === 0) {
            return res.status(400).json({ success: false, message: "No hay IDs para eliminar" });
        }

        // 1. Borrar de la base de datos
        const resultado = await Producto.deleteMany({ _id: { $in: ids } });

        // 2. Registrar en Auditoría
        await new LogAuditoria({ 
            accion: 'ELIMINACIÓN', 
            detalle: `Se eliminaron ${resultado.deletedCount} productos del inventario.` 
        }).save();

        res.json({ success: true, deletedCount: resultado.deletedCount });
    } catch (e) {
        console.error("Error al eliminar:", e);
        res.status(500).json({ success: false, error: e.message });
    }
});

// --- OTRAS RUTAS ---
app.get('/api/productos', async (req, res) => {
    const prods = await Producto.find().sort({ nombre: 1 });
    res.json(prods);
});

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
        await new Kardex({ nombre_producto: nombre, cantidad: cantidad - stockAnt, motivo: 'ACTUALIZACIÓN', stock_anterior: stockAnt, stock_actual: cantidad }).save();
        await new LogAuditoria({ accion: 'INVENTARIO', detalle: `Actualizado: ${nombre} (Stock: ${cantidad})` }).save();
        res.json(prod);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/ventas', async (req, res) => {
    try {
        const { items, total, metodoPago } = req.body;
        const v = new Venta({ productos: items, total, metodoPago });
        await v.save();
        for (const it of items) {
            if (it._id && !it._id.toString().startsWith('MANUAL')) {
                const p = await Producto.findById(it._id);
                const sA = p.cantidad;
                await Producto.findByIdAndUpdate(it._id, { $inc: { cantidad: -Number(it.cantidadSeleccionada) } });
                await new Kardex({ nombre_producto: p.nombre, cantidad: it.cantidadSeleccionada, motivo: 'VENTA', stock_anterior: sA, stock_actual: sA - it.cantidadSeleccionada }).save();
            }
        }
        await new LogAuditoria({ accion: 'VENTA', detalle: `Cobro POS S/. ${total}` }).save();
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.get('/api/auditoria', async (req, res) => {
    const logs = await LogAuditoria.find().sort({ fecha: -1 }).limit(50);
    res.json(logs);
});

app.get('/api/kardex', async (req, res) => {
    const movs = await Kardex.find().sort({ fecha: -1 }).limit(50);
    res.json(movs);
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
    const c = new Cliente({ nombre: req.body.nombre });
    await c.save();
    res.json(c);
});

app.get('/api/clientes/:id/movimientos', async (req, res) => {
    const movs = await Movimiento.find({ cliente_id: new mongoose.Types.ObjectId(req.params.id) }).sort({ fecha: -1 });
    res.json(movs);
});

app.post('/api/fiados/abono', async (req, res) => {
    const { cliente_id, monto } = req.body;
    const c = await Cliente.findById(cliente_id);
    const nS = c.deudaTotal - monto;
    await new Movimiento({ cliente_id, tipo: 'PAGO', monto, descripcion: 'Abono', saldo_al_momento: nS }).save();
    await Cliente.findByIdAndUpdate(cliente_id, { $inc: { deudaTotal: -monto } });
    res.json({ success: true });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Servidor en puerto ${PORT}`));