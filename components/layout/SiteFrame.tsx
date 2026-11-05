'use client';

/**
 * SiteFrame — adapte le squelette du site à la route courante.
 *
 * Sur /studio (tablette et desktop), CKlayser Studio occupe toute la
 * fenêtre : le header, la sidebar et la navigation mobile du site sont
 * retirés de l'affichage (le Studio a sa propre barre, avec le logo qui
 * ramène à l'accueil). Sur mobile, le site reste navigable normalement : le
 * Studio n'y propose que la consultation des projets.
 *
 * Composants :
 *  - SiteChrome   enveloppe header + sidebar + navigation mobile ;
 *  - SiteColumn   colonne du contenu (décalage de la sidebar, ou plein écran).
 */
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import styles from '@/app/layout.module.css';

export function useIsStudioRoute(): boolean {
  const pathname = usePathname();
  return pathname === '/studio' || pathname.startsWith('/studio/');
}

export function SiteChrome({ children }: { children: ReactNode }) {
  const studio = useIsStudioRoute();
  return <div className={studio ? styles.chromeStudio : styles.chrome}>{children}</div>;
}

export function SiteColumn({ children }: { children: ReactNode }) {
  const studio = useIsStudioRoute();
  return <div className={`${styles.column} ${studio ? styles.columnStudio : ''}`}>{children}</div>;
}
