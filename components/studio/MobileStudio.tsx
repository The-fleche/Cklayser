'use client';

/**
 * MobileStudio — CKlayser Studio sur téléphone (< 768 px).
 *
 * L'éditeur complet n'est pas reproduit : un message l'indique, et le
 * créateur garde l'accès à ses projets en consultation (scènes, aperçu du
 * rendu final par la caméra principale, lecture du clip, composants).
 */
import { Monitor, Pause, Play } from 'lucide-react';
import Link from 'next/link';
import { useEffect } from 'react';
import { formatTimecode, getActiveClip } from '@/lib/studio/animation';
import { flattenTree, getActiveScene, useStudio, useStudioStore } from '@/lib/studio/store';
import { nodeIcon, nodeTypeLabel } from './nodeMeta';
import SceneViewport from './SceneViewport';
import styles from './MobileStudio.module.css';

export default function MobileStudio() {
  const store = useStudioStore();
  const project = useStudio((state) => state.project);
  const playing = useStudio((state) => state.playing);
  const frame = useStudio((state) => state.frame);
  const lastSavedAt = useStudio((state) => state.lastSavedAt);
  const scene = getActiveScene(project);
  const clip = getActiveClip(scene)!;

  useEffect(() => {
    store.setViewMode('preview');
  }, [store, scene.id]);

  return (
    <div className={styles.mobile}>
      <header className={styles.intro}>
        <p className={styles.kicker}>CKlayser Studio</p>
        <h1 className={styles.title}>Vos projets, en consultation</h1>
        <div className={styles.notice} role="note">
          <Monitor size={20} strokeWidth={2} aria-hidden="true" />
          <p>
            La création complète (hiérarchie, viewport, timeline, keyframes) nécessite un écran plus grand : ouvrez le Studio sur une
            tablette ou un ordinateur. Ici, vous pouvez parcourir vos scènes et lire leurs animations.
          </p>
        </div>
      </header>

      <section className={styles.card} aria-labelledby="mobile-projet">
        <h2 id="mobile-projet" className={styles.projectName}>
          {project.name}
        </h2>
        <p className={styles.meta}>
          {project.scenes.length} scène{project.scenes.length > 1 ? 's' : ''}
          {lastSavedAt ? ` · enregistré le ${new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(lastSavedAt)}` : ' · projet de démonstration'}
        </p>
        <div className={styles.scenes} role="radiogroup" aria-label="Scène affichée">
          {project.scenes.map((item) => (
            <button key={item.id} type="button" role="radio" aria-checked={item.id === scene.id} className={styles.scene} onClick={() => store.setActiveScene(item.id)}>
              <span className={styles.dimension}>{item.dimension.toUpperCase()}</span>
              {item.name}
            </button>
          ))}
        </div>
      </section>

      <section className={styles.preview} aria-label={`Aperçu de ${scene.name}`}>
        <div className={styles.viewport}>
          <SceneViewport readOnly embedded />
        </div>
        <div className={styles.player}>
          <button type="button" className={styles.play} aria-label={playing ? 'Pause' : 'Lire l’animation'} onClick={store.togglePlay}>
            {playing ? <Pause size={18} fill="currentColor" aria-hidden="true" /> : <Play size={18} fill="currentColor" aria-hidden="true" />}
          </button>
          <input
            type="range"
            className={styles.range}
            min={0}
            max={clip.duration}
            step={1}
            value={Math.round(frame)}
            aria-label="Position dans le clip"
            aria-valuetext={`Image ${Math.round(frame)} sur ${clip.duration}`}
            onChange={(event) => {
              store.pause();
              store.setFrame(Number(event.target.value));
            }}
          />
          <span className={styles.time}>
            {formatTimecode(frame, clip.fps)} / {formatTimecode(clip.duration, clip.fps)}
          </span>
        </div>
        <p className={styles.meta}>
          Clip « {clip.name} » · {clip.fps} i/s · caméra {scene.viewer.mainCameraId ? scene.nodes[scene.viewer.mainCameraId]?.name : 'non définie'}
        </p>
      </section>

      <details className={styles.card}>
        <summary className={styles.summary}>Composants de la scène ({Object.keys(scene.nodes).length - 1})</summary>
        <ul className={styles.tree}>
          {flattenTree(scene).slice(1).map(({ node, depth }) => {
            const Icon = nodeIcon(node, scene.nodes);
            return (
              <li key={node.id} style={{ paddingLeft: (depth - 1) * 14 }}>
                <Icon size={14} strokeWidth={2} aria-hidden="true" />
                <span>{node.name}</span>
                <span className={styles.type}>{nodeTypeLabel(node, scene.dimension)}</span>
              </li>
            );
          })}
        </ul>
      </details>

      <Link href="/" className={styles.back}>
        Retour à l’accueil
      </Link>
    </div>
  );
}
