const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ MongoDB Conectado"))
    .catch(err => console.error("❌ Error de conexión:", err));

// --- MODELOS ---
const Producto = mongoose.model('Producto', new mongoose.Schema({
    nombre: String, precio: Number, cantidad: Number, unidad: String, precio_compra: Number
}));

const Venta = mongoose.model('Venta', new mongoose.Schema({
    productos: Array, total: Number, metodoPago: String, fecha: { type: Date, default: Date.now }
}));

// MODELO DE CLIENTES (Lo que faltaba)
const Cliente = mongoose.model('Cliente', new mongoose.Schema({
    nombre: { type: String, required: true },
    deudaTotal: { type: Number, default: 0 }
}));

// MODELO DE MOVIMIENTOS/FIADOS
const Movimiento = mongoose.model('Movimiento', new mongoose.Schema({
    cliente_id: mongoose.Schema.Types.ObjectId,
    tipo: String, // 'DEUDA' o 'PAGO'
    monto: Number,
    descripcion: String,
    fecha: { type: Date, default: Date.now }
}));

// --- RUTAS ---

// 1. Productos
app.get('/api/productos', async (req, res) => {
    const prods = await Producto.find().sort({ nombre: 1 });
    res.json(prods);
});

// 2. Ventas (Cobrar en efectivo/yape)
app.post('/api/ventas', async (req, res) => {
    try {
        const { items, total, metodoPago } = req.body;
        const v = new Venta({ productos: items, total, metodoPago });
        await v.save();
        for (const it of items) {
            if (it._id && !it._id.toString().startsWith('MANUAL')) {
                await Producto.findByIdAndUpdate(it._id, { $inc: { cantidad: -Number(it.cantidadSeleccionada) } });
            }
        }
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

// 3. Clientes - Obtener todos con su deuda
app.get('/api/clientes/deudas', async (req, res) => {
    const clientes = await Cliente.find().sort({ nombre: 1 });
    res.json(clientes);
});

// 4. Clientes - CREAR NUEVO (Esta es la ruta que te daba error)
app.post('/api/clientes', async (req, res) => {
    try {
        const { nombre } = req.body;
        const nuevoCliente = new Cliente({ nombre, deudaTotal: 0 });
        await nuevoCliente.save();
        res.json(nuevoCliente);
    } catch (e) { res.status(500).json({ error: "Error al crear cliente" }); }
});

// 5. Fiados - Registrar compra al fiado
app.post('/api/fiados/masivo', async (req, res) => {
    try {
        const { cliente_id, items, total } = req.body;
        
        // Registrar el movimiento de deuda
        const mov = new Movimiento({
            cliente_id, tipo: 'DEUDA', monto: total, descripcion: 'Compra al fiado'
        });
        await mov.save();

        // Aumentar deuda del cliente
        await Cliente.findByIdAndUpdate(cliente_id, { $inc: { deudaTotal: total } });

        // Descontar stock
        for (const it of items) {
            if (it._id && !it._id.toString().startsWith('MANUAL')) {
                await Producto.findByIdAndUpdate(it._id, { $inc: { cantidad: -Number(it.cantidadSeleccionada) } });
            }
        }
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Servidor en puerto ${PORT}`));