# CKlayser — page d'accueil

Plateforme de séries animées 2D et 3D. *Our Clay, Your Keys.*

Intégration Next.js (App Router) de la maquette de la page d'accueil : sidebar, header, hero en carrousel, rangées de découverte, états visiteur et membre. Les interactions fonctionnent avec des données fictives, sans backend.

## Lancer le projet

```bash
npm install
npm run dev        # http://localhost:3000
```

Production :

```bash
npm run build && npm start
```

Vérification des types : `npm run typecheck`.

## États visiteur / membre

- État **membre** par défaut (comme la capture).
- Paramètre d'URL : `?state=guest` ou `?state=member`, lu dès le rendu serveur (pas de clignotement).
- En développement, un commutateur « dev · Visiteur / Membre » apparaît en bas à droite.
- La fenêtre de connexion de démonstration fait passer en état membre ; « Se déconnecter » repasse en visiteur.

## Stack

- Next.js 16 (App Router, Turbopack), React 19, TypeScript strict (`noUncheckedIndexedAccess`).
- CSS3 : CSS Modules par composant + `app/globals.css` pour le design system. **Aucun Tailwind.**
- Icônes : `lucide-react` (trait de 1,75 à 2 px).
- Polices via `next/font/google` : Fraunces (titres), Manrope (interface), JetBrains Mono (surtitres, compteurs).

## Architecture

```
app/
  layout.tsx              polices, état partagé, sidebar + header + navigation mobile
  globals.css             design system (variables), reset, utilitaires a11y
  page.tsx                accueil : hero + rangées
  studio/page.tsx         « Bientôt disponible » (CKlayser Studio)
  serie/[id]/page.tsx     page de visionnage (lecteur à points de vue) ou « Bientôt disponible »
  [section]/page.tsx      Découvrir, Séries Exclusives, Fandoms, Chaînes, Profil, Adhésions, Paramètres
  chaine/[id]/page.tsx    page chaîne « Bientôt disponible »
  ma-liste/page.tsx       séries enregistrées (session)
  not-found.tsx           404
components/
  layout/                 Sidebar, SidebarNav, FollowedChannels, StudioCard, SidebarDecor,
                          Topbar, SearchBar, SearchOverlay, AuthButtons, AuthDialog, UserMenu,
                          NotificationsPanel, MobileNav, DevStateToggle, navItems
  home/                   Hero, HeroSlide, SectionHeader, SeriesRow, SeriesCard, UniverseCard,
                          HomeSections, MyList
  watch/                  PovPlayer (lecteur vidéo à points de vue)
  ui/                     Button, IconButton, Badge, Avatar, KeyframeDiamond, ComingSoon, Toast
data/mock.ts              séries, univers, chaînes, utilisateur, notifications, slides
lib/                      types.ts, catalog.ts (requêtes + formatage), app-state.tsx (contexte),
                          hooks.ts, theme.ts
public/
  brand/logo.png          logo original (conversion PNG sans perte du fichier fourni)
  watch/echos-aelith/     épisode 1 : s1e1-pov1..3.mp4 (+ affiches -poster.webp)
  hero/echos-aelith.mp4   vidéo de la 1re diapositive du hero (+ affiche -poster.webp)
  hero/ series/ universes/ avatars/   visuels SVG de remplacement
```

## Remplacer les visuels

Chaque série, slide, univers et avatar pointe vers un fichier local à nom stable (par ex. `public/series/lune-rousse.svg`). Pour mettre la vraie illustration, déposez le fichier dans `public/` et changez **un seul chemin** dans `data/mock.ts`. Les images raster (JPG, PNG, WebP) seront optimisées automatiquement par `next/image`.

Pour le hero, le champ `focus` (`object-position`) règle le recadrage, notamment en 4:5 sur mobile.

### Vidéo dans le hero

Une diapositive accepte un champ `video` (en plus de `image`, qui sert d'affiche). La première diapositive l'utilise :

- `public/hero/echos-aelith.mp4` : H.264, 1072 × 720, 12 s, sans piste audio, `faststart`. Il est tiré de la vidéo fournie, avec la bande droite recadrée pour retirer la notification NVIDIA.
- `public/hero/echos-aelith-poster.webp` : première image, affichée pendant le chargement et en mouvement réduit.
- La vidéo est muette, sans contrôles et en lecture inline. Elle ne joue que sur la diapositive active et repart du début à chaque retour.
- Sur desktop et tablette, elle est cadrée à droite de la colonne de texte avec un fondu à gauche. Sur mobile, elle occupe le format 4:5.
- La diapositive dure le temps de la vidéo (20 s au plus si la lecture est bloquée), au lieu de 7 s. Au survol, la vidéo tourne en boucle.
- Le bouton pause reste visible sur cette diapositive, mobile compris (WCAG 2.2.2), et arrête la vidéo et le défilement. Avec `prefers-reduced-motion`, la vidéo ne démarre pas et seule l'affiche est montrée.

Pour régénérer le fichier à partir d'une nouvelle source :

```bash
ffmpeg -i source.mp4 -an -c:v libx264 -preset slow -crf 24 -pix_fmt yuv420p -movflags +faststart public/hero/echos-aelith.mp4
```

## Page de visionnage et points de vue

`/serie/echos-aelith` (bouton « Regarder maintenant » du hero) ouvre le lecteur de l'épisode 1. Une série sans épisode vidéo affiche toujours « Bientôt disponible ». Les épisodes sont décrits dans `data/mock.ts` (`episodes`), avec un tableau `povs` : un point de vue par vidéo du même mouvement.

Changement de point de vue (`components/watch/PovPlayer.tsx`) :

- Les trois vidéos sont superposées et préchargées. Seule la vidéo active est visible.
- Au clic sur « POV n » (ou touche 1 à 3), le lecteur procède en quatre temps :
  1. il relève le timestamp de la vidéo quittée et la met en pause ;
  2. il positionne la nouvelle vidéo sur ce timestamp et attend `seeked` ;
  3. il relance la lecture si elle était en cours ;
  4. il bascule l'affichage. L'image quittée reste visible entre-temps, donc il n'y a pas d'écran noir.
- Le volume, la sourdine et la vitesse suivent le changement.
- Les extraits n'ont pas la même durée (POV 1 : 2,37 s, POV 2 : 2,69 s, POV 3 : 2,30 s). Un timestamp au-delà de la fin du nouveau point de vue est ramené à sa dernière image, et l'annonce vocale le signale.
- Plusieurs clics rapprochés forment une seule transition, qui garde l'état de départ (lecture, timestamp).
- Le plein écran s'applique au cadre entier, donc les boutons de point de vue restent disponibles.
- Raccourcis quand le focus est dans le lecteur : Espace ou K (lecture), ← / → (±0,5 s), M (son), F (plein écran), 1 à 3 (point de vue).

Pour ajouter un épisode : déposer les MP4 dans `public/watch/<serie>/` et les rendre lisibles au démarrage avec `ffmpeg -i in.mp4 -c copy -movflags +faststart out.mp4`, puis ajouter une entrée dans `episodes`.

## Design system

- Toutes les couleurs sont des variables de `app/globals.css`, regroupées par rôle : fonds, marque, accents relevés sur la capture, texte, badges, bordures lumineuses, ombres, typographie, layout, rayons, mouvement, z-index.
- Aucune valeur HEX dans les composants. Seule exception : `lib/theme.ts`, car `<meta name="theme-color">` n'accepte pas de variable CSS.
- Ratio des cartes : `--card-ratio: 16 / 10` (mesuré sur la capture). Passer à `16 / 9` ne demande qu'une ligne.
- Cascade CSS indépendante de l'ordre de chargement (qui change entre `dev` et `build`) :
  - reset de `globals.css` sous `:where()`, en spécificité nulle ;
  - base de chaque composant en spécificité de classe (0,1,0) ;
  - surcharge par un parent via `className` en (0,2,0), par exemple `.railWrap .scrollButton`.

## Accessibilité (WCAG 2.2 AA)

- Boutons primaires : fond `#BE4D3D`, texte blanc (4,86:1), survol avec halo doré et 1 px d'élévation, état pressé `#A63E30`.
- Couleurs corrigées pour le contraste :

  | Élément | Capture | Ratio capture | Corrigé | Ratio corrigé |
  | --- | --- | --- | --- | --- |
  | Bouton primaire | `#C9542D` | 4,38:1 | `#BE4D3D` | 4,86:1 |
  | Badge « En avance » | `#C9572D` | 4,30:1 | `#BE4D3D` | 4,86:1 |
  | Placeholder de recherche | `#87756B` | 3,7:1 | `#9A8A7F` | 4,9:1 |

- Le voile du hero est calé en pixels sur la colonne de texte : 6,2:1 au minimum mesuré sur le rendu réel.
- Focus doré de 2 px partout, navigation clavier complète.
- Motifs ARIA : combobox (recherche), menu button (compte), carrousel (APG).
- `inert` sur les slides masquées. Pastilles toujours doublées d'un texte accessible. `prefers-reduced-motion` respecté (pas d'autoplay). Aucun texte sous 12 px.
