const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// --- CONEXIÓN A MONGODB ---
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ Conectado a MongoDB Atlas"))
    .catch(err => console.error("❌ Error de conexión:", err));

// --- MODELOS ---
const Producto = mongoose.model('Producto', new mongoose.Schema({
    nombre: { type: String, required: true },
    precio: { type: Number, default: 0 },
    unidad_venta: { type: String, default: 'PAQUETE' },
    unidades_por_paquete: { type: Number, default: 1 }
}));

const Inversion = mongoose.model('Inversion', new mongoose.Schema({
    nombre: String,
    cantidad_comprada: Number,
    fecha: { type: Date, default: Date.now }
}));

const Venta = mongoose.model('Venta', new mongoose.Schema({
    productos: Array, total: Number, metodoPago: String, fecha: { type: Date, default: Date.now }
}));

const Cliente = mongoose.model('Cliente', new mongoose.Schema({
    nombre: String, deudaTotal: { type: Number, default: 0 }
}));

const MovimientoFiado = mongoose.model('MovimientoFiado', new mongoose.Schema({
    cliente_id: mongoose.Schema.Types.ObjectId, 
    tipo: String, // 'DEUDA' o 'PAGO'
    monto: Number, 
    descripcion: String,
    saldo_al_momento: Number, 
    fecha: { type: Date, default: Date.now }
}));

// --- RUTAS ---

// Ruta de prueba para saber si el servidor está vivo
app.get('/', (req, res) => res.send("🚀 Servidor de Simona Funcionando"));

// 1. PRODUCTOS
app.get('/api/productos', async (req, res) => {
    try {
        const productos = await Producto.find().sort({ nombre: 1 });
        const inversiones = await Inversion.find();
        const resultado = productos.map(p => {
            const totalPaquetes = inversiones
                .filter(inv => inv.nombre && inv.nombre.toLowerCase() === p.nombre.toLowerCase())
                .reduce((acc, curr) => acc + (curr.cantidad_comprada || 0), 0);
            return {
                ...p._doc,
                stock_actual: p.unidad_venta === 'UNIDAD' 
                    ? (totalPaquetes * p.unidades_por_paquete) 
                    : totalPaquetes,
                cantidad: p.unidad_venta === 'UNIDAD' 
                    ? (totalPaquetes * p.unidades_por_paquete) 
                    : totalPaquetes
            };
        });
        res.json(resultado);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/productos', async (req, res) => {
    try {
        const { nombre, precio, unidad_venta, unidades_por_paquete } = req.body;
        const prod = await Producto.findOneAndUpdate(
            { nombre: new RegExp(`^${nombre}$`, 'i') },
            { nombre: nombre.toUpperCase(), precio, unidad_venta, unidades_por_paquete: Number(unidades_por_paquete) || 1 },
            { upsert: true, new: true }
        );
        res.json(prod);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 2. CLIENTES
app.get('/api/clientes/deudas', async (req, res) => {
    const c = await Cliente.find().sort({ nombre: 1 });
    res.json(c);
});

app.post('/api/clientes', async (req, res) => {
    const nuevo = new Cliente({ nombre: req.body.nombre.toUpperCase(), deudaTotal: 0 });
    await nuevo.save();
    res.json(nuevo);
});

app.delete('/api/clientes/:id', async (req, res) => {
    await Cliente.findByIdAndDelete(req.params.id);
    res.json({ success: true });
});

// 3. MOVIMIENTOS Y FIADOS
app.get('/api/clientes/:id/movimientos', async (req, res) => {
    const movs = await MovimientoFiado.find({ cliente_id: req.params.id }).sort({ fecha: -1 });
    res.json(movs);
});

app.post('/api/fiados/abono', async (req, res) => {
    const { cliente_id, monto } = req.body;
    const c = await Cliente.findById(cliente_id);
    const nS = c.deudaTotal - monto;
    await new MovimientoFiado({ 
        cliente_id, tipo: 'PAGO', monto, 
        descripcion: 'ABONO EN EFECTIVO', saldo_al_momento: nS 
    }).save();
    await Cliente.findByIdAndUpdate(cliente_id, { $inc: { deudaTotal: -monto } });
    res.json({ success: true });
});

app.post('/api/fiados/masivo', async (req, res) => {
    const { cliente_id, total } = req.body;
    const c = await Cliente.findById(cliente_id);
    const nS = (c.deudaTotal || 0) + total;
    await new MovimientoFiado({ 
        cliente_id, tipo: 'DEUDA', monto: total, 
        descripcion: 'COMPRA AL FIADO', saldo_al_momento: nS 
    }).save();
    await Cliente.findByIdAndUpdate(cliente_id, { $inc: { deudaTotal: total } });
    res.json({ success: true });
});

// 4. VENTAS Y REPORTES
app.post('/api/ventas', async (req, res) => {
    const v = new Venta(req.body);
    await v.save();
    res.json({ success: true });
});

app.get('/api/reportes/ventas', async (req, res) => {
    const { desde, hasta } = req.query;
    const fI = new Date(desde); fI.setHours(0,0,0,0);
    const fF = new Date(hasta); fF.setHours(23,59,59,999);
    const ventas = await Venta.find({ fecha: { $gte: fI, $lte: fF } }).sort({ fecha: -1 });
    res.json(ventas.map(v => ({ ...v._doc, items: v.productos })));
});

app.get('/api/nombres-inversiones', async (req, res) => {
    const nombres = await Inversion.find().distinct('nombre');
    res.json(nombres.filter(n => n));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Servidor listo en puerto ${PORT}`));