const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// --- MIDDLEWARES ---
app.use(cors());
app.use(express.json());

// --- CONEXIÓN A BASE DE DATOS ---
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ Servidor Simona conectado a MongoDB Atlas"))
    .catch(err => console.error("❌ Error de conexión DB:", err));

// --- 1. MODELOS DE DATOS ---

const Producto = mongoose.model('Producto', new mongoose.Schema({
    nombre: String,
    precio: Number,
    unidad_venta: String,
    unidades_por_paquete: { type: Number, default: 1 }
}));

const Inversion = mongoose.model('Inversion', new mongoose.Schema({
    nombre: String,
    formato_compra: String,
    cantidadFormato: Number,
    unidadesPorFormato: Number,
    costoTotal: Number,
    fecha: { type: Date, default: Date.now }
}));

const Venta = mongoose.model('Venta', new mongoose.Schema({
    productos: Array,
    total: Number,
    metodoPago: String,
    fecha: { type: Date, default: Date.now }
}));

// Modelo Cliente con inyección de detalles para Dashboard
const Cliente = mongoose.model('Cliente', new mongoose.Schema({
    nombre: { type: String, uppercase: true },
    deudaTotal: { type: Number, default: 0 },
    detalles_deuda: { type: Array, default: [] } 
}, { strict: false }));

const MovimientoFiado = mongoose.model('MovimientoFiado', new mongoose.Schema({
    cliente_id: mongoose.Schema.Types.ObjectId,
    tipo: String, 
    monto: Number,
    descripcion: String,
    productos: Array,
    saldo_al_momento: Number,
    fecha: { type: Date, default: Date.now }
}));

const Log = mongoose.model('Log', new mongoose.Schema({ accion: String, detalle: String, fecha: { type: Date, default: Date.now } }));
const Kardex = mongoose.model('Kardex', new mongoose.Schema({ nombre_producto: String, cantidad: Number, motivo: String, stock_actual: Number, fecha: { type: Date, default: Date.now } }));


// --- 2. RUTAS DE LA API ---

// Ruta raíz (Salud del servidor)
app.get('/', (req, res) => res.send("🚀 API Simona Operativa"));

/**
 * PRODUCTOS: Cálculo de Stock Real (Inversiones - Ventas)
 */
app.get('/api/productos', async (req, res) => {
    try {
        const productos = await Producto.find().sort({ nombre: 1 });
        const inversiones = await Inversion.find();
        const ventas = await Venta.find();

        const resultado = productos.map(p => {
            const n = (p.nombre || "").toLowerCase().trim();
            
            // Sumar Entradas
            const ent = inversiones
                .filter(i => (i.nombre || "").toLowerCase().trim() === n)
                .reduce((acc, c) => acc + (Number(c.cantidadFormato) * Number(c.unidadesPorFormato) || 0), 0);
            
            // Sumar Salidas (Busca en TODOS los tickets de venta)
            let sal = 0;
            ventas.forEach(v => {
                const lista = v.productos || [];
                const encontrado = lista.find(item => (item.nombre || "").toLowerCase().trim() === n);
                if (encontrado) sal += Number(encontrado.cantidadSeleccionada);
            });

            const base = ent - sal;
            return { 
                ...p._doc, 
                stock_actual: p.unidad_venta === 'UNIDAD' ? base : Math.floor(base / (p.unidades_por_paquete || 1)) 
            };
        });
        res.json(resultado);
    } catch (e) { res.status(500).json([]); }
});

app.post('/api/productos', async (req, res) => {
    const { nombre, precio, unidad_venta, unidades_por_paquete } = req.body;
    const prod = await Producto.findOneAndUpdate({ nombre: new RegExp(`^${nombre}$`, 'i') }, { nombre: nombre.toUpperCase().trim(), precio, unidad_venta, unidades_por_paquete }, { upsert: true, new: true });
    res.json(prod);
});

/**
 * VENTAS Y COBROS (EFECTIVO/YAPE)
 */
app.post('/api/ventas', async (req, res) => {
    try {
        const { items, total, metodoPago } = req.body;
        const nuevaVenta = new Venta({ productos: items, total, metodoPago, fecha: new Date() });
        await nuevaVenta.save();
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

/**
 * FIADOS: Deuda y Dashboard de Clientes
 */
app.post('/api/fiados/masivo', async (req, res) => {
    try {
        const { cliente_id, items, total } = req.body;

        const listaProductos = items.map(it => ({
            producto: it.nombre,
            cantidad: it.cantidadSeleccionada,
            precio: it.precio,
            fecha: new Date()
        }));

        // Actualización Forzada en Clientes (Para tu Dashboard)
        const db = mongoose.connection.db;
        await db.collection('clientes').updateOne(
            { _id: new mongoose.Types.ObjectId(cliente_id) },
            { 
                $inc: { deudaTotal: total },
                $push: { detalles_deuda: { $each: listaProductos } } 
            }
        );

        // Registro de Venta para bajar stock
        await new Venta({ productos: items, total, metodoPago: 'FIADO', fecha: new Date() }).save();

        // Registro de Movimiento para Tickets
        await new MovimientoFiado({
            cliente_id: new mongoose.Types.ObjectId(cliente_id),
            tipo: 'DEUDA', monto: total, productos: listaProductos,
            saldo_al_momento: total, fecha: new Date()
        }).save();

        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.post('/api/fiados/abono', async (req, res) => {
    try {
        const { cliente_id, monto } = req.body;
        const c = await Cliente.findById(cliente_id);
        const nS = c.deudaTotal - monto;

        await new MovimientoFiado({ cliente_id: new mongoose.Types.ObjectId(cliente_id), tipo: 'PAGO', monto, descripcion: 'ABONO EFECTIVO', saldo_al_momento: nS }).save();
        
        if (nS <= 0.1) {
            await Cliente.findByIdAndUpdate(cliente_id, { $set: { deudaTotal: 0, detalles_deuda: [] } });
        } else {
            await Cliente.findByIdAndUpdate(cliente_id, { $set: { deudaTotal: nS } });
        }
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

/**
 * REPORTES: Ganancia Real vs Fiados
 */
app.get('/api/reportes/ventas', async (req, res) => {
    try {
        const { desde, hasta } = req.query;
        const fI = new Date(desde); fI.setHours(0,0,0,0);
        const fF = new Date(hasta); fF.setHours(23,59,59,999);

        const ventas = await Venta.find({ fecha: { $gte: fI, $lte: fF } });
        const abonos = await MovimientoFiado.find({ fecha: { $gte: fI, $lte: fF }, tipo: 'PAGO' });

        const real = ventas.filter(v => v.metodoPago !== 'FIADO').reduce((acc, v) => acc + v.total, 0) + abonos.reduce((acc, a) => acc + a.monto, 0);
        const fiado = ventas.filter(v => v.metodoPago === 'FIADO').reduce((acc, v) => acc + v.total, 0);

        res.json({
            ventas: ventas.map(v => ({ ...v._doc, items: v.productos })),
            abonos,
            totalGananciaReal: real,
            totalFiadoPeriodo: fiado
        });
    } catch (e) { res.status(500).json({ totalGananciaReal: 0 }); }
});

/**
 * CONSULTAS GENERALES
 */
app.get('/api/clientes/deudas', async (req, res) => res.json(await Cliente.find().sort({ nombre: 1 })));

app.post('/api/clientes', async (req, res) => { 
    const n = new Cliente({ nombre: req.body.nombre.toUpperCase(), deudaTotal: 0, detalles_deuda: [] }); 
    await n.save(); res.json(n); 
});

app.get('/api/clientes/:id/movimientos', async (req, res) => {
    res.json(await MovimientoFiado.find({ cliente_id: new mongoose.Types.ObjectId(req.params.id) }).sort({ fecha: -1 }));
});

app.get('/api/nombres-inversiones', async (req, res) => {
    const invs = await Inversion.find();
    const tots = {};
    invs.forEach(i => {
        const n = (i.nombre || "S/N").toUpperCase();
        const unidades = (Number(i.cantidadFormato) * Number(i.unidadesPorFormato)) || 0;
        tots[n] = (tots[n] || 0) + unidades;
    });
    res.json(Object.keys(tots).map(n => ({ nombre: n, total: tots[n] })));
});

app.post('/api/productos/eliminar-masivo', async (req, res) => {
    await Producto.deleteMany({ _id: { $in: req.body.ids } });
    res.json({ success: true });
});

// PUERTO DINÁMICO PARA RENDER
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Servidor en puerto ${PORT}`));