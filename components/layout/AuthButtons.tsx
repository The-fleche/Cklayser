'use client';

/**
 * AuthButtons — actions du header pour un visiteur non connecté.
 *
 * Rôle : sélecteur de langue (FR), « Se connecter » (pilule secondaire) et
 * « Créer un compte » (pilule primaire). Les deux boutons ouvrent la
 * fenêtre de démonstration (aucun vrai compte).
 *
 * Props :
 *  - compact  version mobile : seul « Se connecter » est affiché.
 *
 * États : sélecteur de langue fermé / ouvert (menu à choix unique ; l'anglais
 * est annoncé comme bientôt disponible et reste désactivé).
 */
import { Check, ChevronDown, Globe } from 'lucide-react';
import { useId, useRef, useState } from 'react';
import { useAppState } from '@/lib/app-state';
import { useDismiss } from '@/lib/hooks';
import Button from '@/components/ui/Button';
import styles from './AuthButtons.module.css';

function LanguageSelect() {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);

  useDismiss(
    [buttonRef, menuRef],
    (reason) => {
      setOpen(false);
      if (reason === 'escape') buttonRef.current?.focus();
    },
    open,
  );

  return (
    <div className={styles.language}>
      <button
        ref={buttonRef}
        type="button"
        className={styles.languageButton}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label="Langue : français"
        onClick={() => setOpen((value) => !value)}
      >
        <Globe size={18} strokeWidth={1.75} aria-hidden="true" />
        <span aria-hidden="true">FR</span>
        <ChevronDown size={16} strokeWidth={2} aria-hidden="true" className={styles.languageChevron} />
      </button>
      <ul ref={menuRef} id={menuId} role="menu" className={styles.languageMenu} hidden={!open}>
        <li role="none">
          <button
            type="button"
            role="menuitemradio"
            aria-checked="true"
            className={styles.languageItem}
            onClick={() => setOpen(false)}
          >
            Français
            <Check size={16} strokeWidth={2} aria-hidden="true" />
          </button>
        </li>
        <li role="none">
          <button type="button" role="menuitemradio" aria-checked="false" aria-disabled="true" className={styles.languageItem}>
            English <span className={styles.soon}>bientôt</span>
          </button>
        </li>
      </ul>
    </div>
  );
}

export default function AuthButtons({ compact = false }: { compact?: boolean }) {
  const { openAuthDialog } = useAppState();

  if (compact) {
    return (
      <Button variant="secondary" size="sm" onClick={() => openAuthDialog('login')}>
        Se connecter
      </Button>
    );
  }

  return (
    <div className={styles.group}>
      <LanguageSelect />
      <Button variant="secondary" size="sm" onClick={() => openAuthDialog('login')}>
        Se connecter
      </Button>
      <Button variant="primary" size="sm" onClick={() => openAuthDialog('signup')}>
        Créer un compte
      </Button>
    </div>
  );
}
