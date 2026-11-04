'use client';

/**
 * Topbar — header supérieur, à droite de la sidebar.
 *
 * Rôle : recherche du catalogue et compte utilisateur.
 *
 * Props : aucune.
 *
 * États :
 *  - membre   cloche de notifications + avatar avec menu de compte ;
 *  - visiteur sélecteur de langue, « Se connecter », « Créer un compte » ;
 *  - mobile   header simplifié : logo réduit, icône de recherche (ouvre la
 *             recherche plein écran), avatar ou « Se connecter » ;
 *  - raccourci clavier « / » : place le focus dans la recherche (ou ouvre la
 *    recherche plein écran sur mobile), sauf si l'on écrit déjà dans un champ.
 * Le header est collant (sticky) : il reste accessible pendant le défilement.
 */
import { Search } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useAppState } from '@/lib/app-state';
import { isEditableTarget } from '@/lib/hooks';
import IconButton from '@/components/ui/IconButton';
import AuthButtons from './AuthButtons';
import NotificationsPanel from './NotificationsPanel';
import SearchBar from './SearchBar';
import SearchOverlay from './SearchOverlay';
import UserMenu from './UserMenu';
import styles from './Topbar.module.css';

const MOBILE_QUERY = '(max-width: 767px)';

export default function Topbar() {
  const { isMember } = useAppState();
  const inlineInputRef = useRef<HTMLInputElement>(null);
  const [overlayOpen, setOverlayOpen] = useState(false);

  // Raccourci « / » : focus de la recherche.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey) return;
      if (isEditableTarget(event.target)) return;
      event.preventDefault();
      if (window.matchMedia(MOBILE_QUERY).matches) {
        setOverlayOpen(true);
      } else {
        inlineInputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <header className={styles.topbar}>
      {/* Logo réduit : uniquement sur mobile (la sidebar le porte ailleurs). */}
      <Link href="/" className={styles.mobileLogo} aria-label="CKlayser, retour à l’accueil">
        <Image src="/brand/logo.png" alt="CKlayser" width={1467} height={720} sizes="96px" className={styles.mobileLogoImage} />
      </Link>

      <SearchBar variant="inline" inputRef={inlineInputRef} className={styles.search} />

      <div className={styles.actions}>
        <IconButton
          label="Rechercher"
          variant="plain"
          size={44}
          className={styles.mobileSearchButton}
          aria-haspopup="dialog"
          onClick={() => setOverlayOpen(true)}
        >
          <Search size={24} strokeWidth={1.75} />
        </IconButton>

        {isMember ? (
          <>
            <div className={styles.desktopOnly}>
              <NotificationsPanel />
            </div>
            <div className={styles.desktopOnly}>
              <UserMenu />
            </div>
            <div className={styles.mobileOnly}>
              <UserMenu compact />
            </div>
          </>
        ) : (
          <>
            <div className={styles.desktopOnly}>
              <AuthButtons />
            </div>
            <div className={styles.mobileOnly}>
              <AuthButtons compact />
            </div>
          </>
        )}
      </div>

      <SearchOverlay open={overlayOpen} onClose={() => setOverlayOpen(false)} />
    </header>
  );
}
