'use client';

/**
 * SearchOverlay — recherche plein écran (mobile).
 *
 * Rôle : rendre la recherche accessible sur petit écran, où la pilule du
 * header est masquée.
 *
 * Props :
 *  - open     affiche la fenêtre ;
 *  - onClose  ferme la fenêtre (bouton « Fermer », Échap, choix d'un résultat).
 *
 * États : fermé / ouvert. Fenêtre modale native (<dialog>) : le focus est
 * piégé à l'intérieur et rendu au déclencheur à la fermeture.
 */
import { ArrowLeft } from 'lucide-react';
import { useEffect, useRef } from 'react';
import SearchBar from './SearchBar';
import styles from './SearchOverlay.module.css';

interface SearchOverlayProps {
  open: boolean;
  onClose: () => void;
}

export default function SearchOverlay({ open, onClose }: SearchOverlayProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      // showModal() donne le focus au premier élément focalisable (le
      // bouton retour) : on le place explicitement dans le champ.
      inputRef.current?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className={styles.overlay}
      aria-label="Recherche"
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      {open ? (
        <div className={styles.inner}>
          <div className={styles.bar}>
            <button type="button" className={styles.close} onClick={onClose} aria-label="Fermer la recherche">
              <ArrowLeft size={22} strokeWidth={2} aria-hidden="true" />
            </button>
            <SearchBar variant="overlay" inputRef={inputRef} onNavigate={onClose} />
          </div>
          <p className={styles.hint}>Séries, univers, techniques d’animation ou créateurs.</p>
        </div>
      ) : null}
    </dialog>
  );
}
