const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// --- MIDDLEWARES ---
app.use(cors());
app.use(express.json());

// --- CONEXIÓN A BASE DE DATOS ---
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ Conectado a MongoDB Atlas"))
    .catch(err => console.error("❌ Error de conexión:", err));

// --- MODELOS ---
const Producto = mongoose.model('Producto', new mongoose.Schema({
    nombre: String,
    precio: Number,
    unidad_venta: String,
    unidades_por_paquete: { type: Number, default: 1 }
}));

const Inversion = mongoose.model('Inversion', new mongoose.Schema({
    nombre: String,
    formato_compra: String,
    cantidadFormato: Number,
    unidadesPorFormato: Number,
    costoTotal: Number,
    fecha: { type: Date, default: Date.now }
}));

const Venta = mongoose.model('Venta', new mongoose.Schema({
    productos: Array,
    total: Number,
    metodoPago: String,
    fecha: { type: Date, default: Date.now }
}));

const Cliente = mongoose.model('Cliente', new mongoose.Schema({
    nombre: { type: String, uppercase: true },
    deudaTotal: { type: Number, default: 0 },
    detalles_deuda: { type: Array, default: [] }
}, { strict: false }));

const MovimientoFiado = mongoose.model('MovimientoFiado', new mongoose.Schema({
    cliente_id: mongoose.Schema.Types.ObjectId,
    tipo: String,
    monto: Number,
    descripcion: String,
    productos: Array,
    saldo_al_momento: Number,
    fecha: { type: Date, default: Date.now }
}));

// --- RUTAS ---

app.get('/', (req, res) => res.send("🚀 Servidor Simona Online"));
app.post('/api/ventas', async (req, res) => {
    try {
        const { items, total, metodoPago } = req.body;

        // Guardamos la venta asegurando que el campo se llame 'productos'
        const nuevaVenta = new Venta({
            productos: items, // <--- IMPORTANTE: Sincronizado con la lógica de stock
            total: total,
            metodoPago: metodoPago,
            fecha: new Date()
        });
        await nuevaVenta.save();

        console.log(`💰 Venta registrada: S/. ${total} (${metodoPago})`);
        res.json({ success: true });
    } catch (e) {
        console.error("Error al cobrar:", e);
        res.status(500).json({ success: false });
    }
});
app.get('/api/reportes/ventas', async (req, res) => {
    try {
        const { desde, hasta } = req.query;
        if (!desde || !hasta) return res.json({ ventas: [], abonos: [], totalGananciaReal: 0, totalFiadoPeriodo: 0 });

        const fI = new Date(desde); fI.setHours(0,0,0,0);
        const fF = new Date(hasta); fF.setHours(23,59,59,999);

        // 1. Buscamos todas las ventas del periodo
        const todasLasVentas = await Venta.find({ fecha: { $gte: fI, $lte: fF } }).sort({ fecha: -1 });

        // 2. Buscamos todos los abonos (plata que entró de deudas)
        const todosLosAbonos = await MovimientoFiado.find({ 
            fecha: { $gte: fI, $lte: fF }, 
            tipo: 'PAGO' 
        }).sort({ fecha: -1 });

        // --- CÁLCULOS DE PLATA ---
        
        // Ventas reales = Todo lo que NO sea fiado
        const ventasEfectivas = todasLasVentas.filter(v => v.metodoPago !== 'FIADO');
        // Ventas al fiado = Solo lo que se anotó en la cuenta
        const ventasAlFiado = todasLasVentas.filter(v => v.metodoPago === 'FIADO');

        const ingresoVentas = ventasEfectivas.reduce((acc, v) => acc + (Number(v.total) || 0), 0);
        const ingresoAbonos = todosLosAbonos.reduce((acc, a) => acc + (Number(a.monto) || 0), 0);
        const totalFiados = ventasAlFiado.reduce((acc, v) => acc + (Number(v.total) || 0), 0);

        // Enviamos la respuesta con la estructura exacta que pide el Frontend
        res.json({
            ventas: todasLasVentas.map(v => ({ ...v._doc, items: v.productos })),
            abonos: todosLosAbonos,
            totalGananciaReal: ingresoVentas + ingresoAbonos, // Plata física en mano
            totalFiadoPeriodo: totalFiados // Valor de lo que se prestó
        });

    } catch (e) {
        console.error("❌ Error en reporte:", e);
        res.status(500).json({ ventas: [], abonos: [], totalGananciaReal: 0, totalFiadoPeriodo: 0 });
    }
});
// --- 2. MOTOR DE CÁLCULO DE STOCK (REFORZADO) ---
app.get('/api/productos', async (req, res) => {
    try {
        const productos = await Producto.find().sort({ nombre: 1 });
        const inversiones = await Inversion.find();
        const ventas = await Venta.find();

        const resultado = productos.map(p => {
            const n = (p.nombre || "").toLowerCase().trim();
            
            // Sumar Entradas
            const ent = inversiones
                .filter(i => (i.nombre || "").toLowerCase().trim() === n)
                .reduce((acc, c) => acc + (Number(c.cantidadFormato) * Number(c.unidadesPorFormato) || 0), 0);
            
            // Sumar Salidas (Busca en TODOS los tickets de venta)
            let sal = 0;
            ventas.forEach(v => {
                const lista = v.productos || [];
                const encontrado = lista.find(item => (item.nombre || "").toLowerCase().trim() === n);
                if (encontrado) {
                    sal += Number(encontrado.cantidadSeleccionada);
                }
            });

            const base = ent - sal;
            return { 
                ...p._doc, 
                stock_actual: p.unidad_venta === 'UNIDAD' ? base : Math.floor(base / (p.unidades_por_paquete || 1)) 
            };
        });
        res.json(resultado);
    } catch (e) { res.status(500).json([]); }
});

app.post('/api/productos', async (req, res) => {
    const { nombre, precio, unidad_venta, unidades_por_paquete } = req.body;
    const prod = await Producto.findOneAndUpdate(
        { nombre: new RegExp(`^${nombre}$`, 'i') }, 
        { nombre: nombre.toUpperCase().trim(), precio, unidad_venta, unidades_por_paquete }, 
        { upsert: true, new: true }
    );
    res.json(prod);
});


// 3. FIADOS Y CLIENTES
app.post('/api/fiados/masivo', async (req, res) => {
    try {
        const { cliente_id, items, total } = req.body;
        const listaDetallada = items.map(it => ({
            nombre: it.nombre,
            cantidad: it.cantidadSeleccionada,
            precio: it.precio,
            fecha: new Date()
        }));

        const db = mongoose.connection.db;
        await db.collection('clientes').updateOne(
            { _id: new mongoose.Types.ObjectId(cliente_id) },
            { 
                $inc: { deudaTotal: total },
                $push: { detalles_deuda: { $each: listaDetallada } } 
            }
        );

        const v = new Venta({ productos: items, total, metodoPago: 'FIADO' });
        await v.save();

        await new MovimientoFiado({
            cliente_id: new mongoose.Types.ObjectId(cliente_id),
            tipo: 'DEUDA', monto: total, productos: listaDetallada,
            saldo_al_momento: total 
        }).save();

        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false });
    }
});

app.get('/api/clientes/deudas', async (req, res) => res.json(await Cliente.find().sort({ nombre: 1 })));

app.post('/api/clientes', async (req, res) => { 
    const n = new Cliente({ nombre: req.body.nombre.toUpperCase(), deudaTotal: 0 }); 
    await n.save(); res.json(n); 
});
app.post('/api/productos/eliminar-masivo', async (req, res) => {
    try {
        const { ids } = req.body; // Recibe la lista de IDs [1, 2, 3...]

        if (!ids || ids.length === 0) {
            return res.status(400).json({ success: false, message: "No hay IDs" });
        }

        // COMANDO DE MONGO: Borra todos los que coincidan con la lista
        await Producto.deleteMany({ _id: { $in: ids } });

        console.log(`🗑️ Se eliminaron ${ids.length} productos.`);
        res.json({ success: true });
        
    } catch (e) {
        console.error("Error al eliminar masivo:", e);
        res.status(500).json({ success: false, error: e.message });
    }
});

app.get('/api/clientes/:id/movimientos', async (req, res) => {
    const m = await MovimientoFiado.find({ cliente_id: new mongoose.Types.ObjectId(req.params.id) }).sort({ fecha: -1 });
    res.json(m);
});

app.get('/api/nombres-inversiones', async (req, res) => {
    try {
        const invs = await Inversion.find();
        const tots = {};
        invs.forEach(i => {
            const n = (i.nombre || "S/N").trim();
            const cantidad = Number(i.cantidadFormato) || 0;
            const unidadesPorF = Number(i.unidadesPorFormato) || 1;
            const totalUnidades = cantidad * unidadesPorF;
            const key = n.toUpperCase();
            if (!tots[key]) tots[key] = { nombreOriginal: n, total: 0 };
            tots[key].total += totalUnidades;
        });
        res.json(Object.values(tots).map(item => ({ nombre: item.nombreOriginal, total: item.total })));
    } catch (e) { res.json([]); }
});

// --- PUERTO DINÁMICO PARA RENDER ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Servidor en puerto ${PORT}`));