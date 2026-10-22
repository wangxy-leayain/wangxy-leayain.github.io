/* The small playable things inside panels. Each widget mounts into a node and returns { destroy }. */
(function () {
  'use strict';

  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode: fine */ } },
  };
  const G = () => window.gsap || null;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rand = (a, b) => a + Math.random() * (b - a);

  // ───────────── original vinyl-toy figures, drawn as SVG (blind boxes, VN sprite) ─────────────
  // Designer-toy proportions: big glossy head, tiny body, soft vinyl shading. All six are original designs.
  const FIGS = [
    { id: 'star', name: 'Starling', line: 'Wishes on every star it sees.', rare: 'regular', skin: '#ffe3d3', suit: '#b9a2ff', type: 'hood', top: 'star' },
    { id: 'shroom', name: 'Little Shroom', line: 'Grows best after it rains.', rare: 'regular', skin: '#ffe6d6', suit: '#fff3df', type: 'shroom', top: 'none' },
    { id: 'cat', name: 'Purrcy', line: 'Naps on warm keyboards.', rare: 'regular', skin: '#ffe4d2', suit: '#ffb27a', type: 'cathood', top: 'none' },
    { id: 'boba', name: 'Boba Bean', line: 'Fifty per cent sugar, all of the pearls.', rare: 'regular', skin: '#ffe5d5', suit: '#f3d9b5', type: 'boba', top: 'none' },
    { id: 'gg', name: 'One More Round', line: 'Headset on. Crosshair steady.', rare: 'rare', skin: '#ffe2d0', suit: '#2c2f48', type: 'gamer', top: 'none' },
    { id: 'gold', name: 'Natural Twenty', line: 'Rolled a 20. Became gold.', rare: 'secret', skin: '#ffe1a6', suit: '#f5b81c', type: 'gold', top: 'd20' },
  ];
  let figSeq = 0;
  function tint(hex, k) {
    // k > 0 lightens toward white, k < 0 darkens toward black
    const n = parseInt(hex.slice(1), 16);
    const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.round(k >= 0 ? v + (255 - v) * k : v * (1 + k)));
    return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
  }
  function figureSVG(f, opts) {
    const o = opts || {};
    const u = 'f' + (++figSeq);
    const ink = '#2a1d33';
    const gold = f.type === 'gold';
    const skin = f.skin;
    const suit = f.suit;
    const grad = (id, base) => '<radialGradient id="' + u + id + '" cx="34%" cy="28%" r="78%"><stop offset="0" stop-color="' + tint(base, 0.55) + '"/><stop offset=".45" stop-color="' + base + '"/><stop offset="1" stop-color="' + tint(base, -0.28) + '"/></radialGradient>';
    const defs = '<defs>' + grad('s', skin) + grad('b', suit) + grad('h', f.type === 'shroom' ? '#ef4b5b' : f.type === 'cathood' ? '#ffb27a' : suit) +
      '<radialGradient id="' + u + 'e" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="' + (gold ? '#7a4a00' : '#4a3a6e') + '"/><stop offset="1" stop-color="' + (gold ? '#3a2200' : '#120c1f') + '"/></radialGradient>' +
      '<linearGradient id="' + u + 'c" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".75"/><stop offset="1" stop-color="#fff" stop-opacity=".15"/></linearGradient>' +
      '</defs>';
    const S = 'stroke="' + ink + '" stroke-width="3.2" stroke-linejoin="round"';
    const parts = [];
    // ground shadow
    parts.push('<ellipse cx="100" cy="229" rx="46" ry="7" fill="rgba(20,10,30,.18)"/>');
    if (gold) parts.push('<g fill="#ffd23f" stroke="' + ink + '" stroke-width="2"><path d="M22 70l4 10 10 4-10 4-4 10-4-10-10-4 10-4z"/><path d="M178 120l3 7 7 3-7 3-3 7-3-7-7-3 7-3z"/><path d="M168 40l2 5 5 2-5 2-2 5-2-5-5-2 5-2z"/></g>');
    // legs + shoes
    const shoe = f.type === 'gamer' ? '#ff5a60' : gold ? '#b57b00' : tint(suit, -0.35);
    parts.push('<rect x="80" y="196" width="16" height="26" rx="7" fill="url(#' + u + 'b)" ' + S + '/><rect x="104" y="196" width="16" height="26" rx="7" fill="url(#' + u + 'b)" ' + S + '/>');
    parts.push('<ellipse cx="86" cy="223" rx="13" ry="7" fill="' + shoe + '" ' + S + '/><ellipse cx="114" cy="223" rx="13" ry="7" fill="' + shoe + '" ' + S + '/>');
    // body
    if (f.type === 'boba') {
      // the body is a bubble-tea cup
      parts.push('<path d="M58 140 L142 140 L134 212 Q100 220 66 212 Z" fill="#f6e3c4" ' + S + '/>');
      parts.push('<path d="M64 168 L136 168 L134 208 Q100 216 66 208 Z" fill="#c99a6a" opacity=".55"/>');
      [[78, 196], [94, 202], [110, 198], [124, 192], [86, 184], [116, 182], [100, 190]].forEach(([x, y]) => parts.push('<circle cx="' + x + '" cy="' + y + '" r="6.5" fill="#3a2418" stroke="' + ink + '" stroke-width="1.5"/><circle cx="' + (x - 2) + '" cy="' + (y - 2) + '" r="1.8" fill="#fff" opacity=".7"/>'));
      parts.push('<rect x="54" y="132" width="92" height="14" rx="6" fill="#fff" ' + S + '/>');
      parts.push('<path d="M70 146 L74 206" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".55"/>');
    } else {
      parts.push('<path d="M66 154 Q66 140 100 140 Q134 140 134 154 L138 202 Q100 212 62 202 Z" fill="url(#' + u + 'b)" ' + S + '/>');
      if (f.type === 'gamer') parts.push('<path d="M86 168 h28 v22 h-28z" fill="#3b3f62" stroke="' + ink + '" stroke-width="2.4"/><circle cx="100" cy="179" r="7" fill="none" stroke="#ff5a60" stroke-width="2.6"/><path d="M100 168v6M100 184v6M89 179h6M105 179h6" stroke="#ff5a60" stroke-width="2.6"/>');
      if (f.type === 'shroom') parts.push('<circle cx="86" cy="178" r="4" fill="#ef4b5b"/><circle cx="112" cy="190" r="3" fill="#ef4b5b"/><circle cx="114" cy="164" r="3.5" fill="#ef4b5b"/>');
      if (f.type === 'hood' || f.type === 'cathood') parts.push('<path d="M86 150 Q100 162 114 150" fill="none" stroke="' + tint(suit, -0.3) + '" stroke-width="3" stroke-linecap="round"/><circle cx="92" cy="166" r="2.5" fill="' + ink + '"/><circle cx="108" cy="166" r="2.5" fill="' + ink + '"/>');
      if (gold) parts.push('<path d="M86 162 L114 162 L100 186 Z" fill="#fff1b8" stroke="' + ink + '" stroke-width="2.4"/><text x="100" y="177" text-anchor="middle" font-family="Bangers, Impact, sans-serif" font-size="12" fill="' + ink + '">20</text>');
    }
    // arms
    parts.push('<ellipse cx="60" cy="172" rx="10" ry="15" fill="url(#' + u + 'b)" ' + S + ' transform="rotate(18 60 172)"/><ellipse cx="140" cy="172" rx="10" ry="15" fill="url(#' + u + 'b)" ' + S + ' transform="rotate(-18 140 172)"/>');
    parts.push('<circle cx="56" cy="184" r="7" fill="url(#' + u + 's)" ' + S + '/><circle cx="144" cy="184" r="7" fill="url(#' + u + 's)" ' + S + '/>');
    if (f.type === 'boba') parts.push('<path d="M122 136 L150 40" stroke="#ff7ac8" stroke-width="9" stroke-linecap="round"/><path d="M122 136 L150 40" stroke="' + ink + '" stroke-width="12" stroke-linecap="round" opacity="0"/>');

    // head: back layer (hood / hair)
    const HX = 100, HY = 92;
    if (f.type === 'hood' || f.type === 'gold') {
      parts.push('<circle cx="' + HX + '" cy="' + HY + '" r="68" fill="url(#' + u + 'h)" ' + S + '/>');
    } else if (f.type === 'cathood') {
      parts.push('<path d="M44 70 L40 18 L84 40 Z" fill="url(#' + u + 'h)" ' + S + '/><path d="M156 70 L160 18 L116 40 Z" fill="url(#' + u + 'h)" ' + S + '/>');
      parts.push('<path d="M50 54 L48 30 L72 44 Z" fill="#ffd0e0"/><path d="M150 54 L152 30 L128 44 Z" fill="#ffd0e0"/>');
      parts.push('<circle cx="' + HX + '" cy="' + HY + '" r="68" fill="url(#' + u + 'h)" ' + S + '/>');
    } else if (f.type === 'gamer') {
      parts.push('<circle cx="' + HX + '" cy="' + HY + '" r="66" fill="#3a2a44" ' + S + '/>');
    } else {
      parts.push('<circle cx="' + HX + '" cy="' + HY + '" r="64" fill="#6a4632" ' + S + '/>');
    }
    // face
    const faceR = (f.type === 'hood' || f.type === 'cathood' || f.type === 'gold') ? [54, 50] : [60, 56];
    parts.push('<ellipse cx="' + HX + '" cy="' + (HY + 8) + '" rx="' + faceR[0] + '" ry="' + faceR[1] + '" fill="url(#' + u + 's)" ' + S + '/>');
    // fringe for hair types
    if (f.type === 'shroom' || f.type === 'boba' || f.type === 'gamer') {
      const hair = f.type === 'gamer' ? '#3a2a44' : '#6a4632';
      parts.push('<path d="M42 82 Q44 34 100 30 Q156 34 158 82 Q144 70 128 72 Q118 56 104 62 Q92 52 80 66 Q62 62 42 82 Z" fill="' + hair + '" ' + S + '/>');
      if (f.type === 'boba') parts.push('<circle cx="100" cy="30" r="15" fill="' + hair + '" ' + S + '/>');
    }
    // eyes
    const ey = HY + 14;
    const eye = (x) => o.blink
      ? '<path d="M' + (x - 10) + ' ' + ey + ' q10 8 20 0" fill="none" stroke="' + ink + '" stroke-width="3.6" stroke-linecap="round"/>'
      : '<ellipse cx="' + x + '" cy="' + ey + '" rx="10" ry="12.5" fill="url(#' + u + 'e)"/>' +
        (gold ? '<path d="M' + (x - 3) + ' ' + (ey - 7) + 'l2 4 4 2 -4 2 -2 4 -2-4 -4-2 4-2z" fill="#fff"/>' : '<circle cx="' + (x - 3.5) + '" cy="' + (ey - 5) + '" r="4" fill="#fff"/>') +
        '<circle cx="' + (x + 4) + '" cy="' + (ey + 5) + '" r="1.8" fill="#fff" opacity=".85"/>';
    parts.push(eye(78), eye(122));
    parts.push('<ellipse cx="64" cy="' + (ey + 18) + '" rx="10" ry="5.5" fill="#ff8fb4" opacity=".55"/><ellipse cx="136" cy="' + (ey + 18) + '" rx="10" ry="5.5" fill="#ff8fb4" opacity=".55"/>');
    parts.push(f.type === 'gamer'
      ? '<path d="M92 ' + (ey + 22) + ' q8 5 16 0" fill="none" stroke="' + ink + '" stroke-width="3" stroke-linecap="round"/>'
      : '<path d="M95 ' + (ey + 20) + ' q5 5 10 0" fill="#ff7a90" stroke="' + ink + '" stroke-width="2.6" stroke-linecap="round"/>');
    if (f.type === 'cathood') parts.push('<path d="M40 ' + (ey + 12) + ' l14 2 M40 ' + (ey + 22) + ' l14 -2 M160 ' + (ey + 12) + ' l-14 2 M160 ' + (ey + 22) + ' l-14 -2" stroke="' + ink + '" stroke-width="2.2" stroke-linecap="round"/>');

    // head: front layer (hats, headset, antenna)
    if (f.type === 'shroom') {
      parts.push('<path d="M22 70 Q24 6 100 4 Q176 6 178 70 Q160 80 100 78 Q40 80 22 70 Z" fill="url(#' + u + 'h)" ' + S + '/>');
      [[62, 32, 11], [104, 20, 9], [142, 40, 12], [86, 56, 7], [126, 64, 6], [40, 58, 6]].forEach(([x, y, r]) => parts.push('<ellipse cx="' + x + '" cy="' + y + '" rx="' + r + '" ry="' + (r * 0.8) + '" fill="#fff7ee" stroke="' + ink + '" stroke-width="2"/>'));
    }
    if (f.type === 'gamer') {
      parts.push('<path d="M30 96 Q30 18 100 18 Q170 18 170 96" fill="none" stroke="' + ink + '" stroke-width="13" stroke-linecap="round"/><path d="M30 96 Q30 18 100 18 Q170 18 170 96" fill="none" stroke="#4a4f78" stroke-width="7" stroke-linecap="round"/>');
      parts.push('<rect x="20" y="78" width="24" height="40" rx="11" fill="#ff5a60" ' + S + '/><rect x="156" y="78" width="24" height="40" rx="11" fill="#ff5a60" ' + S + '/>');
      parts.push('<path d="M34 114 Q40 140 70 136" fill="none" stroke="' + ink + '" stroke-width="4" stroke-linecap="round"/><circle cx="72" cy="136" r="5" fill="#2c2f48" stroke="' + ink + '" stroke-width="2.5"/>');
    }
    if (f.top === 'star') {
      parts.push('<path d="M100 26 Q98 16 100 8" stroke="' + ink + '" stroke-width="3.5" fill="none" stroke-linecap="round"/>');
      parts.push('<path d="M100 -12 l7 13 15 2 -11 10 3 15 -14 -7 -14 7 3-15 -11-10 15-2z" fill="#ffd23f" ' + S + ' transform="translate(0 4)"/>');
    }
    if (f.top === 'd20') {
      parts.push('<g transform="translate(100 18)"><path d="M0 -24 L21 -12 L21 12 L0 24 L-21 12 L-21 -12 Z" fill="#fff1b8" ' + S + '/><path d="M0 -24 L-12 6 L12 6 Z M-21 -12 L-12 6 M21 -12 L12 6 M-12 6 L0 24 L12 6 M-21 12 L-12 6 M21 12 L12 6" fill="none" stroke="' + ink + '" stroke-width="2"/><text x="0" y="2" text-anchor="middle" font-family="Bangers, Impact, sans-serif" font-size="11" fill="' + ink + '">20</text></g>');
    }
    // vinyl gloss: one soft highlight on the head, one on the body
    parts.push('<ellipse cx="70" cy="56" rx="20" ry="11" fill="url(#' + u + 'c)" transform="rotate(-28 70 56)" opacity=".75"/>');
    parts.push('<ellipse cx="80" cy="158" rx="9" ry="5" fill="#fff" opacity=".35" transform="rotate(-20 80 158)"/>');
    const sil = o.silhouette ? ' style="filter:brightness(0);opacity:.18"' : '';
    return '<svg viewBox="0 -20 200 256" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="' + (o.silhouette ? 'not found yet' : f.name) + '"' + sil + '>' + defs + parts.join('') + '</svg>';
  }

  // ───────────── about: facts + interests as stickers ─────────────
  function interests(root, ctx) {
    const C = window.CONTENT;
    const h = el('h3', 'section', 'Things I’m into');
    const grid = el('div', 'stickers');
    C.INTERESTS.forEach((it) => {
      const b = el('button', 'sticker');
      b.type = 'button';
      b.style.setProperty('--c', it.c);
      b.append(el('b', null, it.name), el('small', null, 'on the desk: ' + it.note));
      b.addEventListener('click', () => ctx.open(it.panel));
      grid.append(b);
    });
    root.append(h, grid);
    return { destroy() {} };
  }

  // ───────────── javascript: typed code + live console ─────────────
  function repl(root, ctx) {
    const P = window.CONTENT.PROFILE;
    const src = [
      '// leayain.js',
      'const leayain = {',
      '  name: "' + P.name + '",',
      '  school: "' + P.school + '",',
      '  study: "' + P.study + '",',
      '  year: ' + P.year + ',',
      '  next: "' + P.next + '",',
      '  into: [' + P.into.map((x) => '"' + x + '"').join(', ') + '],',
      '};',
    ].join('\n');
    const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    function highlight(t) {
      return t.replace(/(\/\/[^\n]*)|("[^"\n]*"?)|\b(const)\b|\b(leayain)\b|\b(\d+)\b|([^]?)/g, (m, c, str, k, v, n, other) => {
        if (c) return '<span class="c">' + esc(c) + '</span>';
        if (str) return '<span class="s">' + esc(str) + '</span>';
        if (k) return '<span class="k">' + k + '</span>';
        if (v) return '<span class="v">' + v + '</span>';
        if (n) return '<span class="n">' + n + '</span>';
        return esc(other || '');
      });
    }
    const code = el('pre', 'code');
    code.setAttribute('aria-label', src);
    root.append(code);
    let timer = 0;
    let shown = 0;
    const total = src.length;
    const paint = (n) => { code.innerHTML = highlight(src.slice(0, n)) + '<span class="caret"></span>'; };
    if (reduce) paint(total);
    else {
      timer = setInterval(() => {
        shown = Math.min(total, shown + 3);
        paint(shown);
        if (shown >= total) clearInterval(timer);
      }, 16);
    }

    const box = el('div', 'repl');
    const log = el('div', 'repl-log');
    log.setAttribute('aria-live', 'polite');
    const form = el('form');
    const input = el('input');
    input.placeholder = 'try: leayain.next';
    input.setAttribute('aria-label', 'JavaScript to run');
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.autocapitalize = 'off';
    const run = el('button', null, 'Run');
    run.type = 'submit';
    form.append(input, run);
    box.append(log, form);
    const chips = el('div', 'chips');
    ['leayain.next', 'leayain.into.length', 'leayain.into.join(" · ")', '`Hi, I\'m ${leayain.name}`', '[2, 0].map(x => x + 1)'].forEach((s) => {
      const c = el('button', 'chip', s);
      c.type = 'button';
      c.addEventListener('click', () => { input.value = s; exec(s); });
      chips.append(c);
    });
    root.append(el('h3', 'section', 'Console'), box, chips);
    const scope = JSON.parse(JSON.stringify(P));
    function fmt(v) {
      if (typeof v === 'string') return JSON.stringify(v);
      if (typeof v === 'function') return 'ƒ ' + (v.name || 'anonymous') + '()';
      try { const s = JSON.stringify(v); return s === undefined ? String(v) : s; } catch (e) { return String(v); }
    }
    function exec(src) {
      if (!src.trim()) return;
      log.append(el('div', 'in', src));
      let out;
      let cls = 'out';
      try {
        let fn;
        try { fn = new Function('leayain', '"use strict"; return (' + src + '\n);'); } catch (e) { fn = new Function('leayain', '"use strict";\n' + src); }
        out = fmt(fn(scope));
      } catch (e) { out = e.name + ': ' + e.message; cls = 'err'; }
      log.append(el('div', cls, out.length > 400 ? out.slice(0, 400) + '…' : out));
      log.scrollTop = log.scrollHeight;
      ctx.blip(cls === 'out' ? 880 : 180, 0.06);
    }
    form.addEventListener('submit', (e) => { e.preventDefault(); exec(input.value); input.select(); });
    return { destroy() { clearInterval(timer); } };
  }

  // ───────────── badminton: keep the rally going ─────────────
  function rally(root, ctx) {
    const game = el('div', 'game rally');
    const cv = el('canvas');
    game.append(cv);
    const score = el('dl', 'score');
    const sv = {};
    [['KEEP-UPS', 'now'], ['BEST', 'best'], ['SWINGS', 'swings']].forEach(([t, k]) => {
      const d = el('div');
      d.append(el('dt', null, t), (sv[k] = el('dd', null, '0')));
      score.append(d);
    });
    root.append(game, score);
    const over = el('div', 'overlay');
    const ttl = el('strong', null, 'Keep it up!');
    const msg = el('p', null, 'Move to aim, click or tap to swing.');
    const go = el('button', 'btn', 'Serve');
    go.type = 'button';
    over.append(ttl, msg, go);
    game.append(over);

    const g = cv.getContext('2d');
    let W = 0, H = 0, dpr = 1;
    let best = +store.get('rally-best', 0);
    sv.best.textContent = best;
    const S = { x: 0, y: 0, vx: 0, vy: 0, a: 0 };
    let rx = 0, swing = 0, playing = false, count = 0, swings = 0, raf = 0, last = 0;
    const trail = [];

    function size() {
      dpr = Math.min(devicePixelRatio || 1, 2);
      const r = game.getBoundingClientRect();
      W = r.width; H = r.height;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    }
    const ground = () => H * 0.56;
    const RY = () => ground() - 16;
    function serve() {
      S.x = W * 0.5; S.y = H * 0.12; S.vx = rand(-40, 40); S.vy = 0; count = 0; swings = 0;
      rx = W / 2; trail.length = 0;
      sv.now.textContent = 0; sv.swings.textContent = 0;
    }
    function hit() {
      swing = 1; swings++;
      sv.swings.textContent = swings;
      const dx = S.x - rx;
      const dy = RY() - 36 - S.y;
      if (Math.abs(dx) < 70 && dy > -40 && dy < 110 && S.vy > -50) {
        S.vy = -rand(430, 520) * (H / 300);
        S.vx = (-dx * 3.2) + rand(-90, 90) + (S.x < W * 0.25 ? 80 : S.x > W * 0.75 ? -80 : 0);
        count++;
        sv.now.textContent = count;
        ctx.blip(620 + Math.min(count, 20) * 30, 0.07, 'triangle');
        if (count > best) { best = count; store.set('rally-best', best); sv.best.textContent = best; }
      } else ctx.blip(140, 0.05, 'sine');
    }
    function step(t) {
      const dt = Math.min(0.033, (t - last) / 1000 || 0.016);
      last = t;
      if (playing) {
        const k = H / 300;
        S.vy += 520 * k * dt;
        S.vx *= Math.pow(0.55, dt);
        S.vy *= Math.pow(0.82, dt);
        const term = 260 * k;
        if (S.vy > term) S.vy = term;
        S.x += S.vx * dt; S.y += S.vy * dt;
        if (S.x < 12) { S.x = 12; S.vx = Math.abs(S.vx); }
        if (S.x > W - 12) { S.x = W - 12; S.vx = -Math.abs(S.vx); }
        S.a = Math.atan2(S.vy, S.vx);
        trail.push([S.x, S.y]);
        if (trail.length > 14) trail.shift();
        if (S.y > ground() + 4) { playing = false; end(); }
      }
      swing = Math.max(0, swing - dt * 5);
      draw();
      raf = requestAnimationFrame(step);
    }
    function draw() {
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, W, H);
      // trail
      trail.forEach((p, i) => { g.fillStyle = 'rgba(255,255,255,' + (i / trail.length * 0.5) + ')'; g.beginPath(); g.arc(p[0], p[1], 4 * i / trail.length, 0, 7); g.fill(); });
      // shuttle
      g.save();
      g.translate(S.x, S.y);
      g.rotate(S.a - Math.PI / 2);
      g.fillStyle = '#fff'; g.strokeStyle = '#14121c'; g.lineWidth = 2.5;
      g.beginPath(); g.moveTo(-6, 4); g.lineTo(-13, -22); g.lineTo(13, -22); g.lineTo(6, 4); g.closePath(); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(-10, -12); g.lineTo(10, -12); g.stroke();
      g.fillStyle = '#fdfbf4'; g.beginPath(); g.arc(0, 6, 7, 0, Math.PI); g.lineTo(-7, 4); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#e5484d'; g.fillRect(-7, 2, 14, 3);
      g.restore();
      // racket
      g.save();
      g.translate(rx, RY());
      g.rotate(-0.5 - swing * 1.4);
      g.strokeStyle = '#14121c'; g.lineWidth = 9; g.lineCap = 'round';
      g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -34); g.stroke();
      g.strokeStyle = '#1e6ed2'; g.lineWidth = 6; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -16); g.stroke();
      g.strokeStyle = '#14121c'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, -34); g.lineTo(0, -46); g.stroke();
      g.fillStyle = 'rgba(255,255,255,.35)'; g.strokeStyle = '#ffd23f'; g.lineWidth = 5;
      g.beginPath(); g.ellipse(0, -68, 17, 23, 0, 0, 7); g.fill(); g.stroke();
      g.strokeStyle = '#14121c'; g.lineWidth = 1.5; g.beginPath(); g.ellipse(0, -68, 20, 26, 0, 0, 7); g.stroke();
      g.restore();
      // ground shadow
      g.fillStyle = 'rgba(0,0,0,.18)';
      g.beginPath(); g.ellipse(S.x, ground() + 6, 10, 3, 0, 0, 7); g.fill();
    }
    function end() {
      store.set('rally-played', '1');
      ttl.textContent = count ? count + (count === 1 ? ' keep-up' : ' keep-ups') + '!' : 'Dropped it!';
      msg.textContent = count >= best && count > 0 ? 'New best.' : 'Best so far: ' + best;
      go.textContent = 'Again';
      over.hidden = false;
      ctx.blip(200, 0.2, 'sawtooth');
    }
    function point(e) {
      const r = game.getBoundingClientRect();
      rx = Math.max(20, Math.min(W - 20, e.clientX - r.left));
    }
    game.addEventListener('pointermove', point);
    game.addEventListener('pointerdown', (e) => {
      if (over.hidden === false) return;
      point(e);
      hit();
    });
    go.addEventListener('click', (e) => { e.stopPropagation(); over.hidden = true; serve(); playing = true; });
    const ro = new ResizeObserver(() => { size(); if (!playing) { S.x = W / 2; S.y = H * 0.3; rx = W / 2; } draw(); });
    ro.observe(game);
    size(); S.x = W / 2; S.y = H * 0.3; rx = W / 2;
    raf = requestAnimationFrame(step);
    return { destroy() { cancelAnimationFrame(raf); ro.disconnect(); } };
  }

  // ───────────── board games: dice + meeples ─────────────
  function dice(root, ctx) {
    const tray = el('div', 'game dice-tray');
    const pips = { 1: [5], 2: [1, 9], 3: [1, 5, 9], 4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9] };
    const ROT = { 1: [0, 0], 6: [0, 180], 2: [0, -90], 5: [0, 90], 3: [-90, 0], 4: [90, 0] };
    const dies = [0, 1].map((k) => {
      const d = el('div', 'die' + (k ? ' red' : ''));
      for (let f = 1; f <= 6; f++) {
        const face = el('div', 'face f' + f);
        for (let c = 1; c <= 9; c++) { const i = el('i'); if (!pips[f].includes(c)) i.style.visibility = 'hidden'; face.append(i); }
        d.append(face);
      }
      const wrap = el('div', 'die-wrap');
      wrap.append(d);
      tray.append(wrap);
      return { node: d, wrap, rx: -20, ry: 25 };
    });
    const row = el('div', 'hud-row');
    const btn = el('button', 'btn', 'Roll the dice');
    btn.type = 'button';
    const total = el('span', 'total', '–');
    const note = el('span', null, '');
    note.style.fontWeight = '700';
    row.append(btn, total, note);
    const hist = el('ul', 'history');
    hist.setAttribute('aria-label', 'Last rolls');
    root.append(tray, row, hist);

    const mh = el('h3', 'section', 'Pick your meeple');
    const ms = el('div', 'meeples');
    const mnote = el('p', null, '');
    mnote.style.fontWeight = '700';
    const cols = [['red', '#e5484d'], ['blue', '#2b6be4'], ['green', '#30a46c'], ['yellow', '#ffd23f'], ['pink', '#ff7ac8'], ['purple', '#8e4ec6']];
    cols.forEach(([n, c]) => {
      const b = el('button', 'meeple');
      b.type = 'button';
      b.setAttribute('aria-label', n + ' meeple');
      b.setAttribute('aria-pressed', 'false');
      b.innerHTML = '<svg viewBox="-12 -12 24 24"><path d="M0-10 2.8-9.2 3.8-6.2 3-3.6 9.2-2 10 0 8.5 1.2 4.2 1 7.5 10 1.2 10 0 6.2-1.2 10-7.5 10-4.2 1-8.5 1.2-10 0-9.2-2-3-3.6-3.8-6.2-2.8-9.2z" fill="' + c + '" stroke="#14121c" stroke-width="1.6" stroke-linejoin="round"/></svg>';
      b.addEventListener('click', () => {
        ms.querySelectorAll('.meeple').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        mnote.textContent = 'You’re ' + n + '. Roll to move.';
        ctx.blip(500, 0.05, 'triangle');
      });
      ms.append(b);
    });
    root.append(mh, ms, mnote);

    let rolling = false;
    btn.addEventListener('click', () => {
      if (rolling) return;
      rolling = true;
      btn.disabled = true;
      const vals = dies.map(() => 1 + Math.floor(Math.random() * 6));
      dies.forEach((d, i) => {
        const [x, y] = ROT[vals[i]];
        const spinX = 360 * (2 + i) * (Math.random() < 0.5 ? 1 : -1);
        const spinY = 360 * (2 + (1 - i));
        const tx = Math.round((d.rx - x) / 360) * 360 + x + spinX - 20;
        const ty = Math.round((d.ry - y) / 360) * 360 + y + spinY + 25;
        d.rx = tx; d.ry = ty;
        d.node.style.transform = 'rotateX(' + tx + 'deg) rotateY(' + ty + 'deg)';
        const g = G();
        if (g && !reduce) g.fromTo(d.wrap, { y: 0 }, { y: -46, duration: 0.3, ease: 'power2.out', yoyo: true, repeat: 1 });
      });
      ctx.blip(330, 0.05, 'square');
      setTimeout(() => ctx.blip(260, 0.05, 'square'), 180);
      setTimeout(() => {
        const sum = vals[0] + vals[1];
        total.textContent = sum;
        note.textContent = vals[0] === vals[1] ? 'Doubles! Roll again.' : vals.join(' + ');
        const li = el('li', null, vals.join('+') + '=' + sum);
        hist.prepend(li);
        while (hist.children.length > 8) hist.lastChild.remove();
        const g = G();
        if (g && !reduce) g.fromTo(total, { scale: 1.8, rotation: -10 }, { scale: 1, rotation: 0, duration: 0.4, ease: 'back.out(3)' });
        ctx.blip(vals[0] === vals[1] ? 990 : 720, 0.12, 'triangle');
        rolling = false;
        btn.disabled = false;
      }, reduce ? 50 : 950);
    });
    return { destroy() {} };
  }

  // ───────────── valorant: 20-second aim warm-up ─────────────
  function aim(root, ctx) {
    const box = el('div', 'game aim');
    const score = el('dl', 'score');
    const sv = {};
    [['HITS', 'hits'], ['ACCURACY', 'acc'], ['AVG TIME', 'avg']].forEach(([t, k]) => {
      const d = el('div');
      d.append(el('dt', null, t), (sv[k] = el('dd', null, '–')));
      score.append(d);
    });
    const over = el('div', 'overlay');
    const ttl = el('strong', null, 'Aim warm-up');
    const msg = el('p', null, '20 seconds. Click the targets.');
    let best = +store.get('aim-best', 0);
    const bestP = el('p', null, best ? 'Best: ' + best + ' hits' : '');
    const go = el('button', 'btn', 'Start');
    go.type = 'button';
    over.append(ttl, msg, bestP, go);
    box.append(over);
    const timeBar = el('div');
    timeBar.style.cssText = 'position:absolute;left:0;top:0;height:5px;background:#ff5a60;width:0;z-index:2';
    box.append(timeBar);
    root.append(box, score);

    let hits = 0, shots = 0, times = [], t0 = 0, spawnAt = 0, timer = 0, raf = 0, live = false, target = null;
    const DUR = 20000;
    function spawn() {
      if (target) target.remove();
      const r = box.getBoundingClientRect();
      const size = Math.max(30, 46 - hits * 0.6);
      target = el('button', 'target');
      target.type = 'button';
      target.setAttribute('aria-label', 'target');
      target.style.width = target.style.height = size + 'px';
      target.style.margin = (-size / 2) + 'px 0 0 ' + (-size / 2) + 'px';
      target.style.left = rand(30, r.width - 30) + 'px';
      target.style.top = rand(34, r.height - 30) + 'px';
      target.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        if (!live) return;
        hits++; shots++;
        times.push(performance.now() - spawnAt);
        const m = el('span', 'hitmark', '+1');
        m.style.left = target.style.left; m.style.top = target.style.top;
        box.append(m);
        setTimeout(() => m.remove(), 650);
        ctx.blip(1200, 0.05, 'square');
        upd();
        spawn();
      });
      box.append(target);
      spawnAt = performance.now();
    }
    function upd() {
      sv.hits.textContent = hits;
      sv.acc.textContent = shots ? Math.round(hits / shots * 100) + '%' : '–';
      sv.avg.textContent = times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) + 'ms' : '–';
    }
    box.addEventListener('pointerdown', () => { if (live) { shots++; upd(); ctx.blip(160, 0.04, 'sine'); } });
    function tick() {
      const p = Math.min(1, (performance.now() - t0) / DUR);
      timeBar.style.width = (100 - p * 100) + '%';
      if (p >= 1) { finish(); return; }
      raf = requestAnimationFrame(tick);
    }
    function finish() {
      live = false;
      if (target) { target.remove(); target = null; }
      ttl.textContent = hits + ' hits';
      msg.textContent = (shots ? Math.round(hits / shots * 100) : 0) + '% accuracy · ' + (times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0) + 'ms average';
      store.set('aim-played', '1');
      if (hits > best) { best = hits; store.set('aim-best', best); bestP.textContent = 'New best!'; } else bestP.textContent = 'Best: ' + best + ' hits';
      go.textContent = 'One more round';
      over.hidden = false;
      ctx.blip(300, 0.25, 'sawtooth');
    }
    go.addEventListener('click', (e) => {
      e.stopPropagation();
      hits = 0; shots = 0; times = []; upd();
      over.hidden = true;
      live = true;
      t0 = performance.now();
      spawn();
      raf = requestAnimationFrame(tick);
    });
    return { destroy() { live = false; cancelAnimationFrame(raf); clearTimeout(timer); } };
  }

  // ───────────── pop mart: blind boxes ─────────────
  function blindbox(root, ctx) {
    const colors = ['#ff9ccf', '#8fe0cc', '#c3b4ff', '#ffd23f', '#9cc8ff', '#ffb3a8'];
    const stageBox = el('div', 'game bb-stage');
    const rays = el('div', 'bb-rays');
    const spot = el('div', 'bb-figure');
    const card = el('div', 'bb-card');
    const name = el('p', 'name', 'Series 1 · six to find');
    const line = el('p', 'bb-line', 'Pick a box below. One of the six is a secret.');
    const rar = el('span', 'rarity', '1 SECRET · 1 RARE · 4 REGULAR');
    card.append(name, line, rar);
    spot.innerHTML = '<div class="bb-wait">?</div>';
    stageBox.append(rays, spot, card);

    const shelf = el('div', 'shelf');
    const got = new Set((store.get('bb-got', '') || '').split(',').filter(Boolean));
    const dex = el('div', 'dex');
    dex.setAttribute('aria-label', 'Collection');
    function paintDex() {
      dex.replaceChildren(...FIGS.map((f) => {
        const s = el('span', got.has(f.id) ? 'got' : '');
        s.title = got.has(f.id) ? f.name : 'Not found yet';
        s.innerHTML = figureSVG(f, { silhouette: !got.has(f.id) });
        return s;
      }));
      count.textContent = got.size + ' / ' + FIGS.length;
    }
    const count = el('span', 'dex-count');
    const again = el('button', 'btn ghost', 'Restock the shelf');
    again.type = 'button';
    function stock() {
      shelf.replaceChildren();
      for (let i = 0; i < 6; i++) {
        const b = el('button', 'bbox');
        b.type = 'button';
        b.setAttribute('aria-label', 'Blind box ' + (i + 1));
        b.style.setProperty('--bc', colors[i]);
        b.append(el('span', 'bb-q', '?'));
        b.addEventListener('click', () => open(b));
        shelf.append(b);
      }
    }
    function pick() {
      const r = Math.random();
      if (r < 1 / 12) return FIGS[5];
      if (r < 1 / 12 + 1 / 6) return FIGS[4];
      return FIGS[Math.floor(Math.random() * 4)];
    }
    let busy = false;
    function show(f, isNew) {
      spot.innerHTML = figureSVG(f);
      name.textContent = f.name + (isNew ? ' · new!' : '');
      line.textContent = f.line;
      rar.textContent = f.rare === 'secret' ? 'SECRET · 1 in 12' : f.rare === 'rare' ? 'RARE · 1 in 6' : 'REGULAR';
      rar.className = 'rarity ' + f.rare;
      stageBox.dataset.rare = f.rare;
      const g = G();
      if (g && !reduce) {
        g.fromTo(spot.firstChild, { y: 60, scale: 0.3, rotation: -10 }, { y: 0, scale: 1, rotation: 0, duration: 0.7, ease: 'back.out(2)' });
        g.fromTo(rays, { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.5, ease: 'power2.out' });
        g.from(card.children, { x: 20, opacity: 0, duration: 0.35, stagger: 0.06, delay: 0.25, clearProps: 'all' });
      }
    }
    function open(b) {
      if (busy || b.classList.contains('opened')) return;
      busy = true;
      const f = pick();
      const g = G();
      const done = () => {
        if (g) g.set(b, { clearProps: 'all' });
        b.classList.add('opened');
        b.replaceChildren();
        b.innerHTML = figureSVG(f);
        b.setAttribute('aria-label', 'Opened: ' + f.name);
        if (f.rare === 'secret') store.set('bb-secret', '1');
        const isNew = !got.has(f.id);
        got.add(f.id);
        store.set('bb-got', [...got].join(','));
        paintDex();
        show(f, isNew);
        ctx.blip(f.rare === 'secret' ? 1320 : f.rare === 'rare' ? 990 : 760, 0.18, 'triangle');
        busy = false;
      };
      ctx.blip(300, 0.05, 'square');
      if (g && !reduce) {
        g.timeline({ onComplete: done })
          .to(b, { rotation: -5, duration: 0.06, repeat: 5, yoyo: true, ease: 'none' })
          .to(b, { y: -10, scale: 1.06, duration: 0.14, ease: 'power2.out' })
          .to(b, { y: 0, scale: 1, duration: 0.12, ease: 'power2.in' });
      } else done();
    }
    again.addEventListener('click', () => { stock(); ctx.blip(500, 0.05); });
    stock();
    const head = el('h3', 'section', 'Collection ');
    head.append(count);
    const links = el('div', 'links');
    links.append(again);
    root.append(stageBox, shelf, head, dex, links);
    paintDex();
    return { destroy() {} };
  }

  // ───────────── visual novel: "Leayain: Year Two" ─────────────
  // The script lives in content.js (VN). This engine handles routes, challenges that read the
  // scores saved by the other desk games, universe-aware lines, and the endings gallery.
  const VN_ENDINGS = [
    { id: 'normal', name: 'Just Visiting', tag: 'NORMAL END' },
    { id: 'good', name: 'Full Desk Tour', tag: 'GOOD END' },
    { id: 'true', name: 'Next Chapter', tag: 'TRUE END' },
    { id: 'wrong', name: 'Wrong Universe', tag: '??? END' },
    { id: 'upside', name: 'The Upside Down', tag: 'UPSIDE DOWN END' },
  ];
  const ROUTES = ['valorant', 'badminton', 'boardgames', 'popmart'];
  function vnRun() { try { return JSON.parse(store.get('vn-run', '') || 'null'); } catch (e) { return null; } }
  function vnSave(run) { store.set('vn-run', JSON.stringify(run)); }
  function vnEndings() { return (store.get('vn-endings', '') || '').split(',').filter(Boolean); }

  function vn(root, ctx) {
    const SCRIPT = window.CONTENT.VN;
    const box = el('div', 'game vn');
    const bg = el('div', 'vn-bg');
    for (let i = 0; i < 8; i++) {
      const b = el('i');
      b.style.left = (2 + i * 12.5) + '%';
      b.style.height = (24 + (i * 37 % 5) * 7) + '%';
      bg.append(b);
    }
    bg.append(el('div', 'vn-moon'));
    const spores = el('div', 'vn-spores');
    for (let i = 0; i < 26; i++) {
      const sp = el('i');
      sp.style.left = rand(0, 100) + '%';
      sp.style.animationDelay = rand(-8, 0) + 's';
      sp.style.animationDuration = rand(5, 10) + 's';
      spores.append(sp);
    }
    const sprite = el('div', 'vn-sprite');
    const lights = el('div', 'vn-lights');
    lights.hidden = true;
    const bulbs = [];
    for (let i = 0; i < 26; i++) {
      const c = el('span');
      c.textContent = String.fromCharCode(65 + i);
      c.style.setProperty('--bc', ['#ff4b4b', '#ffd23f', '#3ec46d', '#3e8bff', '#ff7ac8'][i % 5]);
      lights.append(c);
      bulbs.push(c);
    }
    const tb = el('div', 'vn-box');
    tb.setAttribute('role', 'button');
    tb.setAttribute('tabindex', '0');
    tb.setAttribute('aria-label', 'Continue');
    const nm = el('span', 'vn-name', 'Leayain');
    const tx = el('p', 'vn-text');
    tx.setAttribute('aria-live', 'polite');
    const nx = el('span', 'vn-next', '▼');
    tb.append(nm, tx, nx);
    const ch = el('div', 'vn-choices');
    ch.hidden = true;
    const screen = el('div', 'vn-screen');           // title screen and ending cards
    box.append(bg, spores, sprite, lights, ch, tb, screen);
    const tally = el('p', 'vn-tally');
    root.append(box, tally);

    let run = vnRun();
    let node = null;
    let typing = 0, blinkT = 0, full = '', shown = 0;
    const timers = [];
    const later = (fn, ms) => timers.push(setTimeout(fn, ms));
    const figure = FIGS[0];
    const paintSprite = (blink) => { sprite.innerHTML = figureSVG(figure, { blink }); };
    paintSprite(false);

    // which universe the desk is in changes how lines are dressed
    const look = () => (ctx.isUpside && ctx.isUpside()) ? 'upside' : (ctx.styleId ? ctx.styleId() : 'comic');
    function paintLook() {
      box.className = 'game vn vn--' + look();
    }
    function dress(text) {
      const l = look();
      if (l === 'neon' || l === 'upside') return '> ' + text;
      return text;
    }
    function choiceLabel(t) { return look() === 'pixel' ? '▶ ' + t : t; }

    function scores() {
      const got = (store.get('bb-got', '') || '').split(',').filter(Boolean);
      return {
        aimPlayed: store.get('aim-played', '') === '1', aim: +store.get('aim-best', 0),
        rallyPlayed: store.get('rally-played', '') === '1', rally: +store.get('rally-best', 0),
        boxes: got.length, secret: store.get('bb-secret', '') === '1',
      };
    }
    function pickVariant(n) {
      // a line may change per universe: { text, noir: '...', pixel: '...', upside: '...' }
      const l = look();
      const t = n[l] || n.text;
      return typeof t === 'function' ? t(scores(), run) : t;
    }
    function find(id) { return SCRIPT.findIndex((n) => n.id === id); }
    function typeLine(text) {
      clearInterval(typing);
      full = dress(text);
      shown = 0;
      nx.hidden = true;
      typing = setInterval(() => {
        shown++;
        tx.textContent = full.slice(0, shown);
        if (shown % 3 === 0) ctx.blip(900 + Math.random() * 200, 0.02, 'square');
        if (shown >= full.length) finishLine();
      }, reduce ? 1 : 26);
    }
    function finishLine() {
      clearInterval(typing);
      tx.textContent = full;
      shown = full.length;
      const n = SCRIPT[node];
      const opts = (n.choices || []).filter((c) => !c.if || c.if(scores(), run));
      if (opts.length) {
        ch.replaceChildren(...opts.map((c) => {
          const b = el('button', c.cls || null);
          b.type = 'button';
          const done = c.route && run.visited.includes(c.route);
          b.textContent = choiceLabel(typeof c.label === 'function' ? c.label(scores(), run) : c.label) + (done ? '  ✓' : '');
          b.addEventListener('click', (e) => { e.stopPropagation(); choose(c); });
          return b;
        }));
        ch.classList.toggle('many', opts.length > 3);
        ch.hidden = false;
        const g = G();
        if (g && !reduce) g.from(ch.children, { y: -10, opacity: 0, duration: 0.25, stagger: 0.06, clearProps: 'all' });
      } else nx.hidden = false;
    }
    function show(i) {
      node = i;
      const n = SCRIPT[i];
      run.node = n.id || null;
      vnSave(run);
      ch.hidden = true;
      if (n.do) n.do({ flash, flip, spellLights, setLights, setDark, ctx, run, s: scores(), look: look() });
      if (n.route && !run.visited.includes(n.route)) { run.visited.push(n.route); vnSave(run); }
      if (n.ending) { ending(n.ending); return; }
      nm.textContent = n.who || 'Leayain';
      nm.hidden = n.who === '';
      let text = pickVariant(n);
      if (look() === 'pixel' && n.route && n.enter) text = '[ LEAYAIN JOINED THE PARTY! ] ' + text;
      typeLine(text);
      const g = G();
      if (g && !reduce) g.fromTo(sprite, { y: 6 }, { y: 0, duration: 0.25, ease: 'power2.out' });
    }
    function next() {
      const n = SCRIPT[node];
      if (n.go) { show(find(typeof n.go === 'function' ? n.go(scores(), run) : n.go)); return; }
      show(node + 1);
    }
    function choose(c) {
      ctx.blip(620, 0.05, 'triangle');
      if (c.challenge) {
        // leave for one of the desk games; the story picks up here when the handheld is opened again
        run.pending = c.challenge;
        run.node = c.back;
        vnSave(run);
        ctx.open(c.challenge);
        return;
      }
      const target = typeof c.go === 'function' ? c.go(scores(), run) : c.go;
      show(find(target));
    }
    function advance() {
      if (!screen.hidden) return;
      if (shown < full.length) { finishLine(); return; }
      if (!ch.hidden) return;
      next();
    }
    tb.addEventListener('click', advance);
    box.addEventListener('click', (e) => { if (e.target === box || e.target === sprite || bg.contains(e.target)) advance(); });
    tb.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); advance(); } });

    // effects the script can call
    function flash(color) {
      const f = el('div', 'vn-flash');
      f.style.background = color || '#ffe27a';
      box.append(f);
      later(() => f.remove(), 700);
    }
    function flip() {
      box.classList.add('vn-flipping');
      later(() => box.classList.remove('vn-flipping'), 1300);
    }
    function setDark(on) { box.classList.toggle('vn-dark', on); }
    function setLights(on) { lights.hidden = !on; bulbs.forEach((b) => b.classList.remove('on')); }
    function spellLights(word, gap) {
      [...word].forEach((c, k) => {
        later(() => {
          bulbs.forEach((b) => b.classList.remove('on'));
          const b = bulbs[c.charCodeAt(0) - 65];
          if (b) { b.classList.add('on'); ctx.blip(700 + k * 60, 0.08, 'sine'); }
        }, k * (gap || 700));
      });
      later(() => bulbs.forEach((b) => b.classList.remove('on')), word.length * (gap || 700));
    }

    // title screen and ending cards
    function paintTally() {
      const got = vnEndings();
      tally.replaceChildren(el('b', null, 'Endings ' + got.length + ' / ' + VN_ENDINGS.length + '  '),
        ...VN_ENDINGS.map((e) => el('span', got.includes(e.id) ? 'got' : '', got.includes(e.id) ? e.name : '???')));
    }
    function title() {
      clearInterval(typing);
      setLights(false);
      setDark(look() === 'upside');
      screen.hidden = false;
      screen.className = 'vn-screen vn-title';
      const t = el('div');
      t.append(el('small', null, 'a very short visual novel'), el('strong', null, 'LEAYAIN'), el('em', null, 'Year Two'));
      const start = el('button', 'btn', run && run.node ? 'Continue' : 'Press start');
      start.type = 'button';
      start.addEventListener('click', (e) => {
        e.stopPropagation();
        screen.hidden = true;
        if (!run || !run.node) { run = { visited: [], pending: null, node: null }; vnSave(run); show(0); } else resume();
      });
      const fresh = el('button', 'btn ghost', 'New game');
      fresh.type = 'button';
      fresh.hidden = !(run && run.node);
      fresh.addEventListener('click', (e) => { e.stopPropagation(); screen.hidden = true; run = { visited: [], pending: null, node: null }; vnSave(run); show(0); });
      const row = el('div', 'links');
      row.append(start, fresh);
      screen.replaceChildren(t, row);
      tx.textContent = '';
      nx.hidden = true;
      ch.hidden = true;
    }
    function ending(id) {
      clearInterval(typing);
      const e = VN_ENDINGS.find((x) => x.id === id);
      const got = vnEndings();
      const isNew = !got.includes(id);
      if (isNew) { got.push(id); store.set('vn-endings', got.join(',')); }
      paintTally();
      run = { visited: [], pending: null, node: null };
      vnSave(run);
      screen.hidden = false;
      screen.className = 'vn-screen vn-end vn-end--' + id;
      const t = el('div');
      t.append(el('small', null, e.tag), el('strong', null, e.name), el('em', null, isNew ? 'New ending unlocked' : 'Ending ' + (VN_ENDINGS.indexOf(e) + 1) + ' of ' + VN_ENDINGS.length));
      const again = el('button', 'btn', id === 'true' ? 'To be continued' : 'Play again');
      again.type = 'button';
      again.addEventListener('click', (ev) => { ev.stopPropagation(); title(); });
      screen.replaceChildren(t, again);
      ctx.blip(id === 'true' || id === 'upside' ? 1046 : 784, 0.3, 'triangle');
      const g = G();
      if (g && !reduce) g.from(t.children, { y: 20, opacity: 0, duration: 0.4, stagger: 0.12, ease: 'back.out(2)' });
    }
    function resume() {
      if (run.pending) {
        const back = run.node;
        run.pending = null;
        show(find(back));
        return;
      }
      const i = run.node ? find(run.node) : -1;
      show(i >= 0 ? i : 0);
    }

    // press space mid-conversation and the desk changes universe under her feet
    const mo = new MutationObserver(() => {
      paintLook();
      if (!screen.hidden || node == null) return;
      if (ctx.isUpside && ctx.isUpside()) return;
      show(find('wrong'));
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-style'] });

    paintLook();
    paintTally();
    blinkT = setInterval(() => { paintSprite(true); later(() => paintSprite(false), 140); }, 3200);
    if (run && run.pending) { screen.hidden = true; resume(); } else title();
    return { destroy() { clearInterval(typing); clearInterval(blinkT); timers.forEach(clearTimeout); mo.disconnect(); } };
  }

  // ───────────── phd: two stops ─────────────
  function road(root) {
    const r = el('div', 'road');
    const a = el('div', 'stop now');
    a.append(el('small', null, 'NOW'), el('b', null, 'CS at UNSW'), el('small', null, 'year 2'));
    const b = el('div', 'stop');
    b.append(el('small', null, 'NEXT'), el('b', null, 'PhD'), el('small', null, 'the plan'));
    r.append(a, b);
    root.append(r);
    return { destroy() {} };
  }

  window.WIDGETS = { interests, repl, rally, dice, aim, blindbox, vn, road, figureSVG, FIGS };
})();
