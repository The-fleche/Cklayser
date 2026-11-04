/**
 * Sidebar — colonne gauche fixe (desktop et tablette).
 *
 * Rôle : identité (logo original), navigation principale, chaînes suivies,
 * accès au Studio et décor organique. Ordre de haut en bas : logo,
 * navigation, séparateur, chaînes suivies, bouton Studio, décor inférieur.
 *
 * Props : aucune.
 *
 * États :
 *  - desktop (≥ 1280 px) : 252 px de large, toute la hauteur, fixe au défilement ;
 *  - tablette (768 → 1279 px) : 76 px, icônes seules avec infobulles ;
 *  - mobile (< 768 px) : masquée, remplacée par MobileNav.
 *
 * Logo : fichier original public/brand/logo.png affiché tel quel, ratio
 * d'origine (1467 × 720), sans filtre ni recadrage (règle n°2).
 */
import Image from 'next/image';
import Link from 'next/link';
import FollowedChannels from './FollowedChannels';
import SidebarDecor from './SidebarDecor';
import SidebarNav from './SidebarNav';
import StudioCard from './StudioCard';
import styles from './Sidebar.module.css';

export default function Sidebar() {
  return (
    <aside className={styles.sidebar} aria-label="Menu latéral">
      <div className={styles.content}>
        <Link href="/" className={styles.logoLink} aria-label="CKlayser, retour à l’accueil">
          <Image
            src="/brand/logo.png"
            alt="CKlayser"
            width={1467}
            height={720}
            sizes="(max-width: 1279px) 60px, 208px"
            preload
            className={styles.logo}
          />
        </Link>

        <SidebarNav />

        <hr className={styles.separator} />

        <FollowedChannels />

        <div className={styles.studio}>
          <StudioCard />
        </div>
      </div>

      <SidebarDecor />
    </aside>
  );
}
