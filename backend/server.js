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
    .then(() => console.log("✅ Conectado a MongoDB Atlas - Tienda Simo"))
    .catch(err => console.error("❌ Error de conexión:", err));

// --- MODELOS DE DATOS ---

const Producto = mongoose.model('Producto', new mongoose.Schema({
    nombre: { type: String, required: true },
    precio: { type: Number, default: 0 },
    cantidad: { type: Number, default: 0 },
    unidad: { type: String, default: 'UNIDAD' },
    precio_compra: { type: Number, default: 0 }
}));

const Venta = mongoose.model('Venta', new mongoose.Schema({
    productos: Array, // Aquí se guardan los items del carrito
    total: Number,
    metodoPago: { type: String, default: 'EFECTIVO' },
    fecha: { type: Date, default: Date.now }
}));

const Cliente = mongoose.model('Cliente', new mongoose.Schema({
    nombre: { type: String, required: true },
    deudaTotal: { type: Number, default: 0 }
}));

const MovimientoFiado = mongoose.model('MovimientoFiado', new mongoose.Schema({
    cliente_id: mongoose.Schema.Types.ObjectId,
    tipo: String, // 'DEUDA' o 'PAGO'
    monto: Number,
    descripcion: String,
    saldo_al_momento: Number,
    fecha: { type: Date, default: Date.now }
}));

const Kardex = mongoose.model('Kardex', new mongoose.Schema({
    nombre_producto: String,
    cantidad: Number,
    motivo: String,
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
app.get('/api/reportes/ventas', async (req, res) => {
    try {
        const { desde, hasta, categoria } = req.query; // <--- Recibimos categoria
        
        const fInicio = new Date(desde); fInicio.setHours(0,0,0,0);
        const fFin = new Date(hasta); fFin.setHours(23,59,59,999);

        // Creamos el filtro básico de fechas
        let filtro = {
            fecha: { $gte: fInicio, $lte: fFin }
        };

        // Si el usuario eligió una categoría específica (y no "TODAS")
        // Nota: Esto asume que tus productos tienen el campo categoria
        if (categoria && categoria !== 'TODAS') {
            filtro["productos.categoria"] = categoria;
        }

        const ventas = await Venta.find(filtro).sort({ fecha: -1 });

        const respuesta = ventas.map(v => ({
            ...v._doc,
            items: v.productos || []
        }));

        res.json(respuesta);
    } catch (e) {
        res.status(500).json([]);
    }
});

// 2. POS: Registrar Venta
app.post('/api/ventas', async (req, res) => {
    try {
        const { items, total, metodoPago } = req.body;
        const v = new Venta({ productos: items, total, metodoPago });
        await v.save();

        for (const it of items) {
            if (it._id && !it._id.toString().startsWith('MANUAL')) {
                const prod = await Producto.findById(it._id);
                if (prod) {
                    const sAnt = prod.cantidad;
                    const sAct = sAnt - Number(it.cantidadSeleccionada);
                    await Producto.findByIdAndUpdate(it._id, { cantidad: sAct });
                    await new Kardex({ nombre_producto: prod.nombre, cantidad: it.cantidadSeleccionada, motivo: 'VENTA', stock_anterior: sAnt, stock_actual: sAct }).save();
                }
            }
        }
        await new LogAuditoria({ accion: 'VENTA', detalle: `Venta POS: S/. ${total.toFixed(2)} (${metodoPago})` }).save();
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

// 3. INVENTARIO: Guardar/Actualizar
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

// 4. CLIENTES: Movimientos (Historial corregido)
app.get('/api/clientes/:id/movimientos', async (req, res) => {
    try {
        const movs = await MovimientoFiado.find({ cliente_id: new mongoose.Types.ObjectId(req.params.id) }).sort({ fecha: -1 });
        res.json(movs);
    } catch (e) { res.json([]); }
});

// 5. CLIENTES: Registrar Abono
app.post('/api/fiados/abono', async (req, res) => {
    try {
        const { cliente_id, monto } = req.body;
        const c = await Cliente.findById(cliente_id);
        const nuevoSaldo = c.deudaTotal - monto;

        await new MovimientoFiado({ cliente_id: new mongoose.Types.ObjectId(cliente_id), tipo: 'PAGO', monto, descripcion: 'Abono a cuenta', saldo_al_momento: nuevoSaldo }).save();
        await Cliente.findByIdAndUpdate(cliente_id, { $inc: { deudaTotal: -monto } });
        await new LogAuditoria({ accion: 'ABONO', detalle: `Abono S/. ${monto} de ${c.nombre}` }).save();
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

// 6. CLIENTES: Registrar Fiado (Desde POS)
app.post('/api/fiados/masivo', async (req, res) => {
    try {
        const { cliente_id, items, total } = req.body;
        const cliente = await Cliente.findById(cliente_id);
        const nuevoSaldo = cliente.deudaTotal + total;

        await new MovimientoFiado({ cliente_id: new mongoose.Types.ObjectId(cliente_id), tipo: 'DEUDA', monto: total, descripcion: 'Compra al fiado', saldo_al_momento: nuevoSaldo }).save();
        await Cliente.findByIdAndUpdate(cliente_id, { $inc: { deudaTotal: total } });

        for (const it of items) {
            if (it._id && !it._id.toString().startsWith('MANUAL')) {
                const prod = await Producto.findById(it._id);
                if (prod) {
                    const sAnt = prod.cantidad;
                    const sAct = sAnt - Number(it.cantidadSeleccionada);
                    await Producto.findByIdAndUpdate(it._id, { cantidad: sAct });
                    await new Kardex({ nombre_producto: prod.nombre, cantidad: it.cantidadSeleccionada, motivo: 'FIADO', stock_anterior: sAnt, stock_actual: sAct }).save();
                }
            }
        }
        await new LogAuditoria({ accion: 'FIADO', detalle: `S/. ${total} fiados a ${cliente.nombre}` }).save();
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

// 7. AUDITORÍA Y KARDEX: Listar
app.get('/api/auditoria', async (req, res) => {
    const logs = await LogAuditoria.find().sort({ fecha: -1 }).limit(100);
    res.json(logs);
});
app.get('/api/kardex', async (req, res) => {
    const movs = await Kardex.find().sort({ fecha: -1 }).limit(100);
    res.json(movs);
});

// --- RUTAS BÁSICAS RESTANTES ---
app.get('/api/productos', async (req, res) => {
    const p = await Producto.find().sort({ nombre: 1 });
    res.json(p);
});
app.get('/api/nombres-inversiones', async (req, res) => {
    const n = await Inversion.find().distinct('nombre');
    res.json(n);
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
app.delete('/api/clientes/:id', async (req, res) => {
    await Cliente.findByIdAndDelete(req.params.id);
    res.json({ success: true });
});
app.post('/api/productos/eliminar-masivo', async (req, res) => {
    await Producto.deleteMany({ _id: { $in: req.body.ids } });
    res.json({ success: true });
});

// --- INICIO ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Servidor Tienda Simo v3 listo en puerto ${PORT}`));