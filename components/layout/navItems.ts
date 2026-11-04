/**
 * Entrées de la navigation principale, partagées par la sidebar (desktop,
 * tablette) et la navigation inférieure (mobile).
 */
import { createLucideIcon, Play, Star, Users, type LucideIcon } from 'lucide-react';

/**
 * Icône « maison » de Lucide, avec les deux tracés d'origine dans l'ordre
 * inverse (toit d'abord, porte ensuite). Remplie à l'état actif, la porte
 * peinte en dernier reste visible comme une découpe, comme sur la capture.
 */
const HouseIcon = createLucideIcon('house-door-last', [
  [
    'path',
    {
      d: 'M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
      key: 'house',
    },
  ],
  ['path', { d: 'M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8', key: 'door' }],
]);

export interface NavItem {
  href: string;
  /** Libellé complet (sidebar). */
  label: string;
  /** Libellé court (navigation mobile, place limitée). */
  shortLabel: string;
  icon: LucideIcon;
  /** Pastille « nouveautés disponibles ». */
  hasNews?: boolean;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { href: '/', label: 'Accueil', shortLabel: 'Accueil', icon: HouseIcon },
  { href: '/decouvrir', label: 'Découvrir', shortLabel: 'Découvrir', icon: Play },
  { href: '/exclusives', label: 'Séries Exclusives', shortLabel: 'Exclusives', icon: Star, hasNews: true },
  { href: '/fandoms', label: 'Fandoms & Forums', shortLabel: 'Fandoms', icon: Users },
];

/** Entrée active : correspondance exacte pour l'accueil, par préfixe sinon. */
export function isNavItemActive(href: string, pathname: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}
