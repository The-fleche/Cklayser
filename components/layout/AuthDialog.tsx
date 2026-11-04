'use client';

/**
 * AuthDialog — fenêtres de démonstration « Se connecter » / « Créer un compte ».
 *
 * Rôle : simuler la connexion et l'inscription, sans backend ni vrai compte.
 * La validation du formulaire fait passer l'interface en état membre.
 *
 * Props : aucune (pilotée par authDialog dans AppStateProvider).
 *
 * États :
 *  - fermé / connexion / inscription ;
 *  - raison facultative affichée en tête (ex. : enregistrer une série) ;
 *  - champs requis validés nativement ; bascule entre les deux modes.
 * Accessibilité : <dialog> modal natif (focus piégé, Échap, retour du focus).
 */
import { X } from 'lucide-react';
import { useEffect, useId, useRef, type FormEvent } from 'react';
import { useAppState } from '@/lib/app-state';
import Button from '@/components/ui/Button';
import styles from './AuthDialog.module.css';

export default function AuthDialog() {
  const { authDialog, closeAuthDialog, completeAuth, openAuthDialog } = useAppState();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const baseId = useId();
  const titleId = `${baseId}-titre`;
  const isOpen = authDialog !== null;
  const mode = authDialog?.mode ?? 'login';

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    completeAuth();
  };

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby={titleId}
      onClose={closeAuthDialog}
      onCancel={(event) => {
        event.preventDefault();
        closeAuthDialog();
      }}
      // Clic sur le fond assombri : fermeture.
      onClick={(event) => {
        if (event.target === dialogRef.current) closeAuthDialog();
      }}
    >
      {isOpen ? (
        <div className={styles.panel}>
          <button type="button" className={styles.close} aria-label="Fermer" onClick={closeAuthDialog}>
            <X size={20} strokeWidth={2} aria-hidden="true" />
          </button>

          <p className={styles.kicker} lang="en">
            Our Clay, Your Keys.
          </p>
          <h2 id={titleId} className={styles.title}>
            {mode === 'login' ? 'Se connecter' : 'Créer un compte'}
          </h2>
          {authDialog?.reason ? <p className={styles.reason}>{authDialog.reason}</p> : null}

          <form className={styles.form} onSubmit={onSubmit}>
            {mode === 'signup' ? (
              <div className={styles.field}>
                <label htmlFor={`${baseId}-prenom`}>Prénom</label>
                <input id={`${baseId}-prenom`} name="prenom" autoComplete="given-name" required defaultValue="Inès" />
              </div>
            ) : null}
            <div className={styles.field}>
              <label htmlFor={`${baseId}-email`}>Adresse e-mail</label>
              <input
                id={`${baseId}-email`}
                name="email"
                type="email"
                autoComplete="email"
                required
                defaultValue="ines.morel@example.com"
              />
            </div>
            <div className={styles.field}>
              <label htmlFor={`${baseId}-mdp`}>Mot de passe</label>
              <input
                id={`${baseId}-mdp`}
                name="password"
                type="password"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                required
                minLength={4}
                defaultValue="demo"
              />
            </div>

            <Button type="submit" variant="primary" size="lg" fullWidth>
              {mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
            </Button>
          </form>

          <p className={styles.notice}>Démonstration : aucun compte n’est créé, aucune donnée n’est envoyée.</p>

          <p className={styles.switch}>
            {mode === 'login' ? 'Pas encore de compte ?' : 'Déjà membre ?'}{' '}
            <button
              type="button"
              className={styles.switchButton}
              onClick={() => openAuthDialog(mode === 'login' ? 'signup' : 'login', authDialog?.reason)}
            >
              {mode === 'login' ? 'Créer un compte' : 'Se connecter'}
            </button>
          </p>
        </div>
      ) : null}
    </dialog>
  );
}
