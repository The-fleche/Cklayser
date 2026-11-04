'use client';

/**
 * MobileNav — navigation inférieure fixe (mobile, < 768 px).
 *
 * Rôle : remplace la sidebar sur petit écran, avec les quatre mêmes entrées
 * (libellés courts).
 *
 * Props : aucune (entrée active déduite de l'URL).
 *
 * États : entrée active (couleur argile + trait supérieur + aria-current),
 * survol, focus clavier. La pastille « nouveautés » de « Exclusives » porte un
 * texte accessible. Masquée au-delà de 767 px.
 */
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_ITEMS, isNavItemActive } from './navItems';
import styles from './MobileNav.module.css';

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Navigation principale (mobile)" className={styles.mobileNav}>
      <ul className={styles.list}>
        {NAV_ITEMS.map(({ href, shortLabel, label, icon: Icon, hasNews }) => {
          const active = isNavItemActive(href, pathname);
          return (
            <li key={href} className={styles.entry}>
              <Link
                href={href}
                className={`${styles.item} ${active ? styles.active : ''}`}
                aria-current={active ? 'page' : undefined}
                aria-label={hasNews ? `${label}, nouveautés disponibles` : label}
              >
                <span className={styles.iconWrap}>
                  <Icon
                    size={22}
                    strokeWidth={1.75}
                    aria-hidden="true"
                    className={`${styles.icon} ${href === '/' ? styles.iconHouse : ''}`}
                  />
                  {hasNews ? <span className={styles.dot} aria-hidden="true" /> : null}
                </span>
                <span className={styles.label} aria-hidden="true">
                  {shortLabel}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
