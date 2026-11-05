'use client';

/**
 * ViewportToolbar — outils de manipulation et réglages de vue.
 *
 *  - outils : sélection (Q), déplacement (W), rotation (E), échelle (R),
 *    points de contrôle / pose des bones (T) ;
 *  - mode de vue : Édition (caméra de création libre), Caméra (vue de la
 *    caméra de scène choisie, manipulable), Aperçu (rendu final, sans
 *    gizmos ni aides) ;
 *  - caméra de scène utilisée par les modes Caméra et Aperçu ;
 *  - caméra de création : perspective / orthographique, vues prédéfinies,
 *    cadrage de la sélection ; grille, squelettes, aimantation.
 */
import {
  Bone,
  Eye,
  Focus,
  Grid3x3,
  Magnet,
  MousePointer2,
  Move3d,
  PencilRuler,
  Rotate3d,
  Scale3d,
  Video,
  View,
} from 'lucide-react';
import { useActiveScene, useStudio, useStudioStore } from '@/lib/studio/store';
import type { Tool, ViewMode } from '@/lib/studio/types';
import { MenuButton, ToolButton } from './ui';
import styles from './SceneViewport.module.css';

const TOOLS: { id: Tool; label: string; key: string; icon: typeof Move3d }[] = [
  { id: 'select', label: 'Sélection', key: 'Q', icon: MousePointer2 },
  { id: 'move', label: 'Déplacer', key: 'W', icon: Move3d },
  { id: 'rotate', label: 'Rotation', key: 'E', icon: Rotate3d },
  { id: 'scale', label: 'Mise à l’échelle', key: 'R', icon: Scale3d },
  { id: 'pose', label: 'Points de contrôle et bones', key: 'T', icon: Bone },
];

const MODES: { id: ViewMode; label: string; icon: typeof Eye; key: string }[] = [
  { id: 'edit', label: 'Édition', icon: PencilRuler, key: 'Échap' },
  { id: 'camera', label: 'Caméra', icon: Video, key: '0' },
  { id: 'preview', label: 'Aperçu', icon: Eye, key: 'P' },
];

export default function ViewportToolbar({ onView }: { onView: (view: 'front' | 'right' | 'top' | 'perspective') => void }) {
  const store = useStudioStore();
  const scene = useActiveScene();
  const tool = useStudio((state) => state.tool);
  const viewMode = useStudio((state) => state.viewMode);
  const viewCameraId = useStudio((state) => state.viewCameraId);
  const projection = useStudio((state) => state.editorProjection);
  const settings = useStudio((state) => state.settings);
  const cameras = Object.values(scene.nodes).filter((node) => node.kind === 'camera');
  const is2d = scene.dimension === '2d';

  return (
    <div className={styles.toolbar} role="toolbar" aria-label="Outils du viewport">
      <div className={styles.group} role="group" aria-label="Outils de manipulation">
        {TOOLS.map(({ id, label, key, icon: Icon }) => (
          <ToolButton key={id} size="sm" label={label} shortcut={key} pressed={tool === id} icon={<Icon size={15} strokeWidth={2} />} onClick={() => store.setTool(id)} />
        ))}
      </div>

      <span className={styles.sep} aria-hidden="true" />

      <div className={styles.segmented} role="radiogroup" aria-label="Mode de vue">
        {MODES.map(({ id, label, icon: Icon, key }) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={viewMode === id}
            className={styles.segment}
            data-tip={`${label} (${key})`}
            onClick={() => store.setViewMode(id)}
          >
            <Icon size={14} strokeWidth={2} aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>

      <label className={styles.cameraSelect}>
        <span className="sr-only">Caméra de scène</span>
        <Video size={13} strokeWidth={2} aria-hidden="true" />
        <select
          value={viewCameraId ?? ''}
          disabled={cameras.length === 0}
          onChange={(event) => store.setViewCamera(event.target.value)}
          data-tip="Caméra de scène affichée par les modes Caméra et Aperçu"
        >
          {cameras.length === 0 ? <option value="">Aucune caméra</option> : null}
          {cameras.map((camera) => (
            <option key={camera.id} value={camera.id}>
              {scene.viewer.mainCameraId === camera.id ? '★ ' : ''}
              {camera.name}
            </option>
          ))}
        </select>
      </label>

      <div className={styles.spacer} />

      <div className={styles.group} role="group" aria-label="Caméra de création">
        {!is2d ? (
          <>
            <button
              type="button"
              className={styles.textToggle}
              disabled={viewMode !== 'edit'}
              data-tip="Projection de la caméra de création"
              onClick={() => store.setEditorProjection(projection === 'perspective' ? 'orthographic' : 'perspective')}
            >
              {projection === 'perspective' ? 'Persp.' : 'Ortho.'}
            </button>
            <MenuButton
              label="Vues prédéfinies"
              ariaLabel="Vues prédéfinies"
              tip="Vues prédéfinies"
              align="end"
              className={styles.iconMenu}
              items={[
                { label: 'Face', shortcut: '1', onSelect: () => onView('front') },
                { label: 'Droite', shortcut: '3', onSelect: () => onView('right') },
                { label: 'Dessus', shortcut: '7', onSelect: () => onView('top') },
                { label: 'Perspective', onSelect: () => onView('perspective') },
              ]}
            >
              <View size={15} strokeWidth={2} aria-hidden="true" />
            </MenuButton>
          </>
        ) : null}
        <ToolButton size="sm" label="Cadrer la sélection" shortcut="F" icon={<Focus size={15} strokeWidth={2} />} disabled={viewMode !== 'edit'} onClick={store.requestFrameSelection} />
        <ToolButton size="sm" className={styles.optional} label="Grille et axes" pressed={settings.grid} icon={<Grid3x3 size={15} strokeWidth={2} />} onClick={() => store.setSetting('grid', !settings.grid)} />
        <ToolButton size="sm" className={styles.optional} label="Afficher les squelettes" pressed={settings.bones} icon={<Bone size={15} strokeWidth={2} />} onClick={() => store.setSetting('bones', !settings.bones)} />
        <ToolButton size="sm" className={styles.optional} label="Aimantation" pressed={settings.snap} icon={<Magnet size={15} strokeWidth={2} />} onClick={() => store.setSetting('snap', !settings.snap)} />
      </div>
    </div>
  );
}
