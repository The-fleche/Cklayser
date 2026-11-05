'use client';

/**
 * StudioApp — point d'entrée de CKlayser Studio (route /studio).
 *
 * Crée le store central (projet enregistré dans ce navigateur, sinon projet
 * de démonstration) et choisit l'interface :
 *  - tablette et desktop (≥ 768 px) : éditeur complet (StudioLayout) ;
 *  - mobile : consultation des projets (MobileStudio).
 *
 * Rendu côté client uniquement : WebGL, stockage local et identifiants
 * générés n'existent pas au rendu serveur.
 */
import { useEffect, useState } from 'react';
import { StudioStore, StudioStoreContext, STUDIO_STORAGE_KEY, parseProject } from '@/lib/studio/store';
import MobileStudio from './MobileStudio';
import StudioLayout from './StudioLayout';
import styles from './StudioLayout.module.css';

const MOBILE_QUERY = '(max-width: 767px)';

function createStore(): StudioStore {
  try {
    const saved = window.localStorage.getItem(STUDIO_STORAGE_KEY);
    const project = saved ? parseProject(saved) : null;
    if (project) return new StudioStore(project, project.updatedAt || Date.now());
  } catch {
    /* stockage indisponible : projet de démonstration */
  }
  return new StudioStore();
}

export default function StudioApp() {
  const [mode, setMode] = useState<'pending' | 'mobile' | 'desktop'>('pending');

  useEffect(() => {
    const media = window.matchMedia(MOBILE_QUERY);
    const apply = () => setMode(media.matches ? 'mobile' : 'desktop');
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, []);

  if (mode === 'pending') {
    return (
      <div className={styles.loading} role="status">
        Chargement de CKlayser Studio…
      </div>
    );
  }
  return <StudioRoot mobile={mode === 'mobile'} />;
}

function StudioRoot({ mobile }: { mobile: boolean }) {
  const [store] = useState(createStore);

  useEffect(() => {
    // Prévient avant de quitter la page avec des modifications non enregistrées.
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (store.getState().saveState === 'dirty' && store.getState().canUndo) event.preventDefault();
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      store.pause();
    };
  }, [store]);

  return <StudioStoreContext value={store}>{mobile ? <MobileStudio /> : <StudioLayout />}</StudioStoreContext>;
}
