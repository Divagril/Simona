const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

// 1. PRIMERO INICIALIZAMOS APP
const app = express();

// 2. LUEGO LOS MIDDLEWARES
app.use(cors());
app.use(express.json());

// 3. CONEXIÓN A MONGO
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ Conectado a MongoDB Atlas"))
    .catch(err => console.error("❌ Error DB:", err));

// --- MODELOS ---
const Producto = mongoose.model('Producto', new mongoose.Schema({
    nombre: String, 
    precio: Number, 
    unidad_venta: String, 
    unidades_por_paquete: { type: Number, default: 1 }
}));

const Inversion = mongoose.model('Inversion', new mongoose.Schema({
    nombre: String, 
    total_unidades_compradas: Number, 
    fecha: { type: Date, default: Date.now }
}));

const Venta = mongoose.model('Venta', new mongoose.Schema({
    productos: Array, total: Number, metodoPago: String, fecha: { type: Date, default: Date.now }
}));

const Cliente = mongoose.model('Cliente', new mongoose.Schema({
    nombre: String,
    deudaTotal: { type: Number, default: 0 },
    // ESTA LÍNEA ES LA QUE HACE QUE APAREZCA EN MONGODB COMPASS
    detalles_deuda: { type: Array, default: [] } 
}));
const MovimientoFiado = mongoose.model('MovimientoFiado', new mongoose.Schema({
    cliente_id: mongoose.Schema.Types.ObjectId,
    tipo: String, 
    monto: Number,
    descripcion: String,
    // ASEGÚRATE DE QUE ESTO ESTÉ EXACTAMENTE ASÍ:
    productos: { type: Array, default: [] }, 
    saldo_al_momento: Number,
    fecha: { type: Date, default: Date.now }
}, { strict: false }));

const Log = mongoose.model('Log', new mongoose.Schema({
    accion: String, detalle: String, fecha: { type: Date, default: Date.now }
}));

const Kardex = mongoose.model('Kardex', new mongoose.Schema({
    nombre_producto: String, cantidad: Number, motivo: String, stock_anterior: Number, stock_actual: Number, fecha: { type: Date, default: Date.now }
}));

const ent = inversiones
    .filter(i => (i.nombre || "").toLowerCase().trim() === n)
    .reduce((acc, c) => {
        const cant = Number(c.cantidadFormato) || 0;
        const upf = Number(c.unidadesPorFormato) || 1;
        return acc + (cant * upf);
    }, 0);

app.get('/', (req, res) => res.send("🚀 Servidor Simona Funcionando"));
app.get('/api/health', (req, res) => res.json({ status: "ok", message: "Servidor Simona Online" }));

// PRODUCTOS CON CÁLCULO DE STOCK REAL (Sincronizado con Inversiones)
app.get('/api/productos', async (req, res) => {
    try {
        const productos = await Producto.find().sort({ nombre: 1 });
        const inversiones = await Inversion.find();
        const ventas = await Venta.find();

        const resultado = productos.map(p => {
            const nombreProd = (p.nombre || "").toLowerCase();

            // Sumamos unidades entrantes de Inversiones
            const entradas = inversiones
                .filter(inv => (inv.nombre || "").toLowerCase() === nombreProd)
                .reduce((acc, curr) => acc + (Number(curr.total_unidades_compradas) || 0), 0);

            // Restamos unidades vendidas
            const salidas = ventas.reduce((acc, v) => {
                const item = v.productos.find(it => (it.nombre || "").toLowerCase() === nombreProd);
                return acc + (item ? Number(item.cantidadSeleccionada) : 0);
            }, 0);

            const stockBase = entradas - salidas;

            return {
                ...p._doc,
                stock_actual: p.unidad_venta === 'UNIDAD' 
                    ? stockBase 
                    : Math.floor(stockBase / (p.unidades_por_paquete || 1)),
                cantidad: p.unidad_venta === 'UNIDAD' 
                    ? stockBase 
                    : Math.floor(stockBase / (p.unidades_por_paquete || 1))
            };
        });
        res.json(resultado);
    } catch (e) { res.status(500).json([]); }
});

app.post('/api/productos', async (req, res) => {
    try {
        const { nombre, precio, unidad_venta, unidades_por_paquete } = req.body;
        
        const prod = await Producto.findOneAndUpdate(
            { nombre: new RegExp(`^${nombre}$`, 'i') },
            { nombre: nombre.toUpperCase(), precio, unidad_venta, unidades_por_paquete },
            { upsert: true, new: true }
        );

        // REGISTRO EN AUDITORÍA
        await new Log({
            accion: 'SINCRONIZACIÓN',
            detalle: `Se configuró el producto ${nombre.toUpperCase()} a S/. ${precio}`
        }).save();

        res.json(prod);
    } catch (e) { res.status(500).json({ error: e.message }); }
});
app.get('/api/clientes/deudas', async (req, res) => {
    try {
        const clientes = await Cliente.find().sort({ nombre: 1 });
        res.json(clientes);
    } catch (e) { res.status(500).json([]); }
});

// 2. CREAR NUEVO CLIENTE (Esta es la que falla al dar "Crear y Fiar")
app.post('/api/clientes', async (req, res) => {
    try {
        const { nombre } = req.body;
        const nuevoCliente = new Cliente({ 
            nombre: nombre.toUpperCase(), 
            deudaTotal: 0 
        });
        await nuevoCliente.save();
        res.json(nuevoCliente); // Devolvemos el cliente creado con su _id
    } catch (e) { res.status(500).json({ error: "No se pudo crear" }); }
});
app.post('/api/fiados/abono', async (req, res) => {
    try {
        const { cliente_id, monto } = req.body;
        const c = await Cliente.findById(cliente_id);
        
        await new MovimientoFiado({
            cliente_id, tipo: 'PAGO', monto,
            descripcion: 'ABONO EN EFECTIVO',
            saldo_al_momento: c.deudaTotal - monto
        }).save();
        
        await Cliente.findByIdAndUpdate(cliente_id, { $inc: { deudaTotal: -monto } });

        await new Log({
            accion: 'ABONO',
            detalle: `El cliente ${c.nombre} pagó S/. ${monto.toFixed(2)} de su deuda.`
        }).save();

        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});
app.post('/api/fiados/masivo', async (req, res) => {
    try {
        const { cliente_id, items, total } = req.body;

        // VERIFICACIÓN EN TERMINAL (Mira tu VS Code cuando des clic en Fiar)
        console.log("📦 PRODUCTOS RECIBIDOS:", items ? items.length : "0");

        // Preparamos el detalle detallado
        const detalleDashboard = items.map(it => ({
            nombre: it.nombre,
            cantidad: it.cantidadSeleccionada,
            precio: it.precio
        }));

        const movimiento = new MovimientoFiado({
            cliente_id: new mongoose.Types.ObjectId(cliente_id),
            tipo: 'DEUDA',
            monto: total,
            descripcion: `COMPRA FIADA: ${items.length} productos`,
            // AQUÍ SE GUARDA LA INFO QUE QUIERES VER:
            productos: detalleDashboard, 
            saldo_al_momento: total, 
            fecha: new Date()
        });

        await movimiento.save();

        // Actualizar deuda del cliente
        await Cliente.findByIdAndUpdate(cliente_id, { $inc: { deudaTotal: total } });
        
        // Guardar venta para stock
        await new Venta({ productos: items, total, metodoPago: 'FIADO' }).save();

        res.json({ success: true });
    } catch (e) {
        console.error("❌ ERROR AL GUARDAR:", e);
        res.status(500).json({ success: false });
    }
});

app.get('/api/clientes/:id/movimientos', async (req, res) => {
    try {
        const movs = await MovimientoFiado.find({ 
            cliente_id: new mongoose.Types.ObjectId(req.params.id) 
        }).sort({ fecha: -1 });
        res.json(movs);
    } catch (e) {
        res.status(500).json([]);
    }
});
app.get('/api/reportes/ventas', async (req, res) => {
    try {
        const { desde, hasta } = req.query;
        if (!desde || !hasta) return res.json({ ventas: [], abonos: [], totalGananciaReal: 0, totalFiadoPeriodo: 0 });

        const fI = new Date(desde); fI.setHours(0,0,0,0);
        const fF = new Date(hasta); fF.setHours(23,59,59,999);

        // 1. Todas las ventas del periodo
        const todasLasVentas = await Venta.find({ fecha: { $gte: fI, $lte: fF } }).sort({ fecha: -1 });

        // 2. Todos los abonos (plata que entró de deudas)
        const todosLosAbonos = await MovimientoFiado.find({ 
            fecha: { $gte: fI, $lte: fF }, 
            tipo: 'PAGO' 
        }).sort({ fecha: -1 });

        // Cálculos
        const ventasEfectivas = todasLasVentas.filter(v => v.metodoPago !== 'FIADO');
        const ventasAlFiado = todasLasVentas.filter(v => v.metodoPago === 'FIADO');

        const ingresoVentas = ventasEfectivas.reduce((acc, v) => acc + (v.total || 0), 0);
        const ingresoAbonos = todosLosAbonos.reduce((acc, a) => acc + (a.monto || 0), 0);
        const totalFiados = ventasAlFiado.reduce((acc, v) => acc + (v.total || 0), 0);

        res.json({
            ventas: todasLasVentas.map(v => ({ ...v._doc, items: v.productos })),
            abonos: todosLosAbonos,
            totalGananciaReal: ingresoVentas + ingresoAbonos, // Plata en mano
            totalFiadoPeriodo: totalFiados // Plata en la calle
        });
    } catch (e) {
        res.status(500).json({ ventas: [], abonos: [], totalGananciaReal: 0, totalFiadoPeriodo: 0 });
    }
});

app.post('/api/clientes', async (req, res) => {
    const nuevo = new Cliente({ nombre: req.body.nombre.toUpperCase() });
    await nuevo.save();
    res.json(nuevo);
});

// AUDITORÍA
app.get('/api/auditoria', async (req, res) => {
    res.json(await Log.find().sort({ fecha: -1 }).limit(50));
});

app.get('/api/kardex', async (req, res) => {
    res.json(await Kardex.find().sort({ fecha: -1 }).limit(50));
});

app.get('/api/nombres-inversiones', async (req, res) => {
    try {
        const invs = await Inversion.find();
        const tots = {};

        invs.forEach(i => {
            // Usamos los nombres de campos de tu imagen de Compass
            const n = (i.nombre || "S/N").trim(); 
            
            // Calculamos: Cantidad (10) * Unidades por formato (1) = 10 unidades
            const cantidad = Number(i.cantidadFormato) || 0;
            const unidadesPorF = Number(i.unidadesPorFormato) || 1;
            const totalUnidades = cantidad * unidadesPorF;

            // Agrupamos por nombre (ignorando mayúsculas/minúsculas)
            const nombreKey = n.toUpperCase();
            if (!tots[nombreKey]) {
                tots[nombreKey] = { nombreOriginal: n, total: 0 };
            }
            tots[nombreKey].total += totalUnidades;
        });

        // Enviamos la lista formateada al frontend
        const respuesta = Object.values(tots).map(item => ({
            nombre: item.nombreOriginal,
            total: item.total
        }));

        res.json(respuesta);
    } catch (e) {
        console.error("Error al calcular inversiones:", e);
        res.json([]);
    }
});

// En backend/server.js
app.post('/api/ventas', async (req, res) => {
    try {
        const { items, total, metodoPago } = req.body;
        const v = new Venta(req.body);
        await v.save();

        // REGISTRO EN KARDEX POR CADA PRODUCTO VENDIDO
        for (const item of items) {
            await new Kardex({
                nombre_producto: item.nombre,
                cantidad: -item.cantidadSeleccionada, // Negativo porque sale del stock
                motivo: `VENTA DIRECTA (${metodoPago})`,
                stock_actual: item.stock_actual - item.cantidadSeleccionada,
                fecha: new Date()
            }).save();
        }

        // LOG GENERAL
        await new Log({
            accion: 'VENTA',
            detalle: `Venta realizada por S/. ${total.toFixed(2)} (${metodoPago})`
        }).save();

        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});


app.delete('/api/clientes/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // 1. Validamos que sea un ID real de MongoDB
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: "ID de cliente no válido" });
        }

        // 2. Buscamos y eliminamos al cliente
        const clienteEliminado = await Cliente.findByIdAndDelete(id);

        if (!clienteEliminado) {
            return res.status(404).json({ error: "El cliente no existe" });
        }

        // 3. BORRADO EN CASCADA: Borramos también todos sus movimientos de fiado
        // Esto evita que queden datos "huérfanos" en la base de datos
        await MovimientoFiado.deleteMany({ cliente_id: new mongoose.Types.ObjectId(id) });

        console.log(`🗑️ Cliente eliminado: ${clienteEliminado.nombre}`);
        
        res.json({ success: true, message: "Cliente y movimientos eliminados" });

    } catch (e) {
        console.error("Error al eliminar cliente:", e);
        res.status(500).json({ success: false, error: e.message });
    }
});

const PORT = process.env.PORT || 5000; 
app.listen(PORT, () => console.log(`🚀 Servidor listo en puerto ${PORT}`));