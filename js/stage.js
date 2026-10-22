/* WebGL stage: draws the current universe, the block-glitch transition between two universes,
   and an outline around the hovered object. Shader approach adapted from EdwinjJ1/personal-website (MIT). */
(function () {
  'use strict';

  const VERT = 'attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }';
  const FRAG = `
precision highp float;
uniform sampler2D uA, uB, uHot;
uniform vec2 uRes, uImg, uCenter;
uniform float uScale, uT, uTime, uHover, uDir;
uniform vec3 uHi, uBg;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float hotAt(vec2 uv){ return floor(texture2D(uHot, uv).r * 255.0 / 8.0 + 0.5); }
vec3 split(sampler2D t, vec2 uv, float sh){
  return vec3(texture2D(t, uv + vec2(sh, 0.0)).r, texture2D(t, uv).g, texture2D(t, uv - vec2(sh, 0.0)).b);
}

void main(){
  vec2 frag = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  vec2 uv = ((frag - uRes * 0.5) / uScale + uCenter) / uImg;
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) { gl_FragColor = vec4(uBg, 1.0); return; }

  // transition: the frame is cut into blocks that flip to the new universe one by one,
  // with sideways tearing and RGB split at the peak
  float peak = 1.0 - abs(2.0 * uT - 1.0);
  vec2 cell = floor(uv * vec2(28.0, 15.75));
  float sweep = mix(uv.x, 1.0 - uv.x, step(0.0, -uDir));
  float order = hash(cell) * 0.45 + hash(floor(uv * vec2(7.0, 4.0)) + 3.1) * 0.3 + sweep * 0.25;
  float jit = hash(cell + floor(uTime * 14.0));
  vec2 duv = uv + vec2((jit - 0.5) * 0.06 * peak * step(0.72, jit), 0.0);
  float flip = step(order, uT * 1.25 - 0.12);
  float sh = 0.007 * peak;
  vec3 col = mix(split(uA, duv, sh), split(uB, duv, sh), flip);
  float seam = step(abs(order - (uT * 1.25 - 0.12)), 0.035) * step(0.001, peak);
  col = mix(col, uHi, seam * 0.85);
  // scanline flash
  col += vec3(0.08) * peak * step(0.5, fract(frag.y / 3.0));

  if (uHover > 0.5) {
    float inside = step(abs(hotAt(uv) - uHover), 0.5);
    vec2 px = 4.0 / uImg;
    float near = 0.0;
    for (int i = 0; i < 8; i++) {
      float a = float(i) * 0.7853982;
      near = max(near, step(abs(hotAt(uv + vec2(cos(a), sin(a)) * px) - uHover), 0.5));
    }
    float pulse = 0.72 + 0.28 * sin(uTime * 5.0);
    col = mix(col, vec3(1.0), inside * 0.10);
    col = mix(col, uHi, near * (1.0 - inside) * pulse);
  }
  gl_FragColor = vec4(col, 1.0);
}`;

  function hexToRgb(hex) {
    const h = hex.replace('#', '');
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const im = new Image();
      im.decoding = 'async';
      im.onload = () => resolve(im);
      im.onerror = () => reject(new Error('could not load ' + src.slice(0, 60)));
      im.src = src;
    });
  }

  function createGL(canvas, img) {
    const gl2 = canvas.getContext('webgl2', { antialias: false, alpha: false, preserveDrawingBuffer: false });
    const gl = gl2 || canvas.getContext('webgl', { antialias: false, alpha: false }) || canvas.getContext('experimental-webgl');
    if (!gl) return null;
    const compile = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || 'shader');
      return s;
    };
    const prog = gl.createProgram();
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) || 'link');
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const U = {};
    ['uA', 'uB', 'uHot', 'uRes', 'uImg', 'uCenter', 'uScale', 'uT', 'uTime', 'uHover', 'uHi', 'uBg', 'uDir'].forEach((n) => { U[n] = gl.getUniformLocation(prog, n); });
    const maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE);

    function texture(source, nearest) {
      const t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, nearest ? gl.NEAREST : gl.LINEAR);
      if (gl2 && !nearest) { // halftone dots shimmer when minified without mipmaps
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      } else {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, nearest ? gl.NEAREST : gl.LINEAR);
      }
      return t;
    }
    const tex = new Map();
    let hotTex = null;
    return {
      kind: 'webgl',
      fits: (im) => Math.max(im.width, im.height) <= maxTex,
      put(id, im, nearest) { const old = tex.get(id); if (old) gl.deleteTexture(old); tex.set(id, texture(im, nearest)); },
      drop(id) { const old = tex.get(id); if (old) { gl.deleteTexture(old); tex.delete(id); } },
      has: (id) => tex.has(id),
      setHot(im) { hotTex = texture(im, true); },
      resize(w, h) { if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; } gl.viewport(0, 0, w, h); },
      draw(f) {
        const ta = tex.get(f.a);
        const tb = tex.get(f.b) || ta;
        if (!ta) return false;
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, ta);
        gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, tb);
        gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, hotTex);
        gl.uniform1i(U.uA, 0); gl.uniform1i(U.uB, 1); gl.uniform1i(U.uHot, 2);
        gl.uniform2f(U.uRes, canvas.width, canvas.height);
        gl.uniform2f(U.uImg, img.w, img.h);
        gl.uniform2f(U.uCenter, f.cx, f.cy);
        gl.uniform1f(U.uScale, f.scale);
        gl.uniform1f(U.uT, f.t);
        gl.uniform1f(U.uTime, f.time);
        gl.uniform1f(U.uHover, hotTex ? f.hover : 0);
        gl.uniform1f(U.uDir, f.dir || 1);
        gl.uniform3fv(U.uHi, f.hi);
        gl.uniform3fv(U.uBg, f.bg);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        return true;
      },
    };
  }

  // Plain 2D canvas fallback: no outline, the transition becomes a block wipe drawn on the CPU
  function create2D(canvas, img) {
    const ctx = canvas.getContext('2d');
    const tex = new Map();
    const order = [];
    for (let y = 0; y < 9; y++) for (let x = 0; x < 16; x++) order.push({ x, y, o: Math.random() * 0.7 + x / 16 * 0.3 });
    return {
      kind: '2d',
      fits: () => true,
      put(id, im) { tex.set(id, im); },
      drop(id) { tex.delete(id); },
      has: (id) => tex.has(id),
      setHot() {},
      resize(w, h) { if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; } },
      draw(f) {
        const A = tex.get(f.a);
        const B = tex.get(f.b) || A;
        if (!A) return false;
        ctx.fillStyle = `rgb(${f.bg.map((v) => v * 255).join(',')})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const s = f.scale;
        const dx = canvas.width / 2 - f.cx * s;
        const dy = canvas.height / 2 - f.cy * s;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(A, 0, 0, A.width, A.height, dx, dy, img.w * s, img.h * s);
        if (f.t > 0 && f.t < 1 && B !== A) {
          const cw = img.w / 16, ch = img.h / 9;
          order.forEach((c) => {
            if (c.o < f.t * 1.2 - 0.1) {
              ctx.drawImage(B, c.x * B.width / 16, c.y * B.height / 9, B.width / 16, B.height / 9, dx + c.x * cw * s, dy + c.y * ch * s, cw * s + 1, ch * s + 1);
            }
          });
        } else if (f.t >= 1 && B !== A) {
          ctx.drawImage(B, 0, 0, B.width, B.height, dx, dy, img.w * s, img.h * s);
        }
        return true;
      },
    };
  }

  function createStage(canvas, img) {
    try {
      const s = createGL(canvas, img);
      if (s) return s;
    } catch (e) { console.warn('WebGL unavailable, using 2D canvas', e); }
    return create2D(canvas, img);
  }

  window.STAGE = { createStage, loadImage, hexToRgb };
})();
