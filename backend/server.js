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
const Venta = mongoose.model('Venta', new mongoose.Schema({ productos: Array, total: Number, metodoPago: String, fecha: { type: Date, default: Date.now } }));
const Cliente = mongoose.model('Cliente', new mongoose.Schema({ nombre: String, deudaTotal: { type: Number, default: 0 }, detalles_deuda: Array }, { strict: false }));
const MovimientoFiado = mongoose.model('MovimientoFiado', new mongoose.Schema({ cliente_id: mongoose.Schema.Types.ObjectId, tipo: String, monto: Number, productos: Array, saldo_al_momento: Number, fecha: { type: Date, default: Date.now } }));

// MODELOS DE AUDITORÍA (Asegúrate de que existan estos dos)
const Log = mongoose.model('Log', new mongoose.Schema({ accion: String, detalle: String, fecha: { type: Date, default: Date.now } }));
const Kardex = mongoose.model('Kardex', new mongoose.Schema({ nombre_producto: String, cantidad: Number, motivo: String, stock_actual: Number, fecha: { type: Date, default: Date.now } }));

// --- RUTAS ---

app.get('/', (req, res) => res.send("🚀 API Activa"));

// PRODUCTOS Y STOCK
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

// AUDITORÍA Y KARDEX (CORREGIDO: Ahora busca datos reales)
app.get('/api/auditoria', async (req, res) => {
    const logs = await Log.find().sort({ fecha: -1 }).limit(100);
    res.json(logs);
});

app.get('/api/kardex', async (req, res) => {
    const movs = await Kardex.find().sort({ fecha: -1 }).limit(100);
    res.json(movs);
});

// REGISTRAR VENTA (Con disparador de Auditoría)
app.post('/api/ventas', async (req, res) => {
    try {
        const { items, total, metodoPago } = req.body;
        const v = new Venta({ productos: items, total, metodoPago });
        await v.save();

        // Guardamos en el Kardex cada producto vendido
        for (const it of items) {
            await new Kardex({
                nombre_producto: it.nombre,
                cantidad: -it.cantidadSeleccionada, // Negativo porque sale
                motivo: `VENTA ${metodoPago}`,
                stock_actual: (it.stock_actual || 0) - it.cantidadSeleccionada
            }).save();
        }

        await new Log({ accion: 'VENTA', detalle: `Venta realizada por S/. ${total} (${metodoPago})` }).save();
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

// REGISTRAR FIADO (Con disparador de Auditoría)
app.post('/api/fiados/masivo', async (req, res) => {
    try {
        const { cliente_id, items, total } = req.body;
        const c = await Cliente.findById(cliente_id);
        const nS = (c.deudaTotal || 0) + total;

        await Cliente.findByIdAndUpdate(cliente_id, { $inc: { deudaTotal: total }, $push: { detalles_deuda: { $each: items } } });
        await new Venta({ productos: items, total, metodoPago: 'FIADO' }).save();
        
        for (const it of items) {
            await new Kardex({
                nombre_producto: it.nombre,
                cantidad: -it.cantidadSeleccionada,
                motivo: `FIADO A ${c.nombre}`,
                stock_actual: (it.stock_actual || 0) - it.cantidadSeleccionada
            }).save();
        }

        await new MovimientoFiado({ cliente_id: new mongoose.Types.ObjectId(cliente_id), tipo: 'DEUDA', monto: total, productos: items, saldo_al_momento: nS }).save();
        await new Log({ accion: 'FIADO', detalle: `Nuevo crédito a ${c.nombre} por S/. ${total}` }).save();
        
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

// CLIENTES Y OTROS
app.get('/api/clientes/deudas', async (req, res) => res.json(await Cliente.find().sort({ nombre: 1 })));
app.get('/api/nombres-inversiones', async (req, res) => {
    const invs = await Inversion.find();
    const tots = {};
    invs.forEach(i => { const n = (i.nombre || "S/N").toUpperCase(); tots[n] = (tots[n] || 0) + (Number(i.cantidadFormato) * Number(i.unidadesPorFormato)); });
    res.json(Object.keys(tots).map(n => ({ nombre: n, total: tots[n] })));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Puerto ${PORT}`));