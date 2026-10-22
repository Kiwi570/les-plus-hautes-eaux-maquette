// Moteur commun : défilement fluide, ouverture, échelle de crue, gélatine, curseur, son, transitions.
import { next, daysUntil, fLong, cap, titre, SHOW } from './dates.js';

const root = document.documentElement;
const body = document.body;
const PAGE_EL = document.querySelector('[data-page]') || body;
const REL = PAGE_EL.dataset.rel || '';
const PAGE = PAGE_EL.dataset.page;
const gsap = window.gsap;
const ST = window.ScrollTrigger;
const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
const store = {
  get(k, s = localStorage) { try { return s.getItem(k); } catch (e) { return null; } },
  set(k, v, s = localStorage) { try { s.setItem(k, v); } catch (e) { /* stockage indisponible */ } },
};
const calme = root.classList.contains('calme');
const ctx = { gsap, ST, calme, fine, REL, lenis: null, store, toast, sons: null, water: [] };

/* ---------------- toast ---------------- */
let toastT;
function toast(msg) {
  const t = document.querySelector('[data-toast]');
  if (!t) return;
  t.textContent = msg; t.classList.add('is-on');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('is-on'), 2600);
}

/* ---------------- préférences ---------------- */
function prefs() {
  const bc = document.querySelector('[data-calme]');
  if (bc) {
    bc.setAttribute('aria-pressed', String(calme));
    bc.addEventListener('click', () => {
      store.set('lphec-calme', calme ? '0' : '1');
      toast(calme ? 'Animations rétablies' : 'Mode calme activé');
      setTimeout(() => location.reload(), 350);
    });
  }
  const bs = document.querySelector('[data-son]');
  if (bs) {
    bs.addEventListener('click', async () => {
      if (!ctx.sons) ctx.sons = await import('./sons.js');
      const on = bs.getAttribute('aria-pressed') !== 'true';
      bs.setAttribute('aria-pressed', String(on));
      bs.setAttribute('aria-label', on ? "Couper l'ambiance sonore" : "Activer l'ambiance sonore");
      on ? ctx.sons.start() : ctx.sons.stop();
    });
  }
}

/* ---------------- défilement fluide ---------------- */
async function smooth() {
  if (calme || !gsap) return;
  try {
    const { default: Lenis } = await import('./vendor/lenis.js');
    const lenis = new Lenis({ lerp: 0.1, smoothWheel: true, wheelMultiplier: 1 });
    ctx.lenis = lenis;
    lenis.on('scroll', ST.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  } catch (e) { /* défilement natif */ }
}

function scrollToEl(target) {
  const off = -72;
  if (ctx.lenis) ctx.lenis.scrollTo(target, { offset: off, duration: 1.4 });
  else window.scrollTo({ top: target.getBoundingClientRect().top + scrollY + off, behavior: calme ? 'auto' : 'smooth' });
}

function ancres() {
  document.addEventListener('click', ev => {
    const a = ev.target.closest('a[href]');
    if (!a || a.target === '_blank' || ev.metaKey || ev.ctrlKey) return;
    const href = a.getAttribute('href');
    const url = new URL(href, location.href);
    const same = url.pathname === location.pathname || (PAGE === 'accueil' && /(^|\/)index\.html$/.test(url.pathname) && /(^|\/)(index\.html)?$/.test(location.pathname));
    if (a.dataset.prefill) store.set('lphec-prefill', a.dataset.prefill, sessionStorage);
    if (url.hash && (same || href.startsWith('#'))) {
      const t = document.querySelector(url.hash);
      if (t) {
        ev.preventDefault();
        closeMenu();
        scrollToEl(t);
        if (a.dataset.prefill) document.dispatchEvent(new CustomEvent('lphec:prefill'));
        return;
      }
    }
    if (url.origin === location.origin && !href.startsWith('#') && /\.html$|\/$/.test(url.pathname) && !calme && gsap) {
      ev.preventDefault();
      sortie(url.href);
    }
  });
}

/* ---------------- en-tête et menu ---------------- */
let menuOpen = false;
const menu = document.querySelector('[data-menu]');
const burger = document.querySelector('[data-burger]');
function openMenu() {
  menuOpen = true; menu.classList.add('is-open'); menu.setAttribute('aria-hidden', 'false');
  burger.setAttribute('aria-expanded', 'true'); ctx.lenis && ctx.lenis.stop();
  menu.querySelector('a')?.focus();
}
function closeMenu() {
  if (!menuOpen) return;
  menuOpen = false; menu.classList.remove('is-open'); menu.setAttribute('aria-hidden', 'true');
  burger.setAttribute('aria-expanded', 'false'); ctx.lenis && ctx.lenis.start();
}
function entete() {
  const hd = document.querySelector('[data-hd]');
  burger?.addEventListener('click', openMenu);
  document.querySelector('[data-menu-close]')?.addEventListener('click', () => { closeMenu(); burger.focus(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
  let last = 0;
  const onScroll = () => {
    const y = scrollY;
    hd.classList.toggle('is-solid', y > 40);
    if (!menuOpen) hd.classList.toggle('is-hidden', y > 220 && y > last + 2);
    if (y < last - 2) hd.classList.remove('is-hidden');
    last = y;
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

/* ---------------- échelle de crue ---------------- */
function echelle() {
  const eau = document.querySelector('[data-ech-eau]'), rep = document.querySelector('[data-ech-rep]'), val = document.querySelector('[data-ech-val]');
  const barre = document.querySelector('[data-barre]');
  const reg = document.querySelector('.echelle-reg');
  const update = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    const p = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0;
    const m = p * 8.62;
    const pct = (m / 9) * 100;
    if (reg && eau) { const h = reg.getBoundingClientRect().height; eau.style.height = (h * pct / 100) + 'px'; rep.style.bottom = `calc(32px + ${h * pct / 100}px)`; }
    if (val) val.textContent = m.toFixed(2).replace('.', ',') + ' m';
    if (barre) barre.style.transform = `scaleX(${p})`;
  };
  addEventListener('scroll', update, { passive: true });
  addEventListener('resize', update);
  update();
}

/* ---------------- gélatine (couleur du projecteur) ---------------- */
function gelatine() {
  if (!ST) return;
  document.querySelectorAll('[data-gel]').forEach(s => {
    ST.create({
      trigger: s, start: 'top 55%', end: 'bottom 55%',
      onToggle: self => { if (self.isActive) root.style.setProperty('--gel', s.dataset.gel); },
    });
  });
}

/* ---------------- curseur goutte et boutons magnétiques ---------------- */
function curseur() {
  if (!fine || calme || !gsap) return;
  const c = document.querySelector('.goutte'), tx = document.querySelector('.goutte-txt');
  const qx = gsap.quickTo(c, 'x', { duration: .25, ease: 'power3' }), qy = gsap.quickTo(c, 'y', { duration: .25, ease: 'power3' });
  const tqx = gsap.quickTo(tx, 'x', { duration: .3, ease: 'power3' }), tqy = gsap.quickTo(tx, 'y', { duration: .3, ease: 'power3' });
  addEventListener('pointermove', e => { c.classList.add('is-on'); qx(e.clientX); qy(e.clientY); tqx(e.clientX); tqy(e.clientY); }, { passive: true });
  document.addEventListener('pointerleave', () => c.classList.remove('is-on'));
  document.addEventListener('pointerover', e => {
    const t = e.target.closest('[data-cursor]');
    c.classList.toggle('is-big', !!t);
    tx.classList.toggle('is-on', !!t);
    if (t) tx.textContent = t.dataset.cursor;
  });
  document.querySelectorAll('.magnet').forEach(b => {
    const xTo = gsap.quickTo(b, 'x', { duration: .5, ease: 'elastic.out(1,.4)' }), yTo = gsap.quickTo(b, 'y', { duration: .5, ease: 'elastic.out(1,.4)' });
    b.addEventListener('pointermove', e => { const r = b.getBoundingClientRect(); xTo((e.clientX - r.left - r.width / 2) * .25); yTo((e.clientY - r.top - r.height / 2) * .35); });
    b.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
  });
}

/* ---------------- médias : l'eau monte et rend les couleurs ---------------- */
export function setLvl(fig, v, dur = .9) {
  if (!fig) return;
  if (!gsap || calme) { fig.style.setProperty('--lvl', v); return; }
  gsap.to(fig, { '--lvl': v, duration: dur, ease: 'power2.inOut', overwrite: 'auto' });
}
function medias() {
  if (calme || !ST) return;
  const io = new IntersectionObserver(es => es.forEach(en => en.target.classList.toggle('is-wet', en.isIntersecting)), { rootMargin: '40px' });
  document.querySelectorAll('.media').forEach(fig => {
    io.observe(fig);
    if (fig.closest('[data-water]')) return;
    const hover = fine && fig.closest('.carte, .membre, .teaser');
    if (hover) {
      const host = fig.closest('.carte, .membre, .teaser');
      host.addEventListener('pointerenter', () => setLvl(fig, 1));
      host.addEventListener('pointerleave', () => setLvl(fig, 0));
      return;
    }
    if (fig.closest('.s-1910-fond, .s-dec-fond, .s-prog-fond, .lb')) { fig.style.setProperty('--lvl', .35); return; }
    gsap.fromTo(fig, { '--lvl': 0 }, { '--lvl': 1, ease: 'none', scrollTrigger: { trigger: fig, start: 'top 92%', end: 'top 30%', scrub: .6 } });
  });
}

/* ---------------- titres mouillés ---------------- */
function mouilles() {
  if (!gsap || calme) return;
  document.querySelectorAll('[data-wet]').forEach(h => {
    if (h.closest('.hero, .f-hero, .a-hero')) return;
    gsap.fromTo(h, { '--soft': 0 }, { '--soft': 100, ease: 'none', scrollTrigger: { trigger: h, start: 'top 85%', end: 'top 25%', scrub: true } });
    if (window.SplitText) {
      const sp = new SplitText(h, { type: 'words', wordsClass: 'mot' });
      gsap.from(sp.words, { yPercent: 55, rotate: 3, opacity: 0, duration: 1.1, ease: 'expo.out', stagger: .05, scrollTrigger: { trigger: h, start: 'top 92%', once: true } });
    }
  });
}

/* ---------------- apparitions ---------------- */
function apparitions() {
  if (!ST || calme) return;
  const sel = '.sec-head .lead, .prose > p, .membre, .atelier, .etape, .chiffres, .cal, .dec-cote > *, .date-ligne, .fiche-tech, .dist div, .notes p, .tour-grid .carte-geo';
  ST.batch(sel, {
    start: 'top 94%', once: true,
    onEnter: b => gsap.from(b, { y: 34, opacity: 0, duration: .9, ease: 'power3.out', stagger: .07, overwrite: true }),
  });
}

/* ---------------- compteurs ---------------- */
function compteurs() {
  document.querySelectorAll('[data-compteur]').forEach(n => {
    const v = +n.dataset.compteur;
    if (!gsap || calme) { n.textContent = v; return; }
    const o = { v: 0 };
    ST.create({ trigger: n, start: 'top 92%', once: true, onEnter: () => gsap.to(o, { v, duration: 1.8, ease: 'power2.out', onUpdate: () => { n.textContent = Math.round(o.v); } }) });
  });
}

/* ---------------- copie d'adresse ---------------- */
function copies() {
  document.addEventListener('click', async e => {
    const b = e.target.closest('[data-copie]');
    if (!b) return;
    const txt = b.dataset.copie;
    try { await navigator.clipboard.writeText(txt); toast('Adresse copiée'); }
    catch (err) {
      const span = b.parentElement.querySelector('.adr') || b.previousElementSibling;
      if (span) { const r = document.createRange(); r.selectNodeContents(span); const s = getSelection(); s.removeAllRanges(); s.addRange(r); }
      toast('Adresse sélectionnée : copiez-la');
    }
    ctx.sons?.plouf();
  });
}

/* ---------------- prochaine représentation (compte à rebours) ---------------- */
function prochaine() {
  const n = next();
  const box = document.querySelector('[data-prochaine]');
  if (!box) return;
  if (!n) { box.querySelector('[data-p-titre]').textContent = 'Saison à venir'; return; }
  const j = daysUntil(n.d);
  box.querySelector('[data-p-titre]').textContent = titre(n.s);
  box.querySelector('[data-p-ou]').textContent = `${cap(fLong(n.d))} · ${n.c} (${n.dep})`;
  const cpt = box.querySelector('[data-p-compte]');
  cpt.innerHTML = j <= 0 ? '<b>Aujourd’hui</b>' : `<b>${j}</b><span>jour${j > 1 ? 's' : ''}</span>`;
  const l = box.querySelector('[data-p-lien]');
  if (SHOW[n.s]) l.href = `${REL}spectacles/${SHOW[n.s].slug}.html`;
}

/* ---------------- reflet du pied de page ---------------- */
function reflet() {
  const turb = document.querySelector('[data-remous]');
  const ft = document.querySelector('.ft');
  if (!turb || !ft || calme || !gsap) return;
  let on = false, t = 0, mx = .5;
  new IntersectionObserver(([en]) => { on = en.isIntersecting; }).observe(ft);
  ft.addEventListener('pointermove', e => { mx = e.clientX / innerWidth; }, { passive: true });
  gsap.ticker.add(() => {
    if (!on) return;
    t += .006;
    turb.setAttribute('baseFrequency', `${(0.010 + Math.sin(t) * .003 + mx * .004).toFixed(4)} ${(0.08 + Math.cos(t * 1.3) * .02).toFixed(4)}`);
  });
}

/* ---------------- transitions de page en vague ---------------- */
const V = {
  bas: 'M0 100 L0 100 Q50 100 100 100 L100 100 Z',
  mi: 'M0 100 L0 55 Q50 15 100 55 L100 100 Z',
  plein: 'M0 100 L0 0 Q50 0 100 0 L100 100 Z',
};
function sortie(href) {
  const v = document.querySelector('.vague');
  if (!v || !gsap) { location.href = href; return; }
  store.set('lphec-trans', '1', sessionStorage);
  v.style.visibility = 'visible';
  const p1 = v.querySelector('[data-v1]'), p2 = v.querySelector('[data-v2]');
  gsap.timeline({ onComplete: () => { location.href = href; } })
    .to(p1, { attr: { d: V.mi }, duration: .35, ease: 'power2.in' })
    .to(p1, { attr: { d: V.plein }, duration: .3, ease: 'power2.out' })
    .to(p2, { attr: { d: V.mi }, duration: .35, ease: 'power2.in' }, .12)
    .to(p2, { attr: { d: V.plein }, duration: .3, ease: 'power2.out' }, .47);
}
function entree() {
  const v = document.querySelector('.vague');
  if (!v || !gsap || store.get('lphec-trans', sessionStorage) !== '1') return false;
  store.set('lphec-trans', '0', sessionStorage);
  const p1 = v.querySelector('[data-v1]'), p2 = v.querySelector('[data-v2]');
  gsap.set([p1, p2], { attr: { d: V.plein } });
  v.style.visibility = 'visible';
  gsap.to(v.querySelector('svg'), { yPercent: -100, duration: .9, ease: 'power3.inOut', delay: .05, onComplete: () => { v.style.visibility = 'hidden'; gsap.set(v.querySelector('svg'), { yPercent: 0 }); gsap.set([p1, p2], { attr: { d: V.bas } }); } });
  return true;
}
addEventListener('pageshow', e => { if (e.persisted) { const v = document.querySelector('.vague'); if (v) v.style.visibility = 'hidden'; } });

/* ---------------- ouverture (accueil) ---------------- */
function ouverture() {
  const ov = document.querySelector('[data-ouverture]');
  if (!ov) return Promise.resolve();
  if (root.classList.contains('no-ouverture') || !gsap) { ov.remove(); return Promise.resolve(); }
  store.set('lphec-vu', '1', sessionStorage);
  ctx.lenis && ctx.lenis.stop();
  const nom = ov.querySelector('[data-ov-nom]'), rep = ov.querySelector('[data-ov-rep]'), eau = ov.querySelector('[data-ov-eau]');
  let chars = [nom];
  if (window.SplitText) chars = new SplitText(nom, { type: 'chars' }).chars;
  return new Promise(res => {
    gsap.timeline({ onComplete: () => { ov.remove(); ctx.lenis && ctx.lenis.start(); res(); } })
      .from(chars, { yPercent: 70, opacity: 0, duration: .7, ease: 'expo.out', stagger: .018 })
      .from(rep, { opacity: 0, y: 10, duration: .5 }, .45)
      .to(nom, { '--soft': 100, duration: .8 }, .4)
      .to([nom, rep], { opacity: 0, y: -16, duration: .45, ease: 'power2.in' }, 1.35)
      .to(eau, { yPercent: 104, duration: 1.0, ease: 'power3.inOut' }, 1.45);
  });
}

/* ---------------- eau WebGL sur les héros ---------------- */
async function eaux() {
  const boxes = document.querySelectorAll('[data-water]');
  if (!boxes.length || calme) return;
  const probe = document.createElement('canvas');
  if (!(probe.getContext('webgl') || probe.getContext('experimental-webgl'))) return;
  try {
    const { initWater } = await import('./water.js');
    boxes.forEach(b => { const w = initWater(b, { level: .0 }); if (w) { b._water = w; ctx.water.push(w); } });
  } catch (e) { /* version sans WebGL : la photo reste affichée */ }
}

/* ---------------- héros : entrée ---------------- */
function entreeHero() {
  const hero = document.querySelector('.hero, .f-hero, .a-hero');
  if (!hero || !gsap) return;
  const h1 = hero.querySelector('[data-split]');
  const water = hero.querySelector('[data-water]')?._water;
  const fig = hero.querySelector('[data-water] .media');
  const tl = gsap.timeline();
  if (h1 && window.SplitText && !calme) {
    const sp = new SplitText(h1, { type: 'lines,words', linesClass: 'ligne-mask' });
    tl.from(sp.words, { yPercent: 110, duration: 1.1, ease: 'expo.out', stagger: .06 });
    tl.fromTo(h1, { '--soft': 100 }, { '--soft': 0, duration: 1.6, ease: 'power2.out' }, 0);
  }
  if (!calme) {
    tl.from(hero.querySelectorAll('.eyebrow, .lead, .hero-ctas > *, .prochaine, .fil, .f-sous, .a-total'), { y: 24, opacity: 0, duration: .9, ease: 'power3.out', stagger: .08 }, .25);
    const objet = hero.querySelector('.f-objet');
    if (objet) tl.from(objet, { y: 60, rotate: -12, opacity: 0, duration: 1.4, ease: 'elastic.out(1,.6)' }, .3);
  }
  const lvlStart = PAGE === 'accueil' ? .22 : PAGE === 'fiche' ? .5 : .3;
  if (water) {
    if (!calme) tl.fromTo(water, { level: 0 }, { level: lvlStart, duration: 2.2, ease: 'power2.inOut' }, 0);
    else water.level = lvlStart;
    gsap.to(water, { level: 1, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom 20%', scrub: .8 } });
    hero.addEventListener('click', e => {
      if (e.target.closest('a, button')) return;
      const r = hero.getBoundingClientRect();
      water.ripple((e.clientX - r.left) / r.width, 1 - (e.clientY - r.top) / r.height);
      ctx.sons?.plouf();
    });
  } else if (fig && !calme) {
    tl.fromTo(fig, { '--lvl': 0 }, { '--lvl': lvlStart, duration: 2, ease: 'power2.inOut' }, 0);
    gsap.to(fig, { '--lvl': 1, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom 20%', scrub: .8 } });
  } else if (fig) { fig.style.setProperty('--lvl', 1); }
}

/* ---------------- démarrage ---------------- */
async function boot() {
  if (gsap && ST) {
    gsap.registerPlugin(ST);
    if (window.SplitText) gsap.registerPlugin(window.SplitText);
  }
  prefs(); entete(); ancres(); echelle(); copies(); prochaine();
  await smooth();
  const trans = entree();
  if (!trans) await Promise.race([ouverture(), new Promise(r => setTimeout(r, 3200))]);
  else document.querySelector('[data-ouverture]')?.remove();
  await eaux();
  entreeHero();
  gelatine(); curseur(); medias(); mouilles(); apparitions(); compteurs(); reflet();
  try {
    const mod = await import(`./pages/${PAGE}.js`);
    await mod.default(ctx);
  } catch (e) { console.error(e); }
  if (ST) { ST.refresh(); }
  document.fonts?.ready.then(() => ST && ST.refresh());
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
export { ctx, toast };
