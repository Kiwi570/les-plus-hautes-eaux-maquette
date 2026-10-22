// Ambiance sonore générée en code : rivière la nuit, gouttes, et un « plouf » pour les actions.
// Ne démarre qu'après un clic du visiteur.
let ctx = null, master = null, gouttes = 0, on = false;

function bruitBrun(ctx, sec = 4) {
  const buf = ctx.createBuffer(1, ctx.sampleRate * sec, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.2; }
  return buf;
}

function goutte(vol = 0.06, f0 = 900 + Math.random() * 700) {
  if (!ctx) return;
  const t = ctx.currentTime;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(f0 * 0.42, t + 0.12);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
  o.connect(g).connect(master);
  o.start(t); o.stop(t + 0.25);
}

export function start() {
  if (on) return;
  on = true;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.0001; master.connect(ctx.destination);
    const src = ctx.createBufferSource(); src.buffer = bruitBrun(ctx); src.loop = true;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 520; lp.Q.value = 0.6;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1400; bp.Q.value = 1.4;
    const gBp = ctx.createGain(); gBp.gain.value = 0.05;
    const lfo = ctx.createOscillator(), lfoG = ctx.createGain();
    lfo.frequency.value = 0.07; lfoG.gain.value = 180;
    lfo.connect(lfoG).connect(lp.frequency);
    const gRiv = ctx.createGain(); gRiv.gain.value = 0.55;
    src.connect(lp).connect(gRiv).connect(master);
    src.connect(bp).connect(gBp).connect(master);
    src.start(); lfo.start();
  }
  ctx.resume();
  const t = ctx.currentTime;
  master.gain.cancelScheduledValues(t);
  master.gain.setValueAtTime(Math.max(0.0001, master.gain.value), t);
  master.gain.exponentialRampToValueAtTime(0.5, t + 1.6);
  const boucle = () => { goutte(0.035 + Math.random() * 0.03); gouttes = setTimeout(boucle, 700 + Math.random() * 2200); };
  boucle();
}

export function stop() {
  if (!on || !ctx) return;
  on = false;
  clearTimeout(gouttes);
  const t = ctx.currentTime;
  master.gain.cancelScheduledValues(t);
  master.gain.setValueAtTime(Math.max(0.0001, master.gain.value), t);
  master.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
  setTimeout(() => { if (!on) ctx.suspend(); }, 900);
}

export const plouf = () => { if (on) { goutte(0.09, 620); setTimeout(() => goutte(0.05, 980), 90); } };
export const actif = () => on;
