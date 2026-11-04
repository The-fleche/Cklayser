/**
 * Badge — étiquette d'état d'une série.
 *
 * Rôle : signaler « En avance », « Exclusif », « 3D interactif » ou
 * « Nouveau ». Une carte n'affiche qu'un seul badge (priorité calculée par
 * getPrimaryBadge dans lib/catalog.ts).
 *
 * Props :
 *  - kind  'early' | 'exclusive' | 'interactive3d' | 'new'
 *  - size  'sm' (cartes, 26 px de haut) | 'md' (hero, 33 px de haut)
 *
 * États : aucun (élément statique). Le texte est toujours visible : l'état
 * n'est jamais signalé par la couleur seule.
 */
import { Clock, createLucideIcon } from 'lucide-react';
import { badgeLabels } from '@/lib/catalog';
import type { BadgeKind } from '@/lib/types';
import styles from './Badge.module.css';

interface BadgeProps {
  kind: BadgeKind;
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * Icône « lecture cerclée » de Lucide avec ses deux tracés dans l'ordre
 * inverse (cercle puis triangle) : le disque plein ne recouvre plus le
 * triangle, qui reste visible en doré comme sur la capture.
 */
const ExclusiveIcon = createLucideIcon('circle-play-badge', [
  ['circle', { cx: '12', cy: '12', r: '10', key: 'disc' }],
  [
    'path',
    {
      d: 'M9 9.003a1 1 0 0 1 1.517-.859l4.997 2.997a1 1 0 0 1 0 1.718l-4.997 2.997A1 1 0 0 1 9 14.996z',
      key: 'triangle',
    },
  ],
]);

const kindClass: Record<BadgeKind, string> = {
  early: styles.early ?? '',
  exclusive: styles.exclusive ?? '',
  interactive3d: styles.interactive3d ?? '',
  new: styles.new ?? '',
};

export default function Badge({ kind, size = 'sm', className }: BadgeProps) {
  const iconSize = size === 'md' ? 20 : 16;

  return (
    <span className={[styles.badge, styles[size], kindClass[kind], className ?? ''].filter(Boolean).join(' ')}>
      {kind === 'early' ? <Clock size={iconSize} strokeWidth={2} aria-hidden="true" className={styles.icon} /> : null}
      {kind === 'exclusive' ? (
        <ExclusiveIcon size={iconSize} strokeWidth={2} aria-hidden="true" className={`${styles.icon} ${styles.exclusiveIcon}`} />
      ) : null}
      {badgeLabels[kind]}
    </span>
  );
}
