/**
 * ComingSoon — page « Bientôt disponible » aux couleurs de la marque.
 *
 * Rôle : destination des liens dont la page n'est pas encore construite
 * (/studio, /serie/[id], /decouvrir…), pour que toute la navigation reste
 * fonctionnelle.
 *
 * Props :
 *  - kicker       surtitre en capitales (JetBrains Mono)
 *  - title        titre éditorial (Fraunces)
 *  - description  paragraphe d'introduction
 *  - media        visuel facultatif (bandeau illustré)
 *  - highlights   points clés affichés en liste (puces en losange doré)
 *  - children     contenu complémentaire (badge, avatar…)
 *  - backHref / backLabel   lien de retour (accueil par défaut)
 *
 * États : aucun (composant serveur statique).
 */
import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import Button from './Button';
import KeyframeDiamond from './KeyframeDiamond';
import styles from './ComingSoon.module.css';

interface ComingSoonProps {
  kicker?: string;
  title: string;
  description: string;
  media?: ReactNode;
  highlights?: string[];
  children?: ReactNode;
  backHref?: string;
  backLabel?: string;
}

export default function ComingSoon({
  kicker = 'Bientôt disponible',
  title,
  description,
  media,
  highlights,
  children,
  backHref = '/',
  backLabel = 'Retour à l’accueil',
}: ComingSoonProps) {
  return (
    <div className={styles.page}>
      {media ? <div className={styles.media}>{media}</div> : null}

      <div className={styles.panel}>
        <p className={styles.kicker}>
          <KeyframeDiamond size={6} />
          {kicker}
        </p>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.description}>{description}</p>

        {children ? <div className={styles.extra}>{children}</div> : null}

        {highlights && highlights.length > 0 ? (
          <ul className={styles.highlights}>
            {highlights.map((item) => (
              <li key={item} className={styles.highlight}>
                <KeyframeDiamond size={6} glow={false} className={styles.bullet} />
                {item}
              </li>
            ))}
          </ul>
        ) : null}

        <div className={styles.actions}>
          <Button href={backHref} variant="primary" icon={<ArrowLeft size={18} strokeWidth={2} />}>
            {backLabel}
          </Button>
        </div>

        <p className={styles.signature} lang="en">
          Our Clay, Your Keys.
        </p>
      </div>

      {/* Ornement : arcs dorés et keyframes, en écho au décor de la sidebar. */}
      <svg className={styles.ornament} viewBox="0 0 400 200" aria-hidden="true" focusable="false">
        <path d="M0 150 C90 40 250 30 400 90" className={styles.arc} />
        <path d="M40 200 C140 120 260 120 380 170" className={styles.arc} />
        <rect x="-4" y="-4" width="8" height="8" rx="1.5" transform="translate(150 66) rotate(45)" className={styles.key} />
        <rect x="-4" y="-4" width="8" height="8" rx="1.5" transform="translate(300 135) rotate(45)" className={styles.key} />
      </svg>
    </div>
  );
}
