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
 *  - rail (sidebar repliée ou tablette) : icône au-dessus du libellé court,
 *    comme YouTube. Le libellé complet reste le nom accessible du lien.
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
        {NAV_ITEMS.map(({ href, label, shortLabel, icon: Icon, hasNews }) => {
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
                {/* Libellé court du rail, masqué pour les lecteurs d'écran
                    (le nom accessible reste le libellé complet). */}
                <span className={styles.shortLabel} aria-hidden="true">
                  {shortLabel}
                </span>
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
