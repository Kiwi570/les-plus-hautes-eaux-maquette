// Accueil : 1910, répertoire, décembre, tournée, frise, équipe, ateliers, presse, formulaire
import { DATES } from '../data.js';
import { SHOW, color, titre, joue, fLong, cap } from '../dates.js';
import { setLvl } from '../app.js';
import { initCarte } from '../carte.js';
import { animerObjet } from './objets.js';

export default async function accueil(ctx) {
  const { gsap, ST, calme, fine } = ctx;
  const mm = gsap ? gsap.matchMedia() : null;

  /* ---------- 1910 : le niveau monte, le récit se lit ---------- */
  const s1910 = document.querySelector('[data-1910]');
  if (s1910 && gsap && !calme) {
    const eau = s1910.querySelector('[data-1910-eau]');
    const h = s1910.querySelector('[data-hauteur]');
    const ps = [...s1910.querySelectorAll('.recit p')];
    const o = { m: 0 };
    const lire = pr => ps.forEach((p, i) => p.classList.toggle('is-lu', pr > (i / ps.length) * .85 + .02));
    const build = pin => gsap.timeline({
      scrollTrigger: { trigger: s1910, start: pin ? 'top top' : 'top 70%', end: pin ? '+=120%' : 'bottom 60%', scrub: .7, pin, onUpdate: self => lire(self.progress) },
    })
      .to(eau, { height: '86%', ease: 'none' }, 0)
      .to(o, { m: 8.62, ease: 'none', onUpdate: () => { h.textContent = o.m.toFixed(2).replace('.', ','); } }, 0);
    mm.add('(min-width: 900px)', () => { build(true); });
    mm.add('(max-width: 899px)', () => { build(false); });
  } else if (s1910) {
    s1910.querySelectorAll('.recit p').forEach(p => p.classList.add('is-lu'));
  }

  /* ---------- répertoire ---------- */
  const piste = document.querySelector('[data-rep]');
  const rail = piste?.querySelector('[data-rail]');
  const prog = piste?.querySelector('[data-rep-prog]');
  const cartes = [...(rail?.querySelectorAll('.carte') || [])];
  if (rail) {
    if (gsap && !calme) {
      mm.add('(min-width: 1100px)', () => {
        piste.classList.add('is-pinned');
        const dist = () => Math.max(0, rail.scrollWidth - rail.parentElement.clientWidth + 40);
        const tw = gsap.to(rail, {
          x: () => -dist(), ease: 'none',
          scrollTrigger: {
            trigger: piste, start: 'center center', end: () => '+=' + dist(), pin: piste, scrub: .6, invalidateOnRefresh: true,
            onUpdate: self => { if (prog) prog.style.transform = `scaleX(${self.progress})`; },
          },
        });
        cartes.forEach(c => {
          const fig = c.querySelector('.media');
          ST.create({ trigger: c, containerAnimation: tw, start: 'left 70%', end: 'right 30%', onToggle: self => { if (self.isActive) document.documentElement.style.setProperty('--gel', c.style.getPropertyValue('--c')); } });
          gsap.fromTo(fig, { '--lvl': 0 }, { '--lvl': .62, ease: 'none', scrollTrigger: { trigger: c, containerAnimation: tw, start: 'left 95%', end: 'left 40%', scrub: true } });
        });
        return () => { piste.classList.remove('is-pinned'); gsap.set(rail, { x: 0 }); };
      });
    }
    rail.addEventListener('scroll', () => {
      const p = rail.scrollLeft / Math.max(1, rail.scrollWidth - rail.clientWidth);
      if (prog) prog.style.transform = `scaleX(${p})`;
    }, { passive: true });
    // survol : l'eau monte et l'objet du spectacle s'anime
    cartes.forEach(c => {
      const obj = c.querySelector('[data-objet]');
      let anim = null;
      c.addEventListener('pointerenter', () => {
        if (!gsap || calme) return;
        anim = animerObjet(gsap, obj, obj?.dataset.objet);
        document.documentElement.style.setProperty('--gel', c.style.getPropertyValue('--c'));
        ctx.sons?.plouf();
      });
      c.addEventListener('pointerleave', () => { anim && anim.revert ? anim.revert() : anim && anim.kill && anim.kill(); });
    });
    // filtres
    const chips = [...document.querySelectorAll('[data-filtre]')];
    const compte = document.querySelector('[data-rep-compte]');
    chips.forEach(ch => ch.addEventListener('click', () => {
      chips.forEach(x => x.setAttribute('aria-pressed', String(x === ch)));
      const f = ch.dataset.filtre;
      let n = 0;
      cartes.forEach(c => {
        const ok = f === 'tous' || c.dataset.filtres.split(' ').includes(f);
        c.classList.toggle('is-out', !ok);
        c.setAttribute('aria-hidden', String(!ok));
        c.tabIndex = ok ? 0 : -1;
        if (ok) n++;
      });
      if (compte) compte.textContent = `${n} spectacle${n > 1 ? 's' : ''}${f === 'tous' ? '' : ' pour ce filtre'}`;
      const first = cartes.find(c => !c.classList.contains('is-out'));
      if (first && !piste.classList.contains('is-pinned')) rail.scrollTo({ left: first.offsetLeft - rail.offsetLeft, behavior: calme ? 'auto' : 'smooth' });
      if (first && piste.classList.contains('is-pinned') && ctx.lenis) {
        const st = ST.getAll().find(t => t.pin === piste);
        if (st) { const idx = cartes.indexOf(first); ctx.lenis.scrollTo(st.start + (st.end - st.start) * (idx / Math.max(1, cartes.length - 1)), { duration: 1.2 }); }
      }
      ctx.sons?.plouf();
    }));
  }

  /* ---------- décembre ---------- */
  const cal = document.querySelector('[data-cal]');
  if (cal) {
    const detail = cal.querySelector('[data-cal-detail]');
    const choisir = (iso, btn) => {
      cal.querySelectorAll('.cal-case').forEach(c => c.classList.remove('is-sel'));
      btn?.closest('.cal-case')?.classList.add('is-sel');
      const evs = DATES.filter(x => x.d === iso && joue(x));
      detail.innerHTML = `<p class="mono" style="color:var(--laiton)">${cap(fLong(iso))}</p><ul>${evs.map(x => `<li style="--c:${color(x.s)}"><span class="dot"></span><a href="spectacles/${SHOW[x.s].slug}.html">${titre(x.s)}</a><span class="muted">${x.c} (${x.dep})${x.lieu ? ' · ' + x.lieu : ''}</span></li>`).join('')}</ul>`;
    };
    const btns = [...cal.querySelectorAll('[data-jour]')];
    btns.forEach(b => b.addEventListener('click', () => { choisir(b.dataset.jour, b); ctx.sons?.plouf(); }));
    if (btns[0]) choisir(btns[0].dataset.jour, btns[0]);
    if (gsap && !calme) {
      gsap.fromTo(cal, { '--niveau': 0 }, { '--niveau': .9, ease: 'none', scrollTrigger: { trigger: cal, start: 'top 80%', end: 'bottom 40%', scrub: .6 } });
      gsap.from(cal.querySelectorAll('.cal-case .pt'), { scale: 0, duration: .6, ease: 'back.out(3)', stagger: .025, scrollTrigger: { trigger: cal, start: 'top 75%', once: true } });
      const photos = document.querySelectorAll('.dec-photos .media');
      photos.forEach((p, i) => gsap.to(p, { yPercent: i ? -12 : 8, ease: 'none', scrollTrigger: { trigger: p, start: 'top bottom', end: 'bottom top', scrub: true } }));
    } else cal.style.setProperty('--niveau', .6);
  }

  /* ---------- tournée ---------- */
  const carteBox = document.querySelector('[data-carte]');
  if (carteBox) {
    const range = document.querySelector('[data-annee]');
    const lab = carteBox.querySelector('[data-carte-annee]');
    const carte = initCarte(carteBox, { gsap, calme, onYear: y => { lab.textContent = y >= 2027 ? '2018 → 2027' : y; if (range && +range.value !== y) range.value = y; } });
    range?.addEventListener('input', () => carte.setYear(+range.value));
    if (gsap && !calme) {
      carte.setYear(2018, false);
      ST.create({
        trigger: carteBox, start: 'top 75%', end: 'bottom 35%', scrub: true,
        onUpdate: self => { const y = 2018 + Math.round(self.progress * 9); if (y !== carte._y) { carte._y = y; carte.setYear(y); } },
      });
    } else carte.setYear(2027, false);
  }

  /* ---------- frise du déroulé ---------- */
  const frise = document.querySelector('[data-frise]');
  if (frise) {
    const ligne = frise.querySelector('[data-frise-eau]');
    const etapes = [...frise.querySelectorAll('[data-etape]')];
    if (gsap && !calme) {
      gsap.to(ligne, { attr: { 'stroke-dashoffset': 0 }, ease: 'none', scrollTrigger: { trigger: frise, start: 'top 70%', end: 'bottom 60%', scrub: .5 } });
      etapes.forEach(e => ST.create({ trigger: e, start: 'top 68%', onEnter: () => e.classList.add('is-on'), onLeaveBack: () => e.classList.remove('is-on') }));
      const imgs = document.querySelectorAll('.repr-images .media');
      if (imgs[1]) gsap.fromTo(imgs[1], { yPercent: 18 }, { yPercent: -10, ease: 'none', scrollTrigger: { trigger: imgs[1], start: 'top bottom', end: 'bottom top', scrub: true } });
    } else { ligne?.setAttribute('stroke-dashoffset', 0); etapes.forEach(e => e.classList.add('is-on')); }
  }

  /* ---------- équipe : portraits inclinables ---------- */
  if (fine && gsap && !calme) {
    document.querySelectorAll('[data-tilt]').forEach(m => {
      const fig = m.querySelector('.media');
      const rx = gsap.quickTo(fig, 'rotationX', { duration: .6, ease: 'power3' }), ry = gsap.quickTo(fig, 'rotationY', { duration: .6, ease: 'power3' });
      m.addEventListener('pointermove', e => { const r = fig.getBoundingClientRect(); ry(((e.clientX - r.left) / r.width - .5) * 14); rx(-((e.clientY - r.top) / r.height - .5) * 14); });
      m.addEventListener('pointerleave', () => { rx(0); ry(0); });
    });
  }

  /* ---------- ateliers : lampe torche ---------- */
  document.querySelectorAll('[data-torche]').forEach(a => {
    const t = a.querySelector('.torche');
    a.addEventListener('pointermove', e => { const r = t.getBoundingClientRect(); t.style.setProperty('--tx', `${e.clientX - r.left}px`); t.style.setProperty('--ty', `${e.clientY - r.top}px`); });
  });

  /* ---------- presse : les titres dérivent ---------- */
  if (gsap && !calme) {
    document.querySelectorAll('.article.flotte .article-titre').forEach((t, i) => {
      gsap.fromTo(t, { x: i % 2 ? 28 : -18 }, { x: i % 2 ? -12 : 22, ease: 'none', scrollTrigger: { trigger: t, start: 'top bottom', end: 'bottom top', scrub: 1 } });
      gsap.to(t, { y: 3, duration: 2 + (i % 3) * .5, yoyo: true, repeat: -1, ease: 'sine.inOut', delay: i * .13 });
    });
  }

  /* ---------- formulaire en 4 étapes ---------- */
  formulaire(ctx);
}

function formulaire(ctx) {
  const f = document.querySelector('[data-form]');
  if (!f) return;
  const steps = [...f.querySelectorAll('[data-step]')];
  const nav = [...f.querySelectorAll('[data-etapes-nav] span')];
  const prec = f.querySelector('[data-prec]'), suiv = f.querySelector('[data-suiv]'), envoi = f.querySelector('[data-envoi]');
  const err = f.querySelector('[data-erreur]'), jauge = document.querySelector('[data-jauge]'), jt = document.querySelector('[data-jauge-txt]');
  const merci = f.querySelector('[data-merci]'), actions = f.querySelector('[data-actions]');
  let i = 0;
  const niveaux = [8, 34, 58, 82, 100];
  const val = n => f.elements[n]?.value?.trim?.() ?? '';
  const checks = () => [...f.querySelectorAll('input[name="spectacles"]:checked')];
  const valide = k => {
    if (k === 0 && !checks().length) return 'Choisissez au moins un spectacle, ou « conseillez-moi ».';
    if (k === 1 && !f.querySelector('input[name="type"]:checked')) return 'Indiquez qui vous êtes.';
    if (k === 1 && !val('lieu')) return 'Indiquez le lieu de la représentation.';
    if (k === 2 && !val('date') && !val('periode')) return 'Indiquez une date ou une période.';
    if (k === 3 && !val('nom')) return 'Indiquez votre nom.';
    if (k === 3 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val('email'))) return 'Indiquez une adresse e-mail valide, par exemple nom@mairie.fr.';
    return '';
  };
  const recap = () => {
    const r = f.querySelector('[data-recap]');
    const sp = checks().map(c => c.value === 'conseil' ? 'À conseiller' : SHOW[c.value].titre).join(', ');
    const type = f.querySelector('input[name="type"]:checked')?.value || '';
    const quand = val('date') ? cap(fLong(val('date'))) : val('periode');
    r.innerHTML = `<p class="mono" style="color:var(--laiton)">Récapitulatif</p>`
      + [['Spectacle', sp], ['Structure', type], ['Lieu', val('lieu')], ['Public', val('public') ? val('public') + ' personnes' : 'non précisé'], ['Quand', quand + (val('horaire') ? ', ' + val('horaire') : '')]]
        .map(([k, v]) => `<div><span class="k">${k}</span><span>${v ? String(v).replace(/</g, '&lt;') : '—'}</span></div>`).join('');
  };
  const go = k => {
    i = k;
    steps.forEach((s, j) => { s.hidden = j !== i; });
    nav.forEach((n, j) => { n.classList.toggle('is-on', j === i); n.classList.toggle('is-ok', j < i); });
    prec.hidden = i === 0; suiv.hidden = i === steps.length - 1; envoi.hidden = i !== steps.length - 1;
    err.textContent = '';
    if (jauge) jauge.style.height = niveaux[i] + '%';
    if (jt) jt.textContent = `Étape ${i + 1} sur ${steps.length}`;
    if (i === steps.length - 1) recap();
    if (ctx.gsap && !ctx.calme) ctx.gsap.from(steps[i], { y: 16, opacity: 0, duration: .5, ease: 'power3.out' });
    steps[i].querySelector('legend')?.setAttribute('tabindex', '-1');
  };
  suiv.addEventListener('click', () => {
    const m = valide(i);
    if (m) { err.textContent = m; return; }
    ctx.sons?.plouf();
    go(i + 1);
    steps[i].querySelector('input, select, textarea')?.focus({ preventScroll: true });
  });
  prec.addEventListener('click', () => go(i - 1));
  f.addEventListener('submit', e => {
    e.preventDefault();
    const m = valide(3);
    if (m) { err.textContent = m; return; }
    steps.forEach(s => { s.hidden = true; });
    actions.hidden = true; err.textContent = '';
    f.querySelector('[data-etapes-nav]').hidden = true;
    merci.hidden = false; merci.focus({ preventScroll: true });
    if (jauge) jauge.style.height = '100%';
    if (jt) jt.textContent = 'Demande prête';
    ctx.toast('Demande simulée : rien n’a été envoyé');
    ctx.sons?.plouf();
  });
  f.querySelector('[data-reset]')?.addEventListener('click', () => {
    f.reset(); merci.hidden = true; actions.hidden = false; f.querySelector('[data-etapes-nav]').hidden = false; go(0);
  });
  const prefill = () => {
    let v = null;
    try { v = sessionStorage.getItem('lphec-prefill'); sessionStorage.removeItem('lphec-prefill'); } catch (e) { /* rien */ }
    if (!v) return;
    v.split(',').forEach(k => { const c = f.querySelector(`input[name="spectacles"][value="${k}"]`); if (c) c.checked = true; });
    go(0);
  };
  document.addEventListener('lphec:prefill', prefill);
  prefill();
  go(0);
}
