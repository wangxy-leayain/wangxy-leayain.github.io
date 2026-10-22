/* Leayain · one desk, ten universes.
   State, input, camera, panels, reading mode. Drawing lives in stage.js, panel toys in widgets.js. */
(function () {
  'use strict';

  const C = window.CONTENT;
  const A = window.ASSETS;
  const W = window.WIDGETS;
  const { createStage, loadImage, hexToRgb } = window.STAGE;
  const $ = (s, r) => (r || document).querySelector(s);
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (t) => 1 - Math.pow(1 - t, 3);
  const easeIO = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const gs = () => window.gsap || null;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mqPortrait = matchMedia('(max-width: 899px) and (orientation: portrait)');
  const mqTouch = matchMedia('(hover: none), (pointer: coarse)');
  const isHttp = /^https?:$/.test(location.protocol);

  const dom = {
    canvas: $('#stage'), fx: $('#fx'), loader: $('#loader'), bar: $('#loader-bar'), loaderText: $('#loader-text'),
    tip: $('#tip'), sfx: $('#sfx'), panel: $('#panel'), body: $('#panel-body'), back: $('#back'),
    earth: $('#earth'), dots: $('#dots'), hint: $('#hint'), intro: $('#intro'), introBody: $('#intro-body'),
    btnDesk: $('#btn-desk'), btnIntro: $('#btn-intro'), btnSound: $('#btn-sound'),
    hudBottom: $('.hud-bottom'), map: $('#map'), mapView: $('#map-view'), hotList: $('#hot-list'), fx2: $('#fx2'), radio: $('#radio'),
  };

  const IMG = { w: A.scene.width, h: A.scene.height };
  const hots = A.scene.hots;                 // name → { index, bbox, center } in full-size image pixels
  const byIndex = [];
  Object.keys(hots).forEach((n) => { byIndex[hots[n].index] = n; });

  const S = {
    style: 0, from: 0, t: 1, tStart: 0, dir: 1,
    view: { cx: IMG.w / 2, cy: IMG.h / 2, z: 1 }, anim: null, back: null,
    hover: 0, panel: null, widget: null, mode: 'desk', sound: false, ready: false,
    dock: 0, allowX: 0, allowY: 0, lastInput: performance.now(),
  };
  let stage = null;
  let hotData = null;
  const lo = {};
  const hi = {};
  const hiPending = {};
  let texVersion = 0;

  // ───────────── sound (off by default) ─────────────
  let audio = null;
  function blip(freq, dur, type) {
    if (!S.sound) return;
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      const t = audio.currentTime;
      const o = audio.createOscillator();
      const g = audio.createGain();
      o.type = type || 'square';
      o.frequency.setValueAtTime(freq || 520, t);
      o.frequency.exponentialRampToValueAtTime(Math.max(40, (freq || 520) * 0.5), t + (dur || 0.08));
      g.gain.setValueAtTime(0.05, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + (dur || 0.08));
      o.connect(g).connect(audio.destination);
      o.start(t);
      o.stop(t + (dur || 0.08));
    } catch (e) { /* no audio: fine */ }
  }
  function glitchSound() {
    if (!S.sound) return;
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      const len = audio.sampleRate * 0.35;
      const buf = audio.createBuffer(1, len, audio.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) * (Math.floor(i / 900) % 2 ? 1 : 0.25);
      const src = audio.createBufferSource();
      const g = audio.createGain();
      const f = audio.createBiquadFilter();
      f.type = 'bandpass'; f.frequency.value = 1800; f.Q.value = 0.8;
      g.gain.value = 0.12;
      src.buffer = buf;
      src.connect(f).connect(g).connect(audio.destination);
      src.start();
    } catch (e) { /* fine */ }
  }

  // ───────────── viewport / camera ─────────────
  const vw = () => window.innerWidth;
  const vh = () => window.innerHeight - S.dock;
  const dpr = () => Math.min(window.devicePixelRatio || 1, 2);
  const base = () => Math.max(vw() / IMG.w, vh() / IMG.h);
  const scaleOf = (v) => base() * v.z;

  function clampView(v, ax, ay) {
    const s = scaleOf(v);
    const hw = vw() / (2 * s);
    const hh = vh() / (2 * s);
    const ox = (ax || 0) / s;
    const oy = (ay || 0) / s;
    const cx = 2 * hw >= IMG.w + 2 * ox ? IMG.w / 2 : clamp(v.cx, hw - ox, IMG.w - hw + ox);
    const cy = 2 * hh >= IMG.h + 2 * oy ? IMG.h / 2 : clamp(v.cy, hh - oy, IMG.h - hh + oy);
    return { cx, cy, z: v.z };
  }
  function homeView() {
    // portrait phones see a slice: start on the middle of the desk, a little left of centre
    return clampView({ cx: mqPortrait.matches ? IMG.w * 0.47 : IMG.w / 2, cy: IMG.h / 2, z: 1 }, 0, 0);
  }
  function animateView(to, dur) {
    S.anim = { from: { ...S.view }, to, t0: performance.now(), dur: reduce ? 1 : (dur || 650) };
  }
  function screenToImage(px, py) {
    const s = scaleOf(S.view);
    return { x: S.view.cx + (px - vw() / 2) / s, y: S.view.cy + (py - vh() / 2) / s };
  }
  function imageToScreen(x, y, v) {
    const view = v || S.view;
    const s = scaleOf(view);
    return { x: (x - view.cx) * s + vw() / 2, y: (y - view.cy) * s + vh() / 2 };
  }
  function hotAt(px, py, radius) {
    if (!hotData) return 0;
    const p = screenToImage(px, py);
    const sx = hotData.w / IMG.w;
    const read = (x, y) => {
      const hx = Math.floor(x * sx);
      const hy = Math.floor(y * sx);
      if (hx < 0 || hy < 0 || hx >= hotData.w || hy >= hotData.h) return 0;
      return Math.round(hotData.d[(hy * hotData.w + hx) * 4] / 8);
    };
    const direct = read(p.x, p.y);
    if (direct || !radius) return direct;
    const s = scaleOf(S.view);
    const r = radius / s;
    for (let ring = 1; ring <= 3; ring++) {
      for (let k = 0; k < 12; k++) {
        const a = k * Math.PI / 6;
        const hit = read(p.x + Math.cos(a) * r * ring / 3, p.y + Math.sin(a) * r * ring / 3);
        if (hit) return hit;
      }
    }
    return 0;
  }

  // ───────────── universes ─────────────
  function applyTheme(i) {
    const s = C.STYLES[i];
    const r = document.documentElement;
    r.dataset.style = s.id;
    r.style.setProperty('--ink', s.ink);
    r.style.setProperty('--paper', s.paper);
    r.style.setProperty('--accent', s.accent);
    dom.earth.replaceChildren(el('b', null, s.code), el('span', null, s.name));
    [...dom.dots.children].forEach((d, k) => d.setAttribute('aria-current', k === i ? 'true' : 'false'));
    dom.map.style.backgroundImage = 'url("' + A.lo[s.id] + '")';
  }
  function burst(text, at) {
    const p = at || { x: vw() / 2, y: vh() / 2 };
    dom.sfx.textContent = text;
    dom.sfx.style.left = clamp(p.x, 130, vw() - 130) + 'px';
    dom.sfx.style.top = clamp(p.y - 60, 90, vh() - 60) + 'px';
    dom.sfx.classList.remove('go');
    void dom.sfx.offsetWidth;
    dom.sfx.classList.add('go');
  }
  function setStyle(i, dir, at) {
    const next = ((i % C.STYLES.length) + C.STYLES.length) % C.STYLES.length;
    if (UP.on || UP.flipping) { radio('No signal down here. Type 11 or use the walkie to get out.', 2400); return; }
    if (next === S.style || S.t < 1 || !stage) return;
    S.from = S.style;
    S.style = next;
    S.dir = dir || 1;
    S.t = reduce ? 1 : 0;
    S.tStart = performance.now();
    applyTheme(next);
    burst(C.STYLES[next].sfx, at);
    glitchSound();
    dom.canvas.classList.remove('shake');
    void dom.canvas.offsetWidth;
    if (!reduce) dom.canvas.classList.add('shake');
    wantHi(C.STYLES[next].id);
  }
  function rollDice() {
    const d = hots.dice;
    const at = d ? imageToScreen(d.center[0], d.center[1]) : null;
    let n = S.style;
    while (n === S.style) n = Math.floor(Math.random() * C.STYLES.length);
    setStyle(n, 1, at);
  }

  // hi-res textures only over http(s): a page opened from disk keeps the embedded ones
  function wantHi(id) {
    if (!isHttp || hi[id] || hiPending[id]) return;
    hiPending[id] = loadImage('assets/styles/' + id + '.webp').then((im) => {
      hi[id] = im;
      if (stage && stage.fits(im)) { stage.put(id, im); texVersion++; }
      trimHi();
    }).catch(() => { /* stay on the embedded size */ }).then(() => { hiPending[id] = null; });
  }
  function trimHi() {
    const keep = [C.STYLES[S.style].id, C.STYLES[S.from].id, ...(UP.on ? ['upside'] : [])];
    Object.keys(hi).forEach((id) => {
      if (!keep.includes(id) && S.t >= 1) { delete hi[id]; stage.put(id, lo[id]); texVersion++; }
    });
  }

  // ───────────── the Upside Down (type 11, or use the walkie-talkie) ─────────────
  const UP = { on: false, flipT0: 0, flipping: false, swapped: false, spores: [], bolt: null, nextBolt: 0, flash: 0, spell: null, nextSpell: 0, lamp: 1, dirty: true };
  const BULB_COLS = ['#ff4b4b', '#ffd23f', '#3ec46d', '#3e8bff', '#ff7ac8'];
  const LAMP = { x: IMG.w * 0.705, y: IMG.h * 0.418 };   // where the desk lamp's head sits in the picture
  const fx2 = dom.fx2;
  const g2 = fx2.getContext('2d');
  function sizeFx() {
    fx2.width = Math.round(vw() * dpr());
    fx2.height = Math.round(vh() * dpr());
    UP.dirty = true;
  }
  function seedSpores() {
    UP.spores = Array.from({ length: mqPortrait.matches ? 70 : 140 }, () => ({
      x: Math.random(), y: Math.random(), r: 0.6 + Math.random() * 2.2, a: 0.25 + Math.random() * 0.6,
      vy: 0.004 + Math.random() * 0.012, ph: Math.random() * 6.28, sw: 0.002 + Math.random() * 0.006,
    }));
  }
  function radio(text, ms) {
    const w = hots.walkie;
    const p = w ? imageToScreen(w.center[0], w.bbox[1]) : { x: vw() / 2, y: vh() / 2 };
    dom.radio.textContent = text;
    dom.radio.hidden = false;
    const bw = dom.radio.offsetWidth;
    dom.radio.style.left = clamp(p.x - bw / 2, 12, vw() - bw - 12) + 'px';
    dom.radio.style.top = clamp(p.y - 64, 70, vh() - 60) + 'px';
    const g = gs();
    if (g && !reduce) g.fromTo(dom.radio, { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.25, ease: 'back.out(2.5)' });
    clearTimeout(radio.t);
    radio.t = setTimeout(() => { dom.radio.hidden = true; }, ms || 2200);
  }
  function staticSound(dur) {
    if (!S.sound) return;
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      const len = Math.floor(audio.sampleRate * (dur || 0.6));
      const buf = audio.createBuffer(1, len, audio.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (0.5 + 0.5 * Math.sin(i / 400));
      const src = audio.createBufferSource();
      const f = audio.createBiquadFilter();
      const g = audio.createGain();
      f.type = 'highpass'; f.frequency.value = 1200; g.gain.value = 0.08;
      src.buffer = buf; src.connect(f).connect(g).connect(audio.destination); src.start();
    } catch (e) { /* fine */ }
  }
  function thunder() {
    if (!S.sound) return;
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      const len = Math.floor(audio.sampleRate * 1.4);
      const buf = audio.createBuffer(1, len, audio.sampleRate);
      const d = buf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < len; i++) { last = last * 0.985 + (Math.random() * 2 - 1) * 0.15; d[i] = last * Math.pow(1 - i / len, 2) * 3; }
      const src = audio.createBufferSource();
      const g = audio.createGain();
      g.gain.value = 0.35;
      src.buffer = buf; src.connect(g).connect(audio.destination); src.start();
    } catch (e) { /* fine */ }
  }
  function spell(word, gap) {
    const bulbs = A.scene.bulbs || [];
    if (!bulbs.length) return;
    UP.spell = { word: word.toUpperCase(), t0: performance.now(), gap: gap || 700 };
    blip(520, 0.05, 'sine');
  }
  function setUpside(on) {
    if (on === UP.on || UP.flipping || !stage) return;
    closePanel();
    UP.flipping = true;
    UP.swapped = false;
    UP.flipT0 = performance.now();
    UP.target = on;
    if (on) wantHi('upside');
    staticSound(0.8);
  }
  function finishSwap() {
    UP.on = UP.target;
    UP.swapped = true;
    const r = document.documentElement;
    if (UP.on) {
      r.dataset.upside = '';
      r.style.setProperty('--ink', '#e3eaf4');
      r.style.setProperty('--paper', '#111827');
      r.style.setProperty('--accent', '#ff3344');
      dom.earth.replaceChildren(el('b', null, 'U-11'), el('span', null, 'The Upside Down'));
      dom.map.style.backgroundImage = 'url("' + A.lo.upside + '")';
      seedSpores();
      UP.nextBolt = performance.now() + 900;
      UP.nextSpell = performance.now() + 2600;
      thunder();
    } else {
      delete r.dataset.upside;
      applyTheme(S.style);
      UP.spell = null;
    }
    UP.dirty = true;
    texVersion++;
  }
  function onWalkie() {
    if (UP.flipping) return;
    staticSound(0.5);
    if (!UP.on) {
      radio('…El? Do you copy? Over.', 1800);
      setTimeout(() => setUpside(true), 1100);
    } else {
      radio('Closing the gate. Over and out.', 1800);
      setTimeout(() => setUpside(false), 900);
    }
  }
  function drawFx(now) {
    const active = UP.on || UP.flipping || UP.spell || UP.flash > 0;
    if (!active) {
      if (UP.dirty) { g2.clearRect(0, 0, fx2.width, fx2.height); UP.dirty = false; }
      return false;
    }
    UP.dirty = true;
    const d = dpr();
    g2.setTransform(d, 0, 0, d, 0, 0);
    g2.clearRect(0, 0, vw(), vh());
    const s = scaleOf(S.view);
    // flip: squash the stage vertically, swap to the other world at the thinnest point
    if (UP.flipping) {
      const k = clamp((now - UP.flipT0) / (reduce ? 1 : 1100), 0, 1);
      const sy = Math.max(0.02, Math.abs(Math.cos(Math.PI * k)));
      dom.canvas.style.transform = 'scaleY(' + sy.toFixed(3) + ')';
      if (k >= 0.5 && !UP.swapped) { finishSwap(); UP.flash = 1; UP.flashT0 = now; }
      if (k >= 1) { UP.flipping = false; dom.canvas.style.transform = ''; }
    }
    if (UP.on) {
      // lightning in the window, now and then
      if (now > UP.nextBolt) {
        UP.nextBolt = now + 4000 + Math.random() * 6000;
        const pts = [];
        let x = IMG.w * (0.7 + Math.random() * 0.25);
        for (let y = 0; y < IMG.h * 0.45; y += IMG.h * 0.04) { pts.push([x, y]); x += (Math.random() - 0.5) * IMG.w * 0.04; }
        UP.bolt = { pts, t0: now };
        UP.flash = 0.9; UP.flashT0 = now;
        setTimeout(thunder, 250);
      }
      if (UP.bolt && now - UP.bolt.t0 < 260) {
        const on = (now - UP.bolt.t0) % 120 < 80;
        if (on) {
          g2.save();
          g2.shadowColor = '#ff2a3a'; g2.shadowBlur = 24;
          g2.strokeStyle = '#ffd0d6'; g2.lineWidth = 3; g2.lineJoin = 'round';
          g2.beginPath();
          UP.bolt.pts.forEach(([x, y], i) => { const p = imageToScreen(x, y); if (i) g2.lineTo(p.x, p.y); else g2.moveTo(p.x, p.y); });
          g2.stroke();
          g2.restore();
        }
      }
      // the lamp has a bad connection
      if (Math.random() < 0.06) UP.lamp = Math.random() < 0.5 ? 0 : 1;
      if (UP.lamp) {
        const p = imageToScreen(LAMP.x, LAMP.y);
        const r = 140 * s;
        const gr = g2.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
        gr.addColorStop(0, 'rgba(200,220,255,.28)');
        gr.addColorStop(1, 'rgba(200,220,255,0)');
        g2.fillStyle = gr;
        g2.fillRect(p.x - r, p.y - r, r * 2, r * 2);
      }
      // spores drifting up through the room
      const t = now / 1000;
      g2.fillStyle = '#d4deea';
      UP.spores.forEach((p) => {
        p.y -= p.vy / 60;
        if (p.y < -0.02) { p.y = 1.02; p.x = Math.random(); }
        const x = (p.x + Math.sin(t * 0.6 + p.ph) * p.sw) * vw();
        g2.globalAlpha = p.a * (0.6 + 0.4 * Math.sin(t * 1.3 + p.ph));
        g2.beginPath(); g2.arc(x, p.y * vh(), p.r, 0, 6.283); g2.fill();
      });
      g2.globalAlpha = 1;
      if (!UP.spell && now > UP.nextSpell) { spell('EL', 750); UP.nextSpell = now + 9000; }
    }
    // the alphabet lights spelling a word, one bulb at a time
    if (UP.spell) {
      const bulbs = A.scene.bulbs;
      const k = (now - UP.spell.t0) / UP.spell.gap;
      const idx = Math.floor(k);
      if (idx >= UP.spell.word.length) UP.spell = null;
      else if (k - idx < 0.72) {
        const letter = UP.spell.word.charCodeAt(idx) - 65;
        const b = bulbs[letter];
        if (b) {
          const p = imageToScreen(b[0], b[1] + 10);
          const col = BULB_COLS[letter % BULB_COLS.length];
          const r = Math.max(26, 95 * s);
          const gr = g2.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
          gr.addColorStop(0, '#ffffff');
          gr.addColorStop(0.18, col);
          gr.addColorStop(1, 'rgba(0,0,0,0)');
          g2.globalCompositeOperation = 'lighter';
          g2.fillStyle = gr;
          g2.fillRect(p.x - r, p.y - r, r * 2, r * 2);
          g2.globalCompositeOperation = 'source-over';
          g2.fillStyle = '#fffbe8';
          g2.beginPath(); g2.arc(p.x, p.y, Math.max(3, 9 * s), 0, 6.283); g2.fill();
          if (k - idx < 0.05 && !UP.spell.beeped) { blip(700 + letter * 10, 0.08, 'sine'); }
        }
      }
    }
    if (UP.flash > 0) {
      const k = clamp(1 - (now - (UP.flashT0 || now)) / 380, 0, 1);   // fades by time, not by frame count
      g2.fillStyle = 'rgba(255,40,60,' + (UP.flash * k * 0.3).toFixed(3) + ')';
      g2.fillRect(0, 0, vw(), vh());
      if (k <= 0) UP.flash = 0;
    }
    return true;
  }

  // ───────────── hover tooltip ─────────────
  function setHover(index, px, py) {
    S.hover = index;
    dom.canvas.classList.toggle('on-hot', index > 0);
    if (!index) { dom.tip.hidden = true; return; }
    const name = byIndex[index];
    dom.tip.textContent = C.LABELS[name] || name;
    dom.tip.hidden = false;
    const w = dom.tip.offsetWidth;
    dom.tip.style.left = Math.min(px, vw() - w - 30) + 'px';
    dom.tip.style.top = Math.min(py, vh() - 50) + 'px';
  }

  // ───────────── panels ─────────────
  const ctx = { open: (id) => openPanel(id), blip, isUpside: () => UP.on, styleId: () => C.STYLES[S.style].id };
  function buildCard(id) {
    const p = C.PANELS[id];
    const card = el('article', 'card');
    card.append(el('p', 'kicker', p.kicker), el('h2', null, p.title), el('p', 'sub', p.sub));
    (p.body || []).forEach((t) => card.append(el('p', null, t)));
    if (p.facts) {
      const dl = el('dl', 'facts');
      p.facts.forEach(([k, v]) => { const d = el('div'); d.append(el('dt', null, k), el('dd', null, v)); dl.append(d); });
      card.append(dl);
    }
    let widget = null;
    if (p.widget && W[p.widget]) widget = W[p.widget](card, ctx);
    return { card, widget };
  }
  function focusOn(name) {
    const h = hots[name];
    if (!h) return;
    const portrait = mqPortrait.matches;
    const w = vw();
    const H = vh();
    if (portrait) {
      const covered = Math.max(0, dom.panel.offsetHeight - S.dock);
      const free = H - covered;
      const z = 1;
      const s = base() * z;
      const v = { cx: h.center[0], cy: h.center[1] - (free / 2 - H / 2) / s, z };
      S.allowX = 0; S.allowY = covered;
      animateView(clampView(v, 0, covered), 700);
    } else {
      const pw = dom.panel.offsetWidth + 36;
      const free = w - pw;
      const bw = (h.bbox[2] - h.bbox[0]) || 100;
      const bh = (h.bbox[3] - h.bbox[1]) || 100;
      const z = clamp(Math.min(free * 0.55 / (bw * base()), H * 0.55 / (bh * base())), 1, 1.6);
      const s = base() * z;
      const v = { cx: h.center[0] - (free / 2 - w / 2) / s, cy: h.center[1], z };
      S.allowX = pw; S.allowY = 0;
      animateView(clampView(v, pw, 0), 700);
    }
  }
  function openPanel(id, hotName) {
    if (S.mode === 'intro') setMode('desk');
    if (S.widget) { S.widget.destroy(); S.widget = null; }
    const p = C.PANELS[id];
    const { card, widget } = buildCard(id);
    S.widget = widget;
    S.panel = id;
    dom.body.replaceChildren(card);
    dom.body.scrollTop = 0;
    dom.panel.classList.toggle('wide', !!p.wide);
    const wasHidden = dom.panel.hidden;
    dom.panel.hidden = false;
    document.documentElement.dataset.ui = 'panel';
    setHover(0);
    if (!S.back) S.back = { ...S.view };
    const target = hotName || Object.keys(C.HOTS).find((k) => C.HOTS[k].panel === id && hots[k]);
    if (target) focusOn(target);
    blip(660, 0.07, 'triangle');
    const g = gs();
    if (g && !reduce) {
      if (wasHidden) g.fromTo(dom.panel, { x: mqPortrait.matches ? 0 : 40, y: mqPortrait.matches ? 60 : 0, opacity: 0, rotation: mqPortrait.matches ? 0 : 1 }, { x: 0, y: 0, opacity: 1, rotation: 0, duration: 0.45, ease: 'back.out(1.4)' });
      g.from(card.children, { y: 14, opacity: 0, duration: 0.35, stagger: 0.04, ease: 'power2.out', clearProps: 'transform,opacity' });
    }
    if (!mqTouch.matches) setTimeout(() => dom.back.focus({ preventScroll: true }), 50);
  }
  function closePanel() {
    if (dom.panel.hidden) return;
    if (S.widget) { S.widget.destroy(); S.widget = null; }
    S.panel = null;
    const done = () => { dom.panel.hidden = true; dom.body.replaceChildren(); };
    const g = gs();
    if (g && !reduce) g.to(dom.panel, { opacity: 0, x: mqPortrait.matches ? 0 : 30, y: mqPortrait.matches ? 40 : 0, duration: 0.22, ease: 'power2.in', onComplete: () => { done(); g.set(dom.panel, { clearProps: 'all' }); } });
    else done();
    delete document.documentElement.dataset.ui;
    S.allowX = 0; S.allowY = 0;
    animateView(clampView(S.back || homeView(), 0, 0), 600);
    S.back = null;
    dom.canvas.focus({ preventScroll: true });
  }
  function activate(name) {
    S.lastInput = performance.now();
    stopTour();
    const h = C.HOTS[name];
    if (!h) return;
    if (h.action === 'style') { rollDice(); return; }
    if (h.action === 'walkie') { onWalkie(); return; }
    if (h.action === 'lights') { spell(UP.on ? 'RUN' : ['EL', 'HI', 'RUN'][Math.floor(Math.random() * 3)]); return; }
    openPanel(h.panel, name);
  }

  // ───────────── reading mode ─────────────
  let introWidgets = [];
  function buildIntro() {
    introWidgets.forEach((w) => w && w.destroy());
    introWidgets = [];
    const head = el('header', 'intro-head');
    const h1 = el('h1');
    'LEAYAIN'.split('').forEach((c) => h1.append(el('span', null, c)));
    head.append(el('p', 'kicker', 'ONE DESK · TEN UNIVERSES'), h1, el('p', null, C.PANELS.about.sub));
    const nodes = [head];
    C.READ_ORDER.forEach((id) => {
      const { card, widget } = buildCard(id);
      introWidgets.push(widget);
      nodes.push(card);
    });
    nodes.push(el('p', 'foot', 'Leayain · one desk, ten universes'));
    dom.introBody.replaceChildren(...nodes);
    const g = gs();
    if (g && !reduce) {
      g.from(h1.children, { y: 40, rotation: () => (Math.random() - 0.5) * 30, opacity: 0, duration: 0.5, stagger: 0.04, ease: 'back.out(2)' });
      g.from(nodes.slice(1, 4), { y: 30, opacity: 0, duration: 0.45, stagger: 0.08, ease: 'power2.out', clearProps: 'transform,opacity', delay: 0.15 });
    }
  }
  function setMode(mode) {
    if (mode === S.mode) return;
    S.mode = mode;
    dom.btnDesk.setAttribute('aria-pressed', String(mode === 'desk'));
    dom.btnIntro.setAttribute('aria-pressed', String(mode === 'intro'));
    if (mode === 'intro') {
      closePanel();
      buildIntro();
      dom.intro.hidden = false;
      dom.intro.scrollTop = 0;
      document.documentElement.dataset.ui = 'intro';
      setHover(0);
    } else {
      dom.intro.hidden = true;
      introWidgets.forEach((w) => w && w.destroy());
      introWidgets = [];
      dom.introBody.replaceChildren();
      delete document.documentElement.dataset.ui;
    }
    blip(440, 0.05);
  }

  // ───────────── touch tour: when nobody is touching, name the objects one by one ─────────────
  let tour = null;
  function startTour() {
    if (!mqTouch.matches || tour || S.panel || S.mode !== 'desk') return;
    const names = Object.keys(hots).filter((n) => n !== 'about');
    let k = 0;
    tour = setInterval(() => {
      if (S.panel || S.mode !== 'desk') { stopTour(); return; }
      let guard = 0;
      while (guard++ < names.length) {
        const n = names[k++ % names.length];
        const c = hots[n].center;
        const p = imageToScreen(c[0], c[1]);
        if (p.x > 30 && p.x < vw() - 30 && p.y > 60 && p.y < vh() - 30) {
          setHover(hots[n].index, p.x - 20, p.y - 10);
          break;
        }
      }
      if (k >= names.length * 1) stopTour(true);
    }, 1700);
  }
  function stopTour(keepTip) {
    if (tour) { clearInterval(tour); tour = null; }
    if (!keepTip) setHover(0);
    else setTimeout(() => { if (!tour) setHover(0); }, 1600);
  }

  // ───────────── input on the stage ─────────────
  const pointers = new Map();
  let drag = null;
  let pinch = null;
  function onDown(e) {
    S.lastInput = performance.now();
    stopTour();
    dom.canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), z: S.view.z };
      drag = null;
    } else {
      drag = { x: e.clientX, y: e.clientY, cx: S.view.cx, cy: S.view.cy, moved: false, type: e.pointerType };
    }
    S.anim = null;
  }
  function onMove(e) {
    if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      S.view = clampView({ ...S.view, z: clamp(pinch.z * d / pinch.d, 1, 2.6) }, S.allowX, S.allowY);
      return;
    }
    if (drag) {
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      if (!drag.moved && Math.hypot(dx, dy) > (drag.type === 'mouse' ? 5 : 9)) { drag.moved = true; dom.canvas.classList.add('dragging'); setHover(0); }
      if (drag.moved) {
        const s = scaleOf(S.view);
        S.view = clampView({ cx: drag.cx - dx / s, cy: drag.cy - dy / s, z: S.view.z }, S.allowX, S.allowY);
      }
      return;
    }
    if (e.pointerType === 'mouse' && S.ready) {
      const i = hotAt(e.clientX, e.clientY, 0);
      if (i !== S.hover || i) setHover(i, e.clientX, e.clientY);
    }
  }
  function onUp(e) {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch = null;
    dom.canvas.classList.remove('dragging');
    if (drag && !drag.moved && S.ready) {
      const i = hotAt(e.clientX, e.clientY, drag.type === 'mouse' ? 0 : 16);
      if (i) activate(byIndex[i]);
      else if (S.panel) closePanel();
    }
    drag = null;
  }
  function onWheel(e) {
    e.preventDefault();
    S.anim = null;
    const before = screenToImage(e.clientX, e.clientY);
    const z = clamp(S.view.z * Math.exp(-e.deltaY * 0.0015), 1, 2.6);
    const s = base() * z;
    const v = { cx: before.x - (e.clientX - vw() / 2) / s, cy: before.y - (e.clientY - vh() / 2) / s, z };
    S.view = clampView(v, S.allowX, S.allowY);
    setHover(hotAt(e.clientX, e.clientY, 0), e.clientX, e.clientY);
  }

  // minimap (portrait phones)
  function mapTo(e) {
    const r = dom.map.getBoundingClientRect();
    const x = clamp((e.clientX - r.left) / r.width, 0, 1) * IMG.w;
    const y = clamp((e.clientY - r.top) / r.height, 0, 1) * IMG.h;
    S.anim = null;
    S.view = clampView({ cx: x, cy: y, z: S.view.z }, S.allowX, S.allowY);
    stopTour();
  }
  function paintMap() {
    if (!mqPortrait.matches) return;
    const s = scaleOf(S.view);
    const w = vw() / s / IMG.w;
    const h = vh() / s / IMG.h;
    const x = (S.view.cx / IMG.w - w / 2);
    const y = (S.view.cy / IMG.h - h / 2);
    const st = dom.mapView.style;
    st.left = (x * 100) + '%'; st.top = (y * 100) + '%'; st.width = (w * 100) + '%'; st.height = (h * 100) + '%';
  }

  // ───────────── layout ─────────────
  function measure() {
    S.dock = mqPortrait.matches ? Math.ceil(dom.hudBottom.getBoundingClientRect().height) : 0;
    document.documentElement.style.setProperty('--dock', S.dock + 'px');
    if (stage) stage.resize(Math.round(vw() * dpr()), Math.round(vh() * dpr()));
    sizeFx();
    S.view = clampView(S.view, S.allowX, S.allowY);
    dom.hint.innerHTML = mqTouch.matches
      ? 'Tap anything on the desk · drag to look around · roll the red d20 for a new universe'
      : 'Click anything on the desk · <kbd>Space</kbd> new universe · drag &amp; scroll to look around';
  }

  // ───────────── frame loop ─────────────
  let lastMap = '';
  let lastKey = '';
  function frame(now) {
    if (S.anim) {
      const k = clamp((now - S.anim.t0) / S.anim.dur, 0, 1);
      const e = easeIO(k);
      S.view = { cx: lerp(S.anim.from.cx, S.anim.to.cx, e), cy: lerp(S.anim.from.cy, S.anim.to.cy, e), z: lerp(S.anim.from.z, S.anim.to.z, e) };
      if (k >= 1) S.anim = null;
    }
    if (S.ready && !tour && !S.panel && S.mode === 'desk' && mqTouch.matches && now - S.lastInput > 4500 && !S.touredOnce) {
      S.touredOnce = true;
      startTour();
    }
    if (S.t < 1) {
      S.t = clamp((now - S.tStart) / 950, 0, 1);
      if (S.t >= 1) { S.from = S.style; trimHi(); }
    }
    const fxLive = drawFx(now);
    const st = C.STYLES[S.style];
    const inUp = UP.on;
    const fromId = inUp ? 'upside' : C.STYLES[S.t < 1 ? S.from : S.style].id;
    // only redraw when something moves: a transition, a hover pulse, the camera, a new texture
    const key = [S.view.cx.toFixed(2), S.view.cy.toFixed(2), S.view.z.toFixed(4), S.style, S.t, S.panel ? 0 : S.hover, vw(), vh(), texVersion, inUp].join('|');
    const live = S.t < 1 || (S.hover && !S.panel) || fxLive;
    if (!live && key === lastKey) { requestAnimationFrame(frame); return; }
    lastKey = key;
    stage.draw({
      a: fromId, b: inUp ? 'upside' : st.id, t: S.t < 1 && !inUp ? ease(S.t) : 1, dir: S.dir,
      cx: S.view.cx, cy: S.view.cy, scale: scaleOf(S.view) * dpr(), time: now / 1000,
      hover: S.panel ? 0 : S.hover, hi: hexToRgb(inUp ? '#ff3344' : st.accent), bg: [0.063, 0.063, 0.078],
    });
    const mk = S.view.cx.toFixed(1) + S.view.cy.toFixed(1) + S.view.z.toFixed(3) + vw() + vh();
    if (mk !== lastMap) { lastMap = mk; paintMap(); }
    requestAnimationFrame(frame);
  }

  // ───────────── chrome: buttons, dots, keys ─────────────
  const ICON = {
    on: '<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/></svg>',
    off: '<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M17 9l5 6M22 9l-5 6"/></svg>',
    desk: '<svg viewBox="0 0 24 24"><path d="M3 10h18M5 10v9M19 10v9M7 10V6h5v4"/></svg>',
    read: '<svg viewBox="0 0 24 24"><path d="M4 5h6a3 3 0 0 1 2 1 3 3 0 0 1 2-1h6v13h-6a3 3 0 0 0-2 1 3 3 0 0 0-2-1H4z"/><path d="M12 6v13"/></svg>',
  };
  function paintSound() {
    dom.btnSound.innerHTML = (S.sound ? ICON.on : ICON.off) + '<span class="lbl-long">Sound </span>' + (S.sound ? 'on' : 'off');
    dom.btnSound.setAttribute('aria-pressed', String(S.sound));
    dom.btnSound.setAttribute('aria-label', 'Sound ' + (S.sound ? 'on' : 'off'));
  }
  let oneTimer = 0;
  function buildChrome() {
    paintSound();
    dom.btnDesk.innerHTML = ICON.desk + 'Desk';
    dom.btnIntro.innerHTML = ICON.read + 'Read';
    dom.btnSound.addEventListener('click', () => { S.sound = !S.sound; paintSound(); blip(880, 0.08, 'triangle'); });
    dom.btnDesk.addEventListener('click', () => { setMode('desk'); closePanel(); });
    dom.btnIntro.addEventListener('click', () => setMode(S.mode === 'intro' ? 'desk' : 'intro'));
    dom.back.addEventListener('click', closePanel);
    C.STYLES.forEach((s, i) => {
      const b = el('button', 'dot');
      b.type = 'button';
      b.style.setProperty('--c1', s.paper);
      b.style.setProperty('--c2', s.accent);
      b.setAttribute('aria-label', 'Universe ' + (i + 1) + ': ' + s.name);
      b.title = s.name;
      b.addEventListener('click', () => { const r = b.getBoundingClientRect(); setStyle(i, i > S.style ? 1 : -1, { x: r.left + r.width / 2, y: r.top - 80 }); });
      dom.dots.append(b);
    });
    // a real button for every object, for keyboards and screen readers
    const seen = new Set();
    Object.keys(hots).forEach((n) => {
      const label = C.LABELS[n];
      if (!label || seen.has(label)) return;
      seen.add(label);
      const b = el('button', null, label);
      b.type = 'button';
      b.addEventListener('click', () => activate(n));
      dom.hotList.append(b);
    });
    window.addEventListener('keydown', (e) => {
      const tag = (e.target && e.target.tagName) || '';
      if (/INPUT|TEXTAREA|SELECT/.test(tag)) return;
      if (e.key === 'Escape') { if (S.mode === 'intro') setMode('desk'); else closePanel(); return; }
      if (e.target && e.target.closest && e.target.closest('.vn, button, a') && (e.key === ' ' || e.key === 'Enter')) return;
      if (e.key === ' ' || e.code === 'Space') { e.preventDefault(); setStyle(S.style + 1, 1); }
      else if (e.key === 'ArrowRight' && !S.panel) setStyle(S.style + 1, 1);
      else if (e.key === 'ArrowLeft' && !S.panel) setStyle(S.style - 1, -1);
      else if (e.key === '1') {
        // "11" opens the Upside Down; a single 1 still jumps to universe one
        if (oneTimer) { clearTimeout(oneTimer); oneTimer = 0; setUpside(!UP.on); }
        else oneTimer = setTimeout(() => { oneTimer = 0; setStyle(0, -1); }, 420);
      } else if (/^[0-9]$/.test(e.key)) setStyle(e.key === '0' ? 9 : +e.key - 1, 1);
    });
    dom.canvas.addEventListener('pointerdown', onDown);
    dom.canvas.addEventListener('pointermove', onMove);
    dom.canvas.addEventListener('pointerup', onUp);
    dom.canvas.addEventListener('pointercancel', onUp);
    dom.canvas.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse' && !drag) setHover(0); });
    dom.canvas.addEventListener('wheel', onWheel, { passive: false });
    dom.canvas.addEventListener('dblclick', () => animateView(homeView(), 500));
    let mapDrag = false;
    dom.map.addEventListener('pointerdown', (e) => { mapDrag = true; dom.map.setPointerCapture(e.pointerId); mapTo(e); });
    dom.map.addEventListener('pointermove', (e) => { if (mapDrag) mapTo(e); });
    dom.map.addEventListener('pointerup', () => { mapDrag = false; });
    window.addEventListener('resize', () => { measure(); if (S.panel) { const n = Object.keys(C.HOTS).find((k) => C.HOTS[k].panel === S.panel && hots[k]); if (n) focusOn(n); } });
    mqPortrait.addEventListener && mqPortrait.addEventListener('change', () => { measure(); S.view = homeView(); });
  }

  // ───────────── boot ─────────────
  async function boot() {
    buildChrome();
    applyTheme(0);
    const g = gs();
    if (g && !reduce) g.from('.loader-name span', { y: -60, rotation: () => (Math.random() - 0.5) * 50, opacity: 0, duration: 0.6, stagger: 0.05, ease: 'back.out(2.4)' });
    measure();
    try {
      stage = createStage(dom.canvas, IMG);
    } catch (e) {
      dom.loaderText.textContent = 'This device cannot draw the desk. Opening the reading view.';
    }
    const ids = C.STYLES.map((s) => s.id).concat(A.lo.upside ? ['upside'] : []);
    let done = 0;
    const total = ids.length + 1;
    const tick = () => { done++; dom.bar.style.width = Math.round(done / total * 100) + '%'; };
    const hotIm = await loadImage(A.hot);
    const cv = document.createElement('canvas');
    cv.width = hotIm.width; cv.height = hotIm.height;
    const c2 = cv.getContext('2d', { willReadFrequently: true });
    c2.drawImage(hotIm, 0, 0);
    hotData = { w: cv.width, h: cv.height, d: c2.getImageData(0, 0, cv.width, cv.height).data };
    if (stage) stage.setHot(hotIm);
    tick();
    // the first universe first, then the rest
    lo[ids[0]] = await loadImage(A.lo[ids[0]]);
    if (stage) stage.put(ids[0], lo[ids[0]]);
    tick();
    await Promise.all(ids.slice(1).map((id) => loadImage(A.lo[id]).then((im) => { lo[id] = im; if (stage) stage.put(id, im); tick(); })));
    measure();
    S.view = homeView();
    if (!stage) { dom.loader.classList.add('done'); dom.loader.hidden = true; setMode('intro'); return; }
    S.ready = true;
    requestAnimationFrame(frame);
    wantHi(ids[0]);
    // reveal
    const start = { ...S.view };
    S.view = { ...start, z: 1.12 };
    animateView(start, 1400);
    if (g && !reduce) {
      g.to(dom.loader, { opacity: 0, duration: 0.5, delay: 0.15, ease: 'power2.out', onComplete: () => { dom.loader.hidden = true; } });
      g.from('.hud-top > *', { y: -30, opacity: 0, duration: 0.5, stagger: 0.08, delay: 0.35, ease: 'back.out(2)', clearProps: 'transform,opacity' });
      g.from('.hud-bottom > :not(.map)', { y: 30, opacity: 0, duration: 0.5, stagger: 0.06, delay: 0.45, ease: 'back.out(2)', clearProps: 'transform,opacity' });
    } else dom.loader.hidden = true;
    setTimeout(() => burst('HELLO!', { x: vw() / 2, y: vh() * 0.42 }), reduce ? 0 : 650);
    dom.canvas.focus({ preventScroll: true });
    S.lastInput = performance.now();
  }

  boot().catch((e) => {
    console.error(e);
    dom.loaderText.textContent = 'Something went wrong loading the desk. Opening the reading view.';
    setTimeout(() => { dom.loader.hidden = true; setMode('intro'); }, 900);
  });
})();
