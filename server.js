const express    = require('express');
const Database   = require('better-sqlite3');
const bcrypt     = require('bcryptjs');
const jwt        = require('jsonwebtoken');
const cors       = require('cors');
const path       = require('path');
const multer     = require('multer');
const fs         = require('fs');

const app    = express();
const db     = new Database(path.join(__dirname, 'ffstore.db'));
const SECRET = 'ffstore_secret_2025_jwt';

// Carpeta para comprobantes
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename:    (req, file, cb) => cb(null, Date.now() + '_' + file.originalname.replace(/\s/g,'_'))
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));
app.use('/uploads', express.static(uploadsDir));

// ══════════════════════════════════════
//  INICIALIZAR BASE DE DATOS
// ══════════════════════════════════════
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    username  TEXT    UNIQUE NOT NULL,
    email     TEXT    UNIQUE NOT NULL,
    password  TEXT    NOT NULL,
    role      TEXT    DEFAULT 'user',
    created   TEXT    DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS orders (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    order_num    TEXT    UNIQUE NOT NULL,
    user_id      INTEGER NOT NULL,
    username     TEXT    NOT NULL,
    product      TEXT    NOT NULL,
    uid          TEXT    NOT NULL,
    total        TEXT    NOT NULL,
    status       TEXT    DEFAULT 'pending',
    comprobante  TEXT    DEFAULT NULL,
    nro_op       TEXT    DEFAULT NULL,
    date         TEXT    DEFAULT (datetime('now','localtime')),
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`);
// Migrar tabla vieja si no tiene columna comprobante
try { db.exec("ALTER TABLE orders ADD COLUMN comprobante TEXT DEFAULT NULL"); } catch {}
try { db.exec("ALTER TABLE orders ADD COLUMN nro_op TEXT DEFAULT NULL"); } catch {}

// Crear admin por defecto si no existe
const adminExists = db.prepare("SELECT id FROM users WHERE username = 'admin'").get();
if (!adminExists) {
  const hash = bcrypt.hashSync('ffstore2025', 10);
  db.prepare("INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)").run('admin', 'admin@ffstore.com', hash, 'admin');
  console.log('✅ Admin creado: admin / ffstore2025');
}

// ══════════════════════════════════════
//  MIDDLEWARE JWT
// ══════════════════════════════════════
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token requerido' });
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido' });
  }
}

function adminMiddleware(req, res, next) {
  authMiddleware(req, res, () => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acceso denegado' });
    next();
  });
}

// ══════════════════════════════════════
//  AUTH ROUTES
// ══════════════════════════════════════

// REGISTRO
app.post('/api/register', (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password)
    return res.status(400).json({ error: 'Todos los campos son requeridos' });
  if (password.length < 6)
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
  if (!email.includes('@'))
    return res.status(400).json({ error: 'Email inválido' });

  const exists = db.prepare("SELECT id FROM users WHERE username = ? OR email = ?").get(username, email);
  if (exists) return res.status(409).json({ error: 'Usuario o email ya registrado' });

  const hash = bcrypt.hashSync(password, 10);
  const info = db.prepare("INSERT INTO users (username, email, password) VALUES (?, ?, ?)").run(username, email, hash);

  const token = jwt.sign({ id: info.lastInsertRowid, username, role: 'user' }, SECRET, { expiresIn: '7d' });
  res.json({ token, username, role: 'user' });
});

// LOGIN
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'Completá todos los campos' });

  const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username);
  if (!user) return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });

  const valid = bcrypt.compareSync(password, user.password);
  if (!valid) return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });

  const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, SECRET, { expiresIn: '7d' });
  res.json({ token, username: user.username, role: user.role });
});

// VERIFICAR TOKEN
app.get('/api/me', authMiddleware, (req, res) => {
  res.json({ id: req.user.id, username: req.user.username, role: req.user.role });
});

// ══════════════════════════════════════
//  ORDERS ROUTES (usuarios)
// ══════════════════════════════════════

// Crear pedido
app.post('/api/orders', authMiddleware, (req, res) => {
  const { order_num, product, uid, total } = req.body;
  if (!order_num || !product || !uid || !total)
    return res.status(400).json({ error: 'Datos incompletos' });

  db.prepare("INSERT INTO orders (order_num, user_id, username, product, uid, total) VALUES (?, ?, ?, ?, ?, ?)")
    .run(order_num, req.user.id, req.user.username, product, uid, total);

  res.json({ success: true, order_num });
});

// Mis pedidos
app.get('/api/orders/me', authMiddleware, (req, res) => {
  const orders = db.prepare("SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC").all(req.user.id);
  res.json(orders);
});

// ══════════════════════════════════════
//  ADMIN ROUTES
// ══════════════════════════════════════

// Todos los pedidos
app.get('/api/admin/orders', adminMiddleware, (req, res) => {
  const orders = db.prepare("SELECT * FROM orders ORDER BY id DESC").all();
  res.json(orders);
});

// Cambiar estado
app.put('/api/admin/orders/:order_num', adminMiddleware, (req, res) => {
  const { status } = req.body;
  const valid = ['pending','processing','completed'];
  if (!valid.includes(status)) return res.status(400).json({ error: 'Estado inválido' });
  const orderNum = decodeURIComponent(req.params.order_num);
  db.prepare("UPDATE orders SET status = ? WHERE order_num = ?").run(status, orderNum);
  res.json({ success: true });
});

// Eliminar pedido
app.delete('/api/admin/orders/:order_num', adminMiddleware, (req, res) => {
  const orderNum = decodeURIComponent(req.params.order_num);
  db.prepare("DELETE FROM orders WHERE order_num = ?").run(orderNum);
  res.json({ success: true });
});

// Todos los usuarios
app.get('/api/admin/users', adminMiddleware, (req, res) => {
  const users = db.prepare("SELECT id, username, email, role, created FROM users ORDER BY id DESC").all();
  res.json(users);
});

// Stats
app.get('/api/admin/stats', adminMiddleware, (req, res) => {
  const total    = db.prepare("SELECT COUNT(*) as n FROM orders").get().n;
  const pending  = db.prepare("SELECT COUNT(*) as n FROM orders WHERE status='pending'").get().n;
  const proc     = db.prepare("SELECT COUNT(*) as n FROM orders WHERE status='processing'").get().n;
  const done     = db.prepare("SELECT COUNT(*) as n FROM orders WHERE status='completed'").get().n;
  const users    = db.prepare("SELECT COUNT(*) as n FROM users WHERE role='user'").get().n;
  res.json({ total, pending, processing: proc, completed: done, users });
});

// ── Subir comprobante
app.post('/api/orders/:order_num/comprobante', authMiddleware, upload.single('comprobante'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se recibió archivo' });
  const orderNum = decodeURIComponent(req.params.order_num);
  const url  = '/uploads/' + req.file.filename;
  const nro  = req.body.nro_op || null;
  db.prepare("UPDATE orders SET comprobante = ?, nro_op = ?, status = 'processing' WHERE order_num = ? AND user_id = ?")
    .run(url, nro, orderNum, req.user.id);
  res.json({ success: true, url });
});

// ══════════════════════════════════════
//  INICIO
// ══════════════════════════════════════
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚀 FF Store Server corriendo en http://localhost:${PORT}`);
  console.log(`📦 Base de datos: ffstore.db`);
  console.log(`🔑 Admin: admin / ffstore2025\n`);
});
