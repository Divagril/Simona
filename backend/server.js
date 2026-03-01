const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ Conectado a MongoDB Atlas"))
    .catch(err => console.error("❌ Error:", err));

// --- MODELOS ---

const Producto = mongoose.model('Producto', new mongoose.Schema({
    nombre: { type: String, required: true },
    precio: { type: Number, default: 0 },
    unidad_venta: { type: String, default: 'PAQUETE' }, // 'PAQUETE' o 'UNIDAD'
    unidades_por_paquete: { type: Number, default: 1 }
}));

const Inversion = mongoose.model('Inversion', new mongoose.Schema({
    nombre: String,
    cantidad_comprada: Number, // Cantidad en paquetes
    fecha: { type: Date, default: Date.now }
}));

const Venta = mongoose.model('Venta', new mongoose.Schema({
    productos: Array, total: Number, metodoPago: String, fecha: { type: Date, default: Date.now }
}));

const Cliente = mongoose.model('Cliente', new mongoose.Schema({
    nombre: String, deudaTotal: { type: Number, default: 0 }
}));

const MovimientoFiado = mongoose.model('MovimientoFiado', new mongoose.Schema({
    cliente_id: mongoose.Schema.Types.ObjectId, tipo: String, monto: Number, saldo_al_momento: Number, fecha: { type: Date, default: Date.now }
}));

// --- RUTAS ---

// 1. OBTENER PRODUCTOS CON STOCK REAL SINCRONIZADO
app.get('/api/productos', async (req, res) => {
    try {
        const productos = await Producto.find().sort({ nombre: 1 });
        const inversiones = await Inversion.find();

        // Calculamos el stock sumando inversiones para cada producto
        const resultado = productos.map(p => {
            const totalPaquetes = inversiones
                .filter(inv => inv.nombre && inv.nombre.toLowerCase() === p.nombre.toLowerCase())
                .reduce((acc, curr) => acc + (curr.cantidad_comprada || 0), 0);

            return {
                ...p._doc,
                stock_base: totalPaquetes, // Cuántos paquetes hay
                // Stock final depende de si vende por unidad o paquete
                stock_actual: p.unidad_venta === 'UNIDAD' 
                    ? (totalPaquetes * p.unidades_por_paquete) 
                    : totalPaquetes
            };
        });

        res.json(resultado);
    } catch (e) { res.status(500).json([]); }
});

// 2. ACTUALIZAR CONFIGURACIÓN DE PRODUCTO
app.post('/api/productos', async (req, res) => {
    try {
        const { nombre, precio, unidad_venta, unidades_por_paquete } = req.body;
        const prod = await Producto.findOneAndUpdate(
            { nombre: new RegExp(`^${nombre}$`, 'i') },
            { 
                nombre: nombre.toUpperCase(), 
                precio, 
                unidad_venta, 
                unidades_por_paquete: Number(unidades_por_paquete) || 1 
            },
            { upsert: true, new: true }
        );
        res.json(prod);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 3. NOMBRES DESDE INVERSIONES
app.get('/api/nombres-inversiones', async (req, res) => {
    try {
        const nombres = await Inversion.find().distinct('nombre');
        res.json(nombres.filter(n => n)); // Filtra nombres nulos
    } catch (e) { res.json([]); }
});

// 4. VENTAS
app.post('/api/ventas', async (req, res) => {
    try {
        const { items, total, metodoPago } = req.body;
        const v = new Venta({ productos: items, total, metodoPago });
        await v.save();
        // Nota: El descuento de stock aquí debería restar de la colección Inversion 
        // o manejar un inventario de salidas. Por ahora guardamos la venta.
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

// 5. CLIENTES Y OTROS (MANTENER)
app.get('/api/clientes/deudas', async (req, res) => {
    const c = await Cliente.find().sort({ nombre: 1 });
    res.json(c);
});

app.post('/api/fiados/abono', async (req, res) => {
    const { cliente_id, monto } = req.body;
    const c = await Cliente.findById(cliente_id);
    const nS = c.deudaTotal - monto;
    await new MovimientoFiado({ cliente_id, tipo: 'PAGO', monto, saldo_al_momento: nS }).save();
    await Cliente.findByIdAndUpdate(cliente_id, { $inc: { deudaTotal: -monto } });
    res.json({ success: true });
});

app.post('/api/productos/eliminar-masivo', async (req, res) => {
    await Producto.deleteMany({ _id: { $in: req.body.ids } });
    res.json({ success: true });
});

app.get('/api/reportes/ventas', async (req, res) => {
    const { desde, hasta } = req.query;
    const fI = new Date(desde); fI.setHours(0,0,0,0);
    const fF = new Date(hasta); fF.setHours(23,59,59,999);
    const ventas = await Venta.find({ fecha: { $gte: fI, $lte: fF } }).sort({ fecha: -1 });
    res.json(ventas.map(v => ({ ...v._doc, items: v.productos })));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Servidor listo en ${PORT}`));