'use client';

/**
 * StudioStatusBar — barre d'état en bas de l'éditeur.
 *
 * Message de la dernière action (annoncé aux lecteurs d'écran), composant
 * sélectionné, mode de vue, image courante et moteur de rendu.
 */
import { useEffect, useState } from 'react';
import { getActiveClip } from '@/lib/studio/animation';
import { getActiveScene, useStudio } from '@/lib/studio/store';
import styles from './StudioLayout.module.css';

const MODE_LABELS = { edit: 'Vue éditeur', camera: 'Vue caméra', preview: 'Aperçu du rendu' } as const;

export default function StudioStatusBar() {
  const message = useStudio((state) => state.message);
  const project = useStudio((state) => state.project);
  const selectedId = useStudio((state) => state.selectedId);
  const viewMode = useStudio((state) => state.viewMode);
  const autoKey = useStudio((state) => state.autoKey);
  const frame = useStudio((state) => Math.round(state.frame));
  const scene = getActiveScene(project);
  const clip = getActiveClip(scene);
  const selected = selectedId ? scene.nodes[selectedId] : undefined;
  const [visible, setVisible] = useState<typeof message>(null);

  useEffect(() => {
    if (!message) return undefined;
    setVisible(message);
    const timer = window.setTimeout(() => setVisible(null), 5000);
    return () => window.clearTimeout(timer);
  }, [message]);

  return (
    <footer className={styles.statusBar}>
      <p className={`${styles.statusMessage} ${visible?.tone === 'error' ? styles.statusError : ''}`} role="status" aria-live="polite">
        {visible?.text ?? 'Prêt.'}
      </p>
      <dl className={styles.statusFacts}>
        <div>
          <dt>Sélection</dt>
          <dd>{selected ? selected.name : 'aucune'}</dd>
        </div>
        <div>
          <dt>Mode</dt>
          <dd>{MODE_LABELS[viewMode]}</dd>
        </div>
        {autoKey ? (
          <div className={styles.statusRecord}>
            <dt className="sr-only">Enregistrement</dt>
            <dd>● Enregistrement auto</dd>
          </div>
        ) : null}
        <div>
          <dt>Image</dt>
          <dd>
            {frame} / {clip?.duration ?? 0} · {clip?.fps ?? 24} i/s
          </dd>
        </div>
        <div>
          <dt>Scène</dt>
          <dd>{scene.dimension.toUpperCase()} · {Object.keys(scene.nodes).length} composants</dd>
        </div>
        <div className={styles.statusEngine}>
          <dt className="sr-only">Rendu</dt>
          <dd>three.js · WebGL</dd>
        </div>
      </dl>
    </footer>
  );
}
