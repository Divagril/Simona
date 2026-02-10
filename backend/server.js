// backend/server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// --- CONEXIÓN A MONGODB ---
// Usamos la URI de tu archivo .env
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Conectado a MongoDB Atlas'))
  .catch(err => console.error('❌ Error de conexión:', err));

// --- MODELOS DE DATOS ---

const Auditoria = mongoose.model('Auditoria', new mongoose.Schema({
  fecha: { type: Date, default: Date.now },
  accion: String,
  detalle: String
}));

const MovimientoInventario = mongoose.model('MovimientoInventario', new mongoose.Schema({
  producto_id: mongoose.Schema.Types.ObjectId,
  nombre_producto: String,
  tipo: { type: String, enum: ['ENTRADA', 'SALIDA'] }, 
  motivo: String, // VENTA, AJUSTE MANUAL, REGISTRO
  cantidad: Number,
  stock_anterior: Number,
  stock_actual: Number,
  fecha: { type: Date, default: Date.now }
}));

const Producto = mongoose.model('Producto', new mongoose.Schema({
  codigo_barra: String,
  nombre: String,
  precio: Number,
  cantidad: Number, // Este es el STOCK ACTUAL
  unidad: String
}));

const Venta = mongoose.model('Venta', new mongoose.Schema({
  fecha: { type: Date, default: Date.now },
  items: Array,
  total: Number,
  metodoPago: String,
  pagoCon: Number,
  vuelto: Number
}));

const Cliente = mongoose.model('Cliente', new mongoose.Schema({ 
    nombre: String, 
    telefono: String 
}));

const Fiado = mongoose.model('Fiado', new mongoose.Schema({
  cliente_id: mongoose.Schema.Types.ObjectId,
  descripcion: String,
  monto: Number,
  fecha: { type: Date, default: Date.now },
  tipo: { type: String, enum: ['DEUDA', 'PAGO'], default: 'DEUDA' }
}));

// --- FUNCIONES AYUDANTES (LOGS Y KARDEX) ---

const logAudit = async (accion, detalle) => {
  try { await new Auditoria({ accion, detalle }).save(); } catch (e) { console.log(e); }
};

const registrarKardex = async (prodId, nombre, tipo, motivo, cant, anterior, actual) => {
  try {
    await new MovimientoInventario({
      producto_id: prodId,
      nombre_producto: nombre,
      tipo,
      motivo,
      cantidad: cant,
      stock_anterior: anterior,
      stock_actual: actual
    }).save();
  } catch (e) { console.log("Error Kardex:", e); }
};


app.get('/api/kardex', async (req, res) => {
  try {
    const movimientos = await MovimientoInventario.find().sort({ fecha: -1 }).limit(50);
    res.json(movimientos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/auditoria', async (req, res) => {
  try {
    const logs = await Auditoria.find().sort({ fecha: -1 }).limit(50);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/', (req, res) => {
  res.send('🚀 Servidor de Tienda Simona funcionando correctamente');
});

// 2. PRODUCTOS
app.get('/api/productos', async (req, res) => {
  const prods = await Producto.find().sort({ nombre: 1 });
  res.json(prods);
});

app.post('/api/productos', async (req, res) => {
  try {
    const nuevoProd = new Producto(req.body);
    await nuevoProd.save();
    if (nuevoProd.cantidad > 0) {
      await registrarKardex(nuevoProd._id, nuevoProd.nombre, 'ENTRADA', 'REGISTRO INICIAL', nuevoProd.cantidad, 0, nuevoProd.cantidad);
    }
    await logAudit("CREAR_PRODUCTO", `Se creó: ${nuevoProd.nombre}`);
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.put('/api/productos/:id', async (req, res) => {
  try {
    const prodAnterior = await Producto.findById(req.params.id);
    const stockAnterior = prodAnterior.cantidad;
    const stockNuevo = Number(req.body.cantidad);

    if (stockAnterior !== stockNuevo) {
      const diff = stockNuevo - stockAnterior;
      await registrarKardex(prodAnterior._id, prodAnterior.nombre, diff > 0 ? 'ENTRADA' : 'SALIDA', 'AJUSTE MANUAL', Math.abs(diff), stockAnterior, stockNuevo);
    }

    await Producto.findByIdAndUpdate(req.params.id, req.body);
    await logAudit("EDITAR_PRODUCTO", `Se editó: ${req.body.nombre}`);
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.delete('/api/productos/:id', async (req, res) => {
  try {
    const prod = await Producto.findById(req.params.id);
    await Producto.findByIdAndDelete(req.params.id);
    await logAudit("ELIMINAR_PRODUCTO", `Se eliminó: ${prod.nombre}`);
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// 3. VENTAS (POS)
app.post('/api/ventas', async (req, res) => {
  const { items, total, metodoPago, pagoCon, vuelto } = req.body;
  try {
    const nuevaVenta = new Venta({ items, total, metodoPago, pagoCon, vuelto });
    await nuevaVenta.save();

    for (const item of items) {
      if (!item.esManual && item._id) {
        const prod = await Producto.findById(item._id);
        const stockAnt = prod.cantidad;
        const stockAct = stockAnt - item.cantidadSeleccionada;
        await registrarKardex(prod._id, prod.nombre, 'SALIDA', 'VENTA', item.cantidadSeleccionada, stockAnt, stockAct);
        await Producto.findByIdAndUpdate(item._id, { cantidad: stockAct });
      }
    }
    await logAudit("VENTA", `Venta de S/. ${total} via ${metodoPago}`);
    res.json({ success: true });
  } catch (error) { res.status(500).json({ success: false }); }
});

// 4. CLIENTES Y FIADOS
app.get('/api/clientes/deudas', async (req, res) => {
  try {
    const clientes = await Cliente.find().sort({ nombre: 1 }).lean();
    const clientesConDeuda = await Promise.all(clientes.map(async (c) => {
      const movs = await Fiado.find({ cliente_id: c._id });
      const balance = movs.reduce((acc, m) => m.tipo === 'DEUDA' ? acc + m.monto : acc - m.monto, 0);
      return { ...c, deudaTotal: balance < 0 ? 0 : balance };
    }));
    res.json(clientesConDeuda);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/clientes', async (req, res) => {
    try {
      const { nombre } = req.body;
      const existe = await Cliente.findOne({ nombre: { $regex: new RegExp(`^${nombre}$`, 'i') } });
      if (existe) return res.status(400).json({ message: "Ya existe" });
      
      const nuevo = new Cliente(req.body);
      await nuevo.save();
      await logAudit("NUEVO_CLIENTE", `Se registró a: ${nuevo.nombre}`);
      res.json(nuevo);
    } catch (e) { res.status(500).json({error: e.message}); }
});

app.delete('/api/clientes/:id', async (req, res) => {
  await Cliente.findByIdAndDelete(req.params.id);
  await Fiado.deleteMany({ cliente_id: req.params.id });
  res.json({ success: true });
});

app.get('/api/clientes/:id/movimientos', async (req, res) => {
  const movs = await Fiado.find({ cliente_id: req.params.id }).sort({ fecha: -1 });
  res.json(movs);
});

app.post('/api/fiados/masivo', async (req, res) => {
  const { cliente_id, items, total } = req.body;
  try {
    for (const item of items) {
      await new Fiado({
        cliente_id,
        descripcion: `${item.nombre} (x${item.cantidadSeleccionada})`,
        monto: item.subtotal,
        tipo: 'DEUDA'
      }).save();

      if (!item.esManual && item._id) {
        const prod = await Producto.findById(item._id);
        const stockAnt = prod.cantidad;
        const stockAct = stockAnt - item.cantidadSeleccionada;
        await registrarKardex(prod._id, prod.nombre, 'SALIDA', 'FIADO', item.cantidadSeleccionada, stockAnt, stockAct);
        await Producto.findByIdAndUpdate(item._id, { cantidad: stockAct });
      }
    }
    await logAudit("FIADO", `Monto total: S/. ${total}`);
    res.json({ success: true });
  } catch (error) { res.status(500).json({ success: false }); }
});

app.post('/api/fiados/abono', async (req, res) => {
  const { cliente_id, monto } = req.body;
  await new Fiado({ cliente_id, monto, descripcion: "ABONO DE CUENTA", tipo: 'PAGO' }).save();
  await logAudit("ABONO_CLIENTE", `Monto: S/. ${monto}`);
  res.json({ success: true });
});

// 5. REPORTES
app.get('/api/reportes/ventas', async (req, res) => {
  const { desde, hasta, categoria } = req.query;
  let filtro = { fecha: { $gte: new Date(desde), $lte: new Date(new Date(hasta).setHours(23,59,59)) } };
  if (categoria !== 'TODAS') filtro["items.categoria"] = categoria;
  const ventas = await Venta.find(filtro).sort({ fecha: -1 });
  res.json(ventas);
});

app.get('/api/reportes/stats', async (req, res) => {
  const inicioMes = new Date(); inicioMes.setDate(1); inicioMes.setHours(0,0,0,0);
  const stats = await Venta.aggregate([
    { $match: { fecha: { $gte: inicioMes } } },
    { $group: { _id: { $week: "$fecha" }, total: { $sum: "$total" } } },
    { $sort: { "_id": 1 } }
  ]);
  res.json(stats.map(s => ({ semana: `Semana ${s._id}`, total: s.total })));
});

// --- INICIO ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Servidor corriendo en puerto ${PORT}`));

app.use(cors());