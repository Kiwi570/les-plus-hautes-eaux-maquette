# Les Plus Hautes Eaux Connues — maquette

Maquette statique (HTML, CSS, JavaScript), direction « La Crue ». Aucune étape de construction.

- `index.html` : accueil
- `spectacles/*.html` : les 7 fiches spectacle
- `agenda.html` : agenda, carte de la tournée, archives
- `assets/js/data.js` : **le seul fichier des dates** (à venir et passées sont triées automatiquement)
- `assets/img/` : images WebP en plusieurs tailles, `manifest.json` (dimensions et aperçus flous)
- `vercel.json` : adresses propres, en-tête noindex (maquette) et cache des images
- `404.html` : page d'erreur ; `assets/img/partage/` : images d'aperçu pour le partage du lien

Bibliothèques hébergées avec le site : GSAP 3.15 (ScrollTrigger, SplitText), Lenis 1.3, OGL.
Polices : Fraunces, Schibsted Grotesk, DM Mono en WOFF2 (licence SIL OFL, fichiers dans `assets/fonts`).

Avant la mise en ligne définitive : retirer la balise `noindex` des pages et l'en-tête `X-Robots-Tag` de `vercel.json`, et remplacer l'adresse vercel.app dans les balises de partage.
