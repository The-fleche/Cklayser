'use client';

/**
 * SidebarNav — navigation principale de la sidebar.
 *
 * Rôle : quatre entrées (Accueil, Découvrir, Séries Exclusives, Fandoms &
 * Forums), chacune avec une icône Lucide au trait fin et un libellé.
 *
 * Props : aucune (l'entrée active est déduite de l'URL).
 *
 * États :
 *  - active  fond terracotta, texte ivoire, icône claire pleine, coins arrondis
 *            (aria-current="page") ;
 *  - survol  fond légèrement plus clair, transition douce ;
 *  - focus   anneau doré ;
 *  - tablette (76 px) : icônes seules, libellé affiché en infobulle au survol
 *    et au focus (le libellé reste le nom accessible du lien).
 * La pastille de « Séries Exclusives » porte un texte accessible.
 */
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_ITEMS, isNavItemActive } from './navItems';
import styles from './SidebarNav.module.css';

export default function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Navigation principale" className={styles.nav}>
      <ul className={styles.list}>
        {NAV_ITEMS.map(({ href, label, icon: Icon, hasNews }) => {
          const active = isNavItemActive(href, pathname);
          return (
            <li key={href}>
              <Link
                href={href}
                className={`${styles.item} ${active ? styles.active : ''}`}
                aria-current={active ? 'page' : undefined}
              >
                <Icon
                  size={26}
                  strokeWidth={1.75}
                  aria-hidden="true"
                  className={`${styles.icon} ${href === '/' ? styles.iconHouse : ''}`}
                />
                <span className={styles.label}>{label}</span>
                {hasNews ? (
                  <span className={styles.newsDot}>
                    <span className="sr-only">, nouveautés disponibles</span>
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
