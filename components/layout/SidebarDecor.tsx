/**
 * SidebarDecor — décor organique en bas de la sidebar.
 *
 * Rôle : signature visuelle « Warm outside » — une silhouette d'argile
 * (profil de jarre) en trois couches terracotta / brique / brique profonde,
 * texture de grain, arcs fins dorés et deux losanges évoquant des keyframes.
 * Le tracé reprend les points relevés sur la capture (repère 252 × 290 px,
 * soit la zone x 0 → 252, y 651 → 941 de la maquette).
 *
 * Props : aucune.
 * États : aucun. Toujours derrière le contenu, aria-hidden,
 * pointer-events: none ; il occupe uniquement l'espace libre sous la carte
 * Studio et ne passe donc jamais sous du texte.
 */
import styles from './SidebarDecor.module.css';

/* Silhouette : épaule (y ≈ 94), col resserré (x ≈ 95 à y ≈ 180),
   puis panse qui s'évase jusqu'à x ≈ 238 en bas. */
const SILHOUETTE =
  'M0 94 C32 91 66 96 84 107 C98 116 101 128 101 142 C101 158 95 168 95 182 ' +
  'C95 197 101 207 113 216 C130 228 160 233 192 239 C221 246 236 262 238 290 L0 290 Z';

/* Couche brique : tout ce qui se trouve sous la ligne y ≈ 186 → 200. */
const BRICK_LAYER = 'M0 186 C38 186 78 190 118 200 C170 213 220 228 260 236 L260 300 L0 300 Z';

/* Couche profonde : diagonale du bord gauche (y ≈ 237) vers le bas (x ≈ 150). */
const DEEP_LAYER = 'M0 236 C46 242 104 260 152 300 L0 300 Z';

/* Arcs dorés : ils naissent ou disparaissent derrière la silhouette. */
const ARC_TOP = 'M-2 14 C70 17 135 49 133 87 C132 109 118 121 99 132';
const ARC_BOTTOM = 'M98 199 C124 168 160 150 189 143 C215 137 236 133 254 132';

/* Veines claires très discrètes dans l'argile. */
const VEINS = [
  'M8 118 C30 112 52 116 70 126',
  'M14 150 C34 146 58 151 80 162',
  'M120 252 C150 250 178 256 206 270',
];

export default function SidebarDecor() {
  return (
    <div className={styles.decor} aria-hidden="true">
      <svg
        className={styles.svg}
        viewBox="0 0 252 290"
        preserveAspectRatio="xMinYMax meet"
        focusable="false"
      >
        <defs>
          <linearGradient id="sd-clay" x1="0" y1="0" x2="0.55" y2="1">
            <stop offset="0" className={styles.stopClay} />
            <stop offset="1" className={styles.stopClay2} />
          </linearGradient>
          <linearGradient id="sd-brick" x1="0" y1="0" x2="1" y2="0.35">
            <stop offset="0" className={styles.stopBrick} />
            <stop offset="1" className={styles.stopBrick2} />
          </linearGradient>
          <linearGradient id="sd-deep" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" className={styles.stopDeep} />
            <stop offset="1" className={styles.stopDeep2} />
          </linearGradient>
          <clipPath id="sd-silhouette">
            <path d={SILHOUETTE} />
          </clipPath>
          {/* Grain fin : bruit fractal désaturé, appliqué en lumière douce. */}
          <filter id="sd-grain" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.95" numOctaves="2" seed="11" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
            <feComponentTransfer>
              <feFuncA type="table" tableValues="0 0.55" />
            </feComponentTransfer>
          </filter>
          {/* Marbrure large : variations lentes de teinte, façon argile cuite. */}
          <filter id="sd-mottle" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="3" seed="4" />
            <feColorMatrix type="saturate" values="0" />
            <feComponentTransfer>
              <feFuncA type="table" tableValues="0 0.5" />
            </feComponentTransfer>
          </filter>
        </defs>

        {/* 1. Arcs (dessinés d'abord : ils passent derrière l'argile). */}
        <path d={ARC_TOP} className={styles.arc} />
        <path d={ARC_BOTTOM} className={styles.arc} />

        {/* 2. Argile en trois couches superposées, découpées par la silhouette. */}
        <g clipPath="url(#sd-silhouette)">
          <rect width="252" height="290" fill="url(#sd-clay)" />
          <path d={BRICK_LAYER} fill="url(#sd-brick)" />
          <path d={DEEP_LAYER} fill="url(#sd-deep)" />
          {VEINS.map((d) => (
            <path key={d} d={d} className={styles.vein} />
          ))}
          <rect width="252" height="290" filter="url(#sd-mottle)" className={styles.mottle} />
          <rect width="252" height="290" filter="url(#sd-grain)" className={styles.grain} />
        </g>

        {/* 3. Keyframes : losange cerclé (haut) et losange plein (bas). */}
        <g className={styles.keyframe} transform="translate(104 47) rotate(45)">
          <rect x="-4.6" y="-4.6" width="9.2" height="9.2" rx="1.6" className={styles.keyframeRing} />
          <rect x="-1.8" y="-1.8" width="3.6" height="3.6" rx="0.6" className={styles.keyframeCore} />
        </g>
        <g className={styles.keyframe} transform="translate(189 143) rotate(45)">
          <rect x="-4.3" y="-4.3" width="8.6" height="8.6" rx="1.2" className={styles.keyframeSolid} />
        </g>
      </svg>
    </div>
  );
}
