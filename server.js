const express  = require('express');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const cors     = require('cors');
const path     = require('path');
const multer   = require('multer');
const fs       = require('fs');

const app    = express();
const SECRET = 'ffstore_secret_2025_jwt';

// ── BASE DE DATOS ─────────────────────────────────────────────────────────────
let query, queryOne;

if (process.env.DATABASE_URL) {
  // PostgreSQL
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  query    = async (sql, params=[]) => { const r = await pool.query(sql, params); return r.rows; };
  queryOne = async (sql, params=[]) => { const r = await pool.query(sql, params); return r.rows[0]||null; };
  console.log('🗄️  Usando PostgreSQL');
} else {
  // SQLite fallback
  const Database = require('better-sqlite3');
  const db = new Database(path.join(__dirname, 'ffstore.db'));
  db.pragma('foreign_keys = OFF');
  query    = (sql, params=[]) => {
    const pgToSql = sql.replace(/\$(\d+)/g, '?');
    try {
      // Para CREATE/INSERT/UPDATE/DELETE usar run()
      if (/^\s*(CREATE|INSERT|UPDATE|DELETE|ALTER)/i.test(sql)) {
        const info = db.prepare(pgToSql).run(...params);
        return Promise.resolve([info]);
      }
      return Promise.resolve(db.prepare(pgToSql).all(...params));
    } catch(e) { return Promise.reject(e); }
  };
  queryOne = (sql, params=[]) => {
    const pgToSql = sql.replace(/\$(\d+)/g, '?').replace(/\s*RETURNING\s+\w+/i, '');
    try {
      if (/^\s*(INSERT|UPDATE|DELETE)/i.test(sql)) {
        const info = db.prepare(pgToSql.replace(/\s*RETURNING\s+\w+/i,'')).run(...params);
        return Promise.resolve(info.lastInsertRowid ? { id: info.lastInsertRowid } : null);
      }
      return Promise.resolve(db.prepare(pgToSql).get(...params) || null);
    } catch(e) { return Promise.reject(e); }
  };
  console.log('🗄️  Usando SQLite (sin DATABASE_URL)');
}

// ── INIT DB ───────────────────────────────────────────────────────────────────
async function initDB() {
  if (process.env.DATABASE_URL) {
    // PostgreSQL
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id        SERIAL PRIMARY KEY,
        username  TEXT UNIQUE NOT NULL,
        email     TEXT UNIQUE NOT NULL,
        password  TEXT NOT NULL,
        role      TEXT DEFAULT 'user',
        created   TIMESTAMP DEFAULT NOW()
      )
    `);
    await query(`
      CREATE TABLE IF NOT EXISTS orders (
        id          SERIAL PRIMARY KEY,
        order_num   TEXT UNIQUE NOT NULL,
        user_id     INTEGER NOT NULL,
        username    TEXT NOT NULL,
        product     TEXT NOT NULL,
        uid         TEXT NOT NULL,
        total       TEXT NOT NULL,
        status      TEXT DEFAULT 'pending',
        comprobante TEXT DEFAULT NULL,
        nro_op      TEXT DEFAULT NULL,
        date        TIMESTAMP DEFAULT NOW()
      )
    `);
  } else {
    // SQLite
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id        INTEGER PRIMARY KEY AUTOINCREMENT,
        username  TEXT UNIQUE NOT NULL,
        email     TEXT UNIQUE NOT NULL,
        password  TEXT NOT NULL,
        role      TEXT DEFAULT 'user',
        created   TEXT DEFAULT (datetime('now'))
      )
    `);
    await query(`
      CREATE TABLE IF NOT EXISTS orders (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        order_num   TEXT UNIQUE NOT NULL,
        user_id     INTEGER NOT NULL,
        username    TEXT NOT NULL,
        product     TEXT NOT NULL,
        uid         TEXT NOT NULL,
        total       TEXT NOT NULL,
        status      TEXT DEFAULT 'pending',
        comprobante TEXT DEFAULT NULL,
        nro_op      TEXT DEFAULT NULL,
        date        TEXT DEFAULT (datetime('now'))
      )
    `);
  }
  // Admin por defecto
  const admin = await queryOne("SELECT id FROM users WHERE username = 'admin'");
  if (!admin) {
    const hash = bcrypt.hashSync('ffstore2025', 10);
    await query("INSERT INTO users (username, email, password, role) VALUES ($1,$2,$3,$4)",
      ['admin','admin@ffstore.com', hash, 'admin']);
    console.log('✅ Admin creado: admin / ffstore2025');
  }
  console.log('✅ PostgreSQL listo');
}

// ── ARCHIVOS ──────────────────────────────────────────────────────────────────
const uploadsDir = path.join('/tmp', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename:    (req, file, cb) => cb(null, Date.now() + '_' + file.originalname.replace(/\s/g,'_'))
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));
app.use('/uploads', express.static(uploadsDir));

// ── JWT MIDDLEWARE ────────────────────────────────────────────────────────────
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token requerido' });
  try { req.user = jwt.verify(token, SECRET); next(); }
  catch { res.status(401).json({ error: 'Token inválido' }); }
}
function adminMiddleware(req, res, next) {
  authMiddleware(req, res, () => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acceso denegado' });
    next();
  });
}

// ── AUTH ──────────────────────────────────────────────────────────────────────
app.post('/api/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) return res.status(400).json({ error: 'Todos los campos son requeridos' });
    if (password.length < 6) return res.status(400).json({ error: 'Contraseña mínimo 6 caracteres' });
    if (!email.includes('@')) return res.status(400).json({ error: 'Email inválido' });
    const exists = await queryOne("SELECT id FROM users WHERE username=$1 OR email=$2", [username, email]);
    if (exists) return res.status(409).json({ error: 'Usuario o email ya registrado' });
    const hash = bcrypt.hashSync(password, 10);
    let userId;
    if (process.env.DATABASE_URL) {
      const row = await queryOne("INSERT INTO users (username,email,password) VALUES ($1,$2,$3) RETURNING id", [username, email, hash]);
      userId = row.id;
    } else {
      await query("INSERT INTO users (username,email,password) VALUES ($1,$2,$3)", [username, email, hash]);
      const row = await queryOne("SELECT id FROM users WHERE username=$1", [username]);
      userId = row.id;
    }
    const token = jwt.sign({ id: userId, username, role: 'user' }, SECRET, { expiresIn: '7d' });
    res.json({ token, username, role: 'user' });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Completá todos los campos' });
    const user = await queryOne("SELECT * FROM users WHERE username=$1", [username]);
    if (!user || !bcrypt.compareSync(password, user.password))
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, SECRET, { expiresIn: '7d' });
    res.json({ token, username: user.username, role: user.role });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/me', authMiddleware, (req, res) => {
  res.json({ id: req.user.id, username: req.user.username, role: req.user.role });
});

// ── ORDERS ────────────────────────────────────────────────────────────────────
app.post('/api/orders', authMiddleware, async (req, res) => {
  try {
    const { order_num, product, uid, total } = req.body;
    if (!order_num || !product || !uid || !total) return res.status(400).json({ error: 'Datos incompletos' });
    await query("INSERT INTO orders (order_num,user_id,username,product,uid,total) VALUES ($1,$2,$3,$4,$5,$6)",
      [order_num, req.user.id, req.user.username, product, uid, total]);
    res.json({ success: true, order_num });
  } catch(e) { console.error('Error orders:', e.message); res.status(500).json({ error: e.message }); }
});

app.get('/api/orders/me', authMiddleware, async (req, res) => {
  try {
    const orders = await query("SELECT * FROM orders WHERE user_id=$1 ORDER BY id DESC", [req.user.id]);
    res.json(orders);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── ADMIN ─────────────────────────────────────────────────────────────────────
app.get('/api/admin/orders', adminMiddleware, async (req, res) => {
  try { res.json(await query("SELECT * FROM orders ORDER BY id DESC")); }
  catch(e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/admin/orders/:order_num', adminMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['pending','processing','completed'].includes(status)) return res.status(400).json({ error: 'Estado inválido' });
    const orderNum = decodeURIComponent(req.params.order_num);
    await query("UPDATE orders SET status=$1 WHERE order_num=$2", [status, orderNum]);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/admin/orders/:order_num', adminMiddleware, async (req, res) => {
  try {
    const orderNum = decodeURIComponent(req.params.order_num);
    await query("DELETE FROM orders WHERE order_num=$1", [orderNum]);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/admin/users', adminMiddleware, async (req, res) => {
  try { res.json(await query("SELECT id,username,email,role,created FROM users ORDER BY id DESC")); }
  catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/admin/stats', adminMiddleware, async (req, res) => {
  try {
    const [total, pending, proc, done, users] = await Promise.all([
      queryOne("SELECT COUNT(*) as n FROM orders"),
      queryOne("SELECT COUNT(*) as n FROM orders WHERE status='pending'"),
      queryOne("SELECT COUNT(*) as n FROM orders WHERE status='processing'"),
      queryOne("SELECT COUNT(*) as n FROM orders WHERE status='completed'"),
      queryOne("SELECT COUNT(*) as n FROM users WHERE role='user'"),
    ]);
    res.json({ total: +total.n, pending: +pending.n, processing: +proc.n, completed: +done.n, users: +users.n });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── COMPROBANTE ───────────────────────────────────────────────────────────────
app.post('/api/orders/:order_num/comprobante', authMiddleware, upload.single('comprobante'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No se recibió archivo' });
    const orderNum = decodeURIComponent(req.params.order_num);
    const url = '/uploads/' + req.file.filename;
    const nro = req.body.nro_op || null;
    await query("UPDATE orders SET comprobante=$1, nro_op=$2, status='processing' WHERE order_num=$3 AND user_id=$4",
      [url, nro, orderNum, req.user.id]);
    res.json({ success: true, url });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── INICIO ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
initDB().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 FF Store en http://localhost:${PORT}`);
    console.log(`🗄️  PostgreSQL conectado\n`);
  });
}).catch(e => {
  console.error('Error iniciando DB:', e.message);
  process.exit(1);
});
