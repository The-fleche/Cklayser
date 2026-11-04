'use client';

/**
 * Toast — confirmation brève des actions (Ma liste, connexion…).
 *
 * Rôle : afficher et annoncer (aria-live="polite") le dernier message émis
 * par AppStateProvider.announce().
 *
 * Props : aucune.
 * États : masqué / visible ; disparition automatique après 3,2 s.
 */
import { useEffect } from 'react';
import { useAppState } from '@/lib/app-state';
import styles from './Toast.module.css';

export default function Toast() {
  const { toast, dismissToast } = useAppState();

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(dismissToast, 3200);
    return () => window.clearTimeout(timer);
  }, [toast, dismissToast]);

  return (
    <div className={styles.region} role="status" aria-live="polite" aria-atomic="true">
      {toast ? (
        <p key={toast.id} className={styles.toast}>
          {toast.message}
        </p>
      ) : null}
    </div>
  );
}
