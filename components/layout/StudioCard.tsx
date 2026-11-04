/**
 * StudioCard — carte compacte « Découvrir le Studio ».
 *
 * Rôle : passerelle vers CKlayser Studio, le logiciel de création
 * (lien /studio).
 *
 * Props : aucune.
 *
 * États :
 *  - repos    fond brun légèrement plus clair que la sidebar, bordure
 *             brun-ocre fine, coins arrondis ;
 *  - survol   halo doré discret ;
 *  - focus    anneau doré ;
 *  - tablette réduite à son icône (le texte reste le nom accessible et
 *             s'affiche en infobulle).
 */
import { ExternalLink, WandSparkles } from 'lucide-react';
import Link from 'next/link';
import styles from './StudioCard.module.css';

export default function StudioCard() {
  return (
    <Link href="/studio" className={styles.card}>
      <WandSparkles size={22} strokeWidth={1.75} aria-hidden="true" className={styles.icon} />
      <span className={styles.text}>
        <span className={styles.title}>Découvrir le Studio</span>
        <span className={styles.subtitle}>Créez. Animez. Publiez.</span>
      </span>
      <ExternalLink size={16} strokeWidth={1.75} aria-hidden="true" className={styles.external} />
    </Link>
  );
}
