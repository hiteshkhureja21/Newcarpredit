/* ═════════════════════════════════════════════════════════════
   VisionaryX — Main Application JavaScript
   Dot Background · Particle System · Calculator · Theme Toggle
   ═════════════════════════════════════════════════════════════ */

// ── Utility ──────────────────────────────────────────────────
function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}
function formatINR(n) {
  return '₹ ' + new Intl.NumberFormat('en-IN').format(Math.round(n));
}

// ═══════════════════════════════════════════════════════════════
//  1. DOT BACKGROUND  (Gemini-style repulsive dot grid)
// ═══════════════════════════════════════════════════════════════
class DotBackground {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.dots = [];
    this.mouse = { x: -9999, y: -9999 };
    this.repulseRadius = 120;
    this.spring = 0.025;
    this.damping = 0.88;
    this.spacing = 38;
    this.baseRadius = 1.4;

    this._resize();
    this._createDots();
    this._bind();
    this._loop();
  }

  _resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  _createDots() {
    this.dots = [];
    const cols = Math.ceil(this.canvas.width / this.spacing) + 2;
    const rows = Math.ceil(this.canvas.height / this.spacing) + 2;
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        this.dots.push({
          x: c * this.spacing,
          y: r * this.spacing,
          ox: c * this.spacing,
          oy: r * this.spacing,
          vx: 0, vy: 0,
          baseAlpha: 0.12 + Math.random() * 0.08,
          phase: Math.random() * Math.PI * 2
        });
      }
    }
  }

  _bind() {
    const onMove = (e) => {
      const t = e.touches ? e.touches[0] : e;
      this.mouse.x = t.clientX;
      this.mouse.y = t.clientY;
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('mouseleave', () => { this.mouse.x = -9999; this.mouse.y = -9999; });

    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => { this._resize(); this._createDots(); }, 200);
    });
  }

  _loop() {
    const t = performance.now() * 0.001;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    const rgb = isDark ? '255,255,255' : '30,30,50';

    for (const d of this.dots) {
      // Repulse
      const dx = d.x - this.mouse.x;
      const dy = d.y - this.mouse.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < this.repulseRadius && dist > 0) {
        const f = (this.repulseRadius - dist) / this.repulseRadius;
        d.vx += (dx / dist) * f * 2.5;
        d.vy += (dy / dist) * f * 2.5;
      }
      // Spring
      d.vx += (d.ox - d.x) * this.spring;
      d.vy += (d.oy - d.y) * this.spring;
      // Damp
      d.vx *= this.damping;
      d.vy *= this.damping;
      // Move
      d.x += d.vx;
      d.y += d.vy;
      // Pulse
      const pulse = Math.sin(t * 1.2 + d.phase) * 0.04;
      const alpha = d.baseAlpha + pulse;
      // Draw
      this.ctx.beginPath();
      this.ctx.arc(d.x, d.y, this.baseRadius, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(${rgb},${alpha.toFixed(3)})`;
      this.ctx.fill();
    }

    requestAnimationFrame(() => this._loop());
  }
}

// ═══════════════════════════════════════════════════════════════
//  2. PARTICLE SYSTEM  (Click‑to‑spawn with gravity physics)
// ═══════════════════════════════════════════════════════════════
class ParticleSystem {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
    this.gravity = 0.05;
    this.drag = 0.98;
    this.spawnCount = 8;
    this.paletteIdx = 0;
    this.palettes = [
      ['#00f2fe', '#4facfe', '#00c6fb'],
      ['#f5576c', '#ff6b6b', '#ee5a6f'],
      ['#38ef7d', '#11998e', '#2ecc71'],
      ['#f7971e', '#ffd200', '#f9a825'],
      ['#a855f7', '#6366f1', '#8b5cf6']
    ];
    this.mouse = { x: 0, y: 0, down: false };

    this._resize();
    this._bind();
    this._loop();
  }

  get palette() { return this.palettes[this.paletteIdx % this.palettes.length]; }

  _resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  burst(x, y) {
    for (let i = 0; i < this.spawnCount; i++) {
      const angle = (Math.PI * 2 / this.spawnCount) * i + (Math.random() - 0.5) * 0.8;
      const speed = 2 + Math.random() * 5;
      const hex = this.palette[Math.floor(Math.random() * this.palette.length)];
      const { r, g, b } = hexToRgb(hex);
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r, g, b,
        size: 2 + Math.random() * 3,
        life: 1,
        decay: 0.004 + Math.random() * 0.006,
        trail: []
      });
    }
    this.paletteIdx++;
  }

  scatter() {
    for (const p of this.particles) {
      p.vx = (Math.random() - 0.5) * 22;
      p.vy = (Math.random() - 0.5) * 22;
    }
  }

  implode() {
    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2;
    for (const p of this.particles) {
      const dx = cx - p.x, dy = cy - p.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      p.vx = (dx / d) * 9;
      p.vy = (dy / d) * 9;
    }
  }

  reset() { this.particles = []; }

  _bind() {
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => this._resize(), 200);
    });

    const isInteractive = (el) => el.closest(
      '.form-card, .predict-btn, .result-card, .particle-controls, .price-row, select, input, button, label, a, .app-header'
    );

    document.addEventListener('mousedown', (e) => {
      this.mouse.down = true;
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    });
    document.addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    });
    document.addEventListener('mouseup', () => { this.mouse.down = false; });

    document.addEventListener('click', (e) => {
      if (isInteractive(e.target)) return;
      this.burst(e.clientX, e.clientY);
    });

    // Touch
    document.addEventListener('touchstart', (e) => {
      if (isInteractive(e.target)) return;
      const t = e.touches[0];
      this.burst(t.clientX, t.clientY);
    }, { passive: true });
  }

  _loop() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Gravity well
    if (this.mouse.down) {
      for (const p of this.particles) {
        const dx = this.mouse.x - p.x, dy = this.mouse.y - p.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        p.vx += (dx / d) * 0.6;
        p.vy += (dy / d) * 0.6;
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.vy += this.gravity;
      p.vx *= this.drag;
      p.vy *= this.drag;
      p.x += p.vx;
      p.y += p.vy;
      p.life -= p.decay;

      p.trail.push({ x: p.x, y: p.y });
      if (p.trail.length > 18) p.trail.shift();

      if (p.life <= 0) { this.particles.splice(i, 1); continue; }

      // Trail
      for (let t = 0; t < p.trail.length; t++) {
        const a = (t / p.trail.length) * p.life * 0.25;
        const s = p.size * (t / p.trail.length) * 0.5;
        this.ctx.beginPath();
        this.ctx.arc(p.trail[t].x, p.trail[t].y, s, 0, Math.PI * 2);
        this.ctx.fillStyle = `rgba(${p.r},${p.g},${p.b},${a.toFixed(3)})`;
        this.ctx.fill();
      }

      // Outer glow
      const grad = this.ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3.5);
      grad.addColorStop(0, `rgba(${p.r},${p.g},${p.b},${(p.life * 0.3).toFixed(3)})`);
      grad.addColorStop(1, `rgba(${p.r},${p.g},${p.b},0)`);
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size * 3.5, 0, Math.PI * 2);
      this.ctx.fillStyle = grad;
      this.ctx.fill();

      // Core body
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(${p.r},${p.g},${p.b},${p.life.toFixed(3)})`;
      this.ctx.fill();

      // White core
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size * 0.35, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(255,255,255,${(p.life * 0.9).toFixed(3)})`;
      this.ctx.fill();
    }

    requestAnimationFrame(() => this._loop());
  }
}

// ═══════════════════════════════════════════════════════════════
//  3. CALCULATOR  (Form logic, API calls, result rendering)
// ═══════════════════════════════════════════════════════════════
const CAR_DATA = {
  models: {
    'Maruti Suzuki': ['Alto','Swift','Baleno','Dzire','Brezza','Ertiga'],
    'Hyundai':       ['Grand i10','i20','Venue','Verna','Creta'],
    'Tata':          ['Tiago','Altroz','Nexon','Harrier','Safari'],
    'Mahindra':      ['Bolero','XUV300','Thar','Scorpio','XUV700'],
    'Kia':           ['Sonet','Carens','Seltos'],
    'Toyota':        ['Glanza','Urban Cruiser','Innova','Fortuner'],
    'Honda':         ['Amaze','Elevate','City'],
    'Volkswagen':    ['Polo','Vento','Taigun','Virtus']
  },
  variants: {
    'Maruti Suzuki': ['LXI (Base)','VXI (Mid)','ZXI (Top)'],
    'Hyundai':       ['E (Base)','S (Mid)','SX (Top)'],
    'Tata':          ['XE (Base)','XM (Mid)','XZ (Top)'],
    'Mahindra':      ['Base','Mid','Top'],
    'Kia':           ['HTE (Base)','HTK (Mid)','GTX (Top)'],
    'Toyota':        ['G (Base)','V (Top)'],
    'Honda':         ['E (Base)','S (Mid)','VX (Top)'],
    'Volkswagen':    ['Trendline (Base)','Comfortline (Mid)','Highline (Top)']
  }
};

class Calculator {
  constructor() {
    this.form = document.getElementById('calculatorForm');
    this.btnText = document.getElementById('btnText');
    this.loadingDots = document.getElementById('loadingDots');
    this.predictBtn = document.getElementById('predictBtn');
    this.resultsSection = document.getElementById('resultsSection');

    this._populateBrand();
    this._bindCascade();
    this._bindSteppers();
    this._bindYearSlider();
    this._bindSubmit();
  }

  _populateSelect(id, options) {
    const el = document.getElementById(id);
    el.innerHTML = '';
    options.forEach((o, i) => {
      const opt = document.createElement('option');
      opt.value = o; opt.textContent = o;
      el.appendChild(opt);
    });
  }

  _populateBrand() {
    const brand = document.getElementById('brand').value;
    this._populateSelect('carModel', CAR_DATA.models[brand] || []);
    this._populateSelect('variant', CAR_DATA.variants[brand] || []);
  }

  _bindCascade() {
    document.getElementById('brand').addEventListener('change', () => this._populateBrand());
  }

  _bindSteppers() {
    document.querySelectorAll('.stepper-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = document.getElementById(btn.dataset.target);
        const step = parseFloat(btn.dataset.step);
        let val = parseFloat(target.value) + step;
        const min = parseFloat(target.min);
        const max = parseFloat(target.max);
        if (!isNaN(min)) val = Math.max(val, min);
        if (!isNaN(max)) val = Math.min(val, max);
        target.value = val;
      });
    });
  }

  _bindYearSlider() {
    const slider = document.getElementById('year');
    const readout = document.getElementById('yearReadout');
    slider.addEventListener('input', () => { readout.textContent = slider.value; });
  }

  _bindSubmit() {
    this.form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this._predict();
    });
  }

  async _predict() {
    // Show loading
    this.predictBtn.classList.add('loading');

    const data = {
      brand:          document.getElementById('brand').value,
      model:          document.getElementById('carModel').value,
      variant:        document.getElementById('variant').value,
      fuel:           document.getElementById('fuel').value,
      transmission:   document.getElementById('transmission').value,
      condition:      document.getElementById('condition').value,
      owner:          document.getElementById('owner').value,
      year:           document.getElementById('year').value,
      km_driven:      document.getElementById('km_driven').value,
      city:           document.getElementById('city').value,
      engine:         document.getElementById('engine').value,
      max_power:      document.getElementById('max_power').value,
      mileage:        document.getElementById('mileage').value,
      seats:          document.getElementById('seats').value,
      airbags:        document.getElementById('airbags').value,
      original_price: document.getElementById('original_price').value
    };

    try {
      const res = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Server error');
      }

      const result = await res.json();
      this._renderResult(result);
    } catch (err) {
      // Fallback: client-side estimate if server is down
      console.warn('API error, using client-side estimate:', err.message);
      this._renderFallback(data);
    } finally {
      this.predictBtn.classList.remove('loading');
    }
  }

  _renderFallback(data) {
    const origPrice = parseFloat(data.original_price);
    const age = 2026 - parseInt(data.year);
    let price = origPrice;

    // Simple depreciation model
    price *= (1 - 0.17); // Year 1
    for (let i = 1; i < age; i++) price *= (1 - 0.10);

    // Adjustments
    const premiumSUVs = ['Creta','Fortuner','Innova','Scorpio','Thar','XUV700'];
    const isPremium = premiumSUVs.includes(data.model);
    if (isPremium) price *= 1.15;
    if (data.condition === 'Excellent') price *= 1.10;
    else if (data.condition === 'Fair') price *= 0.85;
    else if (data.condition === 'Poor') price *= 0.70;
    if (data.owner === 'First Owner') price *= 1.10;
    else if (data.owner === 'Third Owner') price *= 0.80;
    if (data.city.startsWith('Metro')) price *= 1.05;
    if (parseInt(data.km_driven) < 30000) price *= 1.08;
    else if (parseInt(data.km_driven) > 100000) price *= 0.85;

    // Caps
    const minP = origPrice * 0.30, maxP = origPrice * 0.90;
    let safetyCap = null;
    if (price < minP) { price = minP + origPrice * 0.05; safetyCap = 'floor'; }
    if (price > maxP) { price = maxP - origPrice * 0.05; safetyCap = 'ceiling'; }

    const dep = Math.max(((origPrice - price) / origPrice) * 100, 0);

    // Tags
    const tags = [];
    if (data.city.startsWith('Metro')) tags.push('Metro Boost');
    if (isPremium) tags.push('Premium SUV');
    if (data.owner === 'First Owner') tags.push('1st Owner Advantage');
    if (data.transmission === 'Automatic') tags.push('AT Premium');
    if (parseInt(data.engine) >= 1500) tags.push('Power Plant');
    if (age <= 2) tags.push('Nearly New');
    if (parseInt(data.km_driven) < 20000) tags.push('Low Mileage Gem');

    let score = 50;
    if (isPremium) score += 15;
    if (data.owner === 'First Owner') score += 10;
    if (data.condition === 'Excellent') score += 15;
    else if (data.condition === 'Good') score += 10;
    if (age <= 3) score += 10;
    if (data.city.startsWith('Metro')) score += 5;
    score = Math.min(score, 98);

    const confidence = dep < 50 && score > 60 ? 'High' : score > 40 ? 'Medium' : 'Low';

    // Round to nearest 1000 for clean prices
    price = Math.round(price / 1000) * 1000;

    this._renderResult({
      predicted_price: price,
      depreciation: Math.round(dep * 10) / 10,
      range_low: Math.round((price * 0.95) / 1000) * 1000,
      range_high: Math.round((price * 1.05) / 1000) * 1000,
      is_premium_suv: isPremium,
      safety_cap: safetyCap,
      car_age: age,
      original_price: origPrice,
      tags, market_score: score, confidence
    });
  }

  _renderResult(r) {
    this.resultsSection.style.display = 'block';

    // Scroll to results
    setTimeout(() => {
      this.resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);

    // Animated price counter
    this._animateCounter('predictedPrice', r.predicted_price);

    // Range
    document.getElementById('priceRange').textContent =
      `Market Range: ${formatINR(r.range_low)} — ${formatINR(r.range_high)}`;

    // Details
    document.getElementById('rOrigPrice').textContent = formatINR(r.original_price);
    document.getElementById('rAge').textContent = `${r.car_age} year${r.car_age !== 1 ? 's' : ''}`;
    document.getElementById('rAdj').textContent =
      r.is_premium_suv ? '+15% Premium SUV' : 'Standard AI';

    // Confidence badge
    const badge = document.getElementById('confidenceBadge');
    badge.textContent = r.confidence;
    badge.className = 'confidence-badge ' + r.confidence.toLowerCase();

    // Depreciation bar
    const dep = Math.min(r.depreciation, 100);
    document.getElementById('depPct').textContent = dep.toFixed(1) + '%';
    const fill = document.getElementById('depFill');
    fill.className = 'depreciation-fill';
    if (dep > 60) fill.classList.add('high');
    else if (dep > 35) fill.classList.add('mid');
    requestAnimationFrame(() => { fill.style.width = dep + '%'; });

    // Market score ring
    const circumference = 2 * Math.PI * 50; // r=50
    const offset = circumference - (r.market_score / 100) * circumference;
    const ringFill = document.getElementById('ringFill');
    ringFill.style.strokeDashoffset = offset;

    // Score color
    if (r.market_score >= 70) ringFill.style.stroke = '#10b981';
    else if (r.market_score >= 50) ringFill.style.stroke = '#00d4ff';
    else if (r.market_score >= 30) ringFill.style.stroke = '#f59e0b';
    else ringFill.style.stroke = '#ef4444';

    document.getElementById('scoreNum').textContent = r.market_score;

    // Smart tags
    const tagsContainer = document.getElementById('smartTags');
    tagsContainer.innerHTML = '';
    (r.tags || []).forEach(tag => {
      const el = document.createElement('span');
      el.className = 'smart-tag';
      el.textContent = tag;
      tagsContainer.appendChild(el);
    });

    // Safety cap
    const safetyEl = document.getElementById('safetyMsg');
    if (r.safety_cap === 'floor') {
      safetyEl.style.display = 'block';
      safetyEl.textContent = '⚠️ Price was raised to meet the 30% minimum market value floor.';
    } else if (r.safety_cap === 'ceiling') {
      safetyEl.style.display = 'block';
      safetyEl.textContent = '⚠️ Price corrected downward to respect 90% resale ceiling.';
    } else {
      safetyEl.style.display = 'none';
    }

    // Re-trigger card animation
    const card = document.getElementById('resultCard');
    card.style.animation = 'none';
    card.offsetHeight; // force reflow
    card.style.animation = '';
  }

  _animateCounter(elId, target) {
    const el = document.getElementById(elId);
    const duration = 1200;
    const start = performance.now();
    const from = 0;

    const tick = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(from + (target - from) * ease);
      el.textContent = formatINR(current);
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
}

// ═══════════════════════════════════════════════════════════════
//  4. THEME TOGGLE
// ═══════════════════════════════════════════════════════════════
class ThemeManager {
  constructor() {
    this.root = document.documentElement;
    this.btn = document.getElementById('themeToggle');
    this.icon = document.getElementById('themeIcon');
    this.metaTheme = document.querySelector('meta[name="theme-color"]');

    // Load saved theme
    const saved = localStorage.getItem('vx-theme') || 'dark';
    this.root.setAttribute('data-theme', saved);
    this._updateIcon(saved);

    this.btn.addEventListener('click', () => this.toggle());
  }

  toggle() {
    const current = this.root.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';

    if (document.startViewTransition) {
      document.startViewTransition(() => {
        this.root.setAttribute('data-theme', next);
        this._updateIcon(next);
      });
    } else {
      this.root.setAttribute('data-theme', next);
      this._updateIcon(next);
    }
    localStorage.setItem('vx-theme', next);
  }

  _updateIcon(theme) {
    this.icon.textContent = theme === 'dark' ? '🌙' : '☀️';
    if (this.metaTheme) {
      this.metaTheme.content = theme === 'dark' ? '#060610' : '#f0f2f8';
    }
  }
}

// ═══════════════════════════════════════════════════════════════
//  5. PARTICLE CONTROLS PANEL
// ═══════════════════════════════════════════════════════════════
class ParticleControls {
  constructor(particleSystem) {
    this.ps = particleSystem;
    this.panel = document.getElementById('controlsPanel');
    this.toggleBtn = document.getElementById('controlsToggle');
    this.open = false;

    // Toggle panel
    this.toggleBtn.addEventListener('click', () => {
      this.open = !this.open;
      this.panel.classList.toggle('open', this.open);
      this.toggleBtn.setAttribute('aria-expanded', this.open);
    });

    // Sliders
    document.getElementById('gravitySlider').addEventListener('input', (e) => {
      this.ps.gravity = parseFloat(e.target.value);
    });
    document.getElementById('dragSlider').addEventListener('input', (e) => {
      this.ps.drag = parseFloat(e.target.value);
    });
    document.getElementById('spawnSlider').addEventListener('input', (e) => {
      this.ps.spawnCount = parseInt(e.target.value);
    });

    // Buttons
    document.getElementById('scatterBtn').addEventListener('click', () => this.ps.scatter());
    document.getElementById('implodeBtn').addEventListener('click', () => this.ps.implode());
    document.getElementById('resetBtn').addEventListener('click', () => this.ps.reset());
  }
}

// ═══════════════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  // Theme
  new ThemeManager();

  // Dot Background
  const dotCanvas = document.getElementById('dotCanvas');
  new DotBackground(dotCanvas);

  // Particle System
  const particleCanvas = document.getElementById('particleCanvas');
  const ps = new ParticleSystem(particleCanvas);

  // Particle Controls
  new ParticleControls(ps);

  // Calculator
  new Calculator();
});
