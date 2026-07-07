/* ═══════════════════════════════════════════
   FREE FIRE DIAMONDS STORE — app.js
═══════════════════════════════════════════ */

// ── DATA ──────────────────────────────────────────────────────────────────────

const DIAMONDS = [
  { id: 1,  name: '100+10 Diamantes',   img: 'diamond-100.png',      price: 3.45,   bonus: '+10%', recommended: false, minQty: 1  },
  { id: 3,  name: '310+31 Diamantes',   img: 'diamond-310.png',      price: 10.30,  bonus: '+10%', recommended: false, minQty: 1  },
  { id: 5,  name: '520+52 Diamantes',   img: 'diamond-520.png',      price: 14.99,  bonus: '+10%', recommended: false, minQty: 1  },
  { id: 8,  name: '1060+106 Diamantes', img: 'diamond-1060.png',     price: 26.99,  bonus: '+10%', recommended: true,  minQty: 1  },
  { id: 10, name: '2180+218 Diamantes', img: 'diamond-2180.png',     price: 53.95,  bonus: '+10%', recommended: false, minQty: 1  },
  { id: 11, name: '5600+560 Diamantes', img: 'diamond-5600.png',     price: 132.86, bonus: '+10%', recommended: false, minQty: 1  },
  { id: 4,  name: 'Pase Booyah',        img: 'booyah-pass.png',      price: 5.45,   bonus: null,   recommended: false, minQty: 1  },
  { id: 2,  name: 'Fracmentos de Evos', img: 'tarjeta-semanal.png',  price: 0.27,   bonus: null,   recommended: false, minQty: 10 },
  { id: 6,  name: 'Cajas de Evos',      img: 'cajasevos.png',        price: 1.21,   bonus: null,   recommended: false, minQty: 10 },
];

const PAYMENTS = [
  { img: 'pay-icon5.png', name: 'Yape QR', promo: true },
];

// ── FORMATO PRECIO (Soles peruanos) ───────────────────────────────────────────
function sol(amount) {
  return 'S/ ' + amount.toFixed(2).replace('.', '.').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
let selectedDiamond = null;
let qty = 1;

// ── INIT ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  renderDiamonds();
  renderPayments();
});

// ── RENDER DIAMONDS ───────────────────────────────────────────────────────────
function renderDiamonds() {
  const grid = document.getElementById('diamondsGrid');
  grid.innerHTML = '';
  DIAMONDS.forEach(d => {
    const div = document.createElement('div');
    div.className = 'diamond-item' + (d.recommended ? ' recommended' : '');
    div.dataset.id = d.id;
    div.innerHTML = `
      <img class="d-img" src="${d.img}" alt="${d.name}" />
      <span class="d-name">${d.name}${d.bonus ? ' <em class="d-bonus">' + d.bonus + '</em>' : ''}</span>
      <span class="d-price">${sol(d.price)}</span>
    `;
    div.addEventListener('click', () => selectDiamond(d.id));
    grid.appendChild(div);
  });
}

// ── RENDER PAYMENTS ───────────────────────────────────────────────────────────
function renderPayments() {
  const grid = document.getElementById('paymentGrid');
  grid.innerHTML = '';
  PAYMENTS.forEach((p, index) => {
    const div = document.createElement('div');
    div.className = 'payment-item' + (p.promo ? ' promo' : '');
    div.dataset.index = index;
    let promoTags = '';
    if (p.promo) promoTags += '<span class="promo-tag">PROMO</span>';
    if (p.promoDouble) promoTags += '<span class="promo-tag yellow">PROMOCIÓN</span>';
    div.innerHTML = `
      ${promoTags}
      <img class="pay-img" src="${p.img}" alt="${p.name}" />
      <span>${p.name}</span>
    `;
    div.addEventListener('click', () => selectPayment(index, div));
    grid.appendChild(div);
  });
}

let selectedPayment = null;

function selectPayment(index, el) {
  document.querySelectorAll('.payment-item').forEach(i => i.classList.remove('selected'));
  el.classList.add('selected');
  selectedPayment = PAYMENTS[index];
  checkReady();
}

// ── SELECT DIAMOND ────────────────────────────────────────────────────────────
function selectDiamond(id) {
  selectedDiamond = DIAMONDS.find(d => d.id === id);
  qty = selectedDiamond.minQty || 5;

  document.querySelectorAll('.diamond-item').forEach(el => {
    el.classList.toggle('selected', parseInt(el.dataset.id) === id);
  });

  updateOrderCard();
}

// ── UPDATE ORDER CARD ─────────────────────────────────────────────────────────
function updateOrderCard() {
  if (!selectedDiamond) return;
  const total = selectedDiamond.price * qty;

  // Right sidebar
  document.getElementById('orderProductName').textContent = selectedDiamond.name;
  document.getElementById('orderDiamondImg').src = selectedDiamond.img;
  document.getElementById('summaryPack').textContent = selectedDiamond.name;
  document.getElementById('summaryQty').textContent = qty;
  document.getElementById('summaryTotal').textContent = sol(total);
  document.getElementById('qtyDisplay').textContent = qty;

  // Step 3 (mobile/left column)
  document.getElementById('buySummaryName').textContent = selectedDiamond.name;
  document.getElementById('buySummaryPrice').textContent = sol(total);

  checkReady();
}

function checkReady() {
  const uid = document.getElementById('orderUid').value.trim() || document.getElementById('userIdInput').value.trim();
  const btn = document.querySelector('.btn-buy-now.full-btn');
  if (btn) {
    const ready = selectedDiamond && uid.length >= 6 && selectedPayment;
    btn.classList.toggle('ready', !!ready);
  }
}

// ── QUANTITY ──────────────────────────────────────────────────────────────────
function changeQty(delta) {
  const min = selectedDiamond ? (selectedDiamond.minQty || 5) : 5;
  qty = Math.max(min, Math.min(99, qty + delta));
  document.getElementById('qtyDisplay').textContent = qty;
  updateOrderCard();
}

// ── SYNC UID ──────────────────────────────────────────────────────────────────
function syncUID(value) {
  const clean = value.replace(/\D/g, '');
  document.getElementById('userIdInput').value = clean;
  document.getElementById('orderUid').value = clean;
  checkReady();
}
function syncUID2(value) {
  const clean = value.replace(/\D/g, '');
  document.getElementById('orderUid').value = clean;
  document.getElementById('userIdInput').value = clean;
  checkReady();
}

// ── ADD TO CART ───────────────────────────────────────────────────────────────
function addToCart() {
  const uid = document.getElementById('orderUid').value.trim() || document.getElementById('userIdInput').value.trim();
  if (!selectedDiamond) {
    showToast('⚠️ Seleccioná un paquete primero', false);
    return;
  }
  if (!uid || uid.length < 6) {
    showToast('⚠️ Ingresá tu User ID (mínimo 6 dígitos)', false);
    return;
  }
  showToast(`✅ ${qty}x ${selectedDiamond.name} agregado al carrito`);
}

// ── BUY NOW ───────────────────────────────────────────────────────────────────
function buyNow() {
  if (!currentUser) {
    openModal('modalAuth');
    showToast('⚠️ Iniciá sesión para poder comprar', false);
    return;
  }
  const uid = document.getElementById('orderUid').value.trim() || document.getElementById('userIdInput').value.trim();
  if (!selectedDiamond) {
    showToast('⚠️ Seleccioná un paquete primero', false);
    return;
  }
  if (!uid || uid.length < 6) {
    showToast('⚠️ Ingresá tu User ID (mínimo 6 dígitos)', false);
    return;
  }
  if (!selectedPayment) {
    showToast('⚠️ Seleccioná un método de pago', false);
    return;
  }
  if (qty < (selectedDiamond.minQty || 5)) {
    showToast(`⚠️ La cantidad mínima para este producto es ${selectedDiamond.minQty || 5}`, false);
    return;
  }
  // Abrir modal confirmación de ID
  document.getElementById('confirmIDValue').textContent = uid;
  document.getElementById('confirmProductName').textContent = selectedDiamond.name;
  document.getElementById('confirmProductPrice').textContent = sol(selectedDiamond.price * qty);
  document.getElementById('confirmProductImg').src = selectedDiamond.img;
  openModal('modalConfirmID');
}

function confirmarID() {
  closeModal('modalConfirmID');
  const uid = document.getElementById('orderUid').value.trim() || document.getElementById('userIdInput').value.trim();
  const total = selectedDiamond.price * qty;
  // Poblar modal de pago
  document.getElementById('payProductImg').src = selectedDiamond.img;
  document.getElementById('payProductName').textContent = selectedDiamond.name;
  document.getElementById('payProductPrice').textContent = sol(total);
  document.getElementById('payUID').textContent = uid;
  document.getElementById('payMethod').textContent = selectedPayment.name;
  document.getElementById('payTotal').textContent = sol(total);
  // Reset steps
  showPayPanel(1);
  openModal('modalPago');
}

function irAComprobante() {
  const total = selectedDiamond.price * qty;
  document.getElementById('qrTotal').textContent = sol(total);
  showPayPanel(2);
}
function volverResumen()   { showPayPanel(1); }
async function irAConfirmar() {
  const uid   = document.getElementById('orderUid').value.trim() || document.getElementById('userIdInput').value.trim();
  const total = selectedDiamond.price * qty;
  const orderNum = '#FF-' + Date.now().toString().slice(-6);

  // 1 — Guardar pedido en DB
  await saveOrder(orderNum);

  // 2 — Subir comprobante usando la variable global
  if (comprobanteFile && authToken) {
    const form = new FormData();
    form.append('comprobante', comprobanteFile);
    const nroOp = document.getElementById('nroOperacion')?.value || '';
    if (nroOp) form.append('nro_op', nroOp);
    try {
      const res = await fetch(`${window.location.origin}/api/orders/${encodeURIComponent(orderNum)}/comprobante`, {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + authToken },
        body: form
      });
      const data = await res.json();
      if (!data.success) console.warn('Error subiendo comprobante:', data);
    } catch (e) { console.warn('No se pudo subir el comprobante:', e); }
  }

  // 3 — Resetear archivo
  comprobanteFile = null;

  // 4 — Mostrar paso 3
  document.getElementById('orderNumber').textContent = orderNum;
  document.getElementById('doneProduct').textContent  = selectedDiamond.name;
  document.getElementById('doneUID').textContent      = uid;
  document.getElementById('doneTotal').textContent    = sol(total);
  showPayPanel(3);
}

function showPayPanel(n) {
  [1,2,3].forEach(i => {
    document.getElementById('payPanel' + i).style.display = i === n ? 'block' : 'none';
    const step = document.getElementById('pstep' + i);
    if (step) step.className = 'pay-step' + (i <= n ? ' active' : '');
  });
}

function openModal(id)  { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

// ── ARCHIVO COMPROBANTE ───────────────────────────────────────────────────────
let comprobanteFile = null;

function previewFile(input) {
  const file = input.files[0];
  if (!file) return;
  comprobanteFile = file; // Guardar referencia global
  const uploadArea = document.getElementById('uploadArea');
  const preview = document.getElementById('filePreview');

  if (file.type.startsWith('image/')) {
    const reader = new FileReader();
    reader.onload = (e) => {
      uploadArea.innerHTML = `
        <img src="${e.target.result}" alt="comprobante"
          style="width:100%;height:100%;object-fit:contain;border-radius:8px;display:block;" />
        <div style="font-size:11px;color:var(--green);margin-top:6px;text-align:center;">✔ ${file.name}</div>
      `;
      uploadArea.style.padding = '8px';
      preview.style.display = 'none';
    };
    reader.readAsDataURL(file);
  } else {
    uploadArea.innerHTML = `
      <div class="upload-icon">📄</div>
      <div class="upload-text" style="color:var(--green);">${file.name}</div>
      <div class="upload-hint">Archivo listo para enviar</div>
    `;
    preview.style.display = 'none';
  }
}

function copyYape() {
  const num = document.getElementById('yapeNumber').textContent.replace(/\s/g, '');
  navigator.clipboard.writeText(num).then(() => {
    const label = document.getElementById('yapeCopied');
    label.style.display = 'block';
    setTimeout(() => label.style.display = 'none', 2000);
  });
}

// ── TOGGLE STEP ───────────────────────────────────────────────────────────────
function toggleStep(id) {
  const body   = document.getElementById(id);
  const chevron = document.getElementById('chevron-' + id);
  if (!body) return;
  const isOpen = body.style.display !== 'none';
  body.style.display = isOpen ? 'none' : 'block';
  if (chevron) chevron.textContent = isOpen ? '▼' : '▲';
}

// ── GAME SELECT ───────────────────────────────────────────────────────────────
function selectGame(el) {
  document.querySelectorAll('.game-icon').forEach(g => g.classList.remove('active'));
  el.classList.add('active');
}

// ── TOAST ─────────────────────────────────────────────────────────────────────
function showToast(msg, success = true) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.style.borderColor = success ? 'var(--green)' : 'var(--red)';
  toast.style.color = success ? 'var(--green)' : 'var(--red)';
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}


// ── AUTH ──────────────────────────────────────────────────────────────────────
const API = window.location.origin + '/api';
let currentUser = null;
let authToken   = null;
let userOrders  = [];

// Restaurar sesión guardada
(function restoreSession() {
  const saved = localStorage.getItem('ff_token');
  if (!saved) return;
  fetch(API + '/me', { headers: { Authorization: 'Bearer ' + saved } })
    .then(r => r.json())
    .then(data => {
      if (data.username) {
        authToken = saved;
        setLoggedIn(data.username);
        connectSSE();
      }
    }).catch(() => localStorage.removeItem('ff_token'));
})();

function switchTab(tab) {
  const isLogin = tab === 'login';
  document.getElementById('panelLogin').style.display    = isLogin ? 'block' : 'none';
  document.getElementById('panelRegister').style.display = isLogin ? 'none'  : 'block';
  document.getElementById('tabLogin').classList.toggle('active', isLogin);
  document.getElementById('tabRegister').classList.toggle('active', !isLogin);
}

function togglePass(inputId, btn) {
  const input = document.getElementById(inputId);
  const isPass = input.type === 'password';
  input.type = isPass ? 'text' : 'password';
  btn.textContent = isPass ? '🙈' : '👁';
}

function setLoggedIn(username) {
  currentUser = username;
  document.getElementById('btnLogin').style.display = 'none';
  document.getElementById('btnMenu').style.display  = 'flex';
  document.getElementById('comprasUsername').textContent = username;
  document.getElementById('btnWsp').style.display = 'flex';
  connectSSE();
}

// ── SSE TIEMPO REAL ───────────────────────────────────────────────────────────
let sseSource = null;
function connectSSE() {
  if (!authToken) return;
  if (sseSource) sseSource.close();

  sseSource = new EventSource(`${API}/events?token=${authToken}`);

  sseSource.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data);
      if (data.type === 'order_update') {
        // Actualizar el pedido en el drawer si está abierto
        const drawer = document.getElementById('drawer');
        if (drawer && drawer.classList.contains('open')) loadOrders();

        // Notificación toast al cliente
        const statusLabel = data.status === 'completed' ? '✔ Completado' : data.status === 'processing' ? '⚙ En proceso' : '⏳ Pendiente';
        showToast(`📦 Pedido ${data.order_num}: ${statusLabel}`, data.status === 'completed');
      }
    } catch {}
  };

  sseSource.onerror = () => {
    // Reconectar en 5 segundos si se cae
    setTimeout(() => { if (authToken) connectSSE(); }, 5000);
  };
}

function toggleDrawer() {
  const drawer  = document.getElementById('drawer');
  const overlay = document.getElementById('drawerOverlay');
  const isOpen  = drawer.classList.contains('open');
  if (!isOpen) loadOrders(); // carga al abrir
  drawer.classList.toggle('open');
  overlay.classList.toggle('open');
}

// Auto-actualizar pedidos cada 30 segundos si el drawer está abierto
setInterval(() => {
  const drawer = document.getElementById('drawer');
  if (drawer && drawer.classList.contains('open')) loadOrders();
}, 30000);

function openCompras() { toggleDrawer(); }

function logout() {
  currentUser = null;
  authToken   = null;
  userOrders  = [];
  if (sseSource) { sseSource.close(); sseSource = null; }
  localStorage.removeItem('ff_token');
  document.getElementById('btnLogin').style.display = 'flex';
  document.getElementById('btnMenu').style.display  = 'none';
  document.getElementById('drawer').classList.remove('open');
  document.getElementById('drawerOverlay').classList.remove('open');
  document.getElementById('btnWsp').style.display = 'none';
  showToast('👋 Sesión cerrada');
}

async function doLogin() {
  const user = document.getElementById('loginUser').value.trim();
  const pass = document.getElementById('loginPass').value.trim();
  if (!user || !pass) { showToast('⚠️ Completá todos los campos', false); return; }

  try {
    const res  = await fetch(API + '/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: user, password: pass })
    });
    const data = await res.json();
    if (!res.ok) { showToast('⚠️ ' + data.error, false); return; }

    authToken = data.token;
    localStorage.setItem('ff_token', authToken);
    closeModal('modalAuth');
    setLoggedIn(data.username);
    showToast('✅ ¡Bienvenido, ' + data.username + '!');
  } catch {
    showToast('⚠️ No se pudo conectar al servidor', false);
  }
}

async function doRegister() {
  const user  = document.getElementById('regUser').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const pass  = document.getElementById('regPass').value.trim();
  const pass2 = document.getElementById('regPass2').value.trim();
  if (!user || !email || !pass || !pass2) { showToast('⚠️ Completá todos los campos', false); return; }
  if (pass.length < 6)      { showToast('⚠️ Contraseña mínimo 6 caracteres', false); return; }
  if (pass !== pass2)       { showToast('⚠️ Las contraseñas no coinciden', false); return; }
  if (!email.includes('@')) { showToast('⚠️ Email inválido', false); return; }

  try {
    const res  = await fetch(API + '/register', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: user, email, password: pass })
    });
    const data = await res.json();
    if (!res.ok) { showToast('⚠️ ' + data.error, false); return; }

    authToken = data.token;
    localStorage.setItem('ff_token', authToken);
    closeModal('modalAuth');
    setLoggedIn(data.username);
    showToast('✅ ¡Cuenta creada! Bienvenido, ' + data.username);
  } catch {
    showToast('⚠️ No se pudo conectar al servidor', false);
  }
}

// ── ORDERS ────────────────────────────────────────────────────────────────────
async function saveOrder(orderNum) {
  if (!currentUser || !authToken) return;
  const uid = document.getElementById('orderUid').value.trim() || document.getElementById('userIdInput').value.trim();
  try {
    await fetch(API + '/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + authToken },
      body: JSON.stringify({ order_num: orderNum, product: selectedDiamond.name, uid, total: sol(selectedDiamond.price * qty) })
    });
  } catch { console.warn('No se pudo guardar el pedido en el servidor'); }
}

async function loadOrders() {
  if (!authToken) return;
  try {
    const res    = await fetch(API + '/orders/me', { headers: { Authorization: 'Bearer ' + authToken } });
    const orders = await res.json();
    renderOrders(orders);
  } catch { renderOrders([]); }
}

function renderOrders(orders = []) {
  const list  = document.getElementById('comprasList');
  const empty = document.getElementById('comprasEmpty');
  if (!orders.length) { empty.style.display = 'flex'; list.innerHTML = '<div id="comprasEmpty" style="display:flex;flex-direction:column;align-items:center;padding:40px 20px;gap:12px;text-align:center;"><div style="font-size:40px">🛒</div><p style="color:var(--text-dim);font-size:13px;line-height:1.6">Todavía no tenés pedidos.<br>¡Realizá tu primera recarga!</p></div>'; return; }
  list.innerHTML = '';
  orders.forEach(o => {
    const card = document.createElement('div');
    card.className = 'order-card-item';
    const statusClass = o.status === 'completed' ? 'status-done' : o.status === 'processing' ? 'status-proc' : 'status-pend';
    const statusLabel = o.status === 'completed' ? '✔ Completado' : o.status === 'processing' ? '⚙ En proceso' : '⏳ Pendiente';
    card.innerHTML = `
      <div class="oci-top">
        <div class="oci-order">${o.order_num || o.order}</div>
        <span class="oci-status ${statusClass}">${statusLabel}</span>
      </div>
      <div class="oci-product">${o.product}</div>
      <div class="oci-divider"></div>
      <div class="oci-row"><span>User ID</span><strong>${o.uid}</strong></div>
      <div class="oci-row"><span>Monto</span><strong class="price-accent">${o.total}</strong></div>
      <div class="oci-row"><span>Fecha</span><strong>${o.date}</strong></div>
    `;
    list.appendChild(card);
  });
}

function toggleStatus(orderNum, status) {
  // Solo admin puede cambiar estado — se hace desde admin.html
}


