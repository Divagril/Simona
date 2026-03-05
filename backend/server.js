const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ Servidor Simona CONECTADO a Atlas"))
    .catch(err => console.error("❌ Error de conexión:", err));

// --- 1. MODELOS ---

const Producto = mongoose.model('Producto', new mongoose.Schema({
    nombre: String, 
    precio: Number, 
    unidad_venta: String, 
    unidades_por_paquete: { type: Number, default: 1 }
}));

const Inversion = mongoose.model('Inversion', new mongoose.Schema({
    nombre: String,
    cantidadFormato: Number,
    unidadesPorFormato: Number,
    costoTotal: Number,
    fecha: { type: Date, default: Date.now }
}));

const Venta = mongoose.model('Venta', new mongoose.Schema({
    productos: Array, // [{nombre, cantidadSeleccionada, unidades_por_paquete, subtotal}]
    total: Number,
    metodoPago: String,
    fecha: { type: Date, default: Date.now }
}));

const Cliente = mongoose.model('Cliente', new mongoose.Schema({
    nombre: { type: String, uppercase: true },
    deudaTotal: { type: Number, default: 0 },
    detalles_deuda: { type: Array, default: [] }
}, { strict: false }));

const MovimientoFiado = mongoose.model('MovimientoFiado', new mongoose.Schema({
    cliente_id: mongoose.Schema.Types.ObjectId,
    tipo: String, 
    monto: Number,
    productos: Array,
    saldo_al_momento: Number,
    fecha: { type: Date, default: Date.now }
}));

const Log = mongoose.model('Log', new mongoose.Schema({ accion: String, detalle: String, fecha: { type: Date, default: Date.now } }));
const Kardex = mongoose.model('Kardex', new mongoose.Schema({ nombre_producto: String, cantidad: Number, motivo: String, stock_actual: Number, fecha: { type: Date, default: Date.now } }));

// --- 2. FUNCIÓN MAESTRA DE CÁLCULO (LA QUE ARREGLA TU ERROR) ---

const obtenerUnidadesDisponibles = (nombreProd, inversiones, ventas) => {
    const n = (nombreProd || "").toLowerCase().trim();

    // 1. Calcular Entradas (Todo lo que se compró en facturas)
    const entradas = inversiones
        .filter(i => (i.nombre || "").toLowerCase().trim() === n)
        .reduce((acc, c) => acc + (Number(c.cantidadFormato) * Number(c.unidadesPorFormato) || 0), 0);

    // 2. Calcular Salidas (Todo lo que se ha vendido)
    let salidas = 0;
    ventas.forEach(v => {
        const listaItems = v.productos || [];
        listaItems.forEach(item => {
            if ((item.nombre || "").toLowerCase().trim() === n) {
                // IMPORTANTE: Si se vendió un paquete, restamos las unidades que ese paquete contenía
                // Si vendió por unidad, unidades_por_paquete es 1.
                const factor = Number(item.unidades_por_paquete) || 1;
                salidas += (Number(item.cantidadSeleccionada) * factor);
            }
        });
    });

    return entradas - salidas;
};

// --- 3. RUTAS ---

app.get('/', (req, res) => res.send("🚀 API Simona Online"));

// PRODUCTOS: Catálogo (Derecha)
app.get('/api/productos', async (req, res) => {
    try {
        const productos = await Producto.find().sort({ nombre: 1 });
        const inversiones = await Inversion.find();
        const ventas = await Venta.find();

        const resultado = productos.map(p => {
            const unidadesDisponibles = obtenerUnidadesDisponibles(p.nombre, inversiones, ventas);
            
            return { 
                ...p._doc, 
                stock_actual: p.unidad_venta === 'UNIDAD' 
                    ? unidadesDisponibles 
                    : Math.floor(unidadesDisponibles / (p.unidades_por_paquete || 1)) 
            };
        });
        res.json(resultado);
    } catch (e) { res.status(500).json([]); }
});

// BUSCADOR DE INVERSIONES: Cuadro Naranja (Izquierda)
app.get('/api/nombres-inversiones', async (req, res) => {
    try {
        const inversiones = await Inversion.find();
        const ventas = await Venta.find();
        const nombresUnicos = [...new Set(inversiones.map(i => (i.nombre || "").toUpperCase().trim()))];

        const listaSugerencias = nombresUnicos.map(nombre => {
            // USAMOS LA MISMA FUNCIÓN PARA QUE AMBOS LADOS COINCIDAN
            const stockReal = obtenerUnidadesDisponibles(nombre, inversiones, ventas);
            return {
                nombre: nombre,
                total: Math.max(0, stockReal)
            };
        });

        res.json(listaSugerencias);
    } catch (e) { res.json([]); }
});

// GUARDAR PRODUCTO
app.post('/api/productos', async (req, res) => {
    try {
        const { nombre, precio, unidad_venta, unidades_por_paquete } = req.body;
        const prod = await Producto.findOneAndUpdate(
            { nombre: new RegExp(`^${nombre}$`, 'i') }, 
            { nombre: nombre.toUpperCase().trim(), precio, unidad_venta, unidades_por_paquete }, 
            { upsert: true, new: true }
        );
        res.json(prod);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ELIMINAR MASIVO
app.post('/api/productos/eliminar-masivo', async (req, res) => {
    try {
        await Producto.deleteMany({ _id: { $in: req.body.ids } });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

// COBRAR VENTA (POS)
app.post('/api/ventas', async (req, res) => {
    try {
        const { items, total, metodoPago } = req.body;
        const v = new Venta({ productos: items, total, metodoPago, fecha: new Date() });
        await v.save();
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

// FIADO MASIVO
app.post('/api/fiados/masivo', async (req, res) => {
    try {
        const { cliente_id, items, total } = req.body;
        const detalleItems = items.map(it => ({ nombre_producto: it.nombre, cantidad: it.cantidadSeleccionada, precio: it.precio, fecha: new Date() }));

        const db = mongoose.connection.db;
        const op = await db.collection('clientes').findOneAndUpdate(
            { _id: new mongoose.Types.ObjectId(cliente_id) },
            { $inc: { deudaTotal: total }, $push: { detalles_deuda: { $each: detalleItems } } },
            { returnDocument: 'after' }
        );

        await new Venta({ productos: items, total, metodoPago: 'FIADO', fecha: new Date() }).save();
        await new MovimientoFiado({ cliente_id: new mongoose.Types.ObjectId(cliente_id), tipo: 'DEUDA', monto: total, productos: detalleItems, saldo_al_momento: (op.value ? op.value.deudaTotal : total) }).save();

        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

// PAGOS (ABONOS)
app.post('/api/fiados/abono', async (req, res) => {
    try {
        const { cliente_id, monto } = req.body;
        const c = await Cliente.findById(cliente_id);
        const nS = (c.deudaTotal || 0) - monto;
        await new MovimientoFiado({ cliente_id: new mongoose.Types.ObjectId(cliente_id), tipo: 'PAGO', monto, saldo_al_momento: nS }).save();
        if (nS <= 0.1) await Cliente.findByIdAndUpdate(cliente_id, { $set: { deudaTotal: 0, detalles_deuda: [] } });
        else await Cliente.findByIdAndUpdate(cliente_id, { $set: { deudaTotal: nS } });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

// CLIENTES, REPORTES Y AUDITORÍA
app.get('/api/clientes/deudas', async (req, res) => res.json(await Cliente.find().sort({ nombre: 1 })));
app.post('/api/clientes', async (req, res) => { const n = new Cliente({ nombre: req.body.nombre.toUpperCase(), deudaTotal: 0, detalles_deuda: [] }); await n.save(); res.json(n); });
app.get('/api/clientes/:id/movimientos', async (req, res) => res.json(await MovimientoFiado.find({ cliente_id: new mongoose.Types.ObjectId(req.params.id) }).sort({ fecha: -1 })));

app.get('/api/reportes/ventas', async (req, res) => {
    const { desde, hasta } = req.query;
    const fI = new Date(desde); fI.setHours(0,0,0,0);
    const fF = new Date(hasta); fF.setHours(23,59,59,999);
    const v = await Venta.find({ fecha: { $gte: fI, $lte: fF } });
    const a = await MovimientoFiado.find({ fecha: { $gte: fI, $lte: fF }, tipo: 'PAGO' });
    const real = v.filter(x => x.metodoPago !== 'FIADO').reduce((acc, x) => acc + x.total, 0) + a.reduce((acc, x) => acc + x.monto, 0);
    res.json({ ventas: v.map(x => ({ ...x._doc, items: x.productos })), abonos: a, totalGananciaReal: real, totalFiadoPeriodo: v.filter(x => x.metodoPago === 'FIADO').reduce((acc, x) => acc + x.total, 0) });
});

app.get('/api/auditoria', async (req, res) => res.json(await Log.find().sort({ fecha: -1 }).limit(100)));
app.get('/api/kardex', async (req, res) => res.json(await Kardex.find().sort({ fecha: -1 }).limit(100)));

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Servidor Simona en puerto ${PORT}`));