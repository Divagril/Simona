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
    .then(() => console.log("✅ Conectado a MongoDB Atlas"))
    .catch(err => console.error("❌ Error de conexión:", err));

// --- MODELOS ---
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

// --- RUTAS ---

app.get('/', (req, res) => res.send("🚀 Servidor Simona Online"));

// 1. PRODUCTOS CON STOCK REAL (CORREGIDO)
app.get('/api/productos', async (req, res) => {
    try {
        const productos = await Producto.find().sort({ nombre: 1 });
        const inversiones = await Inversion.find(); // Se define aquí
        const ventas = await Venta.find();           // Se define aquí

        const resultado = productos.map(p => {
            const n = (p.nombre || "").toLowerCase().trim();
            
            // Entradas desde Inversiones
            const ent = inversiones
                .filter(i => (i.nombre || "").toLowerCase().trim() === n)
                .reduce((acc, c) => {
                    const cant = Number(c.cantidadFormato) || 0;
                    const upf = Number(c.unidadesPorFormato) || 1;
                    return acc + (cant * upf);
                }, 0);
            
            // Salidas desde Ventas
            const sal = ventas.reduce((acc, v) => {
                const it = (v.productos || []).find(item => (item.nombre || "").toLowerCase().trim() === n);
                return acc + (it ? Number(it.cantidadSeleccionada) : 0);
            }, 0);

            const base = ent - sal;

            return { 
                ...p._doc, 
                stock_actual: p.unidad_venta === 'UNIDAD' ? base : Math.floor(base / (p.unidades_por_paquete || 1)) 
            };
        });
        res.json(resultado);
    } catch (e) {
        res.status(500).json([]);
    }
});

app.post('/api/productos', async (req, res) => {
    const { nombre, precio, unidad_venta, unidades_por_paquete } = req.body;
    const prod = await Producto.findOneAndUpdate(
        { nombre: new RegExp(`^${nombre}$`, 'i') }, 
        { nombre: nombre.toUpperCase().trim(), precio, unidad_venta, unidades_por_paquete }, 
        { upsert: true, new: true }
    );
    res.json(prod);
});

// 2. VENTAS
app.post('/api/ventas', async (req, res) => {
    try {
        const v = new Venta(req.body);
        await v.save();
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false });
    }
});

// 3. FIADOS Y CLIENTES
app.post('/api/fiados/masivo', async (req, res) => {
    try {
        const { cliente_id, items, total } = req.body;
        const listaDetallada = items.map(it => ({
            nombre: it.nombre,
            cantidad: it.cantidadSeleccionada,
            precio: it.precio,
            fecha: new Date()
        }));

        const db = mongoose.connection.db;
        await db.collection('clientes').updateOne(
            { _id: new mongoose.Types.ObjectId(cliente_id) },
            { 
                $inc: { deudaTotal: total },
                $push: { detalles_deuda: { $each: listaDetallada } } 
            }
        );

        const v = new Venta({ productos: items, total, metodoPago: 'FIADO' });
        await v.save();

        await new MovimientoFiado({
            cliente_id: new mongoose.Types.ObjectId(cliente_id),
            tipo: 'DEUDA', monto: total, productos: listaDetallada,
            saldo_al_momento: total 
        }).save();

        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false });
    }
});

app.get('/api/clientes/deudas', async (req, res) => res.json(await Cliente.find().sort({ nombre: 1 })));

app.post('/api/clientes', async (req, res) => { 
    const n = new Cliente({ nombre: req.body.nombre.toUpperCase(), deudaTotal: 0 }); 
    await n.save(); res.json(n); 
});

app.get('/api/clientes/:id/movimientos', async (req, res) => {
    const m = await MovimientoFiado.find({ cliente_id: new mongoose.Types.ObjectId(req.params.id) }).sort({ fecha: -1 });
    res.json(m);
});

app.get('/api/nombres-inversiones', async (req, res) => {
    try {
        const invs = await Inversion.find();
        const tots = {};
        invs.forEach(i => {
            const n = (i.nombre || "S/N").trim();
            const cantidad = Number(i.cantidadFormato) || 0;
            const unidadesPorF = Number(i.unidadesPorFormato) || 1;
            const totalUnidades = cantidad * unidadesPorF;
            const key = n.toUpperCase();
            if (!tots[key]) tots[key] = { nombreOriginal: n, total: 0 };
            tots[key].total += totalUnidades;
        });
        res.json(Object.values(tots).map(item => ({ nombre: item.nombreOriginal, total: item.total })));
    } catch (e) { res.json([]); }
});

// --- PUERTO DINÁMICO PARA RENDER ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Servidor en puerto ${PORT}`));