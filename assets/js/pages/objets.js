// Animations des objets des spectacles (caddie, harpe, boule à facettes, planète, astéroïde, cornes, route)
export function animerObjet(gsap, obj, type, { boucle = false } = {}) {
  if (!gsap || !obj) return null;
  const q = s => obj.querySelectorAll(s);
  const rep = boucle ? -1 : 0;
  const tl = gsap.timeline({ repeat: rep, yoyo: false });
  const eclats = q('.obj-eclat');
  if (eclats.length) gsap.fromTo(eclats, { scale: .2, opacity: .2, transformOrigin: '50% 50%' }, { scale: 1.2, opacity: 1, duration: .5, stagger: { each: .15, repeat: boucle ? -1 : 1, yoyo: true }, ease: 'sine.inOut' });
  switch (type) {
    case 'caddie':
      tl.to(obj, { x: 10, duration: .5, ease: 'power2.out' })
        .to(q('.obj-roue'), { rotation: 360, transformOrigin: '50% 50%', duration: .9, ease: 'none', repeat: boucle ? -1 : 1 }, 0)
        .to(obj, { x: 0, rotation: -3, duration: .6, ease: 'elastic.out(1,.4)' }, .5);
      break;
    case 'harpe':
      q('.obj-corde').forEach((c, i) => tl.fromTo(c, { scaleX: 1, x: 0 }, { x: 1.4, duration: .05, repeat: 9, yoyo: true, ease: 'sine.inOut', transformOrigin: '50% 50%' }, i * .06));
      break;
    case 'boule':
      tl.to(obj.querySelector('svg'), { rotation: 8, transformOrigin: '50% 0%', duration: .5, ease: 'sine.inOut', yoyo: true, repeat: boucle ? -1 : 3 });
      tl.to(q('ellipse'), { attr: { rx: (i, el) => +el.getAttribute('rx') + 6 }, duration: .6, yoyo: true, repeat: boucle ? -1 : 1, ease: 'sine.inOut' }, 0);
      break;
    case 'planete':
      tl.to(q('.obj-anneau'), { rotation: 20, transformOrigin: '58px 64px', duration: 1, ease: 'sine.inOut', yoyo: true, repeat: boucle ? -1 : 1 })
        .to(q('.obj-lune'), { x: -86, y: 70, duration: 1.4, ease: 'sine.inOut', yoyo: true, repeat: boucle ? -1 : 1 }, 0);
      break;
    case 'asteroide':
      tl.fromTo(q('.obj-roc'), { rotation: 0, transformOrigin: '80px 55px' }, { rotation: 40, duration: 1.4, ease: 'power1.inOut' })
        .fromTo(q('.obj-trainee path'), { strokeDasharray: '0 60' }, { strokeDasharray: '60 0', duration: .6, stagger: .08, ease: 'power2.out' }, 0)
        .to(obj, { x: -6, y: 6, duration: .4, yoyo: true, repeat: 1, ease: 'sine.inOut' }, 0);
      break;
    case 'cornes':
      tl.fromTo(q('.obj-corne'), { scale: .6, transformOrigin: (i) => i ? '0% 100%' : '100% 100%' }, { scale: 1.12, duration: .7, ease: 'back.out(3)' })
        .to(obj, { rotation: -4, duration: .12, yoyo: true, repeat: 5 }, .2);
      break;
    case 'route':
      tl.fromTo(q('.obj-chemin'), { strokeDashoffset: 80 }, { strokeDashoffset: 0, duration: 1.4, ease: 'none', repeat: boucle ? -1 : 0 });
      break;
    default:
      tl.to(obj, { y: -6, duration: .5, yoyo: true, repeat: 1 });
  }
  return tl;
}
