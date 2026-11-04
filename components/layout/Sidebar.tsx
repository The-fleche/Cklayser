'use client';

/**
 * Sidebar — colonne gauche fixe sous le header (desktop et tablette),
 * rétractable comme celle de YouTube.
 *
 * Rôle : navigation principale, chaînes suivies, accès au Studio et décor
 * organique. Le bouton menu (☰) et le logo sont dans le header (Topbar),
 * indépendants de la sidebar.
 *
 * Props : aucune (état partagé : SidebarContext).
 *
 * États :
 *  - complète (252 px) ou rail (76 px : icônes + libellés courts) sur
 *    desktop, selon le bouton menu ;
 *  - tablette : rail, ou tiroir complet par-dessus le contenu (+ voile) ;
 *  - mobile (< 768 px) : masquée, remplacée par MobileNav.
 * Les composants internes s'adaptent à la largeur réelle de la sidebar
 * (requêtes de conteneur « sidebar »).
 */
import FollowedChannels from './FollowedChannels';
import { SIDEBAR_ID, useSidebar } from './SidebarContext';
import SidebarDecor from './SidebarDecor';
import SidebarNav from './SidebarNav';
import StudioCard from './StudioCard';
import styles from './Sidebar.module.css';

export default function Sidebar() {
  const { drawerOpen, closeDrawer } = useSidebar();

  return (
    <>
      <aside id={SIDEBAR_ID} className={`${styles.sidebar} ${drawerOpen ? styles.drawer : ''}`} aria-label="Menu latéral">
        <div className={styles.content}>
          <SidebarNav />

          <hr className={styles.separator} />

          <FollowedChannels />

          <div className={styles.studio}>
            <StudioCard />
          </div>
        </div>

        <SidebarDecor />
      </aside>

      {drawerOpen ? (
        <button type="button" className={styles.scrim} aria-label="Fermer le menu" tabIndex={-1} onClick={closeDrawer} />
      ) : null}
    </>
  );
}
