const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ Servidor Simona CONECTADO a Atlas"))
    .catch(err => console.error("❌ Error de conexión:", err));

// --- 1. MODELOS ---

const Producto = mongoose.model('Producto', new mongoose.Schema({
    nombre: String, 
    precio: Number, 
    unidad_venta: String, 
    unidades_por_paquete: { type: Number, default: 1 }
}));

const Inversion = mongoose.model('Inversion', new mongoose.Schema({
    nombre: String,
    cantidadFormato: Number,
    unidadesPorFormato: Number,
    costoTotal: Number,
    fecha: { type: Date, default: Date.now }
}));

const Venta = mongoose.model('Venta', new mongoose.Schema({
    productos: Array, // [{nombre, cantidadSeleccionada, unidades_por_paquete, subtotal}]
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
    productos: Array,
    saldo_al_momento: Number,
    fecha: { type: Date, default: Date.now }
}));

const Log = mongoose.model('Log', new mongoose.Schema({ accion: String, detalle: String, fecha: { type: Date, default: Date.now } }));
const Kardex = mongoose.model('Kardex', new mongoose.Schema({ nombre_producto: String, cantidad: Number, motivo: String, stock_actual: Number, fecha: { type: Date, default: Date.now } }));

// --- 2. FUNCIÓN MAESTRA DE CÁLCULO (LA QUE ARREGLA TU ERROR) ---

const obtenerUnidadesDisponibles = (nombreProd, inversiones, ventas) => {
    const n = (nombreProd || "").toLowerCase().trim();

    // 1. Calcular Entradas (Todo lo que se compró en facturas)
    const entradas = inversiones
        .filter(i => (i.nombre || "").toLowerCase().trim() === n)
        .reduce((acc, c) => acc + (Number(c.cantidadFormato) * Number(c.unidadesPorFormato) || 0), 0);

    // 2. Calcular Salidas (Todo lo que se ha vendido)
    let salidas = 0;
    ventas.forEach(v => {
        const listaItems = v.productos || [];
        listaItems.forEach(item => {
            if ((item.nombre || "").toLowerCase().trim() === n) {
                // IMPORTANTE: Si se vendió un paquete, restamos las unidades que ese paquete contenía
                // Si vendió por unidad, unidades_por_paquete es 1.
                const factor = Number(item.unidades_por_paquete) || 1;
                salidas += (Number(item.cantidadSeleccionada) * factor);
            }
        });
    });

    return entradas - salidas;
};

// --- 3. RUTAS ---

app.get('/', (req, res) => res.send("🚀 API Simona Online"));

// PRODUCTOS: Catálogo (Derecha)
app.get('/api/productos', async (req, res) => {
    try {
        const productos = await Producto.find().sort({ nombre: 1 });
        const inversiones = await Inversion.find();
        const ventas = await Venta.find();

        const resultado = productos.map(p => {
            const unidadesDisponibles = obtenerUnidadesDisponibles(p.nombre, inversiones, ventas);
            
            return { 
                ...p._doc, 
                stock_actual: p.unidad_venta === 'UNIDAD' 
                    ? unidadesDisponibles 
                    : Math.floor(unidadesDisponibles / (p.unidades_por_paquete || 1)) 
            };
        });
        res.json(resultado);
    } catch (e) { res.status(500).json([]); }
});

// BUSCADOR DE INVERSIONES: Cuadro Naranja (Izquierda)
app.get('/api/nombres-inversiones', async (req, res) => {
    try {
        const inversiones = await Inversion.find();
        const ventas = await Venta.find();
        const nombresUnicos = [...new Set(inversiones.map(i => (i.nombre || "").toUpperCase().trim()))];

        const listaSugerencias = nombresUnicos.map(nombre => {
            // USAMOS LA MISMA FUNCIÓN PARA QUE AMBOS LADOS COINCIDAN
            const stockReal = obtenerUnidadesDisponibles(nombre, inversiones, ventas);
            return {
                nombre: nombre,
                total: Math.max(0, stockReal)
            };
        });

        res.json(listaSugerencias);
    } catch (e) { res.json([]); }
});

// GUARDAR PRODUCTO
app.post('/api/productos', async (req, res) => {
    try {
        const { nombre, precio, unidad_venta, unidades_por_paquete } = req.body;
        const prod = await Producto.findOneAndUpdate(
            { nombre: new RegExp(`^${nombre}$`, 'i') }, 
            { nombre: nombre.toUpperCase().trim(), precio, unidad_venta, unidades_por_paquete }, 
            { upsert: true, new: true }
        );
        res.json(prod);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ELIMINAR MASIVO
app.post('/api/productos/eliminar-masivo', async (req, res) => {
    try {
        await Producto.deleteMany({ _id: { $in: req.body.ids } });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.post('/api/ventas', async (req, res) => {
    try {
        const { items, total, metodoPago } = req.body;

        // 1. Guardamos la venta oficial
        const nuevaVenta = new Venta({
            productos: items,
            total: total,
            metodoPago: metodoPago,
            fecha: new Date()
        });
        await nuevaVenta.save();

        // 2. REGISTRO EN KARDEX (Para la tabla de Auditoría)
        // Recorremos cada producto vendido para generar su movimiento de inventario
        for (const it of items) {
            await new Kardex({
                nombre_producto: it.nombre,
                cantidad: -it.cantidadSeleccionada, // Negativo porque sale stock
                motivo: `VENTA DIRECTA (${metodoPago})`,
                // Calculamos el stock que queda después de esta resta
                stock_actual: (it.stock_actual || 0) - it.cantidadSeleccionada,
                fecha: new Date()
            }).save();
        }

        // 3. REGISTRO EN LOGS (Historial de acciones generales)
        await new Log({
            accion: 'VENTA',
            detalle: `Cobro exitoso de S/. ${total.toFixed(2)} vía ${metodoPago}.`,
            fecha: new Date()
        }).save();

        res.json({ success: true });

    } catch (e) {
        console.error("❌ Error en Ventas:", e);
        res.status(500).json({ success: false, error: e.message });
    }
});
app.post('/api/fiados/masivo', async (req, res) => {
    try {
        const { cliente_id, items, total } = req.body;

        // 1. Preparamos el detalle de productos para tu DASHBOARD de Clientes
        const infoDashboard = items.map(it => ({
            prod: it.nombre,
            cant: it.cantidadSeleccionada,
            precio: it.precio,
            fecha: new Date()
        }));

        // 2. ACTUALIZACIÓN EN LA COLECCIÓN 'CLIENTES' (Para tu otro sistema)
        // Usamos el driver nativo para asegurar que se cree el campo detalles_deuda
        const db = mongoose.connection.db;
        const opResult = await db.collection('clientes').findOneAndUpdate(
            { _id: new mongoose.Types.ObjectId(cliente_id) },
            { 
                $inc: { deudaTotal: total },
                $push: { detalles_deuda: { $each: infoDashboard } } 
            },
            { returnDocument: 'after' }
        );

        // 3. REGISTRAMOS LA VENTA (Para que el Stock Real baje en todo el sistema)
        await new Venta({
            productos: items,
            total: total,
            metodoPago: 'FIADO',
            fecha: new Date()
        }).save();

        // 4. REGISTRO EN KARDEX (Auditoría de inventario)
        for (const it of items) {
            await new Kardex({
                nombre_producto: it.nombre,
                cantidad: -it.cantidadSeleccionada,
                motivo: 'VENTA AL FIADO',
                stock_actual: (it.stock_actual || 0) - it.cantidadSeleccionada,
                fecha: new Date()
            }).save();
        }

        // 5. REGISTRO EN LOGS (Historial de acciones)
        await new Log({
            accion: 'FIADO',
            detalle: `Se otorgó crédito de S/. ${total.toFixed(2)} con ${items.length} productos.`,
            fecha: new Date()
        }).save();

        // 6. Registro en Movimientos (Para los tickets del historial del cliente)
        await new MovimientoFiado({
            cliente_id: new mongoose.Types.ObjectId(cliente_id),
            tipo: 'DEUDA',
            monto: total,
            productos: infoDashboard,
            saldo_al_momento: (opResult.value ? opResult.value.deudaTotal : total),
            fecha: new Date()
        }).save();

        res.json({ success: true });

    } catch (e) {
        console.error("❌ Error en Fiado Masivo:", e);
        res.status(500).json({ success: false, error: e.message });
    }
});

// PAGOS (ABONOS)
app.post('/api/fiados/abono', async (req, res) => {
    try {
        const { cliente_id, monto } = req.body;
        const c = await Cliente.findById(cliente_id);
        const nS = (c.deudaTotal || 0) - monto;
        await new MovimientoFiado({ cliente_id: new mongoose.Types.ObjectId(cliente_id), tipo: 'PAGO', monto, saldo_al_momento: nS }).save();
        if (nS <= 0.1) await Cliente.findByIdAndUpdate(cliente_id, { $set: { deudaTotal: 0, detalles_deuda: [] } });
        else await Cliente.findByIdAndUpdate(cliente_id, { $set: { deudaTotal: nS } });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});
app.get('/api/auditoria', async (req, res) => {
    // Busca los logs reales en la base de datos
    const logs = await Log.find().sort({ fecha: -1 }).limit(100);
    res.json(logs);
});

app.get('/api/kardex', async (req, res) => {
    // Busca los movimientos de inventario reales
    const movimientos = await Kardex.find().sort({ fecha: -1 }).limit(100);
    res.json(movimientos);
});

app.delete('/api/clientes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // 1. Borramos al cliente de la tabla clientes
        await Cliente.findByIdAndDelete(id);
        
        // 2. Borramos todos sus movimientos de la tabla movimientofiados
        await MovimientoFiado.deleteMany({ 
            cliente_id: new mongoose.Types.ObjectId(id) 
        });

        res.json({ success: true, message: "Cliente borrado" });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, error: e.message });
    }
});

// CLIENTES, REPORTES Y AUDITORÍA
app.get('/api/clientes/deudas', async (req, res) => res.json(await Cliente.find().sort({ nombre: 1 })));
app.post('/api/clientes', async (req, res) => { const n = new Cliente({ nombre: req.body.nombre.toUpperCase(), deudaTotal: 0, detalles_deuda: [] }); await n.save(); res.json(n); });
app.get('/api/clientes/:id/movimientos', async (req, res) => res.json(await MovimientoFiado.find({ cliente_id: new mongoose.Types.ObjectId(req.params.id) }).sort({ fecha: -1 })));

app.get('/api/reportes/ventas', async (req, res) => {
    try {
        const { desde, hasta } = req.query;
        if (!desde || !hasta) return res.json({ ventas: [], abonos: [], totalGananciaReal: 0, totalFiadoPeriodo: 0 });

        const fI = new Date(desde); fI.setHours(0,0,0,0);
        const fF = new Date(hasta); fF.setHours(23,59,59,999);

        // 1. Buscamos todas las ventas y abonos del periodo seleccionado
        const ventas = await Venta.find({ fecha: { $gte: fI, $lte: fF } });
        const abonos = await MovimientoFiado.find({ fecha: { $gte: fI, $lte: fF }, tipo: 'PAGO' });

        const totalVentasDirectas = ventas
            .filter(v => v.metodoPago !== 'FIADO')
            .reduce((acc, v) => acc + (Number(v.total) || 0), 0);

        const totalAbonosHoy = abonos.reduce((acc, a) => acc + (Number(a.monto) || 0), 0);

        const totalFiadosEmitidos = ventas
            .filter(v => v.metodoPago === 'FIADO')
            .reduce((acc, v) => acc + (Number(v.total) || 0), 0);
        const dineroRealEnMano = totalVentasDirectas + totalAbonosHoy;

        const saldoPendienteReal = Math.max(0, totalFiadosEmitidos - totalAbonosHoy);

        res.json({
            ventas: ventas.map(v => ({ ...v._doc, items: v.productos })),
            abonos: abonos,
            totalGananciaReal: dineroRealEnMano,
            totalFiadoPeriodo: saldoPendienteReal // <--- AHORA SÍ DISMINUYE
        });

    } catch (e) {
        console.error("Error en reporte:", e);
        res.status(500).json({ totalGananciaReal: 0, totalFiadoPeriodo: 0 });
    }
});
app.get('/api/dashboard/rentabilidad', async (req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    try {
        const db = mongoose.connection.db;
        if (!db) return res.status(503).json({ error: "Conectando a BD..." });

        const { desde, hasta, producto } = req.query;

        // 1. Filtro de Inversiones
        let queryInv = producto ? { nombre: { $regex: new RegExp(producto, 'i') } } : {};

        // 2. Filtro de Ventas (buscando el producto dentro del array)
        let queryVts = {};
        if (producto) {
            queryVts = {
                "productos": { 
                    $elemMatch: { 
                        $or: [
                            { "nombre_producto": { $regex: new RegExp(producto, 'i') } },
                            { "nombre": { $regex: new RegExp(producto, 'i') } }
                        ] 
                    } 
                }
            };
        }

        if (desde || hasta) {
            const f = {};
            if (desde) f.$gte = new Date(desde);
            if (hasta) f.$lte = new Date(hasta);
            queryInv.fecha = f;
            queryVts.fecha = f;
        }

        // 3. Ejecutar consultas
        const [invs, vts, clts] = await Promise.all([
            db.collection('inversions').find(queryInv).toArray().catch(() => []),
            db.collection('ventas').find(queryVts).toArray().catch(() => []),
            db.collection('clientes').find({}).toArray().catch(() => [])
        ]);

        // --- LÓGICA DE CÁLCULO CORREGIDA ---

        const totalInversion = invs.reduce((acc, i) => acc + (Number(i.costoTotal || i.costo_total || 0)), 0);
        
        // Sumar ingresos totales de ventas (solo de los productos filtrados si hay filtro)
        const totalVentas = vts.reduce((acc, v) => {
            if (producto) {
                const subtotal = v.productos
                    .filter(p => new RegExp(producto, 'i').test(p.nombre_producto || p.nombre || ""))
                    .reduce((sum, p) => sum + (Number(p.subtotal || p.precio_total || 0)), 0);
                return acc + subtotal;
            }
            return acc + (Number(v.total || 0));
        }, 0);

        // CORRECCIÓN DE FIADOS:
        let totalFiados = 0;
        if (producto) {
            // Si hay producto, calculamos la deuda solo de las ventas filtradas que fueron fiadas
            totalFiados = vts.reduce((acc, v) => {
                // Si la venta tiene saldo pendiente (fiado)
                const deudaDeEstaVenta = Number(v.total || 0) - Number(v.monto_pagado || v.pagado || 0);
                if (deudaDeEstaVenta > 0) {
                    // Calculamos qué parte de esa deuda le corresponde al producto filtrado
                    const proporcionProducto = v.productos
                        .filter(p => new RegExp(producto, 'i').test(p.nombre_producto || p.nombre || ""))
                        .reduce((sum, p) => sum + (Number(p.subtotal || p.precio_total || 0)), 0);
                    
                    // Si la venta es de 100 y el producto es de 50, se asume que el fiado es proporcional
                    return acc + proporcionProducto; 
                }
                return acc;
            }, 0);
        } else {
            // Si no hay filtro, mostramos la deuda total de todos los clientes (como antes)
            totalFiados = clts.reduce((acc, c) => acc + (Number(c.deudaTotal || 0)), 0);
        }

        res.json({
            inversionTotal: totalInversion,
            ingresosTotalesVentas: totalVentas,
            plataPorCobrar: totalFiados,
            dineroEnCaja: totalVentas - totalFiados,
            gananciaReal: (totalVentas - totalFiados) - totalInversion
        });

    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/auditoria', async (req, res) => res.json(await Log.find().sort({ fecha: -1 }).limit(100)));
app.get('/api/kardex', async (req, res) => res.json(await Kardex.find().sort({ fecha: -1 }).limit(100)));

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Servidor Simona en puerto ${PORT}`));