const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// --- 1. CONFIGURACIÓN INICIAL (PARA EVITAR ERRORES DE CONEXIÓN) ---
app.use(cors());
app.use(express.json());

// --- 2. CONEXIÓN A LA BASE DE DATOS ---
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ Conectado a MongoDB Atlas"))
    .catch(err => console.error("❌ Error de conexión DB:", err));

// --- 3. MODELOS DE DATOS ---
const Producto = mongoose.model('Producto', new mongoose.Schema({
    nombre: String, precio: Number, unidad_venta: String, unidades_por_paquete: Number
}));

const Inversion = mongoose.model('Inversion', new mongoose.Schema({
    nombre: String, formato_compra: String, cantidadFormato: Number, unidadesPorFormato: Number, costoTotal: Number, fecha: { type: Date, default: Date.now }
}));

const Venta = mongoose.model('Venta', new mongoose.Schema({
    productos: Array, total: Number, metodoPago: String, fecha: { type: Date, default: Date.now }
}));

const Cliente = mongoose.model('Cliente', new mongoose.Schema({
    nombre: { type: String, uppercase: true },
    deudaTotal: { type: Number, default: 0 },
    detalles_deuda: { type: Array, default: [] }
}, { strict: false }));

const MovimientoFiado = mongoose.model('MovimientoFiado', new mongoose.Schema({
    cliente_id: mongoose.Schema.Types.ObjectId, tipo: String, monto: Number, descripcion: String, productos: Array, saldo_al_momento: Number, fecha: { type: Date, default: Date.now }
}));

const Log = mongoose.model('Log', new mongoose.Schema({ accion: String, detalle: String, fecha: { type: Date, default: Date.now } }));
const Kardex = mongoose.model('Kardex', new mongoose.Schema({ nombre_producto: String, cantidad: Number, motivo: String, stock_actual: Number, fecha: { type: Date, default: Date.now } }));

// --- 4. RUTAS DE LA API ---

app.get('/', (req, res) => res.send("🚀 API SIMONA OPERATIVA EN RENDER"));

// PRODUCTOS: Cálculo de Stock Real (Corregido)
app.get('/api/productos', async (req, res) => {
    try {
        const productos = await Producto.find().sort({ nombre: 1 });
        const inversiones = await Inversion.find();
        const ventas = await Venta.find();
        const resultado = productos.map(p => {
            const n = (p.nombre || "").toLowerCase().trim();
            const ent = inversiones.filter(i => (i.nombre || "").toLowerCase().trim() === n).reduce((acc, c) => acc + (Number(c.cantidadFormato) * Number(c.unidadesPorFormato) || 0), 0);
            let sal = 0;
            ventas.forEach(v => { (v.productos || []).forEach(it => { if ((it.nombre || "").toLowerCase().trim() === n) sal += Number(it.cantidadSeleccionada); }); });
            const base = ent - sal;
            return { ...p._doc, stock_actual: p.unidad_venta === 'UNIDAD' ? base : Math.floor(base / (p.unidades_por_paquete || 1)) };
        });
        res.json(resultado);
    } catch (e) { res.status(500).json([]); }
});

app.post('/api/productos', async (req, res) => {
    const { nombre, precio, unidad_venta, unidades_por_paquete } = req.body;
    const prod = await Producto.findOneAndUpdate({ nombre: new RegExp(`^${nombre}$`, 'i') }, { nombre: nombre.toUpperCase().trim(), precio, unidad_venta, unidades_por_paquete }, { upsert: true, new: true });
    await new Log({ accion: 'SINCRONIZACIÓN', detalle: `Producto ${nombre} actualizado.` }).save();
    res.json(prod);
});

// REPORTES: Soluciona el error 404 de la captura
app.get('/api/reportes/ventas', async (req, res) => {
    try {
        const { desde, hasta } = req.query;
        const fI = new Date(desde); fI.setHours(0,0,0,0);
        const fF = new Date(hasta); fF.setHours(23,59,59,999);
        const v = await Venta.find({ fecha: { $gte: fI, $lte: fF } });
        const a = await MovimientoFiado.find({ fecha: { $gte: fI, $lte: fF }, tipo: 'PAGO' });
        const real = v.filter(x => x.metodoPago !== 'FIADO').reduce((acc, x) => acc + x.total, 0) + a.reduce((acc, x) => acc + x.monto, 0);
        const fiado = v.filter(x => x.metodoPago === 'FIADO').reduce((acc, x) => acc + x.total, 0);
        res.json({ ventas: v.map(x => ({ ...x._doc, items: x.productos })), abonos: a, totalGananciaReal: real, totalFiadoPeriodo: fiado });
    } catch (e) { res.status(500).json({ ventas: [], abonos: [] }); }
});

// AUDITORÍA Y KARDEX: Soluciona el segundo error 404 de la captura
app.get('/api/auditoria', async (req, res) => {
    const logs = await Log.find().sort({ fecha: -1 }).limit(50);
    res.json(logs);
});

app.get('/api/kardex', async (req, res) => {
    const movs = await Kardex.find().sort({ fecha: -1 }).limit(50);
    res.json(movs);
});

// VENTAS Y FIADOS
app.post('/api/ventas', async (req, res) => {
    const v = new Venta({ productos: req.body.items, total: req.body.total, metodoPago: req.body.metodoPago });
    await v.save();
    for (const it of req.body.items) {
        await new Kardex({ nombre_producto: it.nombre, cantidad: -it.cantidadSeleccionada, motivo: 'VENTA', stock_actual: (it.stock_actual || 0) - it.cantidadSeleccionada }).save();
    }
    await new Log({ accion: 'VENTA', detalle: `Venta cobrada por S/. ${req.body.total}` }).save();
    res.json({ success: true });
});

app.post('/api/fiados/masivo', async (req, res) => {
    const { cliente_id, items, total } = req.body;
    await Cliente.findByIdAndUpdate(cliente_id, { $inc: { deudaTotal: total }, $push: { detalles_deuda: { $each: items } } });
    await new Venta({ productos: items, total, metodoPago: 'FIADO' }).save();
    await new MovimientoFiado({ cliente_id: new mongoose.Types.ObjectId(cliente_id), tipo: 'DEUDA', monto: total, productos: items }).save();
    await new Log({ accion: 'FIADO', detalle: `Nuevo fiado por S/. ${total}` }).save();
    res.json({ success: true });
});
app.post('/api/clientes', async (req, res) => {
    try {
        const { nombre } = req.body;
        
        // Creamos el cliente con los campos que necesita tu Dashboard
        const nuevoCliente = new Cliente({ 
            nombre: nombre.toUpperCase().trim(), 
            deudaTotal: 0,
            detalles_deuda: [] // Inicializamos vacío para que no de error
        });

        await nuevoCliente.save();
        console.log("👤 Nuevo cliente registrado:", nombre);
        
        // Devolvemos el cliente creado para que el frontend lo use de inmediato
        res.json(nuevoCliente); 
    } catch (e) {
        console.error("Error al crear cliente:", e);
        res.status(500).json({ error: "No se pudo registrar el cliente" });
    }
});
app.post('/api/fiados/abono', async (req, res) => {
    try {
        const { cliente_id, monto } = req.body;

        // 1. Buscamos al cliente para saber su deuda actual
        const cliente = await Cliente.findById(cliente_id);
        if (!cliente) return res.status(404).json({ error: "Cliente no encontrado" });

        // 2. Calculamos el nuevo saldo
        const nuevoSaldo = (cliente.deudaTotal || 0) - Number(monto);

        // 3. REGISTRAMOS EL MOVIMIENTO EN 'movimientofiados'
        const abono = new MovimientoFiado({
            cliente_id: new mongoose.Types.ObjectId(cliente_id),
            tipo: 'PAGO',
            monto: Number(monto),
            descripcion: 'ABONO EN EFECTIVO',
            saldo_al_momento: nuevoSaldo,
            fecha: new Date()
        });
        await abono.save();

        // 4. ACTUALIZAMOS LA DEUDA TOTAL EN LA COLECCIÓN 'clientes'
        // Además, si la deuda llega a 0, limpiamos la lista de detalles_deuda
        const updateData = { $set: { deudaTotal: nuevoSaldo } };
        if (nuevoSaldo <= 0.1) {
            updateData.$set.detalles_deuda = [];
            updateData.$set.deudaTotal = 0;
        }
        
        await Cliente.findByIdAndUpdate(cliente_id, updateData);

        console.log(`💰 Pago recibido: S/. ${monto} de ${cliente.nombre}`);
        res.json({ success: true });

    } catch (e) {
        console.error("❌ Error al procesar abono:", e);
        res.status(500).json({ success: false, error: e.message });
    }
});

app.get('/api/clientes/deudas', async (req, res) => res.json(await Cliente.find().sort({ nombre: 1 })));
app.get('/api/nombres-inversiones', async (req, res) => {
    try {
        const invs = await Inversion.find();
        const vts = await Venta.find();
        const resumenStock = {};

        // 1. Sumamos todo lo comprado (Entradas)
        invs.forEach(i => {
            const n = (i.nombre || "S/N").toUpperCase().trim();
            const unidades = (Number(i.cantidadFormato) * Number(i.unidadesPorFormato)) || 0;
            if (!resumenStock[n]) resumenStock[n] = 0;
            resumenStock[n] += unidades;
        });

        // 2. Restamos todo lo vendido (Salidas)
        vts.forEach(v => {
            (v.productos || []).forEach(it => {
                const nVenta = (it.nombre || "").toUpperCase().trim();
                if (resumenStock[nVenta] !== undefined) {
                    resumenStock[nVenta] -= Number(it.cantidadSeleccionada || 0);
                }
            });
        });

        // 3. Formateamos para el Frontend
        // Solo enviamos los que tengan nombre y el total disponible real
        const listaSugerencias = Object.keys(resumenStock).map(nombre => ({
            nombre: nombre,
            total: Math.max(0, resumenStock[nombre]) // No permitimos negativos aquí
        }));

        res.json(listaSugerencias);
    } catch (e) {
        console.error("Error al calcular stock de inversiones:", e);
        res.json([]);
    }
});

app.get('/api/clientes/:id/movimientos', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Buscamos los movimientos usando el ID que viene en la URL
        const movs = await MovimientoFiado.find({ 
            cliente_id: new mongoose.Types.ObjectId(id) 
        }).sort({ fecha: -1 });

        res.json(movs);
    } catch (e) {
        console.error("Error al cargar movimientos:", e);
        res.status(500).json([]);
    }
});


// --- 5. PUERTO DINÁMICO PARA RENDER ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Servidor listo en puerto ${PORT}`));