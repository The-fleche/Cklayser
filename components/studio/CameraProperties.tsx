'use client';

/**
 * CameraProperties — caméra de SCÈNE (objet de la hiérarchie, animable).
 *
 *  - projection, champ de vision / focale (perspective) ou zoom
 *    (orthographique, 2D), plans de découpe, format d'image ;
 *  - « Voir par cette caméra » (mode caméra du viewport) ;
 *  - rôle pour le spectateur : caméra principale, point de vue proposé
 *    (bouton du lecteur public) et son libellé.
 *
 * À ne pas confondre avec la caméra de création (navigation du viewport),
 * qui n'appartient pas à la scène.
 */
import { Star, Video } from 'lucide-react';
import { useActiveScene, useStudio, useStudioStore } from '@/lib/studio/store';
import type { SceneNode } from '@/lib/studio/types';
import { ScalarKeyField } from './PropertiesInspector';
import { ColorField, Note, NumberField, Section, SelectField, TextField, Toggle } from './ui';
import styles from './Inspector.module.css';

const ASPECTS = [
  { value: String(16 / 9), label: '16:9 (série)' },
  { value: String(2.39), label: '2,39:1 (cinéma)' },
  { value: String(4 / 3), label: '4:3' },
  { value: '1', label: '1:1' },
  { value: String(9 / 16), label: '9:16 (vertical)' },
];

/** Focale équivalente plein format (capteur 24 mm de haut) ↔ champ de vision vertical. */
const fovToFocal = (fov: number) => 24 / (2 * Math.tan((fov * Math.PI) / 360));
const focalToFov = (focal: number) => (2 * Math.atan(24 / (2 * focal)) * 180) / Math.PI;

export default function CameraProperties({ node }: { node: SceneNode }) {
  const store = useStudioStore();
  const scene = useActiveScene();
  const viewMode = useStudio((state) => state.viewMode);
  const viewCameraId = useStudio((state) => state.viewCameraId);
  const camera = node.camera;
  if (!camera) return null;
  const is2d = scene.dimension === '2d';
  const ortho = is2d || camera.projection === 'orthographic';
  const isMain = scene.viewer.mainCameraId === node.id;
  const pov = scene.viewer.povs.find((item) => item.cameraId === node.id);
  const viewing = viewMode !== 'edit' && viewCameraId === node.id;
  const gesture = { onGestureStart: () => store.beginGesture(), onGestureEnd: () => store.endGesture() };

  return (
    <>
      <div className={styles.cameraActions}>
        <button type="button" className={styles.actionButton} aria-pressed={viewing} onClick={() => (viewing ? store.setViewMode('edit') : store.viewThroughCamera(node.id))}>
          <Video size={14} strokeWidth={2} aria-hidden="true" />
          {viewing ? 'Revenir à la vue éditeur' : 'Voir par cette caméra'}
        </button>
      </div>

      <Section title={is2d ? 'Camera2D' : 'Camera3D'}>
        {!is2d ? (
          <SelectField
            label="Projection"
            value={camera.projection}
            options={[
              { value: 'perspective', label: 'Perspective' },
              { value: 'orthographic', label: 'Orthographique' },
            ]}
            onChange={(projection) => store.updateNode(node.id, (draft) => void (draft.camera!.projection = projection))}
          />
        ) : null}
        {ortho ? (
          <ScalarKeyField node={node} property="zoom" label="Zoom" step={0.05} precision={2} min={0.1} max={10} unit="×" />
        ) : (
          <>
            <ScalarKeyField node={node} property="fov" label="Champ de vision" step={0.5} precision={1} min={5} max={120} unit="°" />
            <div className={styles.inlineField}>
              <span className={styles.inlineLabel}>Focale (équiv. 35 mm)</span>
              <NumberField
                label="Focale en millimètres"
                short="f"
                value={Math.round(fovToFocal(camera.fov) * 10) / 10}
                step={1}
                min={8}
                max={300}
                precision={1}
                unit="mm"
                onChange={(focal) => store.setProperty(node.id, 'fov', [Math.round(focalToFov(focal) * 10) / 10])}
                {...gesture}
              />
            </div>
          </>
        )}
      </Section>

      <Section title="Rendu">
        <SelectField
          label="Format"
          value={ASPECTS.find((option) => Math.abs(Number(option.value) - camera.aspect) < 0.01)?.value ?? String(16 / 9)}
          options={ASPECTS}
          onChange={(value) => store.updateNode(node.id, (draft) => void (draft.camera!.aspect = Number(value)))}
        />
        {!is2d ? (
          <div className={styles.pair}>
            <NumberField label="Plan proche" short="N" value={camera.near} min={0.01} step={0.05} onChange={(value) => store.updateNode(node.id, (draft) => void (draft.camera!.near = value))} {...gesture} />
            <NumberField label="Plan lointain" short="F" value={camera.far} min={1} step={5} precision={0} onChange={(value) => store.updateNode(node.id, (draft) => void (draft.camera!.far = value))} {...gesture} />
          </div>
        ) : null}
        <ColorField label="Fond (lecteur)" value={camera.background} onChange={(color) => store.updateNode(node.id, (draft) => void (draft.camera!.background = color))} />
      </Section>

      <Section title="Pour le spectateur">
        <button
          type="button"
          className={styles.actionButton}
          aria-pressed={isMain}
          disabled={isMain}
          onClick={() => store.updateViewer((viewer) => void (viewer.mainCameraId = node.id))}
        >
          <Star size={14} strokeWidth={2} aria-hidden="true" fill={isMain ? 'currentColor' : 'none'} />
          {isMain ? 'Caméra principale de diffusion' : 'Définir comme caméra principale'}
        </button>
        <Toggle
          label="Point de vue proposé"
          hint="Bouton de changement de point de vue dans le lecteur"
          checked={Boolean(pov)}
          onChange={(checked) =>
            store.updateViewer((viewer) => {
              if (checked) viewer.povs.push({ cameraId: node.id, label: node.name.replace(/^Cam_?/, '') || 'Point de vue' });
              else viewer.povs = viewer.povs.filter((item) => item.cameraId !== node.id);
            })
          }
        />
        {pov ? (
          <TextField
            label="Libellé"
            value={pov.label}
            onCommit={(label) =>
              store.updateViewer((viewer) => {
                const item = viewer.povs.find((entry) => entry.cameraId === node.id);
                if (item) item.label = label.trim().slice(0, 30);
              })
            }
          />
        ) : null}
        <Note>
          Transitions et caméra libre du spectateur : propriétés de la scène (sélectionnez la racine « {scene.nodes[scene.rootId]?.name} »).
        </Note>
      </Section>
    </>
  );
}
