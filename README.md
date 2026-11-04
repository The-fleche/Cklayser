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
  decouvrir/page.tsx      catalogue complet filtrable (?univers=…)
  exclusives/page.tsx     séries réservées aux adhérents, épisodes en avance
  chaines/page.tsx        toutes les chaînes (Suivre / Adhérer)
  chaine/[id]/page.tsx    page d'une chaîne et ses séries
  fandoms/page.tsx        communautés et discussions
  fandoms/[id]/page.tsx   une discussion (réponses, j'aime)
  [section]/page.tsx      « Bientôt disponible » : Mes adhésions, Paramètres
  profil/page.tsx         profil du membre (photo, nom, pseudo, préférences)
  ma-liste/page.tsx       séries enregistrées (session)
  not-found.tsx           404
components/
  layout/                 Sidebar, SidebarNav, FollowedChannels, StudioCard, SidebarDecor,
                          Topbar, SearchBar, SearchOverlay, AuthButtons, AuthDialog, UserMenu,
                          NotificationsPanel, MobileNav, DevStateToggle, navItems
  home/                   Hero, HeroSlide, SectionHeader, SeriesRow, SeriesCard, UniverseCard,
                          HomeSections, MyList
  watch/                  PovPlayer (lecteur vidéo à points de vue), EpisodeList
  profile/                ProfileEditor (page /profil)
  catalog/                CatalogBrowser, ExclusivesView, ChannelsView, ChannelView, ChannelActions
  forum/                  ForumHome, ThreadView, ForumAuthorLine, LikeButton
  ui/                     Button, IconButton, Badge, Avatar, KeyframeDiamond, ComingSoon, Toast
data/mock.ts              séries (16), univers, chaînes, adhésions, utilisateur, notifications, slides, épisodes
data/forum.ts             membres fictifs, communautés, discussions et réponses
lib/                      types.ts, catalog.ts (requêtes + formatage), app-state.tsx (contexte),
                          profile.ts (validation, photo), forum.ts + forum-store.ts (forums),
                          sidebar.ts (cookie), hooks.ts, theme.ts
public/
  brand/logo.png          logo original (conversion PNG sans perte du fichier fourni)
  watch/echos-aelith/     épisode 1 : s1e1-pov1..3.mp4 ; épisode 2 : s1e2.mp4 ;
                          extrait du hero : s1e2-extrait.mp4 (+ affiches -poster.webp)
  hero/ series/ universes/ avatars/   visuels SVG de remplacement
```

## Remplacer les visuels

Chaque série, slide, univers et avatar pointe vers un fichier local à nom stable (par ex. `public/series/lune-rousse.svg`). Pour mettre la vraie illustration, déposez le fichier dans `public/` et changez **un seul chemin** dans `data/mock.ts`. Les images raster (JPG, PNG, WebP) seront optimisées automatiquement par `next/image`.

Pour le hero, le champ `focus` (`object-position`) règle le recadrage, notamment en 4:5 sur mobile.

### Vidéo dans le hero : extrait du dernier épisode

La première diapositive joue automatiquement et en boucle un extrait du **dernier épisode** de sa série. Le hero le retrouve tout seul : il prend le champ `teaser` du dernier épisode (`getLatestEpisode`), donc publier un épisode 3 avec un `teaser` suffit à changer la vidéo de l'accueil. « Regarder maintenant » mène à ce même épisode (`/serie/echos-aelith?episode=2`).

- `s1e2-extrait.mp4` : 6 s de l'épisode 2 (de 2,5 s à 8,5 s), avec sa piste son. Elle est presque muette, comme celle de la vidéo fournie. La dernière demi-seconde de l'image et du son est fondue dans le début, ce qui rend la boucle continue.
- La vidéo démarre muette (obligatoire pour la lecture automatique). Le bouton en haut à droite de la bulle active ou coupe le son.
- L'affiche `s1e2-extrait-poster.webp` est montrée pendant le chargement et quand l'utilisateur a réduit les animations.
- La vidéo ne joue que sur la diapositive active et repart du début à chaque retour. La diapositive reste affichée 12 s, soit deux passages, au lieu de 7.
- Sur desktop et tablette, elle est cadrée à droite de la colonne de texte avec un fondu à gauche. Sur mobile, elle occupe le format 4:5.
- Le bouton pause reste visible sur cette diapositive, mobile compris (WCAG 2.2.2). Avec `prefers-reduced-motion`, la vidéo ne démarre pas.

Fabriquer un extrait bouclable de 6 s, ici à partir de 2,5 s :

```bash
ffmpeg -i episode.mp4 -filter_complex "[0:v]split[x][y];[x]trim=2.5:8.5,setpts=PTS-STARTPTS[a];[y]trim=2.0:2.5,setpts=PTS-STARTPTS[b];[a][b]xfade=transition=fade:duration=0.5:offset=5.5,format=yuv420p[v]" -map "[v]" -an -c:v libx264 -crf 24 -movflags +faststart extrait.mp4
```

## Page de visionnage et points de vue

`/serie/echos-aelith?episode=N` ouvre le lecteur de l'épisode N ; sans paramètre, c'est l'épisode 1. La liste des épisodes est sous le lecteur. Une série sans épisode vidéo affiche toujours « Bientôt disponible ». Les épisodes sont décrits dans `data/mock.ts` (`episodes`), avec un tableau `povs` : un point de vue par vidéo du même mouvement. Avec un seul point de vue, le sélecteur est masqué.

| Épisode | Vidéo | Points de vue |
| --- | --- | --- |
| 1 · Premier pas | `s1e1-pov1..3.mp4` (≈ 2,5 s) | 3 : Dos, Plan large, Profil |
| 2 · L'éveil | `s1e2.mp4` (12 s) | 1 : Caméra principale |

`s1e2.mp4` vient de la vidéo fournie pour le hero. La notification NVIDIA « Alt+Y » visible en haut à droite a été effacée : chaque colonne de la zone est un fondu vertical entre le ciel au-dessus et le ciel en dessous. L'image reste en 16:9 et rien n'est recadré.

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

## Page profil

`/profil` (menu du compte → Profil) permet de modifier :

- **La photo.** L'image choisie (JPEG, PNG, WebP, GIF ou AVIF, 8 Mo au plus) est recadrée au centre en carré de 256 px dans le navigateur (`resizeAvatar`), puis montrée en aperçu jusqu'à l'enregistrement. « Retirer » revient aux initiales.
- **Le nom affiché** (2 à 40 caractères).
- **Le pseudo.** Il est normalisé à la saisie : sans « @ », en minuscules, avec lettres, chiffres, « . » et « _ », sur 3 à 20 caractères.
- **L'e-mail et la présentation** (160 caractères au plus, avec compteur).
- **Les univers préférés et les notifications.**

Fonctionnement :

- Les erreurs s'affichent sous chaque champ, reliées par `aria-describedby`. À l'envoi, le focus va au premier champ en erreur.
- « Enregistrer » et « Annuler » ne s'activent que s'il y a des modifications. Le navigateur prévient si l'on quitte la page avec des modifications non enregistrées.
- Une fois enregistré, le profil s'applique aussitôt au header (photo, nom, menu). Il est conservé dans ce navigateur (`localStorage`, clé `cklayser:profil`) et relu avec validation au chargement.
- « Restaurer le profil de démonstration » efface ce stockage.
- En visiteur, la page invite à se connecter.

Aucun serveur : c'est une démonstration. Pour brancher une API, remplacer `saveProfile` dans `lib/app-state.tsx`.

## Sidebar rétractable

Disposition YouTube : le header occupe toute la largeur, avec le bouton menu (☰) et le logo à gauche, indépendants de la sidebar. La sidebar commence sous le header. L'état est partagé entre le header et la sidebar par `components/layout/SidebarContext.tsx`.

Le bouton menu fonctionne ainsi :

| Écran | Par défaut | Bouton menu |
| --- | --- | --- |
| Desktop (≥ 1280 px) | complète (252 px) | replie en rail de 76 px : icône au-dessus d'un libellé court, avatars des chaînes, icône Studio |
| Tablette (768 → 1279 px) | rail | ouvre la sidebar complète par-dessus le contenu, avec un voile. Échap, un clic sur le voile ou un changement de page la referment |
| Mobile | masquée | pas de bouton menu : logo réduit et navigation inférieure |

- Sur desktop, le choix est gardé un an dans le cookie `cklayser-sidebar`. Le serveur le lit et pose `data-sidebar` sur `<html>`, donc il n'y a pas de décalage au chargement.
- Les composants internes ne dépendent pas de la largeur d'écran : ils s'adaptent à la largeur réelle de la sidebar grâce à une requête de conteneur (`@container sidebar (max-width: 120px)`). Le même rail sert donc en mode replié et sur tablette.
- En rail, le libellé complet reste le nom accessible de chaque lien.

## Catalogues et chaînes

- **Découvrir** (`/decouvrir`) : les 16 séries du catalogue.
  - Filtres combinables : recherche (titre, histoire, chaîne), univers, technique 2D ou 3D, 3D interactif, nouveautés.
  - Tri : sélection, A → Z, nouveautés, nombre d'épisodes.
  - L'univers choisi est reporté dans l'URL, et le nombre de résultats est annoncé aux lecteurs d'écran.
- **Séries exclusives** (`/exclusives`) : avantages de l'adhésion, épisodes en avance, puis les exclusivités de chaque chaîne. Pour une chaîne dont on n'est pas adhérent, la carte indique « Réservé aux adhérents » et un bouton « Adhérer · prix/mois » est proposé.
- **Chaînes** (`/chaines`, `/chaine/[id]`) : boutons Suivre et Adhérer.
  - Les chaînes suivies s'affichent aussitôt dans la sidebar.
  - Suivis et adhésions sont gardés dans le navigateur (`cklayser:chaines-suivies`, `cklayser:adhesions`). C'est une démonstration : aucun paiement.
- Six séries ont été ajoutées pour remplir le catalogue. Leurs visuels SVG sont générés dans le même style que les autres.

## Fandoms & Forums

- `/fandoms` : six communautés par série (membres, en ligne) et huit discussions fictives.
  - Les catégories sont : théories, épisodes, fan art, technique et questions.
  - Les membres sont inventés, et les comptes officiels des chaînes portent le badge « Équipe ».
  - On peut filtrer par communauté ou par catégorie, et trier par récence, « j'aime » ou nombre de réponses.
- **Nouvelle discussion** : titre, communauté, catégorie et message. Une ligne vide sépare les paragraphes. Les champs sont validés et les erreurs sont reliées aux champs.
- `/fandoms/[id]` : message, réponses (avec un liseré doré pour l'équipe), « j'aime » sur chaque message, formulaire de réponse et suppression de ses propres sujets.
- Les contributions du membre (sujets, réponses, « j'aime ») sont gardées dans le navigateur (`cklayser:forum`). Les données fictives sont dans `data/forum.ts`. Les anciennetés y sont stockées en minutes, ce qui donne un affichage relatif identique côté serveur et côté navigateur.
- En visiteur, publier, répondre ou aimer ouvre la création de compte.

## Design system

- **Couleur d'action unique** : `--color-action` (`#924323`), c'est-à-dire la pastille active de la navigation. Elle est reprise par tous les boutons pleins et tous les états sélectionnés : bouton primaire (« Regarder maintenant », « Retour à l'accueil »…), bouton lecture du lecteur, point de vue actif, épisode en cours, pastilles de filtre, interrupteurs, badges « En avance » et « Exclusif », et indicateur actif du hero. Le survol utilise `--color-action-hover`, l'état pressé `--color-action-pressed`.
- Hero en bulle : `--radius-hero: 24px`, marges latérales du contenu, contour fin et ombre.
- Toutes les couleurs sont des variables de `app/globals.css`, regroupées par rôle : fonds, marque, accents relevés sur la capture, texte, badges, bordures lumineuses, ombres, typographie, layout, rayons, mouvement, z-index.
- Aucune valeur HEX dans les composants. Seule exception : `lib/theme.ts`, car `<meta name="theme-color">` n'accepte pas de variable CSS.
- Ratio des cartes : `--card-ratio: 16 / 10` (mesuré sur la capture). Passer à `16 / 9` ne demande qu'une ligne.
- Cascade CSS indépendante de l'ordre de chargement (qui change entre `dev` et `build`) :
  - reset de `globals.css` sous `:where()`, en spécificité nulle ;
  - base de chaque composant en spécificité de classe (0,1,0) ;
  - surcharge par un parent via `className` en (0,2,0), par exemple `.railWrap .scrollButton`.

## Accessibilité (WCAG 2.2 AA)

- Boutons pleins : fond `#924323` avec texte blanc (6,9:1). Survol `#A24E2C` (5,7:1) avec halo doré, état pressé `#7D3A1E` (8,4:1).
- Couleurs corrigées pour le contraste :

  | Élément | Capture | Ratio capture | Corrigé | Ratio corrigé |
  | --- | --- | --- | --- | --- |
  | Bouton primaire | `#C9542D` | 4,38:1 | `#924323` (couleur d'action) | 6,9:1 |
  | Badge « En avance » | `#C9572D` | 4,30:1 | `#924323` | 6,9:1 |
  | Placeholder de recherche | `#87756B` | 3,7:1 | `#9A8A7F` | 4,9:1 |

- Le voile du hero est calé en pixels sur la colonne de texte : 6,2:1 au minimum mesuré sur le rendu réel.
- Focus doré de 2 px partout, navigation clavier complète.
- Motifs ARIA : combobox (recherche), menu button (compte), carrousel (APG), bouton de menu `aria-expanded` / `aria-controls` (sidebar).
- Hero : bouton son (« Activer le son » / « Couper le son »). La vidéo démarre toujours muette, comme l'exigent les navigateurs pour la lecture automatique.
- `inert` sur les slides masquées. Pastilles toujours doublées d'un texte accessible. `prefers-reduced-motion` respecté (pas d'autoplay). Aucun texte sous 12 px.
