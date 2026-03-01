const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI).then(() => console.log("✅ DB Conectada"));

// --- MODELOS ---
const Producto = mongoose.model('Producto', new mongoose.Schema({
    nombre: String,
    precio: Number,
    cantidad: { type: Number, default: 0 }, // Stock base (siempre en la unidad de compra)
    unidad: String,
    unidades_por_paquete: { type: Number, default: 1 }, // <--- CLAVE: Factor de conversión
    precio_compra: Number
}));

const Inversion = mongoose.model('Inversion', new mongoose.Schema({
    nombre: String, 
    costo_total: Number, 
    cantidad_comprada: Number, 
    unidad_compra: { type: String, default: 'PAQUETE' }, // Guardamos en qué se compró
    fecha: { type: Date, default: Date.now }
}));

const Venta = mongoose.model('Venta', new mongoose.Schema({
    productos: Array, total: Number, fecha: { type: Date, default: Date.now }
}));

// --- RUTAS ---

// 1. Obtener Stock Real calculado
app.get('/api/productos', async (req, res) => {
    const prods = await Producto.find().sort({ nombre: 1 });
    res.json(prods);
});

// 2. Guardar producto con factor de conversión
app.post('/api/productos', async (req, res) => {
    try {
        const { nombre, precio, unidad, unidades_por_paquete } = req.body;
        
        // Buscamos cuánto se ha comprado en Inversiones para este nombre
        const inversiones = await Inversion.find({ nombre: new RegExp(`^${nombre}$`, 'i') });
        const totalComprado = inversiones.reduce((acc, inv) => acc + inv.cantidad_comprada, 0);

        const prod = await Producto.findOneAndUpdate(
            { nombre: new RegExp(`^${nombre}$`, 'i') },
            { 
                nombre, 
                precio, 
                unidad, 
                unidades_por_paquete: Number(unidades_por_paquete) || 1,
                cantidad: totalComprado // Sincronizamos con Inversiones
            },
            { upsert: true, new: true }
        );
        res.json(prod);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/nombres-inversiones', async (req, res) => {
    const nombres = await Inversion.find().distinct('nombre');
    res.json(nombres);
});

// Eliminar masivo
app.post('/api/productos/eliminar-masivo', async (req, res) => {
    await Producto.deleteMany({ _id: { $in: req.body.ids } });
    res.json({ success: true });
});

const PORT = 5000;
app.listen(PORT, () => console.log(`🚀 Server on ${PORT}`));