'use client';

/**
 * Sidebar — colonne gauche fixe (desktop et tablette), rétractable.
 *
 * Rôle : identité (logo original), navigation principale, chaînes suivies,
 * accès au Studio et décor organique. Ordre de haut en bas : bouton menu +
 * logo, navigation, séparateur, chaînes suivies, bouton Studio, décor.
 *
 * Props :
 *  - initialCollapsed  préférence lue côté serveur dans le cookie
 *                      « cklayser-sidebar » (pas de clignotement au chargement)
 *
 * États (bouton « burger », comme YouTube) :
 *  - desktop (≥ 1280 px) : complète (252 px) ou repliée en rail (76 px,
 *    icônes + libellés courts). Le choix est mémorisé (cookie, 1 an) ;
 *  - tablette (768 → 1279 px) : rail par défaut ; le bouton ouvre la sidebar
 *    complète PAR-DESSUS le contenu (tiroir + voile). Échap, un clic sur le
 *    voile ou un changement de page la referment ;
 *  - mobile (< 768 px) : masquée, remplacée par MobileNav.
 *
 * Mise en page : la largeur réservée au contenu (--sidebar-width) dépend de
 * l'attribut data-sidebar de <html>. Les composants internes s'adaptent à la
 * largeur réelle de la sidebar (requêtes de conteneur « sidebar »).
 *
 * Logo : fichier original public/brand/logo.png affiché tel quel, ratio
 * d'origine (1467 × 720), sans filtre ni recadrage (règle n°2).
 */
import { Menu } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useMediaQuery } from '@/lib/hooks';
import { SIDEBAR_COOKIE } from '@/lib/sidebar';
import FollowedChannels from './FollowedChannels';
import SidebarDecor from './SidebarDecor';
import SidebarNav from './SidebarNav';
import StudioCard from './StudioCard';
import styles from './Sidebar.module.css';

const SIDEBAR_ID = 'menu-lateral';

export default function Sidebar({ initialCollapsed = false }: { initialCollapsed?: boolean }) {
  const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1279px)');
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const burgerRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();

  const expanded = isTablet ? drawerOpen : !collapsed;

  const toggle = useCallback(() => {
    if (isTablet) {
      setDrawerOpen((open) => !open);
      return;
    }
    setCollapsed((value) => {
      const next = !value;
      document.documentElement.dataset.sidebar = next ? 'collapsed' : 'expanded';
      document.cookie = `${SIDEBAR_COOKIE}=${next ? 'collapsed' : 'expanded'}; path=/; max-age=31536000; samesite=lax`;
      return next;
    });
  }, [isTablet]);

  // Le tiroir se referme à chaque changement de page et en quittant la tablette.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setDrawerOpen(false);
  }
  if (!isTablet && drawerOpen) setDrawerOpen(false);

  useEffect(() => {
    document.documentElement.dataset.drawer = drawerOpen ? 'open' : 'closed';
    if (!drawerOpen) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setDrawerOpen(false);
        burgerRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [drawerOpen]);

  return (
    <>
      <aside
        id={SIDEBAR_ID}
        className={`${styles.sidebar} ${drawerOpen ? styles.drawer : ''}`}
        aria-label="Menu latéral"
      >
        <div className={styles.content}>
          <div className={styles.top}>
            <button
              ref={burgerRef}
              type="button"
              className={styles.burger}
              aria-controls={SIDEBAR_ID}
              aria-expanded={expanded}
              aria-label={expanded ? 'Réduire le menu' : 'Afficher le menu complet'}
              onClick={toggle}
            >
              <Menu size={24} strokeWidth={2} aria-hidden="true" />
            </button>
            <Link href="/" className={styles.logoLink} aria-label="CKlayser, retour à l’accueil">
              <Image
                src="/brand/logo.png"
                alt="CKlayser"
                width={1467}
                height={720}
                sizes="176px"
                preload
                className={styles.logo}
              />
            </Link>
          </div>

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
        <button
          type="button"
          className={styles.scrim}
          aria-label="Fermer le menu"
          tabIndex={-1}
          onClick={() => setDrawerOpen(false)}
        />
      ) : null}
    </>
  );
}
