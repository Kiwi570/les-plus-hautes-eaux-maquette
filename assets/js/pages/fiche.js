// Fiche spectacle : dates depuis le fichier unique, compte à rebours, galerie, visionneuse, objet animé
import { DATES } from '../data.js';
import { ligne, upcoming, daysUntil, fLong, cap, MOIS_C, parse } from '../dates.js';
import { animerObjet } from './objets.js';

export default function fiche(ctx) {
  const { gsap, ST, calme, fine } = ctx;
  const main = document.querySelector('[data-show]');
  const key = main?.dataset.show;
  if (!key) return;
  const mine = DATES.filter(x => x.s === key || (x.s === 'multi' && ['roxanne', 'mimo', 'cellule'].includes(key)));

  /* ---------- dates : à venir / passées, selon la date du jour réelle ---------- */
  const fut = upcoming(mine);
  const past = mine.filter(x => !fut.includes(x)).sort((a, b) => b.d.localeCompare(a.d));
  const av = document.querySelector('[data-a-venir]');
  if (av) av.innerHTML = fut.length ? fut.map(x => ligne(x, { rel: '../', withShow: false, ics: true })).join('')
    : `<div class="liste-vide"><p>Aucune date annoncée pour le moment. Ce spectacle est disponible pour vos programmations.</p><a class="btn btn--rouge" href="../index.html#programmer" data-prefill="${key}">Programmer ce spectacle <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h15M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></a></div>`;
  const pa = document.querySelector('[data-passees]');
  if (pa) pa.innerHTML = past.map(x => ligne(x, { rel: '../', withShow: false })).join('');
  const nb = document.querySelector('[data-nb-passees]');
  if (nb) nb.textContent = `(${past.length})`;
  const p = fut[0];
  const fx = document.querySelector('[data-fx-next]');
  if (fx) { if (p) { const d = parse(p.d); fx.textContent = `${d.getDate()} ${MOIS_C[d.getMonth()]} ${d.getFullYear()}, ${p.c}`; } else fx.textContent = 'à programmer'; }
  const cf = document.querySelector('[data-compte-fiche]');
  if (cf) {
    if (p) { cf.querySelector('[data-cf-j]').textContent = Math.max(0, daysUntil(p.d)); cf.querySelector('[data-cf-ou]').textContent = `${cap(fLong(p.d))} · ${p.c} (${p.dep})`; }
    else cf.remove();
  }
  document.addEventListener('click', async e => {
    const b = e.target.closest('[data-ics]');
    if (!b) return;
    const [d, s, c] = b.dataset.ics.split('|');
    const { icsFor } = await import('../dates.js');
    icsFor(d, s, c);
    ctx.toast('Fichier agenda (.ics) téléchargé');
  });

  /* ---------- objet du spectacle en boucle douce ---------- */
  const objet = document.querySelector('.f-objet');
  if (objet && gsap && !calme) {
    gsap.to(objet, { y: -14, rotation: 3, duration: 3, ease: 'sine.inOut', yoyo: true, repeat: -1 });
    setTimeout(() => animerObjet(gsap, objet, objet.dataset.objet, { boucle: true }), 1400);
    gsap.to(objet, { yPercent: -60, ease: 'none', scrollTrigger: { trigger: '.f-hero', start: 'top top', end: 'bottom top', scrub: true } });
  }

  /* ---------- galerie : glisser + visionneuse ---------- */
  const gal = document.querySelector('[data-galerie]');
  if (gal) {
    if (fine) {
      let down = false, sx = 0, sl = 0, moved = false;
      gal.addEventListener('pointerdown', e => { down = true; moved = false; sx = e.clientX; sl = gal.scrollLeft; gal.style.scrollSnapType = 'none'; });
      addEventListener('pointerup', () => { if (down) { down = false; gal.style.scrollSnapType = ''; } });
      gal.addEventListener('pointermove', e => { if (!down) return; const dx = e.clientX - sx; if (Math.abs(dx) > 4) moved = true; gal.scrollLeft = sl - dx; });
      gal.addEventListener('click', e => { if (moved) { e.stopPropagation(); e.preventDefault(); } }, true);
    }
    const figs = [...gal.querySelectorAll('.media')];
    let idx = 0, lb = null, lastFocus = null;
    const render = () => {
      const scene = lb.querySelector('.lb-scene');
      const f = figs[idx];
      const src = f.dataset.src;
      scene.innerHTML = src ? `<img src="${src}" alt="${f.querySelector('img')?.alt || ''}">` : f.querySelector('.m-col').innerHTML;
      if (!src) { const ph = scene.querySelector('.ph'); if (ph) { ph.style.width = 'min(80vw, 60vh)'; ph.style.aspectRatio = '4 / 5'; ph.style.height = 'auto'; } }
      lb.querySelector('[data-lb-n]').textContent = `${idx + 1} / ${figs.length}`;
    };
    const close = () => { lb?.remove(); lb = null; ctx.lenis?.start(); lastFocus?.focus(); };
    const open = i => {
      idx = i; lastFocus = document.activeElement;
      lb = document.createElement('div');
      lb.className = 'lb'; lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true'); lb.setAttribute('aria-label', 'Photos du spectacle');
      lb.innerHTML = `<div class="lb-top"><span class="mono" data-lb-n></span><button class="tool" type="button" data-lb-x>Fermer</button></div><div class="lb-scene"></div><div class="lb-nav"><button class="btn btn--petit" type="button" data-lb-p>Précédente</button><button class="btn btn--petit" type="button" data-lb-s>Suivante</button></div>`;
      document.body.appendChild(lb);
      ctx.lenis?.stop();
      render();
      lb.querySelector('[data-lb-x]').focus();
      lb.addEventListener('click', ev => {
        if (ev.target.closest('[data-lb-x]') || ev.target === lb) close();
        if (ev.target.closest('[data-lb-p]')) { idx = (idx - 1 + figs.length) % figs.length; render(); }
        if (ev.target.closest('[data-lb-s]')) { idx = (idx + 1) % figs.length; render(); }
      });
      if (gsap && !calme) gsap.from(lb, { opacity: 0, duration: .35 });
    };
    gal.querySelectorAll('[data-lb]').forEach(b => b.addEventListener('click', () => open(+b.dataset.lb)));
    addEventListener('keydown', e => {
      if (!lb) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') { idx = (idx + 1) % figs.length; render(); }
      if (e.key === 'ArrowLeft') { idx = (idx - 1 + figs.length) % figs.length; render(); }
      if (e.key === 'Tab') { const f = [...lb.querySelectorAll('button')]; const i = f.indexOf(document.activeElement); if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); } }
    });
    if (gsap && !calme) gsap.from(figs, { x: 80, opacity: 0, duration: 1, ease: 'expo.out', stagger: .08, scrollTrigger: { trigger: gal, start: 'top 85%', once: true } });
  }

}
