const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// --- MIDDLEWARES ---
app.use(cors());
app.use(express.json());

// --- CONEXIÓN A MONGO DB ---
// Render usa process.env.MONGO_URI. Asegúrate que esté configurada en el Dashboard de Render.
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ Conectado a MongoDB Atlas (Base: sistema_pos_v5)"))
    .catch(err => console.error("❌ Error de conexión:", err));

// --- DEFINICIÓN DE MODELOS (Esquemas) ---

const Producto = mongoose.model('Producto', new mongoose.Schema({
    nombre: { type: String, required: true },
    precio: { type: Number, default: 0 },
    cantidad: { type: Number, default: 0 },
    unidad: { type: String, default: 'UNIDAD' },
    precio_compra: { type: Number, default: 0 }
}));

const Inversion = mongoose.model('Inversion', new mongoose.Schema({
    nombre: String,
    costo_total: Number,
    cantidad_comprada: Number,
    costo_unitario: Number,
    fecha: { type: Date, default: Date.now }
}));

const Venta = mongoose.model('Venta', new mongoose.Schema({
    productos: Array,
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

// --- RUTAS DEL SISTEMA ---

// 1. INVENTARIO: Obtener lista
app.get('/api/productos', async (req, res) => {
    try {
        const prods = await Producto.find().sort({ nombre: 1 });
        res.json(prods);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 2. INVENTARIO: Desplegable de nombres desde Inversiones
app.get('/api/nombres-inversiones', async (req, res) => {
    try {
        const nombres = await Inversion.find().distinct('nombre');
        res.json(nombres);
    } catch (e) { res.json([]); }
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

        // Registro Kardex
        await new Kardex({
            nombre_producto: nombre,
            cantidad: cantidad - stockAnt,
            motivo: 'ACTUALIZACIÓN',
            stock_anterior: stockAnt,
            stock_actual: cantidad
        }).save();

        await new LogAuditoria({ accion: 'INVENTARIO', detalle: `Actualizado: ${nombre} (Stock: ${cantidad})` }).save();
        res.json(prod);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 4. INVENTARIO: Eliminar masivo
app.post('/api/productos/eliminar-masivo', async (req, res) => {
    try {
        const { ids } = req.body;
        await Producto.deleteMany({ _id: { $in: ids } });
        await new LogAuditoria({ accion: 'ELIMINACIÓN', detalle: `Se eliminaron ${ids.length} productos` }).save();
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 5. POS: Registrar Venta
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

// 6. CLIENTES: Listar deudas
app.get('/api/clientes/deudas', async (req, res) => {
    try {
        const c = await Cliente.find().sort({ nombre: 1 });
        res.json(c);
    } catch (e) { res.json([]); }
});

// 7. CLIENTES: Crear
app.post('/api/clientes', async (req, res) => {
    try {
        const c = new Cliente({ nombre: req.body.nombre });
        await c.save();
        await new LogAuditoria({ accion: 'CLIENTE', detalle: `Nuevo cliente: ${req.body.nombre}` }).save();
        res.json(c);
    } catch (e) { res.status(500).json({ error: e.message }); }
});
// 8. CLIENTES: Movimientos (Historial corregido)
app.get('/api/clientes/:id/movimientos', async (req, res) => {
    try {
        const clienteId = req.params.id;

        // Validar si el ID es válido para evitar que el servidor se caiga
        if (!mongoose.Types.ObjectId.isValid(clienteId)) {
            return res.json([]);
        }

        // Buscamos los movimientos que pertenezcan a ese ID de cliente
        const movs = await MovimientoFiado.find({ 
            cliente_id: new mongoose.Types.ObjectId(clienteId) 
        }).sort({ fecha: -1 });

        console.log(`🔎 Movimientos encontrados para ${clienteId}:`, movs.length);
        res.json(movs);
    } catch (e) { 
        console.error("❌ Error al obtener movimientos:", e);
        res.json([]); 
    }
});
// 9. CLIENTES: Registrar Fiado
app.post('/api/fiados/masivo', async (req, res) => {
    try {
        const { cliente_id, items, total } = req.body;
        
        // GUARDAR EL HISTORIAL
        const mov = new MovimientoFiado({ 
            cliente_id: new mongoose.Types.ObjectId(cliente_id), // <--- CAMBIO AQUÍ
            tipo: 'DEUDA', 
            monto: total, 
            descripcion: 'Compra al fiado',
            saldo_al_momento: deudaDespuesDeCompra
        });
        await mov.save();

        // Actualizar deuda y stock...
        await Cliente.findByIdAndUpdate(cliente_id, { $inc: { deudaTotal: total } });
        // ... (resto del código de stock)
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

// 10. CLIENTES: Registrar Abono
app.post('/api/fiados/abono', async (req, res) => {
    try {
        const { cliente_id, monto } = req.body;
        const cliente = await Cliente.findById(cliente_id);

        // Calculamos cuánto debe justo después de pagar
        const deudaDespuesDePago = cliente.deudaTotal - monto;
        
        // GUARDAR EL HISTORIAL DEL PAGO
        const mov = new MovimientoFiado({ 
            cliente_id: new mongoose.Types.ObjectId(cliente_id), // <--- CAMBIO AQUÍ
            tipo: 'PAGO', 
            monto: monto, 
            descripcion: 'Abono a cuenta' ,
            saldo_al_momento: deudaDespuesDePago
        });
        await mov.save();

        await Cliente.findByIdAndUpdate(cliente_id, { $inc: { deudaTotal: -monto } });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

// 11. CLIENTES: Eliminar
app.delete('/api/clientes/:id', async (req, res) => {
    try {
        const c = await Cliente.findById(req.params.id);
        if (c) {
            await Cliente.findByIdAndDelete(req.params.id);
            await MovimientoFiado.deleteMany({ cliente_id: req.params.id });
            await new LogAuditoria({ accion: 'CLIENTE', detalle: `Eliminado: ${c.nombre}` }).save();
        }
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

// 12. REPORTES: Ventas por fecha
app.get('/api/reportes/ventas', async (req, res) => {
    try {
        const { desde, hasta } = req.query;
        const fI = new Date(desde); fI.setHours(0,0,0,0);
        const fF = new Date(hasta); fF.setHours(23,59,59,999);
        const ventas = await Venta.find({ fecha: { $gte: fI, $lte: fF } }).sort({ fecha: -1 });
        res.json(ventas.map(v => ({ ...v._doc, items: v.productos })));
    } catch (e) { res.status(500).json([]); }
});

// 13. AUDITORÍA: Obtener Logs
app.get('/api/auditoria', async (req, res) => {
    try {
        const logs = await LogAuditoria.find().sort({ fecha: -1 }).limit(100);
        res.json(logs);
    } catch (e) { res.status(500).json([]); }
});

// 14. AUDITORÍA: Obtener Kardex
app.get('/api/kardex', async (req, res) => {
    try {
        const movs = await Kardex.find().sort({ fecha: -1 }).limit(100);
        res.json(movs);
    } catch (e) { res.status(500).json([]); }
});

// --- INICIO ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Servidor listo en puerto ${PORT}`));