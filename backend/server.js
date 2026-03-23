const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// --- CONFIGURACIÓN DE MIDDLEWARES ---
app.use(cors());
app.use(express.json());

// --- CONEXIÓN A LA BASE DE DATOS MONGODB ---
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log("-----------------------------------------");
        console.log("✅ CONEXIÓN EXITOSA: MongoDB Atlas");
        console.log("📂 BASE DE DATOS: sistema_pos_v5");
        console.log("-----------------------------------------");
    })
    .catch(err => {
        console.error("❌ ERROR CRÍTICO DE CONEXIÓN:", err);
    });

// --- 1. DEFINICIÓN DE MODELOS (SCHEMAS) ---

// MODELO: PRODUCTO (Catálogo de Ventas)
const Producto = mongoose.model('Producto', new mongoose.Schema({
    nombre: { type: String, required: true },
    precio: { type: Number, default: 0 },
    unidad_venta: { type: String, default: 'PAQUETE' },
    unidades_por_paquete: { type: Number, default: 1 }
}));

// MODELO: INVERSION (Registro de compras a proveedores)
const Inversion = mongoose.model('Inversion', new mongoose.Schema({
    nombre: { type: String, required: true },
    formato_compra: String,
    cantidadFormato: { type: Number, default: 0 },
    unidadesPorFormato: { type: Number, default: 0 },
    costoTotal: { type: Number, default: 0 },
    fecha: { type: Date, default: Date.now }
}));

// MODELO: VENTA (Registro de transacciones cerradas)
const Venta = mongoose.model('Venta', new mongoose.Schema({
    productos: Array, // Lista detallada del carrito
    total: { type: Number, required: true },
    metodoPago: String, // 'EFECTIVO', 'YAPE', 'PLIN', 'TARJETA'
    fecha: { type: Date, default: Date.now }
}));

// MODELO: CLIENTE (Ficha de deudores con detalles para Dashboard)
const Cliente = mongoose.model('Cliente', new mongoose.Schema({
    nombre: { type: String, uppercase: true, required: true },
    deudaTotal: { type: Number, default: 0 },
    // Array para que tu otro Dashboard sepa qué productos faltan pagar
    detalles_deuda: { type: Array, default: [] }
}, { strict: false }));

const MovimientoFiado = mongoose.model('MovimientoFiado', new mongoose.Schema({
    cliente_id: mongoose.Schema.Types.ObjectId,
    tipo: String, 
    monto: Number,
    metodoPago: String, // <--- ESTO ES LO QUE FALTA PARA QUE NO SE BORRE
    descripcion: String,
    productos: Array,
    saldo_al_momento: Number,
    fecha: { type: Date, default: Date.now }
}));

// MODELO: LOGS (Auditoría de acciones del usuario)
const Log = mongoose.model('Log', new mongoose.Schema({
    accion: String,
    detalle: String,
    fecha: { type: Date, default: Date.now }
}));

// MODELO: KARDEX (Seguimiento de movimientos físicos de mercadería)
const Kardex = mongoose.model('Kardex', new mongoose.Schema({
    nombre_producto: String,
    cantidad: Number, // Entradas (+) y Salidas (-)
    motivo: String,
    stock_actual: Number,
    fecha: { type: Date, default: Date.now }
}));


// --- 2. RUTAS DE LA API ---

app.get('/', (req, res) => res.send("🚀 Servidor Simona v2.0 Online"));

/**
 * SECCIÓN: GESTIÓN DE PRODUCTOS
 */

// OBTENER PRODUCTOS CON CÁLCULO DE STOCK REAL (Restando ventas de inversiones)
app.get('/api/productos', async (req, res) => {
    try {
        const productos = await Producto.find().sort({ nombre: 1 });
        const inversiones = await Inversion.find();
        const ventas = await Venta.find();

        const resultado = productos.map(p => {
            const n = (p.nombre || "").toLowerCase().trim();
            
            // Calculamos todo lo que entró por facturas
            const ent = inversiones
                .filter(i => (i.nombre || "").toLowerCase().trim() === n)
                .reduce((acc, c) => acc + (Number(c.cantidadFormato) * Number(c.unidadesPorFormato) || 0), 0);
            
            // Calculamos todo lo que salió (Ventas normales y fiados)
            let sal = 0;
            ventas.forEach(v => {
                (v.productos || []).forEach(it => {
                    if ((it.nombre || "").toLowerCase().trim() === n) {
                        sal += Number(it.cantidadSeleccionada);
                    }
                });
            });

            const base = ent - sal;

            return { 
                ...p._doc, 
                stock_actual: p.unidad_venta === 'UNIDAD' ? base : Math.floor(base / (p.unidades_por_paquete || 1)) 
            };
        });
        res.json(resultado);
    } catch (e) {
        console.error("Error al procesar stock:", e);
        res.status(500).json([]);
    }
});

// SINCRONIZAR O CREAR PRODUCTO DESDE EL INVENTARIO
app.post('/api/productos', async (req, res) => {
    try {
        const { nombre, precio, unidad_venta, unidades_por_paquete } = req.body;
        const prod = await Producto.findOneAndUpdate(
            { nombre: new RegExp(`^${nombre}$`, 'i') }, 
            { nombre: nombre.toUpperCase().trim(), precio, unidad_venta, unidades_por_paquete }, 
            { upsert: true, new: true }
        );

        await new Log({ accion: 'SINCRONIZACIÓN', detalle: `Se configuró catálogo para ${nombre.toUpperCase()}` }).save();
        res.json(prod);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// MULTI-ELIMINACIÓN DE PRODUCTOS
app.post('/api/productos/eliminar-masivo', async (req, res) => {
    try {
        const { ids } = req.body;
        await Producto.deleteMany({ _id: { $in: ids } });
        await new Log({ accion: 'ELIMINACIÓN', detalle: `Se borraron ${ids.length} productos del catálogo.` }).save();
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false });
    }
});

// BUSCADOR DE INVERSIONES (Muestra stock restante de facturas)
app.get('/api/nombres-inversiones', async (req, res) => {
    try {
        const invs = await Inversion.find();
        const vts = await Venta.find();
        const tots = {};

        invs.forEach(i => {
            const n = (i.nombre || "S/N").toUpperCase().trim();
            const unidades = (Number(i.cantidadFormato) * Number(i.unidadesPorFormato)) || 0;
            if (!tots[n]) tots[n] = 0;
            tots[n] += unidades;
        });

        vts.forEach(v => {
            (v.productos || []).forEach(it => {
                const nV = (it.nombre || "").toUpperCase().trim();
                if (tots[nV] !== undefined) tots[nV] -= Number(it.cantidadSeleccionada);
            });
        });

        const lista = Object.keys(tots).map(nombre => ({
            nombre: nombre,
            total: Math.max(0, tots[nombre])
        }));

        res.json(lista);
    } catch (e) {
        res.json([]);
    }
});

/**
 * SECCIÓN: VENTAS Y CAJA
 */

// REGISTRAR COBRO NORMAL (Efectivo/Yape/Tarjeta)
app.post('/api/ventas', async (req, res) => {
    try {
        const { items, total, metodoPago } = req.body;
        const v = new Venta({ productos: items, total, metodoPago, fecha: new Date() });
        await v.save();

        // Registro en Kardex para cada producto
        for (const it of items) {
            await new Kardex({
                nombre_producto: it.nombre,
                cantidad: -it.cantidadSeleccionada,
                motivo: `VENTA ${metodoPago}`,
                stock_actual: (it.stock_actual || 0) - it.cantidadSeleccionada
            }).save();
        }

        await new Log({ accion: 'VENTA', detalle: `Venta cobrada: S/. ${total} (${metodoPago})` }).save();
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false });
    }
});

app.get('/api/reportes/ventas', async (req, res) => {
    try {
        const { desde, hasta } = req.query;
        if (!desde || !hasta) return res.json({ ventas: [], abonos: [], totalGananciaReal: 0, totalFiadoPeriodo: 0 });

        const fI = new Date(desde); fI.setHours(0,0,0,0);
        const fF = new Date(hasta); fF.setHours(23,59,59,999);

        // 1. Obtener todas las ventas y abonos del periodo
        const vts = await Venta.find({ fecha: { $gte: fI, $lte: fF } });
        const abs = await MovimientoFiado.find({ fecha: { $gte: fI, $lte: fF }, tipo: 'PAGO' });

        // 2. DINERO EN CAJA: Ventas (Efectivo/Yape/Plin) + Abonos recibidos
        const ingresosVentasReales = vts
            .filter(v => v.metodoPago !== 'FIADO')
            .reduce((acc, v) => acc + (Number(v.total) || 0), 0);
        
        const ingresosPorAbonos = abs.reduce((acc, a) => acc + (Number(a.monto) || 0), 0);

        // 3. POR COBRAR: Sumamos la deuda actual de TODOS los clientes en la base de datos
        // Esto asegura que el número siempre sea real, sin importar las fechas
        const todosLosClientes = await Cliente.find();
        const deudaGlobalActual = todosLosClientes.reduce((acc, c) => acc + (Number(c.deudaTotal) || 0), 0);

        res.json({
            ventas: vts.map(x => ({ ...x._doc, items: x.productos })),
            abonos: abs,
            totalGananciaReal: ingresosVentasReales + ingresosPorAbonos, // Dinero que de verdad tienes
            totalFiadoPeriodo: deudaGlobalActual // Lo que te deben todos hoy
        });
    } catch (e) {
        console.error("Error en reporte:", e);
        res.status(500).json({ totalGananciaReal: 0, totalFiadoPeriodo: 0 });
    }
});

app.get('/api/clientes/deudas', async (req, res) => res.json(await Cliente.find().sort({ nombre: 1 })));

app.post('/api/clientes', async (req, res) => {
    try {
        const n = new Cliente({ nombre: req.body.nombre.toUpperCase(), deudaTotal: 0, detalles_deuda: [] });
        await n.save();
        res.json(n);
    } catch (e) { res.status(500).json({ error: "Error al crear cliente" }); }
});

app.delete('/api/clientes/:id', async (req, res) => {
    try {
        await Cliente.findByIdAndDelete(req.params.id);
        await MovimientoFiado.deleteMany({ cliente_id: new mongoose.Types.ObjectId(req.params.id) });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.get('/api/clientes/:id/movimientos', async (req, res) => {
    try {
        const m = await MovimientoFiado.find({ cliente_id: new mongoose.Types.ObjectId(req.params.id) }).sort({ fecha: -1 });
        res.json(m);
    } catch (e) { res.status(500).json([]); }
});

// REGISTRO DE FIADO (Inyección en Cliente y descuento de Stock)
app.post('/api/fiados/masivo', async (req, res) => {
    try {
        const { cliente_id, items, total } = req.body;
        const c = await Cliente.findById(cliente_id);
        if (!c) return res.status(404).json({ error: "No existe el cliente" });

        const nS = (c.deudaTotal || 0) + total;
        const infoProd = items.map(it => ({ 
            nombre: it.nombre, 
            cant: it.cantidadSeleccionada, 
            precio: it.precio, 
            fecha: new Date() 
        }));

        // Inyectamos productos en la colección Clientes para tu Dashboard externo
        await Cliente.findByIdAndUpdate(cliente_id, { 
            $inc: { deudaTotal: total }, 
            $push: { detalles_deuda: { $each: infoProd } } 
        });

        // Guardamos como venta para stock
        await new Venta({ productos: items, total, metodoPago: 'FIADO' }).save();

        // Registro en historial de movimientos
        await new MovimientoFiado({
            cliente_id: new mongoose.Types.ObjectId(cliente_id),
            tipo: 'DEUDA', monto: total, productos: infoProd, saldo_al_momento: nS, metodoPago: 'FIADO'
        }).save();

        // Kardex
        for (const it of items) {
            await new Kardex({ nombre_producto: it.nombre, cantidad: -it.cantidadSeleccionada, motivo: 'VENTA AL FIADO', stock_actual: (it.stock_actual || 0) - it.cantidadSeleccionada }).save();
        }

        res.json({ success: true });
    } catch (e) {
        console.error("Error al procesar fiado:", e);
        res.status(500).json({ success: false });
    }
});

app.post('/api/fiados/abono', async (req, res) => {
    try {
        const { cliente_id, monto, metodoPago } = req.body; 
        const c = await Cliente.findById(cliente_id);
        if (!c) return res.status(404).json({ error: "Cliente no encontrado" });

        const deudaActual = Number(c.deudaTotal) || 0;
        const montoEntregado = Number(monto);

        // --- LÓGICA DE VUELTO INTELIGENTE ---
        // Si me dan 12 por una deuda de 1, el ingreso real es 1.
        const montoRealIngreso = montoEntregado > deudaActual ? deudaActual : montoEntregado;
        const vueltoEntregado = montoEntregado > deudaActual ? montoEntregado - deudaActual : 0;

        // El nuevo saldo siempre será 0 si el monto es mayor o igual a la deuda
        const nuevoSaldo = montoEntregado >= deudaActual ? 0 : deudaActual - montoEntregado;

        // 1. Actualizamos al cliente
        await Cliente.findByIdAndUpdate(cliente_id, { 
            $set: { 
                deudaTotal: nuevoSaldo,
                detalles_deuda: nuevoSaldo === 0 ? [] : c.detalles_deuda // Limpia productos si pagó todo
            } 
        });

        // 2. Registramos el abono con el MONTO REAL que entra a caja (montoRealIngreso)
        const abono = new MovimientoFiado({
            cliente_id: new mongoose.Types.ObjectId(cliente_id),
            tipo: 'PAGO',
            monto: montoRealIngreso, // Solo guardamos lo que NO es vuelto
            metodoPago: metodoPago,
            descripcion: vueltoEntregado > 0 ? `PAGO CON VUELTO (Recibió: ${montoEntregado}, Vuelto: ${vueltoEntregado})` : 'ABONO A CUENTA',
            saldo_al_momento: nuevoSaldo,
            fecha: new Date()
        });
        await abono.save();

        res.json({ 
            success: true, 
            vuelto: vueltoEntregado, 
            ingresoCaja: montoRealIngreso 
        });

    } catch (e) {
        res.status(500).json({ success: false });
    }
});

app.get('/api/auditoria', async (req, res) => res.json(await Log.find().sort({ fecha: -1 }).limit(100)));
app.get('/api/kardex', async (req, res) => res.json(await Kardex.find().sort({ fecha: -1 }).limit(100)));


// --- ARRANQUE DEL SERVIDOR ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
    console.log("-----------------------------------------");
    console.log(`🚀 SERVIDOR SIMONA CORRIENDO EN PUERTO ${PORT}`);
    console.log("⌚ FECHA DEL SISTEMA:", new Date().toLocaleString());
    console.log("-----------------------------------------");
});