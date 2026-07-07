/* ══════════════════════════════════════
   FF STORE — admin.js (con API)
══════════════════════════════════════ */
const API = window.location.origin + '/api';
let adminToken = null;

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('adminPass').addEventListener('keydown', e => { if (e.key === 'Enter') adminLogin(); });
  startClock();
  // Restaurar sesión admin
  const saved = localStorage.getItem('ff_admin_token');
  if (saved) {
    adminToken = saved;
    fetch(API + '/me', { headers: { Authorization: 'Bearer ' + saved } })
      .then(r => r.json())
      .then(d => {
        if (d.role === 'admin') showPanel();
        else { adminToken = null; localStorage.removeItem('ff_admin_token'); }
      }).catch(() => { adminToken = null; localStorage.removeItem('ff_admin_token'); });
  }
});

function startClock() {
  const el = document.getElementById('topbarTime');
  if (!el) return;
  const update = () => { el.textContent = new Date().toLocaleDateString('es-PE') + '  ' + new Date().toLocaleTimeString('es-PE'); };
  update(); setInterval(update, 1000);
}

async function adminLogin() {
  const user = document.getElementById('adminUser').value.trim();
  const pass = document.getElementById('adminPass').value.trim();
  const err  = document.getElementById('loginError');
  if (!user || !pass) { err.textContent = 'Completá todos los campos.'; return; }

  try {
    const res  = await fetch(API + '/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: user, password: pass })
    });
    const data = await res.json();
    if (!res.ok) { err.textContent = data.error; return; }
    if (data.role !== 'admin') { err.textContent = 'No tenés permisos de administrador.'; return; }

    adminToken = data.token;
    localStorage.setItem('ff_admin_token', adminToken);
    err.textContent = '';
    showPanel();
  } catch {
    err.textContent = 'No se pudo conectar al servidor. ¿Está corriendo?';
  }
}

function showPanel() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('adminPanel').style.display  = 'flex';
  renderTable(); renderStats();
}

function adminLogout() {
  adminToken = null;
  localStorage.removeItem('ff_admin_token');
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('adminPanel').style.display  = 'none';
  document.getElementById('adminUser').value = '';
  document.getElementById('adminPass').value = '';
}

function togglePass() {
  const input = document.getElementById('adminPass');
  const btn   = document.querySelector('.btn-eye');
  input.type  = input.type === 'password' ? 'text' : 'password';
  btn.textContent = input.type === 'password' ? '👁' : '🙈';
}

// ── SECTIONS ──────────────────────────────────────────────────────────────────
const sections = ['orders','stats','users'];
function showSection(name) {
  sections.forEach(s => {
    document.getElementById('section-' + s).style.display = s === name ? 'block' : 'none';
    document.getElementById('nav-' + s).classList.toggle('active', s === name);
  });
  const titles = { orders:'Pedidos', stats:'Estadísticas', users:'Usuarios' };
  const subs   = { orders:'Gestión de órdenes', stats:'Resumen de ventas', users:'Usuarios registrados' };
  document.getElementById('sectionTitle').textContent  = titles[name];
  document.querySelector('.topbar-sub').textContent    = subs[name];
  if (name === 'stats') renderStatsSection();
  if (name === 'users') renderUsers();
}

// ── ORDERS TABLE ──────────────────────────────────────────────────────────────
let allOrders = [];

async function renderTable() {
  try {
    const res = await fetch(API + '/admin/orders', { headers: { Authorization: 'Bearer ' + adminToken } });
    if (!res.ok) {
      showToast('Error API: ' + res.status + ' ' + res.statusText, false);
      allOrders = [];
    } else {
      allOrders = await res.json();
    }
  } catch(e) {
    showToast('Sin conexión al servidor: ' + e.message, false);
    allOrders = [];
  }
  filterAndDraw();
  renderStats();
}

function filterAndDraw() {
  const search = (document.getElementById('searchInput')?.value || '').toLowerCase();
  const status = document.getElementById('filterStatus')?.value || '';
  const tbody  = document.getElementById('ordersBody');
  const empty  = document.getElementById('tableEmpty');

  let filtered = allOrders.filter(o => {
    const ms = !search || [o.order_num, o.username, o.uid, o.product].join(' ').toLowerCase().includes(search);
    const mv = !status || o.status === status;
    return ms && mv;
  });

  tbody.innerHTML = '';
  empty.style.display = filtered.length ? 'none' : 'block';

  filtered.forEach((o, i) => {
    const bc = o.status==='completed'?'badge-done':o.status==='processing'?'badge-proc':'badge-pend';
    const bl = o.status==='completed'?'✔ Completado':o.status==='processing'?'⚙ En proceso':'⏳ Pendiente';
    const tr = document.createElement('tr');
    tr.style.animation = `fadeInUp .3s ease ${i*.04}s both`;
    tr.innerHTML = `
      <td class="td-order">${o.order_num}</td>
      <td class="td-user">👤 ${o.username}</td>
      <td>${o.product}</td>
      <td class="td-uid">${o.uid}</td>
      <td class="td-amount">${o.total}</td>
      <td class="td-date">${o.date}</td>
      <td><span class="badge-status ${bc}">${bl}</span></td>
      <td>
        <div class="td-actions">
          ${o.comprobante ? `<button class="btn-ver-comp" onclick="verComprobante('${window.location.origin}${o.comprobante}','${o.order_num}','${o.nro_op||''}')">🖼 Ver</button>` : '<span class="sin-comp">Sin comprobante</span>'}
          <button class="btn-status pend" onclick="changeStatus('${o.order_num}','pending')"    title="Pendiente">⏳</button>
          <button class="btn-status"      onclick="changeStatus('${o.order_num}','processing')" title="En proceso">⚙</button>
          <button class="btn-status done" onclick="changeStatus('${o.order_num}','completed')"  title="Completado">✔</button>
          <button class="btn-delete"      onclick="deleteOrder('${o.order_num}')"               title="Eliminar">🗑</button>
        </div>
      </td>`;
    tbody.appendChild(tr);
  });
}

async function changeStatus(orderNum, status) {
  await fetch(`http://localhost:3000/api/admin/orders/${encodeURIComponent(orderNum)}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + adminToken },
    body: JSON.stringify({ status })
  });
  renderTable();
  showToast('Estado actualizado: ' + orderNum);
}

async function deleteOrder(orderNum) {
  if (!confirm('¿Eliminar pedido ' + orderNum + '?')) return;
  await fetch(`http://localhost:3000/api/admin/orders/${encodeURIComponent(orderNum)}`, {
    method: 'DELETE', headers: { Authorization: 'Bearer ' + adminToken }
  });
  renderTable();
  showToast('🗑 Pedido eliminado');
}

// ── STATS ─────────────────────────────────────────────────────────────────────
async function renderStats() {
  try {
    const res  = await fetch(API + '/admin/stats', { headers: { Authorization: 'Bearer ' + adminToken } });
    const data = await res.json();
    document.getElementById('statTotal').textContent = data.total;
    document.getElementById('statPend').textContent  = data.pending;
    document.getElementById('statProc').textContent  = data.processing;
    document.getElementById('statDone').textContent  = data.completed;
  } catch {}
}

async function renderStatsSection() {
  renderStats();
  const orders = allOrders.length ? allOrders : await fetch(API+'/admin/orders',{headers:{Authorization:'Bearer '+adminToken}}).then(r=>r.json()).catch(()=>[]);
  document.getElementById('lastOrder').textContent   = orders[0]?.order_num || '—';
  const prod = {}; orders.forEach(o => { prod[o.product] = (prod[o.product]||0)+1; });
  const top  = Object.entries(prod).sort((a,b)=>b[1]-a[1])[0];
  document.getElementById('topProduct').textContent  = top ? top[0] : '—';
  document.getElementById('totalRevenue').textContent = '—';
}

// ── USERS ─────────────────────────────────────────────────────────────────────
async function renderUsers() {
  try {
    const res   = await fetch(API + '/admin/users', { headers: { Authorization: 'Bearer ' + adminToken } });
    const users = await res.json();
    const tbody = document.getElementById('usersBody');
    const empty = document.getElementById('usersEmpty');
    tbody.innerHTML = '';
    empty.style.display = users.length ? 'none' : 'block';
    users.forEach((u, i) => {
      const userOrders = allOrders.filter(o => o.username === u.username);
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="td-uid">${i+1}</td>
        <td class="td-user">👤 ${u.username}</td>
        <td>${u.email}</td>
        <td>${userOrders.length}</td>
        <td class="td-date">${u.created}</td>`;
      tbody.appendChild(tr);
    });
  } catch {}
}

// ── DEMO ORDER ────────────────────────────────────────────────────────────────
const demoProds  = ['100+10 Diamantes','310+31 Diamantes','1060+106 Diamantes'];
const demoStatus = ['pending','processing','completed'];
async function addDemoOrder() {
  const o = {
    order_num: '#FF-' + Date.now().toString().slice(-6),
    product:   demoProds[Math.floor(Math.random()*demoProds.length)],
    uid:       Math.floor(Math.random()*9e8+1e8).toString(),
    total:     'S/ ' + (Math.random()*130+3).toFixed(2)
  };
  // Insertar directo vía endpoint admin (necesita usuario demo)
  showToast('ℹ️ Los pedidos demo se crean desde el frontend'); 
}

// ── VER COMPROBANTE ───────────────────────────────────────────────────────────
function verComprobante(url, orderNum, nroOp) {
  // Crear modal si no existe
  let modal = document.getElementById('modalComp');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'modalComp';
    modal.className = 'comp-modal-overlay';
    modal.innerHTML = `
      <div class="comp-modal">
        <div class="comp-modal-header">
          <div>
            <div class="comp-order" id="compOrder"></div>
            <div class="comp-nro" id="compNro"></div>
          </div>
          <button class="comp-close" onclick="document.getElementById('modalComp').style.display='none'">✕</button>
        </div>
        <div class="comp-img-wrap">
          <img id="compImg" src="" alt="Comprobante" />
        </div>
        <div class="comp-actions">
          <button class="btn-status done" onclick="approveOrder()">✔ Aprobar pedido</button>
          <button class="btn-status pend" onclick="rejectOrder()">✕ Rechazar</button>
          <a id="compDownload" href="" download target="_blank" class="btn-export">⬇ Descargar</a>
        </div>
      </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) modal.style.display = 'none'; });
  }

  document.getElementById('compOrder').textContent = 'Pedido: ' + orderNum;
  document.getElementById('compNro').textContent   = nroOp ? 'N° Operación: ' + nroOp : '';
  document.getElementById('compImg').src           = url;
  document.getElementById('compDownload').href     = url;
  modal.dataset.order = orderNum;
  modal.style.display = 'flex';
}

function approveOrder() {
  const orderNum = document.getElementById('modalComp').dataset.order;
  changeStatus(orderNum, 'completed');
  document.getElementById('modalComp').style.display = 'none';
}
function rejectOrder() {
  const orderNum = document.getElementById('modalComp').dataset.order;
  changeStatus(orderNum, 'pending');
  document.getElementById('modalComp').style.display = 'none';
}
function exportCSV() {
  if (!allOrders.length) { showToast('No hay pedidos', false); return; }
  const header = ['Orden','Usuario','Producto','UserID','Monto','Fecha','Estado'];
  const rows   = allOrders.map(o => [o.order_num, o.username, o.product, o.uid, o.total, o.date, o.status]);
  const csv    = [header,...rows].map(r => r.join(',')).join('\n');
  const a      = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(new Blob([csv],{type:'text/csv'})),
    download: 'pedidos_' + new Date().toISOString().slice(0,10) + '.csv'
  });
  a.click();
  showToast('📥 CSV exportado');
}

// ── TOAST ─────────────────────────────────────────────────────────────────────
function showToast(msg, ok=true) {
  const t = document.getElementById('adminToast');
  t.textContent = msg;
  t.style.borderColor = ok ? 'var(--green)' : 'var(--red)';
  t.style.color = ok ? 'var(--green)' : 'var(--red)';
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}
