'use client';

/**
 * SceneProperties — propriétés de la scène (racine sélectionnée) et
 * CAMÉRAS DU SPECTATEUR :
 *  - caméra principale de diffusion ;
 *  - points de vue proposés (ordre, libellés) et transition entre eux ;
 *  - caméra libre (scènes 3D) : cible et limites de distance et d'angle.
 *    La caméra libre appartient au lecteur public : le Studio n'en définit
 *    que les limites, visualisées dans le viewport (sphères orange) quand
 *    la racine est sélectionnée.
 */
import { ArrowDown, ArrowUp, X } from 'lucide-react';
import { useActiveScene, useStudioStore } from '@/lib/studio/store';
import { ColorField, Note, NumberField, Section, SelectField, Toggle } from './ui';
import styles from './Inspector.module.css';

export default function SceneProperties() {
  const store = useStudioStore();
  const scene = useActiveScene();
  const cameras = Object.values(scene.nodes).filter((node) => node.kind === 'camera');
  const viewer = scene.viewer;
  const free = viewer.freeCamera;
  const gesture = { onGestureStart: () => store.beginGesture(), onGestureEnd: () => store.endGesture() };

  const movePov = (index: number, delta: number) =>
    store.updateViewer((draft) => {
      const target = index + delta;
      if (target < 0 || target >= draft.povs.length) return;
      const [item] = draft.povs.splice(index, 1);
      if (item) draft.povs.splice(target, 0, item);
    });

  return (
    <>
      <Section title="Scène">
        <dl className={styles.facts}>
          <div>
            <dt>Type</dt>
            <dd>Scène {scene.dimension.toUpperCase()}</dd>
          </div>
          <div>
            <dt>Composants</dt>
            <dd>{Object.keys(scene.nodes).length - 1}</dd>
          </div>
          <div>
            <dt>Clips</dt>
            <dd>{scene.clips.length}</dd>
          </div>
        </dl>
        <ColorField
          label="Fond"
          value={scene.background}
          onChange={(color) =>
            store.edit((draft) => {
              draft.background = color;
            }, { keepOverrides: true })
          }
        />
      </Section>

      <Section title="Caméras du spectateur">
        <SelectField
          label="Principale"
          value={viewer.mainCameraId ?? ''}
          options={[{ value: '', label: 'Aucune' }, ...cameras.map((camera) => ({ value: camera.id, label: camera.name }))]}
          onChange={(value) => store.updateViewer((draft) => void (draft.mainCameraId = value || null))}
        />
        <p className={styles.subheading}>Points de vue proposés ({viewer.povs.length})</p>
        {viewer.povs.length === 0 ? (
          <Note>Aucun point de vue : le spectateur ne voit que la caméra principale. Activez « Point de vue proposé » sur une caméra.</Note>
        ) : (
          <ol className={styles.povList}>
            {viewer.povs.map((pov, index) => (
              <li key={pov.cameraId} className={styles.pov}>
                <span className={styles.povIndex}>{index + 1}</span>
                <button type="button" className={styles.inlineLink} onClick={() => store.select(pov.cameraId)}>
                  {pov.label}
                </button>
                <span className={styles.boneMeta}>{scene.nodes[pov.cameraId]?.name}</span>
                <span className={styles.povActions}>
                  <button type="button" className={styles.miniAction} aria-label={`Monter ${pov.label}`} disabled={index === 0} onClick={() => movePov(index, -1)}>
                    <ArrowUp size={13} strokeWidth={2} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className={styles.miniAction}
                    aria-label={`Descendre ${pov.label}`}
                    disabled={index === viewer.povs.length - 1}
                    onClick={() => movePov(index, 1)}
                  >
                    <ArrowDown size={13} strokeWidth={2} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className={styles.miniAction}
                    aria-label={`Retirer ${pov.label}`}
                    onClick={() => store.updateViewer((draft) => void (draft.povs = draft.povs.filter((item) => item.cameraId !== pov.cameraId)))}
                  >
                    <X size={13} strokeWidth={2} aria-hidden="true" />
                  </button>
                </span>
              </li>
            ))}
          </ol>
        )}
        <div className={styles.pair}>
          <SelectField
            label="Transition"
            value={viewer.transition.type}
            options={[
              { value: 'cut', label: 'Coupe franche' },
              { value: 'fade', label: 'Fondu' },
              { value: 'blend', label: 'Mouvement fluide' },
            ]}
            onChange={(type) => store.updateViewer((draft) => void (draft.transition.type = type))}
          />
        </div>
        {viewer.transition.type !== 'cut' ? (
          <NumberField
            label="Durée de transition (s)"
            short="s"
            value={viewer.transition.duration}
            min={0.1}
            max={5}
            step={0.1}
            unit="s"
            onChange={(value) => store.updateViewer((draft) => void (draft.transition.duration = value))}
            {...gesture}
          />
        ) : null}
      </Section>

      {scene.dimension === '3d' ? (
        <Section title="Caméra libre du spectateur">
          <Toggle
            label="Autoriser la caméra libre"
            hint="Le spectateur tourne autour de la scène dans le lecteur"
            checked={free.enabled}
            onChange={(enabled) => store.updateViewer((draft) => void (draft.freeCamera.enabled = enabled))}
          />
          {free.enabled ? (
            <>
              <p className={styles.subheading}>Point visé</p>
              <div className={styles.triple}>
                {(['X', 'Y', 'Z'] as const).map((axis, index) => (
                  <NumberField
                    key={axis}
                    label={`Cible ${axis}`}
                    short={axis}
                    axis={axis.toLowerCase() as 'x' | 'y' | 'z'}
                    value={free.target[index] ?? 0}
                    step={0.1}
                    onChange={(value) => store.updateViewer((draft) => void (draft.freeCamera.target[index] = value))}
                    {...gesture}
                  />
                ))}
              </div>
              <p className={styles.subheading}>Distance (min · max)</p>
              <div className={styles.pair}>
                <NumberField label="Distance minimale" short="↓" value={free.minDistance} min={0.5} max={free.maxDistance} step={0.1} onChange={(value) => store.updateViewer((draft) => void (draft.freeCamera.minDistance = value))} {...gesture} />
                <NumberField label="Distance maximale" short="↑" value={free.maxDistance} min={free.minDistance} max={100} step={0.1} onChange={(value) => store.updateViewer((draft) => void (draft.freeCamera.maxDistance = value))} {...gesture} />
              </div>
              <p className={styles.subheading}>Angle vertical (° depuis le zénith)</p>
              <div className={styles.pair}>
                <NumberField label="Angle minimal" short="↥" value={free.minPolar} min={0} max={free.maxPolar} step={1} precision={0} unit="°" onChange={(value) => store.updateViewer((draft) => void (draft.freeCamera.minPolar = value))} {...gesture} />
                <NumberField label="Angle maximal" short="↧" value={free.maxPolar} min={free.minPolar} max={180} step={1} precision={0} unit="°" onChange={(value) => store.updateViewer((draft) => void (draft.freeCamera.maxPolar = value))} {...gesture} />
              </div>
              <Note>Les sphères orange du viewport montrent la zone autorisée. Le lecteur public appliquera ces limites.</Note>
            </>
          ) : null}
        </Section>
      ) : (
        <Section title="Caméra libre du spectateur">
          <Note>Réservée aux scènes 3D compatibles.</Note>
        </Section>
      )}
    </>
  );
}
