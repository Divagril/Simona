const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ DB Conectada"))
    .catch(err => console.error("❌ Error DB:", err));

// --- MODELOS ---
const Producto = mongoose.model('Producto', new mongoose.Schema({ nombre: String, precio: Number, unidad_venta: String, unidades_por_paquete: Number }));
const Inversion = mongoose.model('Inversion', new mongoose.Schema({ nombre: String, cantidadFormato: Number, unidadesPorFormato: Number }));
const Venta = mongoose.model('Venta', new mongoose.Schema({ productos: Array, total: Number, metodoPago: String, fecha: Date }));
const Cliente = mongoose.model('Cliente', new mongoose.Schema({ nombre: String, deudaTotal: Number, detalles_deuda: Array }, { strict: false }));
const MovimientoFiado = mongoose.model('MovimientoFiado', new mongoose.Schema({ cliente_id: mongoose.Schema.Types.ObjectId, tipo: String, monto: Number, productos: Array, saldo_al_momento: Number, fecha: { type: Date, default: Date.now } }));

// --- RUTAS ---

app.get('/', (req, res) => res.send("🚀 API Activa"));

// PRODUCTOS
app.get('/api/productos', async (req, res) => {
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
});

// CLIENTES: OBTENER, CREAR Y ELIMINAR (CORREGIDO)
app.get('/api/clientes/deudas', async (req, res) => res.json(await Cliente.find().sort({ nombre: 1 })));

app.post('/api/clientes', async (req, res) => {
    const n = new Cliente({ nombre: req.body.nombre.toUpperCase(), deudaTotal: 0, detalles_deuda: [] });
    await n.save();
    res.json(n);
});

// ESTA ES LA RUTA QUE TE DABA EL ERROR 404
app.delete('/api/clientes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await Cliente.findByIdAndDelete(id);
        // Borramos también sus movimientos para no dejar basura
        await MovimientoFiado.deleteMany({ cliente_id: new mongoose.Types.ObjectId(id) });
        res.json({ success: true, message: "Cliente eliminado" });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

app.get('/api/clientes/:id/movimientos', async (req, res) => {
    const m = await MovimientoFiado.find({ cliente_id: new mongoose.Types.ObjectId(req.params.id) }).sort({ fecha: -1 });
    res.json(m);
});

// FIADOS Y PAGOS
app.post('/api/fiados/masivo', async (req, res) => {
    const { cliente_id, items, total } = req.body;
    const c = await Cliente.findById(cliente_id);
    const nS = (c.deudaTotal || 0) + total;
    await Cliente.findByIdAndUpdate(cliente_id, { $inc: { deudaTotal: total }, $push: { detalles_deuda: { $each: items } } });
    await new Venta({ productos: items, total, metodoPago: 'FIADO' }).save();
    await new MovimientoFiado({ cliente_id: new mongoose.Types.ObjectId(cliente_id), tipo: 'DEUDA', monto: total, productos: items, saldo_al_momento: nS }).save();
    res.json({ success: true });
});

app.post('/api/fiados/abono', async (req, res) => {
    const { cliente_id, monto } = req.body;
    const c = await Cliente.findById(cliente_id);
    const nS = (c.deudaTotal || 0) - monto;
    await new MovimientoFiado({ cliente_id: new mongoose.Types.ObjectId(cliente_id), tipo: 'PAGO', monto, saldo_al_momento: nS }).save();
    if (nS <= 0.1) await Cliente.findByIdAndUpdate(cliente_id, { $set: { deudaTotal: 0, detalles_deuda: [] } });
    else await Cliente.findByIdAndUpdate(cliente_id, { $set: { deudaTotal: nS } });
    res.json({ success: true });
});

// REPORTES Y OTROS
app.get('/api/reportes/ventas', async (req, res) => {
    const { desde, hasta } = req.query;
    const fI = new Date(desde); fI.setHours(0,0,0,0);
    const fF = new Date(hasta); fF.setHours(23,59,59,999);
    const v = await Venta.find({ fecha: { $gte: fI, $lte: fF } });
    const a = await MovimientoFiado.find({ fecha: { $gte: fI, $lte: fF }, tipo: 'PAGO' });
    const real = v.filter(x => x.metodoPago !== 'FIADO').reduce((acc, x) => acc + x.total, 0) + a.reduce((acc, x) => acc + x.monto, 0);
    res.json({ ventas: v.map(x => ({ ...x._doc, items: x.productos })), abonos: a, totalGananciaReal: real, totalFiadoPeriodo: v.filter(x => x.metodoPago === 'FIADO').reduce((acc, x) => acc + x.total, 0) });
});

app.get('/api/nombres-inversiones', async (req, res) => {
    const invs = await Inversion.find();
    const tots = {};
    invs.forEach(i => { const n = (i.nombre || "S/N").toUpperCase(); tots[n] = (tots[n] || 0) + (Number(i.cantidadFormato) * Number(i.unidadesPorFormato)); });
    res.json(Object.keys(tots).map(n => ({ nombre: n, total: tots[n] })));
});

app.get('/api/auditoria', async (req, res) => res.json([]));
app.get('/api/kardex', async (req, res) => res.json([]));

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Puerto ${PORT}`));