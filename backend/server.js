const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ Servidor Simona conectado a MongoDB Atlas"))
    .catch(err => console.error("❌ Error DB:", err));

// --- 1. MODELOS DE DATOS (Forzando nombres de tablas) ---

const Producto = mongoose.model('Producto', new mongoose.Schema({
    nombre: String, precio: Number, unidad_venta: String, unidades_por_paquete: Number
}), 'productos');

const Inversion = mongoose.model('Inversion', new mongoose.Schema({
    nombre: String, cantidadFormato: Number, unidadesPorFormato: Number
}), 'inversions');

const Venta = mongoose.model('Venta', new mongoose.Schema({
    productos: Array, total: Number, metodoPago: String, fecha: { type: Date, default: Date.now }
}), 'ventas');

const Cliente = mongoose.model('Cliente', new mongoose.Schema({
    nombre: String, deudaTotal: { type: Number, default: 0 }, detalles_deuda: Array
}, { strict: false }), 'clientes');

const MovimientoFiado = mongoose.model('MovimientoFiado', new mongoose.Schema({
    cliente_id: mongoose.Schema.Types.ObjectId, tipo: String, monto: Number, saldo_al_momento: Number, fecha: { type: Date, default: Date.now }
}), 'movimientofiados');

// ESTOS SON LOS DOS QUE ESTÁN VACÍOS EN TU COMPASS:
const Log = mongoose.model('Log', new mongoose.Schema({
    accion: String, detalle: String, fecha: { type: Date, default: Date.now }
}), 'logs'); // <--- Forzamos nombre 'logs'

const Kardex = mongoose.model('Kardex', new mongoose.Schema({
    nombre_producto: String, cantidad: Number, motivo: String, stock_actual: Number, fecha: { type: Date, default: Date.now }
}), 'kardexes'); // <--- Forzamos nombre 'kardexes'

// --- 2. RUTAS DE SALIDA (PARA TRAER LA INFO) ---

app.get('/api/auditoria', async (req, res) => {
    try {
        const data = await Log.find().sort({ fecha: -1 }).limit(100);
        res.json(data);
    } catch (e) { res.status(500).json([]); }
});

app.get('/api/kardex', async (req, res) => {
    try {
        const data = await Kardex.find().sort({ fecha: -1 }).limit(100);
        res.json(data);
    } catch (e) { res.status(500).json([]); }
});

// --- 3. RUTAS DE ENTRADA (ESTAS ESCRIBEN EN LAS TABLAS) ---

// SINCRONIZAR (INVENTARIO)
app.post('/api/productos', async (req, res) => {
    const { nombre, precio, unidad_venta, unidades_por_paquete } = req.body;
    const prod = await Producto.findOneAndUpdate({ nombre: new RegExp(`^${nombre}$`, 'i') }, { nombre: nombre.toUpperCase(), precio, unidad_venta, unidades_por_paquete }, { upsert: true, new: true });
    
    // GUARDAMOS LOG
    await new Log({ accion: 'SINCRONIZACIÓN', detalle: `Se actualizó el producto ${nombre}` }).save();
    res.json(prod);
});

// COBRAR (POS)
app.post('/api/ventas', async (req, res) => {
    try {
        const { items, total, metodoPago } = req.body;
        const v = new Venta({ productos: items, total, metodoPago });
        await v.save();

        // REGISTRAMOS EN KARDEX CADA PRODUCTO VENDIDO
        for (const it of items) {
            await new Kardex({
                nombre_producto: it.nombre,
                cantidad: -it.cantidadSeleccionada,
                motivo: `VENTA ${metodoPago}`,
                stock_actual: (it.stock_actual || 0) - it.cantidadSeleccionada
            }).save();
        }

        // GUARDAMOS LOG
        await new Log({ accion: 'VENTA', detalle: `Cobro de S/. ${total} realizado.` }).save();
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

// FIADOS (POS)
app.post('/api/fiados/masivo', async (req, res) => {
    try {
        const { cliente_id, items, total } = req.body;
        await Cliente.findByIdAndUpdate(cliente_id, { $inc: { deudaTotal: total }, $push: { detalles_deuda: { $each: items } } });
        await new Venta({ productos: items, total, metodoPago: 'FIADO' }).save();

        // REGISTRAMOS EN KARDEX CADA PRODUCTO FIADO
        for (const it of items) {
            await new Kardex({
                nombre_producto: it.nombre,
                cantidad: -it.cantidadSeleccionada,
                motivo: 'VENTA AL FIADO',
                stock_actual: (it.stock_actual || 0) - it.cantidadSeleccionada
            }).save();
        }

        await new Log({ accion: 'FIADO', detalle: `Se fió un total de S/. ${total}` }).save();
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

// Otras rutas necesarias
app.get('/api/productos', async (req, res) => {
    const p = await Producto.find().sort({ nombre: 1 });
    const inv = await Inversion.find();
    const vts = await Venta.find();
    const resu = p.map(prod => {
        const n = (prod.nombre || "").toLowerCase().trim();
        const e = inv.filter(i => (i.nombre || "").toLowerCase().trim() === n).reduce((acc, c) => acc + (Number(c.cantidadFormato) * Number(c.unidadesPorFormato) || 0), 0);
        let s = 0;
        vts.forEach(v => { (v.productos || []).forEach(it => { if ((it.nombre || "").toLowerCase().trim() === n) s += Number(it.cantidadSeleccionada); }); });
        return { ...prod._doc, stock_actual: prod.unidad_venta === 'UNIDAD' ? e - s : Math.floor((e - s) / (prod.unidades_por_paquete || 1)) };
    });
    res.json(resu);
});

app.get('/api/clientes/deudas', async (req, res) => res.json(await Cliente.find().sort({ nombre: 1 })));
app.get('/api/nombres-inversiones', async (req, res) => {
    const invs = await Inversion.find();
    const tots = {};
    invs.forEach(i => { const n = (i.nombre || "S/N").toUpperCase(); tots[n] = (tots[n] || 0) + (Number(i.cantidadFormato) * Number(i.unidadesPorFormato)); });
    res.json(Object.keys(tots).map(n => ({ nombre: n, total: tots[n] })));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Puerto ${PORT}`));