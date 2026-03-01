const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// --- MIDDLEWARES ---
app.use(cors());
app.use(express.json());

// --- CONEXIÓN A MONGO DB ---
// Asegúrate de que tu .env tenga: MONGO_URI=mongodb+srv://.../sistema_pos_v5
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ Conectado a MongoDB Atlas (Base de datos: sistema_pos_v5)"))
    .catch(err => console.error("❌ Error de conexión:", err));

// --- MODELOS ---

// Modelo para Inventario (Productos)
const Producto = mongoose.model('Producto', new mongoose.Schema({
    codigo_barra: { type: String, default: "" },
    nombre: { type: String, required: true },
    precio: { type: Number, default: 0 },
    cantidad: { type: Number, default: 0 },
    unidad: { type: String, default: 'UNIDAD' }
}));

// Modelo para Compras (Inversiones)
const Inversion = mongoose.model('Inversion', new mongoose.Schema({
    nombre: String,
    costo_total: Number,
    cantidad_comprada: Number,
    costo_unitario: Number,
    fecha: { type: Date, default: Date.now }
}));

// Modelo para Dashboard (Ventas)
const Venta = mongoose.model('Venta', new mongoose.Schema({
    productos: Array,
    total: Number,
    fecha: { type: Date, default: Date.now }
}));

// --- RUTAS ---

// 1. OBTENER NOMBRES ÚNICOS DESDE INVERSIONES (Para el desplegable del Inventario)
app.get('/api/nombres-inversiones', async (req, res) => {
    try {
        console.log("🔍 Buscando nombres en la colección 'inversions'...");
        // distinct('nombre') devuelve un array con los nombres sin repetir
        const nombres = await Inversion.find().distinct('nombre');
        
        console.log("📦 Nombres encontrados en BD:", nombres);
        res.json(nombres);
    } catch (e) {
        console.error("❌ Error en nombres-inversiones:", e);
        res.status(500).json({ error: e.message });
    }
});

// 2. OBTENER PRODUCTOS DEL INVENTARIO
app.get('/api/productos', async (req, res) => {
    try {
        const prods = await Producto.find().sort({ nombre: 1 });
        res.json(prods);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 3. ACTUALIZAR O GUARDAR PRODUCTO EN INVENTARIO
app.post('/api/productos', async (req, res) => {
    try {
        const { nombre, precio, cantidad, unidad } = req.body;
        // Buscamos si ya existe para actualizarlo, si no, lo crea (upsert)
        const prod = await Producto.findOneAndUpdate(
            { nombre: new RegExp(`^${nombre}$`, 'i') },
            { nombre, precio, cantidad, unidad },
            { upsert: true, new: true }
        );
        res.json(prod);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 4. ELIMINAR VARIOS PRODUCTOS A LA VEZ (Masivo)
app.post('/api/productos/eliminar-masivo', async (req, res) => {
    try {
        const { ids } = req.body;
        await Producto.deleteMany({ _id: { $in: ids } });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 5. GUARDAR UNA NUEVA INVERSIÓN (Y actualizar stock automáticamente)
app.post('/api/inversiones', async (req, res) => {
    try {
        const { nombre, costoTotal, cantidad, costoUnid } = req.body;
        
        // Guardar registro de la compra
        const inv = new Inversion({
            nombre, costo_total: costoTotal, cantidad_comprada: cantidad, costo_unitario: costoUnid
        });
        await inv.save();

        // Actualizar stock y costo en la tabla de productos
        await Producto.findOneAndUpdate(
            { nombre: new RegExp(`^${nombre}$`, 'i') },
            { 
                $inc: { cantidad: Number(cantidad) }, 
                $set: { precio_compra: Number(costoUnid) } 
            },
            { upsert: true }
        );

        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 6. OBTENER HISTORIAL DE INVERSIONES
app.get('/api/inversiones', async (req, res) => {
    try {
        const historial = await Inversion.find().sort({ fecha: -1 });
        res.json(historial);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 7. RUTA DASHBOARD: RENTABILIDAD
app.get('/api/dashboard/rentabilidad', async (req, res) => {
    try {
        const ventas = await Venta.find();
        const ingresosTotales = ventas.reduce((acc, v) => acc + v.total, 0);

        const productos = await Producto.find();
        // Costo de inversión = cantidad en stock * costo de compra
        const inversionEnStock = productos.reduce((acc, p) => acc + (p.cantidad * (p.precio_compra || 0)), 0);

        res.json({
            ingresosTotales,
            inversionTotalEnVentas: inversionEnStock,
            gananciaNeta: ingresosTotales - inversionEnStock,
            totalVentas: ventas.length
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- INICIO DEL SERVIDOR ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor listo en puerto ${PORT}`);
    console.log(`👉 Prueba la ruta de nombres aquí: http://localhost:${PORT}/api/nombres-inversiones`);
});