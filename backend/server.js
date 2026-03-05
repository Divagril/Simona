const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// 1. ESTO DEBE IR PRIMERO QUE TODO PARA QUE NO SALGA "DESCONECTADO"
app.use(cors());
app.use(express.json());

// 2. CONEXIÓN A MONGO
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ DB Conectada"))
    .catch(err => console.error("❌ Error DB:", err));

// --- MODELOS ---
const Producto = mongoose.model('Producto', new mongoose.Schema({ nombre: String, precio: Number, unidad_venta: String, unidades_por_paquete: Number }));
const Inversion = mongoose.model('Inversion', new mongoose.Schema({ nombre: String, cantidadFormato: Number, unidadesPorFormato: Number }));
const Venta = mongoose.model('Venta', new mongoose.Schema({ productos: Array, total: Number, metodoPago: String, fecha: { type: Date, default: Date.now } }));
const Cliente = mongoose.model('Cliente', new mongoose.Schema({ nombre: String, deudaTotal: { type: Number, default: 0 }, detalles_deuda: Array }, { strict: false }));
const MovimientoFiado = mongoose.model('MovimientoFiado', new mongoose.Schema({ cliente_id: mongoose.Schema.Types.ObjectId, tipo: String, monto: Number, productos: Array, fecha: { type: Date, default: Date.now } }));

// --- RUTAS ---

// Ruta de prueba: Abre https://simona-backend.onrender.com en tu navegador
app.get('/', (req, res) => res.send("🚀 API SIMONA ESTÁ VIVA"));

// PRODUCTOS Y STOCK (Lógica corregida)
app.get('/api/productos', async (req, res) => {
    try {
        const prods = await Producto.find().sort({ nombre: 1 });
        const invs = await Inversion.find();
        const vts = await Venta.find();
        const resu = prods.map(p => {
            const n = (p.nombre || "").toLowerCase().trim();
            const e = invs.filter(i => (i.nombre || "").toLowerCase().trim() === n).reduce((acc, c) => acc + (Number(c.cantidadFormato) * Number(c.unidadesPorFormato) || 0), 0);
            let s = 0;
            vts.forEach(v => { (v.productos || []).forEach(it => { if ((it.nombre || "").toLowerCase().trim() === n) s += Number(it.cantidadSeleccionada); }); });
            const base = e - s;
            return { ...p._doc, stock_actual: p.unidad_venta === 'UNIDAD' ? base : Math.floor(base / (p.unidades_por_paquete || 1)) };
        });
        res.json(resu);
    } catch (e) { res.status(500).json([]); }
});

app.post('/api/ventas', async (req, res) => {
    const v = new Venta({ productos: req.body.items, total: req.body.total, metodoPago: req.body.metodoPago });
    await v.save();
    res.json({ success: true });
});

app.post('/api/fiados/masivo', async (req, res) => {
    const { cliente_id, items, total } = req.body;
    await Cliente.findByIdAndUpdate(cliente_id, { $inc: { deudaTotal: total }, $push: { detalles_deuda: { $each: items } } });
    await new Venta({ productos: items, total, metodoPago: 'FIADO' }).save();
    await new MovimientoFiado({ cliente_id: new mongoose.Types.ObjectId(cliente_id), tipo: 'DEUDA', monto: total, productos: items }).save();
    res.json({ success: true });
});

app.get('/api/clientes/deudas', async (req, res) => res.json(await Cliente.find().sort({ nombre: 1 })));
app.get('/api/nombres-inversiones', async (req, res) => {
    const invs = await Inversion.find();
    const tots = {};
    invs.forEach(i => { const n = (i.nombre || "S/N").toUpperCase(); tots[n] = (tots[n] || 0) + (Number(i.cantidadFormato) * Number(i.unidadesPorFormato)); });
    res.json(Object.keys(tots).map(n => ({ nombre: n, total: tots[n] })));
});

// PUERTO RENDER
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Puerto ${PORT}`));