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
    .then(() => console.log("✅ Conectado a MongoDB Atlas - Tienda Simo V.Final"))
    .catch(err => console.error("❌ Error de conexión:", err));

// --- MODELOS DE DATOS ---

// 1. Producto (Con Lógica de Conversión)
const Producto = mongoose.model('Producto', new mongoose.Schema({
    nombre: { type: String, required: true },
    precio: { type: Number, default: 0 },
    cantidad_base: { type: Number, default: 0 }, // Siempre en Paquetes/Cajas
    unidades_por_paquete: { type: Number, default: 1 }, // Factor (ej: 12 unidades por caja)
    unidad_venta: { type: String, default: 'PAQUETE' }, // 'PAQUETE' o 'UNIDAD'
    precio_compra: { type: Number, default: 0 }
}));

// 2. Inversiones (Compras de mercadería)
const Inversion = mongoose.model('Inversion', new mongoose.Schema({
    nombre: String,
    costo_total: Number,
    cantidad_comprada: Number, // Cantidad de paquetes/cajas
    costo_unitario: Number,
    fecha: { type: Date, default: Date.now }
}));

// 3. Ventas (POS y Fiados sincronizados)
const Venta = mongoose.model('Venta', new mongoose.Schema({
    productos: Array,
    total: Number,
    metodoPago: { type: String, default: 'EFECTIVO' },
    fecha: { type: Date, default: Date.now }
}));

// 4. Clientes
const Cliente = mongoose.model('Cliente', new mongoose.Schema({
    nombre: { type: String, required: true },
    deudaTotal: { type: Number, default: 0 }
}));

// 5. Movimientos de Fiados (Con Saldo histórico)
const MovimientoFiado = mongoose.model('MovimientoFiado', new mongoose.Schema({
    cliente_id: mongoose.Schema.Types.ObjectId,
    tipo: String, // 'DEUDA' o 'PAGO'
    monto: Number,
    descripcion: String,
    saldo_al_momento: Number, // Deuda que quedó tras esta operación
    fecha: { type: Date, default: Date.now }
}));

// 6. Kardex (Movimientos de Stock)
const Kardex = mongoose.model('Kardex', new mongoose.Schema({
    nombre_producto: String,
    cantidad: Number,
    motivo: String, // 'VENTA', 'COMPRA', 'FIADO', 'ACTUALIZACION'
    stock_anterior: Number,
    stock_actual: Number,
    fecha: { type: Date, default: Date.now }
}));

// 7. Auditoría (Registro de acciones)
const LogAuditoria = mongoose.model('LogAuditoria', new mongoose.Schema({
    accion: String,
    detalle: String,
    fecha: { type: Date, default: Date.now }
}));

// --- RUTAS DEL SISTEMA ---

// --- SECCIÓN: INVENTARIO Y PRODUCTOS ---

app.get('/api/productos', async (req, res) => {
    try {
        const prods = await Producto.find().sort({ nombre: 1 });
        res.json(prods);
    } catch (e) { res.status(500).json([]); }
});

app.post('/api/productos', async (req, res) => {
    try {
        const { nombre, precio, unidad_venta, unidades_por_paquete } = req.body;
        
        // Sincronizar el stock base desde las inversiones acumuladas
        const compras = await Inversion.find({ nombre: new RegExp(`^${nombre}$`, 'i') });
        const totalPaquetes = compras.reduce((acc, c) => acc + (c.cantidad_comprada || 0), 0);

        const prod = await Producto.findOneAndUpdate(
            { nombre: new RegExp(`^${nombre}$`, 'i') },
            { 
                nombre, precio, unidad_venta, 
                unidades_por_paquete: Number(unidades_por_paquete) || 1,
                cantidad_base: totalPaquetes
            },
            { upsert: true, new: true }
        );

        await new LogAuditoria({ accion: 'INV_SYNC', detalle: `Sincronizado: ${nombre}. Stock: ${totalPaquetes} pqts.` }).save();
        res.json(prod);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/productos/eliminar-masivo', async (req, res) => {
    try {
        await Producto.deleteMany({ _id: { $in: req.body.ids } });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

// --- SECCIÓN: COMPRAS / INVERSIONES ---

app.post('/api/inversiones', async (req, res) => {
    try {
        const { nombre, costoTotal, cantidad, costoUnid } = req.body;
        const inv = new Inversion({ nombre, costo_total: costoTotal, cantidad_comprada: cantidad, costo_unitario: costoUnid });
        await inv.save();

        // Actualizar automáticamente el stock base en el modelo Producto
        const prod = await Producto.findOneAndUpdate(
            { nombre: new RegExp(`^${nombre}$`, 'i') },
            { $inc: { cantidad_base: Number(cantidad) }, $set: { precio_compra: Number(costoUnid) } },
            { upsert: true, new: true }
        );

        // Registro Kardex
        await new Kardex({
            nombre_producto: nombre,
            cantidad: Number(cantidad),
            motivo: 'COMPRA',
            stock_anterior: prod.cantidad_base - Number(cantidad),
            stock_actual: prod.cantidad_base
        }).save();

        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/nombres-inversiones', async (req, res) => {
    try {
        const nombres = await Inversion.find().distinct('nombre');
        res.json(nombres);
    } catch (e) { res.json([]); }
});

// --- SECCIÓN: VENTAS (POS) ---

app.post('/api/ventas', async (req, res) => {
    try {
        const { items, total, metodoPago } = req.body;
        const v = new Venta({ productos: items, total, metodoPago });
        await v.save();

        for (const it of items) {
            if (it._id && !it._id.toString().startsWith('MANUAL')) {
                const prod = await Producto.findById(it._id);
                if (prod) {
                    const sAnt = prod.cantidad_base;
                    // Lógica de descuento: si vende unidad, descuenta fracción del paquete
                    const desc = prod.unidad_venta === 'UNIDAD' 
                        ? (Number(it.cantidadSeleccionada) / prod.unidades_por_paquete)
                        : Number(it.cantidadSeleccionada);
                    
                    const sAct = sAnt - desc;
                    await Producto.findByIdAndUpdate(it._id, { cantidad_base: sAct });

                    await new Kardex({ 
                        nombre_producto: prod.nombre, 
                        cantidad: it.cantidadSeleccionada, 
                        motivo: 'VENTA', 
                        stock_anterior: sAnt, 
                        stock_actual: sAct 
                    }).save();
                }
            }
        }
        await new LogAuditoria({ accion: 'VENTA', detalle: `Venta POS: S/. ${total} (${metodoPago})` }).save();
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

// --- SECCIÓN: CLIENTES Y FIADOS SINCRONIZADOS ---

app.get('/api/clientes/deudas', async (req, res) => {
    try {
        const c = await Cliente.find().sort({ nombre: 1 });
        res.json(c);
    } catch (e) { res.json([]); }
});

app.post('/api/clientes', async (req, res) => {
    try {
        const c = new Cliente({ nombre: req.body.nombre });
        await c.save();
        res.json(c);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/clientes/:id/movimientos', async (req, res) => {
    try {
        const movs = await MovimientoFiado.find({ cliente_id: new mongoose.Types.ObjectId(req.params.id) }).sort({ fecha: -1 });
        res.json(movs);
    } catch (e) { res.json([]); }
});

// Registrar Fiado (Sincroniza con Ventas)
app.post('/api/fiados/masivo', async (req, res) => {
    try {
        const { cliente_id, items, total } = req.body;
        const cliente = await Cliente.findById(cliente_id);
        const nuevoSaldo = (cliente.deudaTotal || 0) + total;

        // 1. Guardar en Ventas para Reportes
        const v = new Venta({ productos: items, total, metodoPago: 'FIADO' });
        await v.save();

        // 2. Guardar en Movimientos del Cliente
        const mov = new MovimientoFiado({ 
            cliente_id: new mongoose.Types.ObjectId(cliente_id), 
            tipo: 'DEUDA', monto: total, descripcion: 'Compra al fiado',
            saldo_al_momento: nuevoSaldo
        });
        await mov.save();

        // 3. Aumentar deuda del cliente
        await Cliente.findByIdAndUpdate(cliente_id, { $inc: { deudaTotal: total } });

        // 4. Descontar Stock y Kardex
        for (const it of items) {
            if (it._id && !it._id.toString().startsWith('MANUAL')) {
                const prod = await Producto.findById(it._id);
                if (prod) {
                    const sAnt = prod.cantidad_base;
                    const desc = prod.unidad_venta === 'UNIDAD' 
                        ? (Number(it.cantidadSeleccionada) / prod.unidades_por_paquete)
                        : Number(it.cantidadSeleccionada);
                    const sAct = sAnt - desc;
                    await Producto.findByIdAndUpdate(it._id, { cantidad_base: sAct });
                    await new Kardex({ nombre_producto: prod.nombre, cantidad: it.cantidadSeleccionada, motivo: 'FIADO', stock_anterior: sAnt, stock_actual: sAct }).save();
                }
            }
        }
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

// Registrar Abono
app.post('/api/fiados/abono', async (req, res) => {
    try {
        const { cliente_id, monto } = req.body;
        const cliente = await Cliente.findById(cliente_id);
        const nuevoSaldo = cliente.deudaTotal - monto;

        const mov = new MovimientoFiado({ 
            cliente_id: new mongoose.Types.ObjectId(cliente_id), 
            tipo: 'PAGO', monto, descripcion: 'Abono a cuenta',
            saldo_al_momento: nuevoSaldo
        });
        await mov.save();

        await Cliente.findByIdAndUpdate(cliente_id, { $inc: { deudaTotal: -monto } });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.delete('/api/clientes/:id', async (req, res) => {
    try {
        await Cliente.findByIdAndDelete(req.params.id);
        await MovimientoFiado.deleteMany({ cliente_id: req.params.id });
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

// --- SECCIÓN: AUDITORÍA ---

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

// --- INICIO ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Servidor TIENDA SIMO v.Final corriendo en puerto ${PORT}`));