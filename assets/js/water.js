// « La montée des eaux » : nappe d'eau WebGL qui rend leurs couleurs aux photos
import { Renderer, Program, Mesh, Texture, Triangle } from './vendor/ogl.js';

const vertex = /* glsl */`
attribute vec2 uv;
attribute vec2 position;
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position, 0.0, 1.0); }`;

const fragment = /* glsl */`
precision highp float;
uniform sampler2D tMap;
uniform sampler2D tCaust;
uniform float uCaust;
uniform vec2 uRes;
uniform vec2 uImg;
uniform vec2 uMouse;
uniform float uTime;
uniform float uLevel;
uniform float uAmp;
uniform vec3 uNavy;
uniform vec3 uFoam;
uniform vec3 uTint;
varying vec2 vUv;

vec2 cover(vec2 uv) {
  float rs = uRes.x / uRes.y;
  float ri = uImg.x / uImg.y;
  vec2 s = rs < ri ? vec2(rs / ri, 1.0) : vec2(1.0, ri / rs);
  return (uv - 0.5) * s + 0.5;
}
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float caustic(vec2 p, float t) {
  vec2 i = p;
  float c = 1.0;
  float inten = 0.005;
  for (int n = 0; n < 4; n++) {
    float tt = t * (1.0 - (3.5 / float(n + 1)));
    i = p + vec2(cos(tt - i.x) + sin(tt + i.y), sin(tt - i.y) + cos(tt + i.x));
    vec2 dd = vec2(p.x / (sin(i.x + tt) / inten), p.y / (cos(i.y + tt) / inten));
    c += 1.0 / max(length(dd), 0.001);
  }
  c /= 4.0;
  c = 1.17 - pow(min(c, 50.0), 1.4);
  float v = pow(min(abs(c), 4.0), 8.0);
  if (v != v) v = 0.0;
  return clamp(v, 0.0, 1.0);
}
void main() {
  vec2 uv = vUv;
  float asp = uRes.x / uRes.y;
  float t = uTime;
  float full = step(0.999, uLevel);
  float w = sin(uv.x * 7.0 + t * 1.1) * 0.010 + sin(uv.x * 17.0 - t * 1.6) * 0.005 + (noise(vec2(uv.x * 5.0, t * 0.25)) - 0.5) * 0.02;
  float line = uLevel + w * (1.0 - full);
  float under = 1.0 - smoothstep(line - 0.004, line + 0.004, uv.y);
  vec2 d = (uv - uMouse) * vec2(asp, 1.0);
  float r = length(d);
  float ring = sin(r * 55.0 - t * 7.0) * exp(-r * 5.0) * uAmp;
  vec2 dir = d / max(r, 0.0001);
  vec2 n = vec2(noise(uv * vec2(12.0, 28.0) + t * 0.35) - 0.5, noise(uv * vec2(28.0, 12.0) - t * 0.3) - 0.5);
  vec2 ruv = uv + n * 0.014 * under + dir * ring * 0.012;
  vec3 col = texture2D(tMap, cover(ruv)).rgb;
  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  vec3 duo = mix(uNavy, uFoam, smoothstep(0.02, 0.98, lum));
  duo = mix(duo, duo * uTint, 0.35);
  vec3 wet = col * vec3(0.95, 1.0, 1.05);
  float cp = caustic(uv * vec2(asp, 1.0) * 4.0 + 20.0, t * 0.5);
  vec2 cu = uv * vec2(asp, 1.0);
  float ct = texture2D(tCaust, cu * 1.3 + vec2(t * 0.012, t * 0.008)).r * texture2D(tCaust, cu * 0.9 - vec2(t * 0.01, -t * 0.006)).r;
  float c = mix(cp, ct * 1.6, uCaust);
  wet += c * 0.09 * vec3(0.8, 0.95, 1.0);
  float depth = clamp((line - uv.y) * 2.0, 0.0, 1.0);
  wet = mix(wet, wet * vec3(0.75, 0.88, 1.0), depth * 0.35);
  vec3 o = mix(duo, wet, under);
  float foam = (1.0 - smoothstep(0.0, 0.012, abs(uv.y - line))) * (1.0 - full) * step(0.001, uLevel);
  o += foam * 0.35 * uFoam;
  o += ring * 0.04;
  gl_FragColor = vec4(o, 1.0);
}`;

const hex = h => { const n = parseInt(h.slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };

// Visuel provisoire peint en 2D (en attendant la vraie photo)
async function paintPlaceholder(fig, { objet = true } = {}) {
  const c = fig?.dataset.phC || '#2F6690', c2 = fig?.dataset.phC2 || '#0B1A2A';
  const W = 1600, H = 1000;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const x = cv.getContext('2d');
  let g = x.createLinearGradient(0, 0, W * .4, H);
  g.addColorStop(0, c2); g.addColorStop(1, '#0B1A2A');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  g = x.createRadialGradient(W * .72, H * .1, 10, W * .72, H * .1, H * .95);
  g.addColorStop(0, c); g.addColorStop(.55, c + '55'); g.addColorStop(1, 'transparent');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  // sol de scène éclairé dans la couleur du spectacle
  g = x.createRadialGradient(W * .55, H * 1.05, 10, W * .55, H * 1.05, H * .9);
  g.addColorStop(0, c + 'CC'); g.addColorStop(.5, c + '44'); g.addColorStop(1, 'transparent');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  // cône de poursuite
  x.save(); x.globalCompositeOperation = 'screen';
  g = x.createLinearGradient(W * .7, 0, W * .7, H);
  g.addColorStop(0, 'rgba(255,214,150,.35)'); g.addColorStop(1, 'rgba(255,214,150,0)');
  x.fillStyle = g; x.beginPath(); x.moveTo(W * .66, 0); x.lineTo(W * .74, 0); x.lineTo(W * .95, H); x.lineTo(W * .45, H); x.closePath(); x.fill();
  x.restore();
  // objet du spectacle
  const svg = objet ? fig?.querySelector('.ph-obj svg') : null;
  if (svg) {
    const s = svg.cloneNode(true);
    s.setAttribute('width', 520); s.setAttribute('height', 520); s.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    s.querySelector('g')?.setAttribute('stroke', '#F1ECE2');
    s.querySelector('g')?.setAttribute('stroke-width', '1.2');
    const img = new Image();
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s.outerHTML);
    try { await img.decode(); x.globalAlpha = .85; x.drawImage(img, W * .68, H * .16, 420, 420); x.globalAlpha = 1; } catch (e) { /* objet facultatif */ }
  }
  // lignes d'eau
  x.strokeStyle = 'rgba(241,236,226,.14)'; x.lineWidth = 2;
  for (let y = H * .72; y < H; y += 14) { x.beginPath(); for (let i = 0; i <= W; i += 20) x.lineTo(i, y + Math.sin(i * .01 + y) * 3); x.stroke(); }
  return cv;
}

export function initWater(box, { level = 0.2, caustiques = null } = {}) {
  const fig = box.querySelector('.media');
  let renderer;
  try {
    renderer = new Renderer({ dpr: Math.min(window.devicePixelRatio || 1, 1.5), alpha: false, antialias: false, powerPreference: 'high-performance' });
  } catch (e) { return null; }
  const gl = renderer.gl;
  if (!gl) return null;
  gl.clearColor(0.043, 0.102, 0.165, 1);
  const canvas = gl.canvas;
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.opacity = '0';
  canvas.style.transition = 'opacity .8s';
  box.appendChild(canvas);

  const texture = new Texture(gl, { generateMipmaps: false });
  const tCaust = new Texture(gl, { generateMipmaps: false, wrapS: gl.REPEAT, wrapT: gl.REPEAT });
  const uniforms = {
    tMap: { value: texture }, tCaust: { value: tCaust }, uCaust: { value: 0 },
    uRes: { value: [1, 1] }, uImg: { value: [1600, 1000] }, uMouse: { value: [0.5, 0.5] },
    uTime: { value: 0 }, uLevel: { value: level }, uAmp: { value: 0 },
    uNavy: { value: hex('#0C2033') }, uFoam: { value: hex('#D9D4CA') }, uTint: { value: [0.86, 0.94, 1.06] },
  };
  const program = new Program(gl, { vertex, fragment, uniforms });
  const mesh = new Mesh(gl, { geometry: new Triangle(gl), program });

  let ready = false;
  const show = () => { ready = true; canvas.style.opacity = '1'; if (fig) fig.style.visibility = 'hidden'; };
  if (caustiques) {
    const ci = new Image(); ci.decoding = 'async';
    ci.onload = () => { tCaust.image = ci; uniforms.uCaust.value = 1; };
    ci.src = caustiques;
  }
  const src = (window.innerHeight > window.innerWidth && fig?.dataset.srcPortrait) || fig?.dataset.src;
  if (src) {
    const img = new Image(); img.decoding = 'async';
    img.onload = () => { texture.image = img; uniforms.uImg.value = [img.naturalWidth, img.naturalHeight]; show(); };
    img.src = src;
  } else {
    paintPlaceholder(fig, { objet: !box.closest('.f-hero') }).then(cv => { texture.image = cv; uniforms.uImg.value = [cv.width, cv.height]; show(); });
  }

  const resize = () => {
    const r = box.getBoundingClientRect();
    renderer.setSize(Math.max(1, r.width), Math.max(1, r.height));
    uniforms.uRes.value = [r.width, r.height];
  };
  resize();
  const ro = new ResizeObserver(resize); ro.observe(box);

  const target = { x: .5, y: .5 }, m = { x: .5, y: .5 };
  let amp = 0;
  const host = box.closest('section') || box;
  host.addEventListener('pointermove', ev => {
    const r = box.getBoundingClientRect();
    target.x = (ev.clientX - r.left) / r.width; target.y = 1 - (ev.clientY - r.top) / r.height;
    amp = Math.min(1, amp + .08);
  }, { passive: true });

  let visible = true, raf = 0;
  const t0 = performance.now();
  const loop = now => {
    raf = requestAnimationFrame(loop);
    if (!ready || !visible) return;
    m.x += (target.x - m.x) * .08; m.y += (target.y - m.y) * .08;
    amp *= .975;
    uniforms.uMouse.value = [m.x, m.y];
    uniforms.uAmp.value = amp;
    uniforms.uTime.value = (now - t0) / 1000;
    renderer.render({ scene: mesh });
  };
  raf = requestAnimationFrame(loop);
  const io = new IntersectionObserver(([en]) => { visible = en.isIntersecting; }, { rootMargin: '80px' });
  io.observe(box);

  return {
    canvas,
    get level() { return uniforms.uLevel.value; },
    set level(v) { uniforms.uLevel.value = v; },
    ripple(x = .5, y = .3) { target.x = m.x = x; target.y = m.y = y; amp = 1; },
    destroy() { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); canvas.remove(); if (fig) fig.style.visibility = ''; },
  };
}
