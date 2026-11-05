'use client';

/**
 * Panel — cadre commun des panneaux du Studio (hiérarchie, assets,
 * inspecteur, timeline) : en-tête (icône, titre, actions, bouton de
 * réduction) et corps défilant.
 *
 * Props :
 *  - collapsed / onToggleCollapsed  panneau réduit à son en-tête (ou, pour
 *    les colonnes latérales, à une bande verticale d'icône)
 *  - side  « left » / « right » / « bottom » : sens de la réduction
 */
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from 'lucide-react';
import { useId, type ReactNode } from 'react';
import styles from './Panel.module.css';

interface PanelProps {
  title: string;
  icon: ReactNode;
  side: 'left' | 'right' | 'bottom' | 'stack';
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  /** Région de repère : <section> nommée par son titre. */
  regionLabel?: string;
}

export default function Panel({ title, icon, side, collapsed, onToggleCollapsed, actions, children, className, bodyClassName, regionLabel }: PanelProps) {
  const id = useId();
  const verticalStrip = collapsed && (side === 'left' || side === 'right');
  const CollapseIcon =
    side === 'left' ? (collapsed ? ChevronRight : ChevronLeft) : side === 'right' ? (collapsed ? ChevronLeft : ChevronRight) : collapsed ? ChevronUp : ChevronDown;
  const collapseLabel = `${collapsed ? 'Afficher' : 'Réduire'} le panneau ${title}`;

  if (verticalStrip) {
    return (
      <section className={`${styles.panel} ${styles.strip}`} aria-label={regionLabel ?? title}>
        <button type="button" className={styles.stripButton} aria-expanded={false} aria-label={collapseLabel} data-tip={collapseLabel} onClick={onToggleCollapsed}>
          <CollapseIcon size={16} strokeWidth={2} aria-hidden="true" />
          <span className={styles.stripIcon} aria-hidden="true">
            {icon}
          </span>
          <span className={styles.stripTitle} aria-hidden="true">
            {title}
          </span>
        </button>
      </section>
    );
  }

  return (
    <section className={`${styles.panel} ${collapsed ? styles.collapsed : ''} ${className ?? ''}`} aria-labelledby={`${id}-titre`}>
      <header className={styles.header}>
        <h2 id={`${id}-titre`} className={styles.title}>
          <span className={styles.titleIcon} aria-hidden="true">
            {icon}
          </span>
          {title}
        </h2>
        <div className={styles.actions}>
          {collapsed ? null : actions}
          {onToggleCollapsed ? (
            <button
              type="button"
              className={styles.collapse}
              aria-expanded={!collapsed}
              aria-label={collapseLabel}
              data-tip={collapseLabel}
              onClick={onToggleCollapsed}
            >
              <CollapseIcon size={15} strokeWidth={2} aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </header>
      {collapsed ? null : <div className={`${styles.body} ${bodyClassName ?? ''}`}>{children}</div>}
    </section>
  );
}
