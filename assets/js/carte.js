// Carte de la tournée : chaque commune s'allume en ondes, année après année
import { DATES } from './data.js';
import { COMM, DEPTS, VIEWS } from './geo.js';
import { color, titre, joue, fLong, cap, isPast } from './dates.js';

const NS = 'http://www.w3.org/2000/svg';
const el = (n, a = {}) => { const e = document.createElementNS(NS, n); for (const k in a) e.setAttribute(k, a[k]); return e; };

export function initCarte(box, { gsap, calme = false, onYear } = {}) {
  // regroupe les dates par commune
  const groups = new Map();
  for (const x of DATES) {
    const key = `${x.c}|${x.dep}`;
    if (!COMM[key]) continue;
    if (!groups.has(key)) groups.set(key, { key, c: x.c, dep: x.dep, xy: COMM[key], items: [] });
    groups.get(key).items.push(x);
  }
  const pts = [...groups.values()].map(g => {
    const ok = g.items.filter(joue);
    const years = (ok.length ? ok : g.items).map(x => +x.d.slice(0, 4));
    const count = {};
    for (const x of ok) count[x.s] = (count[x.s] || 0) + 1;
    const main = Object.entries(count).sort((a, b) => b[1] - a[1])[0];
    return { ...g, ok, first: Math.min(...years), n: ok.length, s: main ? main[0] : g.items[0].s };
  }).sort((a, b) => a.first - b.first || b.n - a.n);
  const depsJoues = new Set(pts.filter(p => p.n).map(p => p.dep));

  let vue = 'ouest';
  const vb = v => VIEWS[v].join(' ');
  const svg = el('svg', { viewBox: vb(vue), role: 'group', 'aria-label': 'Carte des communes où la compagnie a joué' });
  const gDep = el('g'), gPts = el('g');
  for (const d of DEPTS) gDep.appendChild(el('path', { d: d.d, class: 'dep' + (depsJoues.has(d.code) ? ' joue' : ''), 'data-dep': d.code }));
  svg.append(gDep, gPts);
  box.prepend(svg);
  const scaleFor = v => VIEWS[v][2] / VIEWS.ouest[2];

  for (const p of pts) {
    const g = el('g', { class: 'pt-g', tabindex: '0', role: 'button', 'aria-label': `${p.c} (${p.dep}) : ${p.n} date${p.n > 1 ? 's' : ''}` });
    g.style.setProperty('--c', color(p.s));
    const r = (1.6 + Math.sqrt(Math.max(1, p.n)) * 1.1);
    p.r = r;
    const hit = el('circle', { class: 'hit', cx: p.xy[0], cy: p.xy[1], r: Math.max(r * 2.2, 7) });
    const onde = el('circle', { class: 'onde', cx: p.xy[0], cy: p.xy[1], r, opacity: 0 });
    const dot = el('circle', { class: 'pt', cx: p.xy[0], cy: p.xy[1], r: p.n ? r : r * .7 });
    if (!p.n) { dot.setAttribute('fill', 'none'); dot.setAttribute('stroke', color(p.s)); dot.setAttribute('stroke-dasharray', '1 1'); }
    g.append(hit, onde, dot);
    p.hit = hit;
    gPts.appendChild(g);
    p.g = g; p.dot = dot; p.onde = onde; p.on = true;
    if (p.c === 'Saint-Grégoire') {
      const lab = el('text', { x: p.xy[0] + 6, y: p.xy[1] - 6, fill: '#F1ECE2', 'font-size': 9, 'font-family': 'DM Mono, monospace' });
      lab.textContent = 'Saint-Grégoire, siège';
      g.appendChild(lab);
      // le nom accessible reprend l'étiquette visible
      g.setAttribute('aria-label', `Saint-Grégoire, siège (${p.dep}) : ${p.n} date${p.n > 1 ? 's' : ''}`);
      p.label = lab;
    }
  }

  // bulle
  const bulle = box.querySelector('[data-bulle]');
  const show = p => {
    if (!bulle) return;
    const items = [...p.items].sort((a, b) => b.d.localeCompare(a.d));
    const li = items.slice(0, 6).map(x => `<li>${cap(fLong(x.d))} · ${titre(x.s)}${x.statut === 'annule' ? ' (annulé)' : x.statut === 'reporte' ? ' (reporté)' : isPast(x) ? '' : ' · à venir'}</li>`).join('');
    bulle.innerHTML = `<b>${p.c} (${p.dep})</b><span class="mono" style="font-size:.6rem">${p.n} date${p.n > 1 ? 's' : ''}</span><ul>${li}${items.length > 6 ? `<li>et ${items.length - 6} autres</li>` : ''}</ul>`;
    const br = box.getBoundingClientRect(), dr = p.dot.getBoundingClientRect();
    let x = dr.left + dr.width / 2 - br.left, y = dr.top - br.top;
    x = Math.max(110, Math.min(br.width - 110, x));
    bulle.style.left = x + 'px'; bulle.style.top = Math.max(150, y) + 'px';
    bulle.classList.add('is-on');
  };
  const hide = () => bulle && bulle.classList.remove('is-on');
  for (const p of pts) {
    p.g.addEventListener('pointerenter', () => show(p));
    p.g.addEventListener('pointerleave', hide);
    p.g.addEventListener('focus', () => show(p));
    p.g.addEventListener('blur', hide);
    p.g.addEventListener('click', () => show(p));
  }

  // filtres (agenda)
  let filtre = { s: 'tous', dep: '' };
  let annee = 9999;
  const match = p => (filtre.s === 'tous' || p.items.some(x => x.s === filtre.s)) && (!filtre.dep || p.dep === filtre.dep);
  const apply = (anim = true) => {
    for (const p of pts) {
      const on = p.first <= annee && match(p);
      if (on === p.on) continue;
      p.on = on;
      if (!gsap || calme || !anim) { p.g.style.display = on ? '' : 'none'; continue; }
      if (on) {
        p.g.style.display = '';
        const k = scaleFor(vue);
        gsap.fromTo(p.dot, { attr: { r: 0 } }, { attr: { r: p.r * k }, duration: .6, ease: 'back.out(3)' });
        gsap.fromTo(p.onde, { attr: { r: p.r * k }, opacity: .9 }, { attr: { r: p.r * k * 6 }, opacity: 0, duration: 1.4, ease: 'power2.out' });
      } else {
        gsap.to(p.dot, { attr: { r: 0 }, duration: .3, onComplete: () => { if (!p.on) p.g.style.display = 'none'; } });
      }
    }
  };
  const setYear = (y, anim = true) => {
    annee = y;
    apply(anim);
    onYear && onYear(y);
  };
  const setFilter = f => { filtre = { ...filtre, ...f }; apply(true); };

  // vues Grand Ouest / France
  const btns = box.querySelectorAll('[data-vue]');
  const setVue = v => {
    vue = v;
    btns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.vue === v)));
    const k = scaleFor(v);
    if (gsap && !calme) {
      gsap.to(svg, { attr: { viewBox: vb(v) }, duration: 1.1, ease: 'power3.inOut' });
      pts.forEach(p => gsap.to(p.dot, { attr: { r: (p.n ? p.r : p.r * .7) * k }, duration: 1.1, ease: 'power3.inOut' }));
    } else {
      svg.setAttribute('viewBox', vb(v));
      pts.forEach(p => p.dot.setAttribute('r', (p.n ? p.r : p.r * .7) * k));
    }
    pts.forEach(p => p.hit.setAttribute('r', Math.max(p.r * 2.2, 7) * k));
    pts.forEach(p => { if (p.label) { p.label.setAttribute('font-size', 9 * k); p.label.setAttribute('x', p.xy[0] + 6 * k); p.label.setAttribute('y', p.xy[1] - 6 * k); } });
    hide();
  };
  btns.forEach(b => b.addEventListener('click', () => setVue(b.dataset.vue)));

  // respiration des points (ondes discrètes)
  if (gsap && !calme) {
    const pulse = () => {
      const vis = pts.filter(p => p.on && p.n);
      if (!vis.length) return;
      const p = vis[Math.floor(Math.random() * vis.length)];
      const k = scaleFor(vue);
      gsap.fromTo(p.onde, { attr: { r: p.r * k }, opacity: .8 }, { attr: { r: p.r * k * 5 }, opacity: 0, duration: 1.6, ease: 'power2.out' });
    };
    const io = new IntersectionObserver(([en]) => { box._pulse = en.isIntersecting; });
    io.observe(box);
    setInterval(() => { if (box._pulse) pulse(); }, 700);
  }

  return { setYear, setFilter, setVue, pts };
}
