/* =====================================================================
   RedJr Builders & Construction Supply — Cashier, Inventory & Dashboard
   Sections:
     1. Helpers & constants
     2. Product catalog
     3. Sales data, state & saving
     4. UI basics (toast, modal, navigation, login)
     5. Dashboard
     6. Cashier (sell, hold, pay, receipt)
     7. Add / edit product, restock, barcode scanner
     8. Inventory
     9. Transactions, refunds, daily summary
    10. Event wiring
   ===================================================================== */

/* ---------- 1. Helpers & constants ---------- */
const money = n => '₱' + Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dateShort = d => new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
const dateTime = d => new Date(d).toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const uid = prefix => prefix + '-' + Math.random().toString(36).slice(2, 8).toUpperCase();
const round2 = n => Math.round((Number(n) || 0) * 100) / 100;
const pad = (n, w = 6) => String(n).padStart(w, '0');
const $ = id => document.getElementById(id);
const clone = v => JSON.parse(JSON.stringify(v));
const MIN = 60000, HR = 3600000;

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function fmtK(v) {
  return v >= 1e6 ? (v / 1e6).toFixed(1).replace(/\.0$/, '') + 'M' : v >= 1e3 ? (v / 1e3).toFixed(1).replace(/\.0$/, '') + 'k' : String(Math.round(v));
}
function niceMax(v) {
  if (v <= 0) return 4;
  const raw = v / 4, p = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / p;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p * 4;
}

const CATEGORIES = ['Cement', 'Masonry', 'Aggregates', 'Steel & Wire', 'Lumber', 'Hardware', 'Tools', 'Power Tools', 'Plumbing', 'Electrical', 'Painting', 'Roofing', 'Safety'];
const UNITS = ['piece', 'bag', 'kg', 'box', 'length', 'roll', 'sheet', 'can', 'pair', 'cu.m', 'set', 'pack', 'liter', 'meter'];
const PAY_METHODS = ['Cash', 'GCash', 'Maya', 'Credit/Debit card', 'Bank transfer'];
const PERIODS = { today: 'Today', week: 'This week', month: 'This month', year: 'This year', all: 'All time' };
const catIndex = c => { const i = CATEGORIES.indexOf(c); return i < 0 ? 999 : i; };
const byCategoryThenName = (a, b) => catIndex(a.category) - catIndex(b.category) || a.name.localeCompare(b.name);

const ICONS = {
  dashboard: '<path d="M4 13h6V4H4zM14 20h6V11h-6zM14 4h6v4h-6zM4 20h6v-4H4z"/>',
  cashier: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 11h2M12 11h2M16 11h0M8 15h2M12 15h2M16 15h0"/>',
  box: '<path d="M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8"/>',
  receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6"/>',
  trend: '<path d="M3 17l6-6 4 4 8-8M15 7h6v6"/>',
  tag: '<path d="M3 12V4h8l10 10-8 8zM7.5 7.5h.01"/>',
  alert: '<path d="M12 3l10 18H2zM12 10v5M12 18h.01"/>'
};
const ico = (name) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ''}</svg>`;

function inPeriod(iso, p) {
  if (p === 'all') return true;
  const d = new Date(iso), n = new Date();
  if (p === 'today') return d.toDateString() === n.toDateString();
  if (p === 'week') { const s = new Date(n.getFullYear(), n.getMonth(), n.getDate() - ((n.getDay() + 6) % 7)); return d >= s; }
  if (p === 'month') return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth();
  if (p === 'year') return d.getFullYear() === n.getFullYear();
  return true;
}

/* ---------- 2. Product catalog ---------- */
// Photos come from Wikimedia Commons. If one cannot load (offline), a bundled picture in /images is shown instead.
const wiki = file => 'https://commons.wikimedia.org/wiki/Special:FilePath/' + encodeURIComponent(file) + '?width=640';

const defaultProducts = [
  { id: 'P001', name: 'Portland Cement',            category: 'Cement',       sku: 'CEM-001', price: 265,  stock: 48,  reorder: 15,  unit: 'bag',    photo: 'Portland_Cement_Bags.jpg' },
  { id: 'P002', name: 'Hollow Block 4-inch',        category: 'Masonry',      sku: 'MAS-004', price: 18,   stock: 320, reorder: 80,  unit: 'piece',  photo: 'Concrete_block.jpg' },
  { id: 'P003', name: 'Hollow Block 6-inch',        category: 'Masonry',      sku: 'MAS-006', price: 22,   stock: 24,  reorder: 60,  unit: 'piece',  photo: 'Concrete_Masonry_blocks.jpg' },
  { id: 'P013', name: 'Red Clay Brick',             category: 'Masonry',      sku: 'MAS-010', price: 12,   stock: 500, reorder: 100, unit: 'piece',  photo: 'Brick_texture_red_brick.jpg' },
  { id: 'P014', name: 'Washed Sand',                category: 'Aggregates',   sku: 'AGG-001', price: 1350, stock: 12,  reorder: 4,   unit: 'cu.m',   photo: 'Sand_Pile.jpg' },
  { id: 'P015', name: 'Gravel 3/4-inch',            category: 'Aggregates',   sku: 'AGG-002', price: 1500, stock: 9,   reorder: 4,   unit: 'cu.m',   photo: '20mm-aggregate.jpg' },
  { id: 'P016', name: 'Deformed Rebar 10mm x 6m',   category: 'Steel & Wire', sku: 'STL-010', price: 185,  stock: 200, reorder: 50,  unit: 'piece',  photo: 'A_bunch_of_rebar_up_close.jpg' },
  { id: 'P017', name: 'Barbed Wire',                category: 'Steel & Wire', sku: 'STL-020', price: 1450, stock: 14,  reorder: 5,   unit: 'roll',   photo: 'Barbed_wire_(blue_background).jpg' },
  { id: 'P018', name: 'Plywood 1/2-inch (4x8)',     category: 'Lumber',       sku: 'LBR-001', price: 620,  stock: 40,  reorder: 12,  unit: 'sheet',  photo: 'Birch_plywood.jpg' },
  { id: 'P019', name: 'Coco Lumber 2x2x10',         category: 'Lumber',       sku: 'LBR-002', price: 95,   stock: 150, reorder: 40,  unit: 'piece',  photo: 'Lumber_stack_in_Picture_Rocks.jpg' },
  { id: 'P004', name: 'Steel Nail 2-inch',          category: 'Hardware',     sku: 'HRD-002', price: 95,   stock: 30,  reorder: 12,  unit: 'kg',     photo: 'Steel_nails.jpg' },
  { id: 'P005', name: 'Steel Nail 3-inch',          category: 'Hardware',     sku: 'HRD-003', price: 110,  stock: 0,   reorder: 12,  unit: 'kg',     photo: 'Nails.jpg' },
  { id: 'P010', name: 'Roofing Screw',              category: 'Hardware',     sku: 'HRD-009', price: 160,  stock: 7,   reorder: 10,  unit: 'box',    photo: 'Screws.jpg' },
  { id: 'P020', name: 'Bolt, Nut & Washer Set',     category: 'Hardware',     sku: 'HRD-012', price: 150,  stock: 36,  reorder: 10,  unit: 'box',    photo: 'Bolt,_Plain_washer_and_Spring_lock_washer.jpg' },
  { id: 'P021', name: 'Padlock 60mm',               category: 'Hardware',     sku: 'HRD-020', price: 195,  stock: 25,  reorder: 8,   unit: 'piece',  photo: 'Padlock.jpg' },
  { id: 'P006', name: 'Combination Pliers',         category: 'Tools',        sku: 'TLS-001', price: 185,  stock: 17,  reorder: 5,   unit: 'piece',  photo: 'Adjustable_pliers_kwb_387710.JPG' },
  { id: 'P007', name: 'Adjustable Wrench',          category: 'Tools',        sku: 'TLS-002', price: 240,  stock: 9,   reorder: 5,   unit: 'piece',  photo: 'Adjustable_wrench_2.jpg' },
  { id: 'P022', name: 'Claw Hammer',                category: 'Tools',        sku: 'TLS-003', price: 220,  stock: 22,  reorder: 6,   unit: 'piece',  photo: 'Claw-hammer.jpg' },
  { id: 'P023', name: 'Hand Saw 22-inch',           category: 'Tools',        sku: 'TLS-004', price: 260,  stock: 14,  reorder: 5,   unit: 'piece',  photo: 'Hand_saw.jpg' },
  { id: 'P024', name: 'Tape Measure 5m',            category: 'Tools',        sku: 'TLS-005', price: 95,   stock: 40,  reorder: 10,  unit: 'piece',  photo: 'Tape_measure.JPG' },
  { id: 'P025', name: 'Phillips Screwdriver',       category: 'Tools',        sku: 'TLS-006', price: 85,   stock: 35,  reorder: 10,  unit: 'piece',  photo: 'Phillips_screwdriver.jpg' },
  { id: 'P026', name: 'Round Point Shovel',         category: 'Tools',        sku: 'TLS-007', price: 350,  stock: 12,  reorder: 4,   unit: 'piece',  photo: 'Shovel_black.jpg' },
  { id: 'P027', name: 'Wheelbarrow',                category: 'Tools',        sku: 'TLS-008', price: 1850, stock: 4,   reorder: 5,   unit: 'piece',  photo: 'Loaded_wheelbarrow.jpg' },
  { id: 'P028', name: 'Masonry Trowel',             category: 'Tools',        sku: 'TLS-009', price: 130,  stock: 28,  reorder: 8,   unit: 'piece',  photo: 'Masons_trowel.jpg' },
  { id: 'P029', name: 'Spirit Level 24-inch',       category: 'Tools',        sku: 'TLS-010', price: 285,  stock: 11,  reorder: 4,   unit: 'piece',  photo: 'Tool-level.jpg' },
  { id: 'P030', name: 'Wood Chisel 1-inch',         category: 'Tools',        sku: 'TLS-011', price: 120,  stock: 20,  reorder: 6,   unit: 'piece',  photo: 'Wood_chisel.JPG' },
  { id: 'P031', name: 'Cordless Drill 12V',         category: 'Power Tools',  sku: 'PWR-001', price: 2450, stock: 6,   reorder: 3,   unit: 'piece',  photo: 'CordlessDrill.jpg' },
  { id: 'P032', name: 'Angle Grinder 4-inch',       category: 'Power Tools',  sku: 'PWR-002', price: 1850, stock: 8,   reorder: 3,   unit: 'piece',  photo: 'Makita_GA9050_Angle_Grinder.jpg' },
  { id: 'P008', name: 'PVC Pipe 1/2-inch',          category: 'Plumbing',     sku: 'PLB-001', price: 88,   stock: 65,  reorder: 20,  unit: 'length', photo: 'PVC_pipe.JPG' },
  { id: 'P033', name: 'Brass Faucet 1/2-inch',      category: 'Plumbing',     sku: 'PLB-002', price: 320,  stock: 30,  reorder: 8,   unit: 'piece',  photo: 'Brass_water_tap.jpg' },
  { id: 'P034', name: 'PPR Pipe & Fittings',        category: 'Plumbing',     sku: 'PLB-003', price: 140,  stock: 45,  reorder: 15,  unit: 'length', photo: 'PPR_pipe_and_Fitting.jpg' },
  { id: 'P009', name: 'Electrical Tape',            category: 'Electrical',   sku: 'ELC-001', price: 28,   stock: 110, reorder: 25,  unit: 'roll',   photo: 'Electrical-tape_black.jpg' },
  { id: 'P035', name: 'Electrical Wire 2.0mm (150m)', category: 'Electrical', sku: 'ELC-002', price: 2650, stock: 10,  reorder: 4,   unit: 'roll',   photo: 'ElectricWireOnReel.JPG' },
  { id: 'P036', name: 'LED Bulb 9W',                category: 'Electrical',   sku: 'ELC-003', price: 85,   stock: 90,  reorder: 25,  unit: 'piece',  photo: 'Led_light_bulb.jpg' },
  { id: 'P037', name: 'Circuit Breaker 30A',        category: 'Electrical',   sku: 'ELC-004', price: 325,  stock: 18,  reorder: 6,   unit: 'piece',  photo: 'Circuit_breaker_BA63_EKF.jpg' },
  { id: 'P038', name: 'Extension Cord 5m',          category: 'Electrical',   sku: 'ELC-005', price: 380,  stock: 16,  reorder: 5,   unit: 'piece',  photo: 'NEMA-1_extension_cord.jpg' },
  { id: 'P039', name: 'Wall Switch',                category: 'Electrical',   sku: 'ELC-006', price: 65,   stock: 60,  reorder: 15,  unit: 'piece',  photo: 'Rocker_light_switch_1.jpg' },
  { id: 'P011', name: 'Paint Brush 3-inch',         category: 'Painting',     sku: 'PNT-003', price: 75,   stock: 42,  reorder: 10,  unit: 'piece',  photo: 'Paintbrush.JPG' },
  { id: 'P040', name: 'Paint Roller 9-inch',        category: 'Painting',     sku: 'PNT-004', price: 145,  stock: 26,  reorder: 8,   unit: 'piece',  photo: 'Paint_roller_4.jpg' },
  { id: 'P041', name: 'Latex Paint White 4L',       category: 'Painting',     sku: 'PNT-005', price: 780,  stock: 3,   reorder: 10,  unit: 'can',    photo: 'White_primer_bucket.jpg' },
  { id: 'P042', name: 'Sandpaper #120',             category: 'Painting',     sku: 'PNT-006', price: 12,   stock: 150, reorder: 40,  unit: 'sheet',  photo: 'Sandpaper_closeup.jpg' },
  { id: 'P012', name: 'GI Sheet 0.4mm',             category: 'Roofing',      sku: 'ROF-004', price: 395,  stock: 16,  reorder: 8,   unit: 'sheet',  photo: 'Corrugated_iron_(AM_2016.25.1-8).jpg' },
  { id: 'P043', name: 'Safety Hard Hat',            category: 'Safety',       sku: 'SAF-001', price: 185,  stock: 30,  reorder: 8,   unit: 'piece',  photo: 'Hard_hat_20111111.jpg' },
  { id: 'P044', name: 'Safety Goggles',             category: 'Safety',       sku: 'SAF-002', price: 95,   stock: 45,  reorder: 10,  unit: 'piece',  photo: 'Safety_Goggles.jpg' },
  { id: 'P045', name: 'Work Gloves',                category: 'Safety',       sku: 'SAF-003', price: 65,   stock: 70,  reorder: 20,  unit: 'pair',   photo: 'Work_Gloves.svg' }
].map((p, i) => ({ ...p, barcode: '48060' + pad(i + 1, 7), cost: round2(p.price * .78), image: wiki(p.photo) }));

// Bundled backup pictures (in /images). Used only if the product photo cannot load.
const imgFallback = { P001: 'cement', P002: 'hollow-block-4', P003: 'hollow-block-6', P004: 'steel-nails-2', P005: 'steel-nails-3', P006: 'pliers', P007: 'wrench', P008: 'pvc-pipe', P009: 'electrical-tape', P010: 'roofing-screw', P011: 'paint-brush', P012: 'gi-sheet' };
const catFallback = { Cement: 'cement', Masonry: 'hollow-block-4', Hardware: 'steel-nails-2', Tools: 'wrench', 'Power Tools': 'wrench', Plumbing: 'pvc-pipe', Electrical: 'electrical-tape', Painting: 'paint-brush', Roofing: 'gi-sheet' };
const localName = p => (imgFallback[p.id] || catFallback[p.category] || 'product-placeholder') + '.svg';
function imgTag(p, cls) {
  const src = p.image || 'images/' + localName(p);
  return `<img class="${cls}" src="${esc(src)}" data-fb="images/${localName(p)}" data-fb2="${localName(p)}" alt="${esc(p.name)}" loading="lazy" referrerpolicy="no-referrer" onerror="var s=this.getAttribute('src');if(s!==this.dataset.fb&&s!==this.dataset.fb2){this.src=this.dataset.fb}else if(s===this.dataset.fb){this.src=this.dataset.fb2}else{this.style.display='none'}">`;
}
const stockStatus = p => p.stock <= 0 ? 'Out of Stock' : p.stock <= p.reorder ? 'Low Stock' : 'In Stock';
const stockLabel = s => s === 'In Stock' ? 'High' : s;
const stockBadgeClass = s => s === 'Out of Stock' ? 'b-red' : s === 'Low Stock' ? 'b-amber' : 'b-green';
const stockBadge = p => { const s = stockStatus(p); return `<span class="badge ${stockBadgeClass(s)}">${stockLabel(s)}</span>`; };

/* ---------- 3. Sales data, state & saving ---------- */
// A sale: { id, customer, items:[{productId,name,price,qty,category,refunded}], subtotal, discount:{label,amount}, total,
//           status:'Completed'|'Partially Refunded'|'Refunded', created, payment:{method,tendered,change,ref}, refunds:[], refunded }
let products = [], sales = [], held = [], counters = { seq: {} };
let posCart = {}, posCat = 'All', posDisc = { type: 'none', value: 0 };
let activePage = 'dashboard';
let revMode = 'monthly', revRange = 'all';

function nextSaleId(date) {
  const y = new Date(date).getFullYear();
  counters.seq[y] = (counters.seq[y] || 0) + 1;
  return 'OR-' + y + '-' + pad(counters.seq[y]);
}
const refundedOf = o => o.refunded || 0;
const netOf = o => round2(Math.max(0, o.total - refundedOf(o)));
const ratioOf = o => o.subtotal > 0 ? o.total / o.subtotal : 1;
const lineNet = (o, i) => i.price * Math.max(0, i.qty - (i.refunded || 0)) * ratioOf(o);
const saleStatus = o => !refundedOf(o) ? 'Completed' : netOf(o) <= 0.004 ? 'Refunded' : 'Partially Refunded';
const statusPill = s => `<span class="badge ${s === 'Completed' ? 'b-green' : s === 'Partially Refunded' ? 'b-red' : 'b-gray'}">${esc(s)}</span>`;
const itemsLabel = o => { const n = o.items.map(i => i.name); return esc(n.slice(0, 2).join(', ')) + (n.length > 2 ? ` <span class="muted">+${n.length - 2} more</span>` : ''); };

// Demo sales so the dashboard has something to show. "Start fresh" removes them.
function demoSales() {
  let seed = 20260;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
  const names = ['Maria Santos', 'Ramon Dela Cruz', 'Ana Reyes', 'BuildRight Contractors', 'Joel Mendoza', 'Lopez Hardware', 'Cavite Homes Corp.', 'Elena Garcia', 'Mang Tonyo', 'Santos Builders', 'Walk-in customer', 'Walk-in customer', 'Walk-in customer'];
  const out = [], now = new Date(), startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const make = d => {
    const lines = 1 + Math.floor(rnd() * 3), items = [], used = new Set();
    for (let l = 0; l < lines; l++) {
      const p = defaultProducts[Math.floor(rnd() * defaultProducts.length)];
      if (used.has(p.id)) continue; used.add(p.id);
      const qty = p.price < 50 ? 20 + Math.floor(rnd() * 80) : p.price < 500 ? 2 + Math.floor(rnd() * 14) : 1 + Math.floor(rnd() * 4);
      items.push({ productId: p.id, name: p.name, price: p.price, qty, category: p.category, refunded: 0 });
    }
    const total = items.reduce((a, i) => a + i.price * i.qty, 0), r = rnd(), method = r < .7 ? 'Cash' : r < .9 ? 'GCash' : 'Maya';
    return { customer: names[Math.floor(rnd() * names.length)], items, subtotal: total, discount: { label: '', amount: 0 }, total, status: 'Completed', created: d.toISOString(), payment: { method, tendered: total, change: 0, ref: '' }, cashier: 'Admin', refunds: [], refunded: 0 };
  };
  for (let m = 11; m >= 0; m--) {
    const count = m === 0 ? 8 : 7 + Math.floor(rnd() * 7) + Math.round((11 - m) * .5);
    for (let k = 0; k < count; k++) {
      const day = m === 0 ? 1 + Math.floor(rnd() * now.getDate()) : 1 + Math.floor(rnd() * 27);
      const d = new Date(now.getFullYear(), now.getMonth() - m, day, 8 + Math.floor(rnd() * 9), Math.floor(rnd() * 60));
      if (d <= now) out.push(make(d));
    }
  }
  for (let i = 0; i < 4; i++) out.push(make(new Date(Math.max(startToday + (i + 1) * MIN, now.getTime() - (i * 70 + 15) * MIN))));
  out.sort((a, b) => new Date(a.created) - new Date(b.created));
  out.forEach(o => { o.id = nextSaleId(o.created); });
  // one sample partial refund so the status shows up
  const r = out.slice().reverse().find(o => o.items[0].qty >= 2 && new Date(o.created) < now - 3 * HR);
  if (r) { const i = r.items[0], amt = round2(i.price * ratioOf(r)); i.refunded = 1; r.refunded = amt; r.refunds = [{ time: r.created, amount: amt, reason: 'Customer returned 1 item', items: [{ productId: i.productId, name: i.name, qty: 1 }], restocked: false }]; r.status = 'Partially Refunded'; }
  return out;
}
function freshDemo() { products = clone(defaultProducts); counters = { seq: {} }; sales = demoSales(); held = []; }

/* saving / loading (browser localStorage) */
const STORE_KEY = 'redjr_pos_v4', OLD_KEY = 'redjr_pos_v3';
let warnedFull = false;
function saveState() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify({ products, sales, held, counters })); }
  catch (e) { if (!warnedFull) { warnedFull = true; toast('Could not save: browser storage may be full. Use smaller product photos.', 'error'); } }
}
function normProduct(p) { return { barcode: '', cost: 0, unit: 'piece', reorder: 0, image: '', ...p }; }
function loadState() {
  try {
    const s = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
    if (s && Array.isArray(s.products) && Array.isArray(s.sales)) {
      products = s.products.map(normProduct); sales = s.sales; held = s.held || []; counters = s.counters || { seq: {} };
      return true;
    }
  } catch (e) { }
  // bring over products and completed sales from the older version, if any
  try {
    const o = JSON.parse(localStorage.getItem(OLD_KEY) || 'null');
    if (o && Array.isArray(o.products) && Array.isArray(o.orders)) {
      products = o.products.map(p => normProduct({ ...p, barcode: p.barcode || defaultProducts.find(d => d.id === p.id)?.barcode || '' }));
      counters = { seq: {} };
      sales = o.orders.filter(x => x.status !== 'Cancelled').sort((a, b) => new Date(a.created) - new Date(b.created)).map(x => {
        const items = x.items.map(i => ({ productId: i.productId, name: i.name, price: i.price, qty: i.qty, category: products.find(p => p.id === i.productId)?.category || 'Other', refunded: 0 }));
        const subtotal = x.subtotal ?? items.reduce((n, i) => n + i.price * i.qty, 0);
        return { id: nextSaleId(x.created), customer: x.customer || 'Walk-in customer', items, subtotal, discount: x.discount || { label: '', amount: 0 }, total: x.total, status: 'Completed', created: x.created, payment: x.payment || { method: 'Cash', tendered: x.total, change: 0, ref: '' }, cashier: x.cashier || 'Admin', refunds: [], refunded: 0 };
      });
      held = o.held || [];
      return true;
    }
  } catch (e) { }
  return false;
}
if (!loadState()) { freshDemo(); saveState(); }

function resetDemo() {
  showModal('Reset demo data?', `<p>This restores the sample products and 12 months of demo sales. Anything you added or sold will be removed.</p>`, [
    { label: 'Cancel', class: 'secondary', action: closeModal },
    { label: 'Reset demo data', class: 'danger', action: () => { freshDemo(); resetPosSale(); closeModal(); renderAll(); toast('Demo data restored.'); } }]);
}
function startFresh() {
  showModal('Start fresh (go live)?', `<p>This deletes <strong>all sales, transactions and held sales</strong> but keeps your products and stock. Do this before recording real sales.</p><div class="notice">This cannot be undone. Export the CSV files first if you need a copy.</div>`, [
    { label: 'Cancel', class: 'secondary', action: closeModal },
    { label: 'Delete sales records', class: 'danger', action: () => { sales = []; held = []; counters = { seq: {} }; resetPosSale(); closeModal(); renderAll(); toast('Sales cleared. Ready for real sales.'); } }]);
}

/* ---------- 4. UI basics ---------- */
function toast(message, type = 'success') {
  const el = document.createElement('div'); el.className = 'toast ' + type; el.textContent = message;
  $('toastRegion').appendChild(el); setTimeout(() => el.remove(), 3400);
}
function showModal(title, body, buttons = [], opts = {}) {
  $('modalRoot').innerHTML = `<div class="modal-backdrop" role="presentation" onclick="if(event.target===this)closeModal()"><section class="modal${opts.wide ? ' wide' : ''}" role="dialog" aria-modal="true" aria-labelledby="modalTitle"><div class="modal-head"><h3 id="modalTitle">${title}</h3><button class="close-btn" aria-label="Close dialog" onclick="closeModal()">✕</button></div><div class="modal-body">${body}</div><div class="modal-foot" id="modalFoot"></div></section></div>`;
  const foot = $('modalFoot');
  buttons.forEach(b => { const btn = document.createElement('button'); btn.className = b.class || 'secondary'; btn.textContent = b.label; btn.addEventListener('click', b.action); foot.appendChild(btn); });
  if (!buttons.length) foot.remove();
  if (!opts.noFocus) { const first = $('modalRoot').querySelector('.modal-body input:not([type=hidden]),.modal-body select'); if (first) first.focus(); }
}
function closeModal() { $('modalRoot').innerHTML = ''; }
function tableHTML(headers, rows, empty = 'No records found.') {
  if (!rows.length) return `<div class="empty"><strong>${empty}</strong>Try changing your search or filters.</div>`;
  return `<table><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}
function categoryChips(elId, current, attr, onPick) {
  const present = new Set(products.map(p => p.category));
  const cats = ['All', ...CATEGORIES.filter(c => present.has(c)), ...[...present].filter(c => !CATEGORIES.includes(c)).sort()];
  const el = $(elId);
  el.innerHTML = cats.map(c => `<button class="chip ${current === c ? 'active' : ''}" data-${attr}="${esc(c)}">${esc(c)}</button>`).join('');
  el.querySelectorAll('[data-' + attr + ']').forEach(b => b.addEventListener('click', () => onPick(b.dataset[attr])));
}
function allCategories() { return [...CATEGORIES, ...[...new Set(products.map(p => p.category))].filter(c => !CATEGORIES.includes(c)).sort()]; }

const PAGE_TITLES = { dashboard: 'Dashboard', pos: 'Cashier', inventory: 'Inventory', transactions: 'Transactions' };
function navigate(page) {
  activePage = page;
  document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
  $('page-' + page).classList.remove('hidden');
  document.querySelectorAll('.nav button').forEach(b => b.classList.toggle('active', b.dataset.page === page));
  $('topTitle').textContent = PAGE_TITLES[page];
  $('sidebar').classList.remove('open');
  renderPage();
  if (page === 'pos') $('posSearch').focus();
  window.scrollTo(0, 0);
}
function renderPage() {
  navBadge(); updateHeldBadge(); saveState();
  if (activePage === 'dashboard') renderDashboard();
  if (activePage === 'pos') renderPOS();
  if (activePage === 'inventory') renderInventory();
  if (activePage === 'transactions') renderTransactions();
}
const renderAll = renderPage;
function navBadge() { const n = products.filter(p => p.stock <= p.reorder).length, e = $('navLowCount'); e.textContent = n; e.classList.toggle('hidden', !n); }
function login() {
  $('loginScreen').classList.add('hidden'); $('app').classList.remove('hidden');
  $('todayLabel').textContent = new Date().toLocaleDateString('en-PH', { weekday: 'long', month: 'short', day: 'numeric' });
  navigate('dashboard');
}

/* ---------- 5. Dashboard ---------- */
const kpi = (cls, label, value, note, icon, extra = '', tag = 'article', attr = '') =>
  `<${tag} class="kpi ${cls}" ${attr}><div class="kpi-label">${label}</div><div class="kpi-value">${value}</div>${note}${icon ? `<span class="kpi-ico">${ico(icon)}</span>` : ''}${extra}</${tag}>`;

function renderDashboard() {
  const total = sales.reduce((a, o) => a + netOf(o), 0);
  const t0 = new Date(); t0.setHours(0, 0, 0, 0);
  const y0 = new Date(t0); y0.setDate(y0.getDate() - 1);
  const sumNet = f => sales.filter(f).reduce((a, o) => a + netOf(o), 0);
  const today = sumNet(o => new Date(o.created) >= t0), yest = sumNet(o => new Date(o.created) >= y0 && new Date(o.created) < t0);
  const note = yest > 0 ? (() => { const p = (today - yest) / yest * 100; return `<div class="kpi-note ${p >= 0 ? 'up' : 'down'}">${p >= 0 ? '▲ +' : '▼ '}${p.toLocaleString('en-PH', { maximumFractionDigits: 1 })}% today</div>`; })()
    : `<div class="kpi-note">${money(today)} sold today</div>`;
  const low = products.filter(p => p.stock <= p.reorder), out = products.filter(p => p.stock <= 0).length, lowOnly = low.length - out;
  const dashes = Array.from({ length: 6 }, (_, i) => `<i class="${i < Math.min(6, low.length) ? '' : 'off'}"></i>`).join('');
  $('dashStats').innerHTML =
    kpi('k-blue', 'Total sales', money(total), note, 'trend') +
    kpi('k-amber', 'Low stock items', lowOnly + ' product' + (lowOnly === 1 ? '' : 's'), `<div class="kpi-note">${out} more out of stock</div><div class="dashes">${dashes}</div>`, '', `<span class="kpi-alert">Alerts: ${low.length}</span>`, 'button', 'onclick="goInventory(\'Low Stock\')" aria-label="View low stock items"') +
    kpi('k-green', 'Total products', products.length + ' SKUs', `<div class="kpi-note">${products.reduce((n, p) => n + p.stock, 0).toLocaleString('en-PH')} units on hand</div>`, 'tag', '', 'button', 'onclick="goInventory(\'All\')" aria-label="View all products"');
  renderRevenue(); renderInvStatus(); renderLatestTx(); renderTopSelling();
}
function goInventory(filter) { $('stockFilter').value = filter; $('invCategory').value = 'All'; $('inventorySearch').value = ''; navigate('inventory'); }

/* monthly / yearly revenue, stacked by category */
function revenueBuckets() {
  const now = new Date(), first = sales.length ? new Date(Math.min(...sales.map(o => +new Date(o.created)))) : now, b = [];
  if (revMode === 'yearly') {
    for (let y = first.getFullYear(); y <= now.getFullYear(); y++) b.push({ label: String(y), test: d => d.getFullYear() === y });
  } else {
    const start = revRange === 'year' ? new Date(now.getFullYear(), 0, 1) : revRange === 'last6' ? new Date(now.getFullYear(), now.getMonth() - 5, 1) : revRange === 'last12' ? new Date(now.getFullYear(), now.getMonth() - 11, 1) : new Date(first.getFullYear(), first.getMonth(), 1);
    for (let d = new Date(start); d <= now; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) {
      const y = d.getFullYear(), m = d.getMonth();
      b.push({ label: d.toLocaleDateString('en-PH', { month: 'short' }) + (m === 0 || !b.length ? ' ' + y : ''), full: d.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' }), test: x => x.getFullYear() === y && x.getMonth() === m, year: y });
    }
  }
  return b.slice(-36);
}
const REV_COLORS = ['#1c4a86', '#3a7cc4', '#7db7ea', '#b6d9f5', '#d9e8f5'];
function renderRevenue() {
  const buckets = revenueBuckets(), catTot = {};
  buckets.forEach(b => {
    b.cats = {}; b.total = 0;
    sales.forEach(o => { if (!b.test(new Date(o.created))) return; o.items.forEach(i => { const v = lineNet(o, i); if (v <= 0) return; const c = i.category || 'Other'; b.cats[c] = (b.cats[c] || 0) + v; b.total += v; catTot[c] = (catTot[c] || 0) + v; }); });
  });
  const top = Object.entries(catTot).sort((a, b) => b[1] - a[1]).map(e => e[0]), shown = top.slice(0, 4), hasOther = top.length > 4, layers = [...shown, ...(hasOther ? ['Other'] : [])];
  const grand = buckets.reduce((a, b) => a + b.total, 0);
  const years = [...new Set(buckets.map(b => b.year).filter(Boolean))];
  $('revTitle').textContent = revMode === 'yearly' ? 'Yearly revenue' : years.length > 1 ? years[0] + ' – ' + years[years.length - 1] : String(years[0] || new Date().getFullYear());
  $('revSub').textContent = 'Total revenue: ' + money(grand);
  $('revRange').classList.toggle('hidden', revMode === 'yearly');
  document.querySelectorAll('#revModeSeg button').forEach(x => x.classList.toggle('on', x.dataset.m === revMode));
  if (grand <= 0) { $('revChart').innerHTML = '<div class="empty"><strong>No sales yet</strong>Completed sales from the Cashier will appear here.</div>'; $('revLegend').innerHTML = ''; return; }
  const W = 780, H = 290, L = 46, R = 12, T = 16, B = 34, cw = W - L - R, ch = H - T - B, n = buckets.length, step = cw / n, bw = Math.min(46, step * .55);
  const max = niceMax(Math.max(...buckets.map(b => b.total)));
  let grid = '';
  for (let i = 0; i <= 4; i++) { const y = T + ch - ch * i / 4; grid += `<line class="chart-grid" x1="${L}" x2="${W - R}" y1="${y}" y2="${y}"/><text x="${L - 8}" y="${y + 3.5}" text-anchor="end">${fmtK(max * i / 4)}</text>`; }
  const skip = n > 16 ? Math.ceil(n / 12) : 1;
  const bars = buckets.map((b, i) => {
    const x = L + step * i + (step - bw) / 2; let y = T + ch, segs = '';
    layers.forEach((c, li) => {
      const v = c === 'Other' ? Object.entries(b.cats).filter(([k]) => !shown.includes(k)).reduce((a, e) => a + e[1], 0) : (b.cats[c] || 0);
      if (v <= 0) return; const h = ch * v / max; y -= h;
      segs += `<rect class="seg-rect" x="${x}" y="${y}" width="${bw}" height="${Math.max(h, 1)}" fill="${REV_COLORS[layers.length - 1 - li < 0 ? 0 : (layers.length - 1 - li)]}" rx="${3}"><title>${esc(b.full || b.label)} · ${esc(c)}: ${money(v)}</title></rect>`;
    });
    return `<g>${segs}${i % skip === 0 ? `<text x="${x + bw / 2}" y="${H - B + 18}" text-anchor="middle">${esc(b.label)}</text>` : ''}</g>`;
  }).join('');
  $('revChart').innerHTML = `<div class="chart-bg"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${revMode} revenue stacked by category">${grid}${bars}</svg></div>`;
  $('revLegend').innerHTML = layers.map((c, li) => `<span><i class="dot sq" style="background:${REV_COLORS[layers.length - 1 - li]}"></i>${esc(c)}</span>`).join('');
}

function renderInvStatus() {
  const out = products.filter(p => p.stock <= 0).length, low = products.filter(p => p.stock > 0 && p.stock <= p.reorder).length, high = products.length - out - low, mx = Math.max(out, low, high, 1);
  const col = (n, label, color) => `<div class="inv-col"><b>${n}</b><div class="track"><div class="bar" style="height:${Math.max(6, n / mx * 120)}px;background:${color}"></div></div><span>${label}</span></div>`;
  $('invStatus').innerHTML = col(out, 'Out of Stock', '#e8834a') + col(low, 'Low', '#f0b13c') + col(high, 'High', '#34b36b');
}

function renderLatestTx() {
  const p = $('txPeriod').value; $('txTitle').textContent = PERIODS[p];
  const list = sales.filter(o => inPeriod(o.created, p)).sort((a, b) => new Date(b.created) - new Date(a.created)).slice(0, 6);
  $('latestTx').innerHTML = tableHTML(['Transaction ID', 'Product', 'Amount', 'Status'], list.map(o => [`<span class="tid">${esc(o.id)}</span>`, itemsLabel(o), `<span class="num">${money(o.total)}</span>`, statusPill(saleStatus(o))]), 'No transactions in this period.');
}

const DONUT = ['#3b82f6', '#f08a3c', '#8b5cf6', '#a3d94a', '#22c55e'], DONUT_BG = ['#dbeafe', '#fde6d2', '#e9defd', '#eef8d3', '#d6f5e1'];
function renderTopSelling() {
  const period = $('topPeriod').value;
  $('topTitle2').textContent = PERIODS[period];
  const totals = {};
  sales.filter(o => inPeriod(o.created, period)).forEach(o => {
    o.items.forEach(item => {
      const quantity = item.qty - (item.refunded || 0);
      if (quantity > 0) totals[item.name] = (totals[item.name] || 0) + quantity;
    });
  });
  const top = Object.entries(totals).sort((a, b) => b[1] - a[1]).slice(0, 6);
  if (!top.length) {
    $('topSelling').innerHTML = '<div class="empty"><strong>No sales in this period</strong>Top selling products will appear here.</div>';
    return;
  }
  const maxQty = Math.max(...top.map(([, quantity]) => quantity), 1);
  $('topSelling').innerHTML = `<div class="selling-chart" role="img" aria-label="Top selling products horizontal bar chart">${top.map(([name, quantity], index) => {
    const width = Math.max(3, quantity / maxQty * 100);
    return `<div class="selling-item"><div class="selling-label"><span class="selling-name" title="${esc(name)}">${esc(name)}</span><strong>${quantity.toLocaleString('en-PH')} <small>units</small></strong></div><div class="selling-track"><span class="selling-bar" style="width:${width}%"></span></div></div>`;
  }).join('')}</div>`;
}

/* ---------- 6. Cashier (sell, hold, pay, receipt) ---------- */
function posFiltered() {
  const q = ($('posSearch')?.value || '').trim().toLowerCase(), sort = $('posSort')?.value || 'category';
  const list = products.filter(p => (posCat === 'All' || p.category === posCat) && (!q || (p.name + ' ' + p.sku + ' ' + p.barcode + ' ' + p.category).toLowerCase().includes(q)));
  return list.sort((a, b) => sort === 'price-low' ? a.price - b.price : sort === 'price-high' ? b.price - a.price : sort === 'stock' ? a.stock - b.stock : sort === 'name' ? a.name.localeCompare(b.name) : byCategoryThenName(a, b));
}
const posEntries = () => Object.entries(posCart).filter(([id, q]) => q > 0 && products.some(p => p.id === id)).map(([id, q]) => ({ p: products.find(p => p.id === id), q }));
function posCalc() {
  const es = posEntries(), subtotal = round2(es.reduce((n, e) => n + e.p.price * e.q, 0)), t = posDisc.type, v = Number(posDisc.value) || 0;
  let disc = 0, label = '';
  if (t === 'senior') { disc = subtotal * .2; label = 'Senior citizen 20%'; }
  else if (t === 'pwd') { disc = subtotal * .2; label = 'PWD 20%'; }
  else if (t === 'pct') { disc = subtotal * Math.min(Math.max(v, 0), 100) / 100; label = 'Discount ' + v + '%'; }
  else if (t === 'amt') { disc = Math.max(v, 0); label = 'Discount'; }
  disc = Math.min(round2(disc), subtotal);
  return { es, subtotal, disc, label, total: round2(subtotal - disc), count: es.reduce((n, e) => n + e.q, 0) };
}
function renderPOS() {
  categoryChips('posCategoryChips', posCat, 'pcat', c => { posCat = c; renderPOS(); });
  const list = posFiltered();
  $('posGrid').innerHTML = list.length ? list.map(p => {
    const st = stockStatus(p), inCart = posCart[p.id] || 0;
    return `<button class="pos-tile" ${p.stock > 0 ? '' : 'disabled'} onclick="posAdd('${p.id}')" aria-label="Add ${esc(p.name)}"><span class="pos-img">${imgTag(p, 'pos-photo')}</span>${st !== 'In Stock' ? `<span class="badge ${stockBadgeClass(st)}">${stockLabel(st)}</span>` : ''}${inCart ? `<span class="in-cart">${inCart}</span>` : ''}<strong>${esc(p.name)}</strong><span class="pos-price">${money(p.price)}</span><small>${p.stock} ${esc(p.unit)} · ${esc(p.sku)}</small></button>`;
  }).join('') : `<div class="empty" style="grid-column:1/-1"><strong>No matching products</strong>Try another search, or <button class="outline small" onclick="openProductModal()">add this product</button></div>`;
  renderPosCart();
}
function renderPosCart() {
  const c = posCalc();
  $('posCount').textContent = c.count + ' item' + (c.count === 1 ? '' : 's');
  $('posLines').innerHTML = c.es.length ? c.es.map(({ p, q }) => `<div class="cart-line"><div><strong>${esc(p.name)}</strong><small>${money(p.price)} × ${q} = ${money(p.price * q)}</small><div class="qty-controls"><button aria-label="Decrease ${esc(p.name)}" onclick="posQty('${p.id}',-1)">−</button><input class="qty-input" type="number" min="1" max="${p.stock}" value="${q}" aria-label="Quantity of ${esc(p.name)}" onchange="posSetQty('${p.id}',this.value)"><button aria-label="Increase ${esc(p.name)}" onclick="posQty('${p.id}',1)">+</button></div></div><button class="danger small" aria-label="Remove ${esc(p.name)}" onclick="posRemove('${p.id}')">×</button></div>`).join('')
    : '<div class="empty"><strong>No items yet</strong>Tap a product or scan a barcode.</div>';
  const vat = c.total - c.total / 1.12;
  $('posSummary').innerHTML = `<div class="cart-total"><span>Subtotal</span><strong>${money(c.subtotal)}</strong></div>${c.disc > 0 ? `<div class="cart-total"><span>${esc(c.label)}</span><strong>−${money(c.disc)}</strong></div>` : ''}<div class="cart-total"><span class="muted">VAT (12%) included</span><span class="muted">${money(vat)}</span></div><div class="cart-total final"><span>Total</span><span>${money(c.total)}</span></div>`;
  const b = $('posChargeBtn'); b.textContent = c.es.length ? 'Charge ' + money(c.total) + '  (F9)' : 'Charge'; b.disabled = !c.es.length; b.style.opacity = c.es.length ? 1 : .55;
  $('posHoldBtn').disabled = !c.es.length;
  const mb = $('posMobileBar'); mb.classList.toggle('hidden', !c.es.length); mb.textContent = 'View sale · ' + c.count + ' item' + (c.count === 1 ? '' : 's') + ' · ' + money(c.total);
}
function posAdd(id) {
  const p = products.find(p => p.id === id);
  if (!p || p.stock <= 0) return toast('This item is out of stock.', 'error');
  if ((posCart[id] || 0) >= p.stock) return toast('Only ' + p.stock + ' ' + p.unit + ' available.', 'error');
  posCart[id] = (posCart[id] || 0) + 1; renderPOS();
}
function posQty(id, d) {
  const p = products.find(p => p.id === id), n = (posCart[id] || 0) + d;
  if (n <= 0) delete posCart[id]; else if (n > p.stock) return toast('Only ' + p.stock + ' ' + p.unit + ' available.', 'error'); else posCart[id] = n;
  renderPOS();
}
function posSetQty(id, v) {
  const p = products.find(p => p.id === id), n = Math.floor(Number(v));
  if (!n || n <= 0) delete posCart[id]; else if (n > p.stock) { posCart[id] = p.stock; toast('Only ' + p.stock + ' ' + p.unit + ' available.', 'error'); } else posCart[id] = n;
  renderPOS();
}
function posRemove(id) { delete posCart[id]; renderPOS(); }
function resetPosSale() { posCart = {}; posDisc = { type: 'none', value: 0 }; syncDiscUI(); const c = $('posCustomer'); if (c) c.value = ''; }
function syncDiscUI() {
  const t = $('posDiscType'); if (!t) return;
  t.value = posDisc.type; const show = posDisc.type === 'pct' || posDisc.type === 'amt';
  $('posDiscValWrap').classList.toggle('hidden', !show); $('posDiscLabel').textContent = posDisc.type === 'pct' ? 'Percent (%)' : 'Amount (₱)'; $('posDiscVal').value = show && posDisc.value ? posDisc.value : '';
}
function confirmClearSale() {
  if (!posEntries().length) return;
  showModal('Clear this sale?', `<p>All items in the current sale will be removed.</p>`, [
    { label: 'Keep sale', class: 'secondary', action: closeModal },
    { label: 'Clear sale', class: 'danger', action: () => { resetPosSale(); closeModal(); renderPOS(); } }]);
}

/* A scanned / typed code: add the item to the sale, or offer to add the new product. Returns true if handled. */
function posByCode(raw) {
  const q = String(raw || '').trim(); if (!q) return false;
  const m = products.find(p => p.barcode && p.barcode === q) || products.find(p => p.sku.toLowerCase() === q.toLowerCase());
  if (m) { posAdd(m.id); return true; }
  return false;
}
function codeNotFound(code) {
  closeScanner();
  showModal('Barcode not in the system', `<p>No product uses the code <strong>${esc(code)}</strong> yet.</p><p class="muted">Do you want to add it as a new product?</p>`, [
    { label: 'Not now', class: 'secondary', action: closeModal },
    { label: 'Add this product', class: 'primary', action: () => openProductModal({ barcode: code }) }], { noFocus: true });
}

/* Hold / resume */
function updateHeldBadge() { const b = $('heldCount'); if (b) { b.textContent = held.length; b.className = 'badge ' + (held.length ? 'b-amber' : 'b-gray'); } }
function holdSale() {
  const c = posCalc(); if (!c.es.length) return toast('Nothing to hold. Add items first.', 'error');
  held.unshift({ id: 'HOLD-' + String(Date.now()).slice(-5), time: new Date().toISOString(), cart: { ...posCart }, customer: $('posCustomer').value.trim(), disc: { ...posDisc } });
  resetPosSale(); saveState(); renderPOS(); updateHeldBadge(); toast('Sale put on hold.');
}
function openHeld() {
  const rows = held.map(h => {
    const items = Object.entries(h.cart).filter(([id]) => products.some(p => p.id === id)), count = items.reduce((n, [, q]) => n + q, 0), sub = items.reduce((n, [id, q]) => n + products.find(p => p.id === id).price * q, 0);
    return [`<strong>${esc(h.id)}</strong><div class="subline">${esc(h.customer || 'Walk-in customer')}</div>`, dateTime(h.time), count + ' item(s)', money(sub), `<button class="primary small" onclick="resumeHeld('${h.id}')">Resume</button> <button class="danger small" onclick="deleteHeld('${h.id}')">Delete</button>`];
  });
  showModal('Held sales', tableHTML(['Hold ID', 'Time', 'Items', 'Subtotal', ''], rows, 'No held sales.'), [{ label: 'Close', class: 'secondary', action: closeModal }], { wide: true, noFocus: true });
}
function resumeHeld(id) {
  const h = held.find(x => x.id === id); if (!h) return;
  if (Object.keys(posCart).length) return toast('Hold or clear the current sale first.', 'error');
  posCart = { ...h.cart }; posDisc = { ...h.disc }; held = held.filter(x => x.id !== id); saveState();
  $('posCustomer').value = h.customer || ''; syncDiscUI(); closeModal(); renderPOS(); updateHeldBadge(); toast('Sale resumed.');
}
function deleteHeld(id) { held = held.filter(x => x.id !== id); saveState(); updateHeldBadge(); openHeld(); }

/* Payment */
function openPayment() {
  const c = posCalc(); if (!c.es.length) return toast('Add items to the sale first.', 'error');
  for (const e of c.es) if (e.q > e.p.stock) return toast('Only ' + e.p.stock + ' ' + e.p.unit + ' of ' + e.p.name + ' left. Adjust the quantity.', 'error');
  const quick = [...new Set([c.total, Math.ceil(c.total / 50) * 50, Math.ceil(c.total / 100) * 100, Math.ceil(c.total / 500) * 500, Math.ceil(c.total / 1000) * 1000])].filter(v => v >= c.total).slice(0, 5);
  showModal('Take payment', `<div class="pay-due"><span>Amount due</span><strong>${money(c.total)}</strong></div><label for="payMethod">Payment method</label><select id="payMethod">${PAY_METHODS.map(m => `<option>${m}</option>`).join('')}</select><div id="cashBox"><label for="payTendered">Cash received (₱)</label><input id="payTendered" type="number" min="0" step="0.01" inputmode="decimal" placeholder="0.00"><div class="quick-cash">${quick.map((v, i) => `<button type="button" class="outline small" data-q="${v}">${i === 0 ? 'Exact' : money(v)}</button>`).join('')}</div></div><div id="refBox" class="hidden"><label for="payRef">Reference no. (optional)</label><input id="payRef" placeholder="Transaction / reference number"></div><div class="change-box"><span id="changeLabel">Change</span><strong id="payChange">${money(0)}</strong></div>`,
    [{ label: 'Cancel', class: 'secondary', action: closeModal }, { label: 'Complete sale', class: 'primary', action: submitPayment }]);
  const method = $('payMethod'), tendered = $('payTendered');
  const update = () => {
    const cash = method.value === 'Cash'; $('cashBox').classList.toggle('hidden', !cash); $('refBox').classList.toggle('hidden', cash);
    const diff = round2((Number(tendered.value) || 0) - c.total);
    $('changeLabel').textContent = cash && diff < 0 ? 'Still needed' : 'Change';
    $('payChange').textContent = cash ? money(Math.abs(diff)) : money(0); $('payChange').style.color = cash && diff < 0 ? '#b12b32' : '';
  };
  method.addEventListener('change', update); tendered.addEventListener('input', update);
  tendered.addEventListener('keydown', e => { if (e.key === 'Enter') submitPayment(); });
  document.querySelectorAll('[data-q]').forEach(b => b.addEventListener('click', () => { tendered.value = b.dataset.q; update(); }));
  tendered.focus();
}
function submitPayment() {
  const c = posCalc(), method = $('payMethod').value; let tendered = c.total, change = 0, ref = '';
  if (method === 'Cash') {
    tendered = round2(Number($('payTendered').value));
    if (!(tendered >= c.total)) return toast('Cash received is less than the amount due.', 'error');
    change = round2(tendered - c.total);
  } else ref = $('payRef').value.trim();
  finishSale(method, tendered, change, ref);
}
function finishSale(method, tendered, change, ref) {
  const c = posCalc(), now = new Date().toISOString();
  for (const e of c.es) if (e.q > e.p.stock) { closeModal(); return toast('Stock changed for ' + e.p.name + '. Review the sale.', 'error'); }
  c.es.forEach(e => e.p.stock -= e.q);
  const o = { id: nextSaleId(now), customer: $('posCustomer').value.trim() || 'Walk-in customer', items: c.es.map(e => ({ productId: e.p.id, name: e.p.name, price: e.p.price, qty: e.q, category: e.p.category, refunded: 0 })), subtotal: c.subtotal, discount: { label: c.label, amount: c.disc }, total: c.total, status: 'Completed', created: now, payment: { method, tendered, change, ref }, cashier: 'Admin', refunds: [], refunded: 0 };
  sales.unshift(o);
  resetPosSale(); closeModal(); renderAll(); showSaleDone(o);
}
function showSaleDone(o) {
  showModal('Sale complete', `<div style="text-align:center;padding:10px 0 14px"><div style="font-size:40px;color:#24865b">✓</div><h2 style="margin:6px 0 2px">${money(o.total)}</h2><div class="muted">${esc(o.id)} · ${esc(o.payment.method)}</div></div><div class="receipt"><div class="receipt-row"><span>Amount received</span><strong>${money(o.payment.tendered)}</strong></div><div class="receipt-row total"><span>Change</span><span>${money(o.payment.change)}</span></div></div>`,
    [{ label: 'Print receipt', class: 'outline', action: () => printReceipt(o.id) }, { label: 'New sale', class: 'primary', action: () => { closeModal(); $('posSearch').focus(); } }], { noFocus: true });
}

/* ---------- 7. Add / edit product, restock, barcode scanner ---------- */
let pmPhoto = '', pmTouchedSku = false, pmLastCode = '', pmEditId = null;
const PM_NEW_CAT = '__new__';

function resizeImage(file, max = 520) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onerror = rej;
    r.onload = () => {
      const img = new Image();
      img.onerror = rej;
      img.onload = () => {
        const s = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(img.width * s)); c.height = Math.max(1, Math.round(img.height * s));
        const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height);
        res(c.toDataURL('image/jpeg', .82));
      };
      img.src = r.result;
    };
    r.readAsDataURL(file);
  });
}
function autoSku(cat) {
  const pre = String(cat || '').replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || 'GEN', used = new Set(products.map(p => p.sku.toUpperCase()));
  let n = 1; while (used.has(pre + '-' + pad(n, 3))) n++;
  return pre + '-' + pad(n, 3);
}
function productFormHTML(p, preBarcode = '') {
  const cats = allCategories(), cur = p?.category || cats[0], units = UNITS.includes(p?.unit) || !p ? UNITS : [...UNITS, p.unit];
  const link = p && p.image && !p.image.startsWith('data:') ? p.image : '';
  return `
  <div class="bc-block">
    <label for="pmBarcode">Barcode</label>
    <div class="bc-row"><input id="pmBarcode" inputmode="numeric" autocomplete="off" placeholder="Scan or type barcode" value="${esc(p?.barcode || preBarcode)}"><button type="button" class="outline" id="pmScanBtn">📷 Scan camera</button></div>
    <div class="field-help">${p ? 'Change the barcode only if the label is different.' : 'Scan the item first. If it is already in your system, you only enter how many were added. New code? Fill in the details below.'}</div>
  </div>
  <div class="pm-photo">
    <div class="pm-preview" id="pmPreview"></div>
    <div><div class="pm-photo-btns"><button type="button" class="outline small" id="pmUpload">Upload photo</button><button type="button" class="outline small" id="pmCamera">Take photo</button><button type="button" class="danger small" id="pmRemovePhoto">Remove</button></div><div class="field-help">A picture helps the cashier recognize the item. Photos are resized automatically.</div></div>
  </div>
  <input type="file" id="pmFile" accept="image/*" class="hidden"><input type="file" id="pmCam" accept="image/*" capture="environment" class="hidden">
  <div class="form-grid">
    <div class="full"><label for="pmName">Product name *</label><input id="pmName" placeholder="e.g. Masonry trowel" value="${esc(p?.name || '')}"></div>
    <div><label for="pmCategory">Category *</label><select id="pmCategory">${cats.map(c => `<option ${c === cur ? 'selected' : ''}>${esc(c)}</option>`).join('')}<option value="${PM_NEW_CAT}">＋ New category…</option></select></div>
    <div id="pmNewCatWrap" class="hidden"><label for="pmNewCat">New category name *</label><input id="pmNewCat" placeholder="e.g. Glass"></div>
    <div><label for="pmSku">SKU *</label><div class="bc-row"><input id="pmSku" placeholder="e.g. TLS-012" value="${esc(p?.sku || autoSku(cur))}"><button type="button" class="outline small" id="pmAutoSku">Auto</button></div></div>
    <div><label for="pmCost">Cost price (₱)</label><input id="pmCost" type="number" min="0" step="0.01" inputmode="decimal" placeholder="What you paid" value="${p?.cost || ''}"></div>
    <div><label for="pmPrice">Selling price (₱) *</label><input id="pmPrice" type="number" min="0.01" step="0.01" inputmode="decimal" placeholder="0.00" value="${p?.price ?? ''}"></div>
    <div class="full margin-hint" id="pmMargin"></div>
    <div><label for="pmStock">${p ? 'Stock on hand' : 'Quantity in stock'} *</label><input id="pmStock" type="number" min="0" step="1" inputmode="numeric" value="${p ? p.stock : 0}"></div>
    <div><label for="pmUnit">Unit</label><select id="pmUnit">${units.map(u => `<option ${u === (p?.unit || 'piece') ? 'selected' : ''}>${esc(u)}</option>`).join('')}</select></div>
    <div class="full"><label for="pmLink">Photo link (optional)</label><input id="pmLink" type="url" placeholder="https://… use this only if you have no photo file" value="${esc(link)}"></div>
  </div>`;
}
function pmUpdatePreview() {
  const src = pmPhoto || ($('pmLink').value.trim().match(/^https?:\/\//i) ? $('pmLink').value.trim() : ''), box = $('pmPreview');
  box.innerHTML = src ? `<img src="${esc(src)}" alt="Product photo" referrerpolicy="no-referrer">` : 'No photo yet';
  const im = box.querySelector('img'); if (im) im.onerror = () => { box.textContent = 'Photo can’t load'; };
}
function pmUpdateMargin() {
  const price = Number($('pmPrice').value), cost = Number($('pmCost').value);
  $('pmMargin').textContent = price > 0 && cost > 0 ? (price >= cost ? `Profit ${money(price - cost)} per unit (${Math.round((price - cost) / price * 100)}% margin)` : 'Selling price is lower than the cost price.') : '';
}
function pmLookup(raw) {
  const code = String(raw || '').trim();
  if (!code || code === pmLastCode) return; pmLastCode = code;
  if (pmEditId) return;
  const ex = products.find(p => (p.barcode && p.barcode === code) || p.sku.toLowerCase() === code.toLowerCase());
  if (ex) openRestockModal(ex, { fromScan: true });
  else { toast('New barcode. Fill in the product details.'); $('pmName').focus(); }
}
function bindProductForm() {
  pmUpdatePreview(); pmUpdateMargin();
  $('pmUpload').onclick = () => $('pmFile').click(); $('pmCamera').onclick = () => $('pmCam').click();
  ['pmFile', 'pmCam'].forEach(id => $(id).addEventListener('change', async e => {
    const f = e.target.files[0]; if (!f) return;
    try { pmPhoto = await resizeImage(f); $('pmLink').value = ''; pmUpdatePreview(); } catch (err) { toast('Could not read that photo. Try another one.', 'error'); }
    e.target.value = '';
  }));
  $('pmRemovePhoto').onclick = () => { pmPhoto = ''; $('pmLink').value = ''; pmUpdatePreview(); };
  $('pmLink').addEventListener('input', () => { if ($('pmLink').value.trim()) pmPhoto = ''; pmUpdatePreview(); });
  const cat = $('pmCategory'), skuFromCat = () => { const nc = cat.value === PM_NEW_CAT; $('pmNewCatWrap').classList.toggle('hidden', !nc); if (!pmTouchedSku) $('pmSku').value = autoSku(nc ? $('pmNewCat').value : cat.value); };
  cat.addEventListener('change', skuFromCat); $('pmNewCat').addEventListener('input', skuFromCat);
  $('pmSku').addEventListener('input', () => { pmTouchedSku = true; });
  $('pmAutoSku').onclick = () => { pmTouchedSku = false; skuFromCat(); };
  $('pmPrice').addEventListener('input', pmUpdateMargin); $('pmCost').addEventListener('input', pmUpdateMargin);
  const bc = $('pmBarcode');
  bc.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); pmLastCode = pmEditId ? pmLastCode : ''; pmLookup(bc.value); } });
  bc.addEventListener('change', () => pmLookup(bc.value));
  $('pmScanBtn').onclick = scanForProduct;
}
function scanForProduct() { openScanner('Scan the product barcode', code => { $('pmBarcode').value = code; pmLastCode = ''; pmLookup(code); }); }
function fail(msg, id) { toast(msg, 'error'); if (id && $(id)) $(id).focus(); return null; }
function readProductForm() {
  const name = $('pmName').value.trim(), sku = $('pmSku').value.trim(), barcode = $('pmBarcode').value.trim(), link = $('pmLink').value.trim();
  let category = $('pmCategory').value; if (category === PM_NEW_CAT) category = $('pmNewCat').value.trim();
  const price = Number($('pmPrice').value), cost = Number($('pmCost').value) || 0, stock = Number($('pmStock').value), reorder = pmEditId ? (products.find(p => p.id === pmEditId)?.reorder ?? 10) : 10, unit = $('pmUnit').value;
  if (!name) return fail('Enter the product name.', 'pmName');
  if (!category) return fail('Enter the new category name.', 'pmNewCat');
  if (!sku) return fail('Enter a SKU, or tap Auto.', 'pmSku');
  if (!(price > 0)) return fail('Enter the selling price.', 'pmPrice');
  if (cost < 0) return fail('Cost price cannot be negative.', 'pmCost');
  if (!Number.isInteger(stock) || stock < 0) return fail('Quantity must be a whole number, zero or more.', 'pmStock');
  const others = products.filter(p => p.id !== pmEditId);
  if (others.some(p => p.sku.toLowerCase() === sku.toLowerCase())) return fail('That SKU is already used. Enter a unique SKU.', 'pmSku');
  if (barcode && others.some(p => p.barcode === barcode)) return fail('That barcode already belongs to another product.', 'pmBarcode');
  if (others.some(p => p.name.toLowerCase() === name.toLowerCase())) return fail('A product with that name already exists.', 'pmName');
  return { name, sku, barcode, category, price: round2(price), cost: round2(cost), stock, reorder, unit, image: pmPhoto || (/^https?:\/\//i.test(link) ? link : '') };
}
function saveProduct(again) {
  const v = readProductForm(); if (!v) return;
  if (pmEditId) {
    Object.assign(products.find(p => p.id === pmEditId), v); closeModal(); renderAll(); toast('Product updated.');
  } else {
    products.push({ id: uid('P'), ...v }); closeModal(); renderAll();
    toast(v.name + ' added' + (v.stock ? ' with ' + v.stock + ' ' + v.unit + ' in stock.' : '.'));
    if (again) openProductModal({ autoScan: true });
  }
}
function openProductModal(opts = {}) {
  const edit = opts.product || null;
  pmEditId = edit ? edit.id : null; pmPhoto = edit && edit.image && edit.image.startsWith('data:') ? edit.image : ''; pmTouchedSku = !!edit; pmLastCode = opts.barcode || (edit ? edit.barcode : '') || '';
  const buttons = edit ? [{ label: 'Cancel', class: 'secondary', action: closeModal }, { label: 'Save changes', class: 'primary', action: () => saveProduct(false) }]
    : [{ label: 'Cancel', class: 'secondary', action: closeModal }, { label: 'Save & add another', class: 'outline', action: () => saveProduct(true) }, { label: 'Save product', class: 'primary', action: () => saveProduct(false) }];
  showModal(edit ? 'Edit product' : 'Add product', productFormHTML(edit, opts.barcode || ''), buttons, { wide: true, noFocus: true });
  bindProductForm();
  if (edit) $('pmName').focus(); else { $('pmBarcode').focus(); if (opts.autoScan) scanForProduct(); }
}

/* Add stock to an existing product (after a scan, or from Inventory) */
function openRestockModal(p, opts = {}) {
  const body = `<div class="restock-prod">${imgTag(p, 'restock-photo')}<div><strong>${esc(p.name)}</strong><div class="subline">${esc(p.sku)}${p.barcode ? ' · ' + esc(p.barcode) : ''} · ${esc(p.category)}</div>${opts.fromScan ? '<div class="subline" style="color:#1f9a5b;font-weight:600">Already in your system</div>' : ''}</div></div>
    <div class="notice">Current stock: <strong>${p.stock} ${esc(p.unit)}</strong></div>
    <label for="rsQty">How many were added? (${esc(p.unit)})</label>
    <input id="rsQty" class="big-input" type="number" min="1" step="1" inputmode="numeric" value="1">
    <div class="quick-cash">${[1, 5, 10, 20, 50, 100].map(n => `<button type="button" class="outline small" data-add="${n}">+${n}</button>`).join('')}</div>
    <div class="form-grid"><div><label for="rsPrice">Selling price (₱)</label><input id="rsPrice" type="number" min="0.01" step="0.01" value="${p.price}"></div><div><label for="rsCost">Cost price (₱)</label><input id="rsCost" type="number" min="0" step="0.01" value="${p.cost || ''}"></div></div>
    <div class="change-box"><span>Stock after adding</span><strong id="rsNew">${p.stock + 1} ${esc(p.unit)}</strong></div>`;
  const buttons = [opts.fromScan ? { label: 'Not this product', class: 'secondary', action: () => openProductModal() } : { label: 'Cancel', class: 'secondary', action: closeModal }];
  if (opts.fromScan) buttons.push({ label: 'Add & scan next', class: 'outline', action: () => saveRestock(p, true) });
  buttons.push({ label: 'Add stock', class: 'primary', action: () => saveRestock(p, false) });
  showModal('Add stock', body, buttons, { noFocus: true });
  const q = $('rsQty'), upd = () => { $('rsNew').textContent = (p.stock + (Math.floor(Number(q.value)) || 0)) + ' ' + p.unit; };
  q.addEventListener('input', upd); q.addEventListener('keydown', e => { if (e.key === 'Enter') saveRestock(p, !!opts.fromScan && false); });
  document.querySelectorAll('[data-add]').forEach(b => b.addEventListener('click', () => { q.value = (Math.floor(Number(q.value)) || 0) + Number(b.dataset.add); upd(); }));
  q.focus(); q.select();
}
function saveRestock(p, scanNext) {
  const n = Number($('rsQty').value), price = Number($('rsPrice').value), cost = Number($('rsCost').value) || 0;
  if (!Number.isInteger(n) || n <= 0) return toast('Enter how many were added (a whole number, 1 or more).', 'error');
  if (!(price > 0)) return toast('Enter a valid selling price.', 'error');
  p.stock += n; p.price = round2(price); p.cost = round2(cost);
  closeModal(); renderAll(); toast(`+${n} ${p.unit} added to ${p.name}. Stock is now ${p.stock}.`);
  if (scanNext) openProductModal({ autoScan: true });
}

/* Barcode scanner (phone/PC camera). USB and Bluetooth scanners work too: they type the code and press Enter. */
const scan = { stream: null, timer: null, h5: null, busy: false, last: '', lastT: 0 };
function beep() { try { const a = new (window.AudioContext || window.webkitAudioContext)(), o = a.createOscillator(), g = a.createGain(); o.frequency.value = 880; g.gain.value = .08; o.connect(g); g.connect(a.destination); o.start(); setTimeout(() => { o.stop(); a.close(); }, 110); } catch (e) { } }
function loadH5() { return new Promise((res, rej) => { if (window.Html5Qrcode) return res(); const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/html5-qrcode@2.3.8/html5-qrcode.min.js'; s.onload = res; s.onerror = rej; document.head.appendChild(s); }); }
function openScanner(title, onCode, continuous = false) {
  closeScanner();
  $('scanRoot').innerHTML = `<div class="modal-backdrop" role="presentation"><section class="modal" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="modal-head"><h3>${esc(title)}</h3><button class="close-btn" aria-label="Close scanner" onclick="closeScanner()">✕</button></div><div class="modal-body"><div class="scan-box"><video id="scanVideo" playsinline muted></video><div id="scanReader"></div><div class="scan-frame" id="scanFrame"></div></div><p id="scanStatus" class="muted tiny" style="margin:10px 0 0">Starting camera…</p><label for="scanManual">Or type the code / use a barcode scanner</label><input id="scanManual" inputmode="numeric" autocomplete="off" placeholder="Type or scan code, then press Enter"></div><div class="modal-foot"><button class="secondary" onclick="closeScanner()">${continuous ? 'Done' : 'Cancel'}</button></div></section></div>`;
  const handle = raw => {
    const code = String(raw || '').trim(), now = Date.now(); if (!code) return;
    if (code === scan.last && now - scan.lastT < 2200) return;
    scan.last = code; scan.lastT = now; beep();
    if (!continuous) closeScanner();
    onCode(code);
  };
  $('scanManual').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); const v = e.target.value; e.target.value = ''; scan.last = ''; handle(v); } });
  startCamera(handle);
}
async function startCamera(handle) {
  const say = t => { const s = $('scanStatus'); if (s) s.textContent = t; };
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return say('The camera is not available here (it needs https or localhost). You can still type or scan the code below.');
  try {
    if ('BarcodeDetector' in window) {
      let formats; try { const sup = await BarcodeDetector.getSupportedFormats(); formats = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'itf', 'qr_code'].filter(f => sup.includes(f)); } catch (e) { }
      const det = new BarcodeDetector(formats && formats.length ? { formats } : undefined);
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
      const v = $('scanVideo'); if (!v) { stream.getTracks().forEach(t => t.stop()); return; }
      scan.stream = stream; v.srcObject = stream; await v.play();
      say('Point the camera at the barcode.');
      scan.timer = setInterval(async () => { if (scan.busy || v.readyState < 2) return; scan.busy = true; try { const r = await det.detect(v); if (r.length) handle(r[0].rawValue); } catch (e) { } scan.busy = false; }, 250);
    } else {
      say('Loading scanner…'); await loadH5(); if (!$('scanReader')) return;
      $('scanVideo').classList.add('hidden'); $('scanFrame').classList.add('hidden');
      scan.h5 = new Html5Qrcode('scanReader');
      await scan.h5.start({ facingMode: 'environment' }, { fps: 10, qrbox: { width: 260, height: 140 } }, t => handle(t), () => { });
      say('Point the camera at the barcode.');
    }
  } catch (e) { say(e && e.name === 'NotAllowedError' ? 'Camera permission was blocked. Allow camera access, or type the code below.' : 'Could not start the camera. You can still type or scan the code below.'); }
}
function closeScanner() {
  clearInterval(scan.timer); scan.timer = null;
  if (scan.stream) { scan.stream.getTracks().forEach(t => t.stop()); scan.stream = null; }
  if (scan.h5) { const h = scan.h5; scan.h5 = null; Promise.resolve().then(() => h.stop()).then(() => h.clear()).catch(() => { }); }
  const r = $('scanRoot'); if (r) r.innerHTML = '';
}

/* ---------- 8. Inventory ---------- */
function renderInventory() {
  const sel = $('invCategory'), cur = sel.value || 'All', cats = allCategories().filter(c => products.some(p => p.category === c));
  sel.innerHTML = '<option value="All">All categories</option>' + cats.map(c => `<option>${esc(c)}</option>`).join(''); sel.value = cats.includes(cur) ? cur : 'All';
  const out = products.filter(p => p.stock <= 0).length, low = products.filter(p => p.stock > 0 && p.stock <= p.reorder).length;
  $('inventoryStats').innerHTML = [['Products', products.length, 'SKUs in your catalog'], ['Units on hand', products.reduce((n, p) => n + p.stock, 0).toLocaleString('en-PH'), 'Across all products'], ['Low stock', low, 'At or below the alert level'], ['Out of stock', out, 'Needs restocking now']].map(([a, b, c]) => `<div class="stat"><span>${a}</span><strong>${b}</strong><small>${c}</small></div>`).join('');
  const q = $('inventorySearch').value.trim().toLowerCase(), filter = $('stockFilter').value, cat = sel.value;
  const rank = p => p.stock <= 0 ? 0 : p.stock <= p.reorder ? 1 : 2;
  const list = products.filter(p => (p.name + ' ' + p.sku + ' ' + p.barcode + ' ' + p.category).toLowerCase().includes(q) && (filter === 'All' || stockStatus(p) === filter) && (cat === 'All' || p.category === cat)).sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
  $('inventoryTable').innerHTML = tableHTML(['Product', 'Category', 'Stock', 'Price', 'Status', 'Actions'], list.map(p => {
    const pct = Math.min(100, p.stock / Math.max(p.reorder * 2, 1) * 100), col = p.stock <= 0 ? '#e8834a' : p.stock <= p.reorder ? '#f0b13c' : '#34b36b';
    return [`<div class="inv-product"><span class="inv-thumb">${imgTag(p, 'mini-product-photo')}</span><div><div class="item-name">${esc(p.name)}</div><div class="subline">${esc(p.sku)}${p.barcode ? ' · ' + esc(p.barcode) : ''}</div></div></div>`, esc(p.category), `<strong>${p.stock}</strong> ${esc(p.unit)}<div class="stock-bar"><i style="width:${pct}%;background:${col}"></i></div>`, `<span class="num">${money(p.price)}</span>`, stockBadge(p), `<div class="row-actions"><button class="primary small" onclick="openRestockById('${p.id}')">Add stock</button><button class="outline small" onclick="editProduct('${p.id}')">Edit</button><button class="danger small" onclick="deleteProduct('${p.id}')">Delete</button></div>`];
  }), 'No products match this filter.');
}
function openRestockById(id) { const p = products.find(x => x.id === id); if (p) openRestockModal(p); }
function editProduct(id) { const p = products.find(x => x.id === id); if (p) openProductModal({ product: p }); }
function deleteProduct(id) {
  const p = products.find(x => x.id === id); if (!p) return;
  showModal('Delete this product?', `<p><strong>${esc(p.name)}</strong> (${esc(p.sku)}) will be removed from the cashier and inventory.</p><div class="notice">Past transactions keep their records. This cannot be undone.</div>`, [
    { label: 'Keep product', class: 'secondary', action: closeModal },
    { label: 'Delete product', class: 'danger', action: () => { products = products.filter(x => x.id !== id); delete posCart[id]; closeModal(); renderAll(); toast('Product deleted.'); } }], { noFocus: true });
}

/* ---------- 9. Transactions, refunds, daily summary ---------- */
function renderTransactions() {
  const today = sales.filter(o => inPeriod(o.created, 'today')), refundTotal = sales.reduce((n, o) => n + refundedOf(o), 0);
  $('txStats').innerHTML = [['Today’s sales', money(today.reduce((n, o) => n + netOf(o), 0)), 'After refunds'], ['Transactions today', today.length, 'Receipts issued today'], ['All-time sales', money(sales.reduce((n, o) => n + netOf(o), 0)), sales.length + ' transactions'], ['Refunded', money(refundTotal), 'All time']].map(([a, b, c]) => `<div class="stat"><span>${a}</span><strong>${b}</strong><small>${c}</small></div>`).join('');
  const q = $('txSearch').value.trim().toLowerCase(), per = $('txFilterPeriod').value, st = $('txFilterStatus').value;
  const list = sales.filter(o => inPeriod(o.created, per) && (st === 'All' || saleStatus(o) === st) && (o.id + ' ' + o.customer + ' ' + o.items.map(i => i.name).join(' ')).toLowerCase().includes(q)).sort((a, b) => new Date(b.created) - new Date(a.created));
  $('txTable').innerHTML = tableHTML(['Transaction ID', 'Date', 'Customer', 'Product', 'Payment', 'Amount', 'Status', 'Actions'], list.slice(0, 250).map(o => [`<span class="tid">${esc(o.id)}</span>`, dateTime(o.created), esc(o.customer), itemsLabel(o), esc(o.payment?.method || '—'), `<span class="num">${money(o.total)}</span>${refundedOf(o) ? `<div class="subline">Refunded ${money(refundedOf(o))}</div>` : ''}`, statusPill(saleStatus(o)), `<div class="row-actions"><button class="outline small" onclick="viewSale('${o.id}')">View</button>${saleStatus(o) === 'Refunded' ? '' : `<button class="outline small" onclick="openRefund('${o.id}')">Refund</button>`}</div>`]), 'No transactions match this filter.');
}
function viewSale(id) {
  const o = sales.find(x => x.id === id); if (!o) return;
  const row = (a, b) => `<div class="receipt-row"><span>${a}</span><strong>${b}</strong></div>`;
  showModal('Transaction details', `<div class="receipt">${row('Receipt no.', esc(o.id))}${row('Date', dateTime(o.created))}${row('Customer', esc(o.customer))}${row('Cashier', esc(o.cashier || 'Admin'))}<div class="receipt-row"><span>Status</span>${statusPill(saleStatus(o))}</div>${o.payment ? row('Payment', esc(o.payment.method) + (o.payment.ref ? ' · ' + esc(o.payment.ref) : '')) : ''}<h4>Items</h4>${o.items.map(i => `<div class="receipt-row"><span>${esc(i.name)} × ${i.qty}${i.refunded ? ` <span class="badge b-red">${i.refunded} refunded</span>` : ''}</span><strong>${money(i.price * i.qty)}</strong></div>`).join('')}${o.discount?.amount > 0 ? row(esc(o.discount.label || 'Discount'), '−' + money(o.discount.amount)) : ''}<div class="receipt-row total"><span>Total</span><span>${money(o.total)}</span></div>${refundedOf(o) ? row('Refunded', '−' + money(refundedOf(o))) + row('Net amount', money(netOf(o))) : ''}${(o.refunds || []).length ? `<h4>Refunds</h4>${o.refunds.map(r => `<div class="receipt-row"><span>${dateTime(r.time)}<br><small class="muted">${esc(r.reason || '')}${r.restocked ? ' · returned to stock' : ''}</small></span><strong>−${money(r.amount)}</strong></div>`).join('')}` : ''}</div>`,
    [{ label: 'Close', class: 'secondary', action: closeModal }, { label: 'Print receipt', class: 'outline', action: () => printReceipt(id) }, ...(saleStatus(o) === 'Refunded' ? [] : [{ label: 'Refund', class: 'primary', action: () => openRefund(id) }])], { noFocus: true });
}
function openRefund(id) {
  const o = sales.find(x => x.id === id); if (!o) return;
  const rem = o.items.map((i, idx) => ({ i, idx, max: i.qty - (i.refunded || 0) })).filter(x => x.max > 0);
  if (!rem.length) return toast('This sale is already fully refunded.', 'error');
  showModal('Refund items', `<p class="muted">Receipt <strong>${esc(o.id)}</strong>. Enter how many of each item are being returned.</p>${rem.map(x => `<div class="receipt-row"><span>${esc(x.i.name)}<br><small class="muted">${money(x.i.price)} each · ${x.max} can be refunded</small></span><input class="qty-input rf-qty" style="width:84px" type="number" min="0" max="${x.max}" step="1" value="0" data-idx="${x.idx}" data-max="${x.max}" aria-label="Refund quantity for ${esc(x.i.name)}"></div>`).join('')}<div class="quick-cash"><button type="button" class="outline small" id="rfAll">Refund everything left</button></div><label for="rfReason">Reason</label><select id="rfReason"><option>Customer returned item</option><option>Wrong item</option><option>Damaged item</option><option>Price correction</option><option>Other</option></select><label style="display:flex;gap:8px;align-items:center;font-weight:500"><input id="rfRestock" type="checkbox" checked style="width:auto"> Return the items to inventory</label><div class="change-box" style="background:#fff1f1;color:#b12b32"><span>Give back to customer</span><strong id="rfAmount">${money(0)}</strong></div>`,
    [{ label: 'Cancel', class: 'secondary', action: closeModal }, { label: 'Confirm refund', class: 'danger', action: () => applyRefund(id) }], { noFocus: true });
  document.querySelectorAll('.rf-qty').forEach(el => el.addEventListener('input', () => { const mx = Number(el.dataset.max); let v = Math.floor(Number(el.value)) || 0; if (v > mx) { v = mx; el.value = mx; } if (v < 0) { v = 0; el.value = 0; } $('rfAmount').textContent = money(refundCalc(o).amount); }));
  $('rfAll').onclick = () => { document.querySelectorAll('.rf-qty').forEach(el => el.value = el.dataset.max); $('rfAmount').textContent = money(refundCalc(o).amount); };
}
function refundCalc(o) {
  const picks = [...document.querySelectorAll('.rf-qty')].map(el => ({ idx: Number(el.dataset.idx), q: Math.min(Number(el.dataset.max), Math.max(0, Math.floor(Number(el.value)) || 0)), max: Number(el.dataset.max) })).filter(x => x.q > 0);
  const everything = picks.length === document.querySelectorAll('.rf-qty').length && picks.every(x => x.q === x.max);
  const left = round2(o.total - refundedOf(o));
  const amount = everything ? left : Math.min(left, round2(picks.reduce((n, x) => n + o.items[x.idx].price * x.q * ratioOf(o), 0)));
  return { picks, amount };
}
function applyRefund(id) {
  const o = sales.find(x => x.id === id), { picks, amount } = refundCalc(o);
  if (!picks.length || amount <= 0) return toast('Enter the quantity to refund.', 'error');
  const restock = $('rfRestock').checked, reason = $('rfReason').value;
  picks.forEach(x => { const i = o.items[x.idx]; i.refunded = (i.refunded || 0) + x.q; if (restock) { const p = products.find(p => p.id === i.productId); if (p) p.stock += x.q; } });
  o.refunded = round2(refundedOf(o) + amount);
  (o.refunds = o.refunds || []).push({ time: new Date().toISOString(), amount, reason, restocked: restock, items: picks.map(x => ({ productId: o.items[x.idx].productId, name: o.items[x.idx].name, qty: x.q })) });
  o.status = saleStatus(o);
  closeModal(); renderAll(); toast('Refund of ' + money(amount) + ' recorded' + (o.payment?.method === 'Cash' ? '. Give the cash back to the customer.' : '.'));
}

/* Receipts & printing */
function printDoc(html) {
  const f = document.createElement('iframe'); f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0'; document.body.appendChild(f);
  const d = f.contentWindow.document; d.open(); d.write(html); d.close();
  setTimeout(() => { try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) { toast('Could not open the print dialog.', 'error'); } setTimeout(() => f.remove(), 2000); }, 300);
}
const printCSS = `<style>@page{margin:6mm}body{font:12px/1.4 'Courier New',monospace;width:72mm;margin:0 auto;color:#000}h1{font-size:15px;text-align:center;margin:0}.c{text-align:center}.r{display:flex;justify-content:space-between;gap:8px}.b{font-weight:bold;font-size:14px}hr{border:0;border-top:1px dashed #000;margin:7px 0}.it{margin-bottom:3px}.s{padding-left:8px}</style>`;
const printRow = (a, b, cls = '') => `<div class="r ${cls}"><span>${a}</span><span>${b}</span></div>`;
function receiptDoc(o) {
  const r = printRow, total = o.total, vatable = total / 1.12;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Receipt ${esc(o.id)}</title>${printCSS}</head><body><h1>RedJr Builders</h1><div class="c">&amp; Construction Supply</div><hr>${r('Receipt', esc(o.id))}${r('Date', dateTime(o.created))}${r('Customer', esc(o.customer))}${r('Cashier', esc(o.cashier || 'Admin'))}<hr>${o.items.map(i => `<div class="it"><div>${esc(i.name)}</div>${r('<span class="s">' + i.qty + ' × ' + money(i.price) + '</span>', money(i.price * i.qty))}</div>`).join('')}<hr>${r('Subtotal', money(o.subtotal))}${o.discount?.amount > 0 ? r(esc(o.discount.label || 'Discount'), '−' + money(o.discount.amount)) : ''}${r('TOTAL', money(total), 'b')}${r('VATable sales', money(vatable))}${r('VAT (12%)', money(total - vatable))}${refundedOf(o) ? r('Refunded', '−' + money(refundedOf(o))) + r('NET', money(netOf(o)), 'b') : ''}<hr>${o.payment ? r(esc(o.payment.method), money(o.payment.tendered)) + (o.payment.method === 'Cash' ? r('Change', money(o.payment.change)) : '') + (o.payment.ref ? r('Ref', esc(o.payment.ref)) : '') : r('Payment', 'Not recorded')}<hr><div class="c">Thank you for shopping with us!</div><div class="c" style="font-size:10px;margin-top:4px">Sales receipt · not an official BIR receipt</div></body></html>`;
}
function printReceipt(id) { const o = sales.find(x => x.id === id); if (o) printDoc(receiptDoc(o)); }

/* Today's summary (end-of-day report) */
function daySummary() {
  const list = sales.filter(o => inPeriod(o.created, 'today')), by = {};
  list.forEach(o => { const m = o.payment?.method || 'Not recorded'; by[m] = (by[m] || 0) + netOf(o); });
  const gross = list.reduce((n, o) => n + o.subtotal, 0), disc = list.reduce((n, o) => n + (o.discount?.amount || 0), 0), refunds = list.reduce((n, o) => n + refundedOf(o), 0), net = list.reduce((n, o) => n + netOf(o), 0);
  return { list, by, gross, disc, refunds, net, vat: net - net / 1.12 };
}
function openDaySummary() {
  const s = daySummary(), r = printRow;
  showModal('Today’s sales summary', `<div class="notice">${new Date().toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</div><div class="receipt"><div class="receipt-row"><span>Transactions</span><strong>${s.list.length}</strong></div><div class="receipt-row"><span>Gross sales</span><strong>${money(s.gross)}</strong></div><div class="receipt-row"><span>Discounts</span><strong>−${money(s.disc)}</strong></div><div class="receipt-row"><span>Refunds</span><strong>−${money(s.refunds)}</strong></div><div class="receipt-row"><span>VAT included (12%)</span><strong>${money(s.vat)}</strong></div><div class="receipt-row total"><span>Net sales</span><span>${money(s.net)}</span></div></div><h4 style="margin:16px 0 4px">By payment method</h4>${Object.keys(s.by).length ? Object.entries(s.by).map(([m, v]) => `<div class="receipt-row"><span>${esc(m)}</span><strong>${money(v)}</strong></div>`).join('') : '<div class="muted">No sales yet today.</div>'}<div class="field-help">Cash in the drawer should equal your opening cash plus the Cash line above.</div>`,
    [{ label: 'Close', class: 'secondary', action: closeModal }, { label: 'Print summary', class: 'primary', action: () => printDoc(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Daily summary</title>${printCSS}</head><body><h1>RedJr Builders</h1><div class="c">Daily sales summary</div><div class="c">${dateTime(new Date())}</div><hr>${r('Transactions', s.list.length)}${r('Gross sales', money(s.gross))}${r('Discounts', '−' + money(s.disc))}${r('Refunds', '−' + money(s.refunds))}${r('VAT included', money(s.vat))}${r('NET SALES', money(s.net), 'b')}<hr>${Object.entries(s.by).map(([m, v]) => r(esc(m), money(v))).join('')}</body></html>`) }], { noFocus: true });
}

function exportCSV(kind) {
  let rows;
  if (kind === 'inventory') rows = [['SKU', 'Barcode', 'Product', 'Category', 'Cost', 'Price', 'Stock', 'Unit', 'Status'], ...products.map(p => [p.sku, p.barcode, p.name, p.category, p.cost, p.price, p.stock, p.unit, stockLabel(stockStatus(p))])];
  else rows = [['Transaction ID', 'Date', 'Customer', 'Items', 'Subtotal', 'Discount', 'Total', 'Refunded', 'Net', 'Payment', 'Status'], ...sales.map(o => [o.id, o.created, o.customer, o.items.map(i => `${i.name} x${i.qty}`).join('; '), o.subtotal, o.discount?.amount || 0, o.total, refundedOf(o), netOf(o), o.payment?.method || '', saleStatus(o)])];
  const csv = rows.map(r => r.map(v => '"' + String(v ?? '').replace(/"/g, '""') + '"').join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })), a = document.createElement('a');
  a.href = url; a.download = 'redjr-' + kind + '-' + new Date().toISOString().slice(0, 10) + '.csv'; a.click(); URL.revokeObjectURL(url); toast('CSV export prepared.');
}

/* ---------- 10. Event wiring ---------- */
document.querySelectorAll('[data-ico]').forEach(e => { e.innerHTML = ico(e.dataset.ico); });
$('loginForm').addEventListener('submit', e => { e.preventDefault(); login(); toast('Welcome to RedJr Builders.'); });
document.querySelectorAll('.nav button').forEach(b => b.addEventListener('click', () => navigate(b.dataset.page)));
$('mobileMenu').addEventListener('click', () => $('sidebar').classList.toggle('open'));
$('profileButton').addEventListener('click', () => $('profilePop').classList.toggle('hidden'));
const closeProfile = () => $('profilePop').classList.add('hidden');
$('logoutButton').addEventListener('click', () => { closeProfile(); $('app').classList.add('hidden'); $('loginScreen').classList.remove('hidden'); toast('You have signed out.'); });
$('resetDemo').addEventListener('click', () => { closeProfile(); resetDemo(); });
$('startFresh').addEventListener('click', () => { closeProfile(); startFresh(); });
document.addEventListener('click', e => { if (!e.target.closest('.profile-menu')) closeProfile(); });

// dashboard controls
document.querySelectorAll('#revModeSeg button').forEach(b => b.addEventListener('click', () => { revMode = b.dataset.m; renderRevenue(); }));
$('revRange').addEventListener('change', e => { revRange = e.target.value; renderRevenue(); });
$('txPeriod').addEventListener('change', renderLatestTx);
$('topPeriod').addEventListener('change', renderTopSelling);

// cashier
$('addProductBtn').addEventListener('click', () => openProductModal());
$('posSearch').addEventListener('input', renderPOS);
$('posSort').addEventListener('change', renderPOS);
$('posSearch').addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;
  const q = e.target.value.trim(); if (!q) return;
  if (posByCode(q)) { e.target.value = ''; renderPOS(); return; }
  const f = posFiltered();
  if (f.length === 1) { e.target.value = ''; posAdd(f[0].id); renderPOS(); }
  else if (/^\d{6,}$/.test(q)) { e.target.value = ''; codeNotFound(q); }
  else toast('No single match. Narrow the search or tap a product.', 'error');
});
$('posScanBtn').addEventListener('click', () => openScanner('Scan items to sell', code => { if (posByCode(code)) toast('Added to the sale.'); else codeNotFound(code); }, true));
$('posChargeBtn').addEventListener('click', openPayment);
$('posMobileBar').addEventListener('click', () => $('posCartPanel').scrollIntoView({ behavior: 'smooth', block: 'start' }));
$('posHoldBtn').addEventListener('click', holdSale); $('posClearBtn').addEventListener('click', confirmClearSale); $('posHeldBtn').addEventListener('click', openHeld);
$('posDiscType').addEventListener('change', e => { posDisc.type = e.target.value; posDisc.value = 0; syncDiscUI(); renderPosCart(); });
$('posDiscVal').addEventListener('input', e => { posDisc.value = Number(e.target.value) || 0; renderPosCart(); });

// inventory & transactions
['inventorySearch', 'stockFilter', 'invCategory'].forEach(id => $(id).addEventListener(id === 'inventorySearch' ? 'input' : 'change', renderInventory));
['txSearch', 'txFilterPeriod', 'txFilterStatus'].forEach(id => $(id).addEventListener(id === 'txSearch' ? 'input' : 'change', renderTransactions));

window.addEventListener('keydown', e => {
  if (e.key === 'Escape') { if ($('scanRoot').innerHTML) closeScanner(); else closeModal(); closeProfile(); $('sidebar').classList.remove('open'); }
  if (activePage !== 'pos' || $('app').classList.contains('hidden')) return;
  const modalOpen = $('modalRoot').innerHTML || $('scanRoot').innerHTML;
  if (e.key === 'F2') { e.preventDefault(); $('posSearch').focus(); }
  if (e.key === 'F9' && !modalOpen) { e.preventDefault(); openPayment(); }
  // a USB barcode scanner "types" fast: send those keystrokes to the search box
  if (!modalOpen && !e.ctrlKey && !e.metaKey && !e.altKey && e.key.length === 1 && !/^(INPUT|SELECT|TEXTAREA|BUTTON)$/.test(document.activeElement.tagName)) $('posSearch').focus();
  else if (!modalOpen && !e.ctrlKey && !e.metaKey && !e.altKey && e.key.length === 1 && document.activeElement.tagName === 'BUTTON') $('posSearch').focus();
});

renderPage();
