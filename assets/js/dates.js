// Outils de dates partagés : tri à venir / passées, rendu des lignes, export .ics
import { SHOWS, EXTRA, DATES } from './data.js';

export const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
export const MOIS_C = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
export const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
export const SHOW = Object.fromEntries(SHOWS.map(s => [s.key, s]));

const pad = n => String(n).padStart(2, '0');
export function todayISO() {
  const t = window.__TODAY ? new Date(window.__TODAY) : new Date();
  return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`;
}
export const parse = iso => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, Math.max(1, d)); };
export const color = k => (SHOW[k] || EXTRA[k] || {}).couleur || '#E2483D';
export const titre = k => (SHOW[k] || EXTRA[k] || {}).titre || '';
export const joue = x => x.statut !== 'annule' && x.statut !== 'reporte';
export const isPast = (x, today = todayISO()) => (x.fin || x.d) < today;
export const upcoming = (list = DATES, today = todayISO()) => list.filter(x => joue(x) && !isPast(x, today)).sort((a, b) => a.d.localeCompare(b.d));
export const next = (list = DATES) => upcoming(list)[0] || null;
export function daysUntil(iso) {
  const a = parse(todayISO()), b = parse(iso);
  return Math.round((b - a) / 864e5);
}
export function fLong(iso) {
  if (iso.endsWith('-00')) { const [y, m] = iso.split('-'); return `${MOIS[+m - 1]} ${y}`; }
  const d = parse(iso);
  const wd = JOURS[(d.getDay() + 6) % 7];
  return `${wd} ${d.getDate()}${d.getDate() === 1 ? 'er' : ''} ${MOIS[d.getMonth()]} ${d.getFullYear()}`;
}
export const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function ligne(x, { rel = '', withShow = true, ics = false, today = todayISO() } = {}) {
  const d = parse(x.d);
  let jj, sous;
  if (x.d.endsWith('-00')) { jj = '—'; sous = `${MOIS[d.getMonth()]} ${d.getFullYear()}`; }
  else { jj = String(d.getDate()); sous = `${JOURS[(d.getDay() + 6) % 7].slice(0, 3)}. ${MOIS_C[d.getMonth()]} ${d.getFullYear()}`; }
  if (x.fin) { const f = parse(x.fin); sous = `${MOIS_C[d.getMonth()]} → ${f.getDate()} ${MOIS_C[f.getMonth()]} ${f.getFullYear()}`; }
  let st;
  if (x.statut === 'annule') st = '<span class="statut statut--annule">Annulé</span>';
  else if (x.statut === 'reporte') st = '<span class="statut statut--reporte">Reporté</span>';
  else if (!isPast(x, today)) st = '<span class="statut statut--venir">À venir</span>';
  else st = '<span class="statut">Passée</span>';
  const lieu = [x.lieu, x.note].filter(Boolean).join(' · ');
  let ou = `${esc(x.c)} (${x.dep})${lieu ? ' · ' + esc(lieu) : ''}`;
  const verif = x.verif ? `<span class="verif">À vérifier : ${esc(x.verif)}</span>` : '';
  const s = SHOW[x.s];
  let t = s && withShow ? `<a href="${rel}spectacles/${s.slug}.html">${esc(titre(x.s))}</a>` : esc(titre(x.s));
  if (!withShow) { t = `${esc(x.c)} (${x.dep})`; ou = lieu ? esc(lieu) : (x.s === 'multi' ? esc(titre(x.s)) : ''); }
  const btn = ics && joue(x) && !isPast(x, today)
    ? `<button class="btn btn--petit" type="button" data-ics="${x.d}|${x.s}|${esc(x.c)}">Ajouter à mon agenda</button>` : '';
  return `<div class="date-ligne" style="--c:${color(x.s)}" data-s="${x.s}" data-dep="${x.dep}"><div class="date-j"><b>${jj}</b><span>${sous}</span></div>`
    + `<div class="date-quoi"><span class="t"><i></i>${t}</span>${verif}</div>`
    + `<div class="date-ou">${ou}</div><div class="date-act">${btn}${st}</div></div>`;
}

export function icsFor(iso, key, commune) {
  const x = DATES.find(e => e.d === iso && e.s === key) || { d: iso, s: key, c: commune, dep: '' };
  const d = parse(x.d), f = new Date(d.getTime() + 864e5);
  const ymd = t => `${t.getFullYear()}${pad(t.getMonth() + 1)}${pad(t.getDate())}`;
  const lieu = [x.lieu, `${x.c} (${x.dep})`].filter(Boolean).join(', ');
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Les Plus Hautes Eaux Connues//Agenda//FR', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT',
    `UID:${x.d}-${x.s}-${(x.c || '').replace(/\W+/g, '')}@lesplushauteseaux`,
    `DTSTAMP:${ymd(new Date())}T000000Z`, `DTSTART;VALUE=DATE:${ymd(d)}`, `DTEND;VALUE=DATE:${ymd(f)}`,
    `SUMMARY:${titre(x.s)} - Les Plus Hautes Eaux Connues`, `LOCATION:${lieu}`,
    'DESCRIPTION:Horaire et réservation auprès de l’organisateur.', 'END:VEVENT', 'END:VCALENDAR',
  ];
  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${SHOW[x.s] ? SHOW[x.s].slug : x.s}-${x.d}.ics`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
