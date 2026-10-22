// Agenda : listes depuis le fichier unique, filtres spectacle et département, .ics, carte libre
import { DATES } from '../data.js';
import { ligne, upcoming, joue, daysUntil, titre, icsFor } from '../dates.js';

export default function agenda(ctx) {
  const { gsap, calme } = ctx;
  const venir = document.querySelector('[data-liste-venir]');
  const arch = document.querySelector('[data-archives]');
  const fut = upcoming(DATES);
  const past = DATES.filter(x => !fut.includes(x));
  const years = [...new Set(past.map(x => x.d.slice(0, 4)))].sort().reverse();
  let filtre = { s: 'tous', dep: '' };
  const ok = x => (filtre.s === 'tous' || x.s === filtre.s || (x.s === 'multi' && ['roxanne', 'mimo', 'cellule'].includes(filtre.s))) && (!filtre.dep || x.dep === filtre.dep);

  const render = () => {
    const f = fut.filter(ok);
    venir.innerHTML = f.length ? f.map(x => ligne(x, { ics: true })).join('')
      : '<p class="liste-vide">Aucune date à venir pour ce filtre. Le spectacle reste disponible pour vos programmations.</p>';
    arch.innerHTML = years.map((y, i) => {
      const xs = past.filter(x => x.d.startsWith(y) && ok(x)).sort((a, b) => b.d.localeCompare(a.d));
      if (!xs.length) return '';
      const n = xs.filter(joue).length;
      return `<details data-annee-arch="${y}"${i === 0 || filtre.s !== 'tous' || filtre.dep ? ' open' : ''}><summary><span class="an">${y}</span><span class="mono muted">${n} date${n > 1 ? 's' : ''}</span><span class="plus" aria-hidden="true">+</span></summary><div>${xs.map(x => ligne(x)).join('')}</div></details>`;
    }).join('') || '<p class="liste-vide">Aucune date passée pour ce filtre.</p>';
    if (gsap && !calme) gsap.from(venir.children, { y: 18, opacity: 0, duration: .5, stagger: .03, ease: 'power2.out' });
  };
  render();

  // compte à rebours
  const ca = document.querySelector('[data-compte-agenda]');
  const p = fut[0];
  if (ca && p) ca.innerHTML = `<span class="mono" style="color:var(--laiton)">Prochaine dans</span><span class="compte"><b>${Math.max(0, daysUntil(p.d))}</b><span>jours</span></span><span>${titre(p.s)} · ${p.c} (${p.dep})</span>`;

  // carte
  const box = document.querySelector('[data-carte]');
  let carte = null;
  const lancerCarte = async () => {
    const { initCarte } = await import('../carte.js');
    const range = document.querySelector('[data-annee]');
    const out = document.querySelector('[data-annee-out]');
    const lab = box.querySelector('[data-carte-annee]');
    carte = initCarte(box, { gsap, calme, onYear: y => { const t = y > 2027 ? 'Toutes' : `→ ${y}`; lab.textContent = t; if (out) out.textContent = t; } });
    carte.setYear(9999, false);
    range?.addEventListener('input', () => carte.setYear(+range.value > 2027 ? 9999 : +range.value));
    carte.setFilter(filtre);
  };
  if (box) {
    const io = new IntersectionObserver(([en]) => { if (en.isIntersecting) { io.disconnect(); lancerCarte(); } }, { rootMargin: '900px 0px' });
    io.observe(box);
  }

  // filtres
  const chips = [...document.querySelectorAll('[data-fs]')];
  chips.forEach(ch => ch.addEventListener('click', () => {
    chips.forEach(x => x.setAttribute('aria-pressed', String(x === ch)));
    filtre.s = ch.dataset.fs;
    render();
    carte?.setFilter({ s: filtre.s });
    ctx.sons?.plouf();
  }));
  const sel = document.querySelector('[data-fdep]');
  sel?.addEventListener('change', () => { filtre.dep = sel.value; render(); carte?.setFilter({ dep: filtre.dep }); });

  // .ics
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-ics]');
    if (!b) return;
    const [d, s, c] = b.dataset.ics.split('|');
    icsFor(d, s, c);
    ctx.toast('Fichier agenda (.ics) téléchargé');
  });
}
