'use client';

/**
 * UserMenu — avatar du membre connecté et menu de compte.
 *
 * Rôle : accès au profil, à Ma liste (séries enregistrées avec l'icône
 * signet des cartes), aux adhésions, au Studio, aux paramètres et à la
 * déconnexion.
 *
 * Props :
 *  - compact  version mobile : avatar seul, sans chevron.
 *
 * États :
 *  - fermé / ouvert (motif ARIA « menu button ») ; le chevron pivote ;
 *  - clavier : ↑ ↓ pour parcourir, Début/Fin, Échap pour fermer (focus rendu
 *    au bouton), Tab ferme le menu ;
 *  - clic extérieur : fermeture.
 */
import { BadgeCheck, Bookmark, ChevronDown, LogOut, Settings, User, WandSparkles } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { currentUser } from '@/data/mock';
import { useAppState } from '@/lib/app-state';
import { useDismiss } from '@/lib/hooks';
import Avatar from '@/components/ui/Avatar';
import styles from './UserMenu.module.css';

const USER_AVATAR = '/avatars/ines-morel.svg';

const LINKS = [
  { href: '/profil', label: 'Profil', icon: User },
  { href: '/ma-liste', label: 'Ma liste', icon: Bookmark },
  { href: '/adhesions', label: 'Mes adhésions', icon: BadgeCheck },
  { href: '/studio', label: 'Studio', icon: WandSparkles },
  { href: '/parametres', label: 'Paramètres', icon: Settings },
] as const;

export default function UserMenu({ compact = false }: { compact?: boolean }) {
  const { favorites, signOut } = useAppState();
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const buttonId = `${menuId}-bouton`;
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLElement | null>>([]);

  useDismiss(
    [buttonRef, panelRef],
    (reason) => {
      setOpen(false);
      if (reason === 'escape') buttonRef.current?.focus();
    },
    open,
  );

  // À l'ouverture, le focus va sur la première entrée (recommandation APG).
  useEffect(() => {
    if (open) itemRefs.current[0]?.focus();
  }, [open]);

  const focusItem = (index: number) => {
    const items = itemRefs.current.filter((item): item is HTMLElement => item !== null);
    if (items.length === 0) return;
    const next = (index + items.length) % items.length;
    items[next]?.focus();
  };

  const onMenuKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    const items = itemRefs.current.filter((item): item is HTMLElement => item !== null);
    const current = items.indexOf(document.activeElement as HTMLElement);
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        focusItem(current + 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        focusItem(current - 1);
        break;
      case 'Home':
        event.preventDefault();
        focusItem(0);
        break;
      case 'End':
        event.preventDefault();
        focusItem(items.length - 1);
        break;
      case 'Tab':
        setOpen(false);
        break;
      default:
        break;
    }
  };

  const close = () => setOpen(false);

  return (
    <div className={styles.wrapper}>
      <button
        ref={buttonRef}
        id={buttonId}
        type="button"
        className={`${styles.trigger} ${compact ? styles.compact : ''}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`Compte de ${currentUser.name}`}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' && !open) {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        <Avatar src={USER_AVATAR} size={compact ? 40 : 50} ring />
        {compact ? null : (
          <ChevronDown size={20} strokeWidth={2} aria-hidden="true" className={styles.chevron} />
        )}
      </button>

      <div ref={panelRef} className={styles.panel} hidden={!open}>
        <div className={styles.profile}>
          <Avatar src={USER_AVATAR} size={44} />
          <div className={styles.profileText}>
            <p className={styles.name}>{currentUser.name}</p>
            <p className={styles.plan}>{currentUser.plan}</p>
          </div>
        </div>

        <ul id={menuId} role="menu" aria-labelledby={buttonId} className={styles.menu} onKeyDown={onMenuKeyDown}>
          {LINKS.map(({ href, label, icon: Icon }, index) => (
            <li key={href} role="none">
              <Link
                ref={(element) => {
                  itemRefs.current[index] = element;
                }}
                href={href}
                role="menuitem"
                tabIndex={-1}
                className={styles.item}
                onClick={close}
              >
                <Icon size={19} strokeWidth={1.75} aria-hidden="true" className={styles.itemIcon} />
                <span className={styles.itemLabel}>{label}</span>
                {href === '/ma-liste' ? (
                  <span className={styles.count}>
                    {favorites.length}
                    <span className="sr-only"> série{favorites.length > 1 ? 's' : ''} enregistrée{favorites.length > 1 ? 's' : ''}</span>
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
          <li role="separator" className={styles.separator} />
          <li role="none">
            <button
              ref={(element) => {
                itemRefs.current[LINKS.length] = element;
              }}
              type="button"
              role="menuitem"
              tabIndex={-1}
              className={`${styles.item} ${styles.signOut}`}
              onClick={() => {
                close();
                signOut();
              }}
            >
              <LogOut size={19} strokeWidth={1.75} aria-hidden="true" className={styles.itemIcon} />
              <span className={styles.itemLabel}>Se déconnecter</span>
            </button>
          </li>
        </ul>
      </div>
    </div>
  );
}
