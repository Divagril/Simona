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
    nombre: String, deudaTotal: { type: Number, default: 0 }
}));
const MovimientoFiado = mongoose.model('MovimientoFiado', new mongoose.Schema({
    cliente_id: mongoose.Schema.Types.ObjectId, 
    tipo: String, // 'DEUDA' o 'PAGO'
    monto: Number, 
    descripcion: String, // <--- Asegúrate de que esté esta línea
    saldo_al_momento: Number, 
    fecha: { type: Date, default: Date.now }
}));

const Log = mongoose.model('Log', new mongoose.Schema({
    accion: String, detalle: String, fecha: { type: Date, default: Date.now }
}));

const Kardex = mongoose.model('Kardex', new mongoose.Schema({
    nombre_producto: String, cantidad: Number, motivo: String, stock_anterior: Number, stock_actual: Number, fecha: { type: Date, default: Date.now }
}));

// --- RUTAS ---

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
            { nombre: nombre.toUpperCase(), precio, unidad_venta, unidades_por_paquete: Number(unidades_por_paquete) || 1 },
            { upsert: true, new: true }
        );
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

// --- RUTA: REGISTRAR ABONO (BOTÓN VERDE) ---
app.post('/api/fiados/abono', async (req, res) => {
    try {
        const { cliente_id, monto } = req.body;
        const cliente = await Cliente.findById(cliente_id);
        
        // Calculamos el saldo que queda justo después de este pago
        const saldoDespuesDelPago = cliente.deudaTotal - monto;

        const abono = new MovimientoFiado({
            cliente_id: new mongoose.Types.ObjectId(cliente_id),
            tipo: 'PAGO',
            monto: monto,
            descripcion: 'ABONO EN EFECTIVO',
            saldo_al_momento: saldoDespuesDelPago, // <--- "FOTOGRAFÍA" DEL SALDO
            fecha: new Date()
        });
        await abono.save();

        // Actualizamos al cliente
        await Cliente.findByIdAndUpdate(cliente_id, { deudaTotal: saldoDespuesDelPago });

        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});
app.post('/api/fiados/masivo', async (req, res) => {
    try {
        const { cliente_id, items, total } = req.body;

        // 1. REGISTRAMOS LA VENTA (Esto es lo que hace que el stock baje)
        // Como tu sistema resta 'Ventas' de 'Inversiones', al crear esta venta el stock cae.
        const nuevaVenta = new Venta({
            productos: items,
            total: total,
            metodoPago: 'FIADO', // Lo marcamos como fiado para tus reportes
            fecha: new Date()
        });
        await nuevaVenta.save();

        // 2. BUSCAMOS AL CLIENTE PARA ACTUALIZAR SU DEUDA
        const cliente = await Cliente.findById(cliente_id);
        const nuevoSaldo = (cliente.deudaTotal || 0) + total;

        // 3. CREAMOS EL MOVIMIENTO EN EL HISTORIAL DEL CLIENTE
        const movimiento = new MovimientoFiado({
            cliente_id: new mongoose.Types.ObjectId(cliente_id),
            tipo: 'DEUDA',
            monto: total,
            descripcion: `COMPRA FIADA: ${items.map(i => i.nombre).join(', ')}`,
            saldo_al_momento: nuevoSaldo,
            fecha: new Date()
        });
        await movimiento.save();

        // 4. ACTUALIZAMOS LA DEUDA TOTAL DEL CLIENTE
        await Cliente.findByIdAndUpdate(cliente_id, { deudaTotal: nuevoSaldo });

        res.json({ success: true, message: "Venta registrada y stock descontado" });

    } catch (e) {
        console.error("Error al registrar fiado:", e);
        res.status(500).json({ success: false, error: e.message });
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
        // Agrupamos por nombre y sumamos el campo total_unidades_compradas
        const resumen = await Inversion.aggregate([
            {
                $group: {
                    _id: "$nombre",
                    totalGlobal: { $sum: "$total_unidades_compradas" }
                }
            },
            { $sort: { _id: 1 } }
        ]);
        // Devolvemos objetos con nombre y total
        res.json(resumen.map(r => ({ nombre: r._id, total: r.totalGlobal })));
    } catch (e) { res.json([]); }
});
// En backend/server.js
app.post('/api/ventas', async (req, res) => {
    try {
        const { items, total, metodoPago } = req.body;
        
        // 1. Guardamos la venta
        const nuevaVenta = new Venta({
            productos: items, // Aquí van los productos del carrito
            total: total,
            metodoPago: metodoPago,
            fecha: new Date()
        });
        await nuevaVenta.save();

        // 2. IMPORTANTE: Responder con SUCCESS para que el Frontend sepa que terminó
        res.json({ success: true });

    } catch (e) {
        console.error("Error al cobrar:", e);
        res.status(500).json({ success: false, error: e.message });
    }
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