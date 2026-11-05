'use client';

/**
 * PropertiesInspector — propriétés du composant sélectionné (panneau droit).
 *
 * Contenu entièrement dynamique selon le type :
 *  - racine de scène  → SceneProperties (rendu, caméras du spectateur) ;
 *  - objet / décor / sprite / modèle / groupe → transformations + ObjectProperties ;
 *  - lumière          → transformations + LightProperties ;
 *  - caméra           → transformations + CameraProperties ;
 *  - squelette / bone / point de contrôle → SkeletonProperties ;
 *  - AnimationPlayer  → AnimationProperties (clip actif).
 *
 * Les valeurs affichées sont celles de l'image courante (animées). Chaque
 * propriété animable porte un losange ◆ : vide = non animée, contour = animée,
 * plein = keyframe à cette image, orange = valeur modifiée non enregistrée.
 */
import { Diamond, Eye, EyeOff, Lock, LockOpen, SlidersHorizontal } from 'lucide-react';
import { animatableProperties, evaluatedValue, findTrack, getActiveClip, overrideKey, PROPERTY_LABELS } from '@/lib/studio/animation';
import { useActiveScene, useEvaluation, useStudio, useStudioStore } from '@/lib/studio/store';
import type { AnimProperty, SceneNode } from '@/lib/studio/types';
import AnimationProperties from './AnimationProperties';
import CameraProperties from './CameraProperties';
import { nodeIcon, nodeTypeLabel } from './nodeMeta';
import ObjectProperties, { LightProperties } from './ObjectProperties';
import Panel from './Panel';
import SceneProperties from './SceneProperties';
import SkeletonProperties from './SkeletonProperties';
import { NumberField, Section, TextField } from './ui';
import styles from './Inspector.module.css';

export type KeyState = 'none' | 'animated' | 'key' | 'override';

/** État de keyframing d'une propriété à l'image courante. */
export function useKeyState(nodeId: string, property: AnimProperty): KeyState {
  const scene = useActiveScene();
  const frame = useStudio((state) => Math.round(state.frame));
  const override = useStudio((state) => state.overrides[overrideKey(nodeId, property)]);
  if (override) return 'override';
  const track = findTrack(getActiveClip(scene), nodeId, property);
  if (!track) return 'none';
  return track.keys.some((key) => key.frame === frame) ? 'key' : 'animated';
}

const KEY_LABELS: Record<KeyState, string> = {
  none: 'Ajouter une keyframe',
  animated: 'Ajouter une keyframe à cette image',
  key: 'Supprimer la keyframe de cette image',
  override: 'Enregistrer la valeur modifiée en keyframe',
};

export function KeyButton({ node, property }: { node: SceneNode; property: AnimProperty }) {
  const store = useStudioStore();
  const state = useKeyState(node.id, property);
  const label = `${KEY_LABELS[state]} (${PROPERTY_LABELS[property].toLowerCase()})`;
  return (
    <button
      type="button"
      className={styles.keyButton}
      data-state={state}
      aria-label={label}
      data-tip={label}
      onClick={() => (state === 'key' ? store.removeKeyAtFrame(node.id, property) : store.insertKey(node.id, property))}
    >
      <Diamond size={12} strokeWidth={2.4} aria-hidden="true" />
    </button>
  );
}

/** Ligne d'une propriété vectorielle animable (position, rotation, échelle). */
function VectorRow({ node, property, axes, step, precision, unit }: { node: SceneNode; property: 'position' | 'rotation' | 'scale'; axes: (0 | 1 | 2)[]; step: number; precision: number; unit?: string }) {
  const store = useStudioStore();
  const evaluation = useEvaluation();
  const keyState = useKeyState(node.id, property);
  const value = evaluatedValue(evaluation.get(node.id), node, property);
  const names = ['x', 'y', 'z'] as const;
  return (
    <div className={styles.vectorRow}>
      <div className={styles.vectorLabel}>
        <KeyButton node={node} property={property} />
        <span>{PROPERTY_LABELS[property]}</span>
      </div>
      <div className={styles.vectorFields} style={{ gridTemplateColumns: `repeat(${axes.length}, minmax(0, 1fr))` }}>
        {axes.map((axis) => (
          <NumberField
            key={axis}
            label={`${PROPERTY_LABELS[property]} ${names[axis].toUpperCase()}`}
            short={names[axis].toUpperCase()}
            axis={names[axis]}
            value={value[axis] ?? 0}
            step={step}
            precision={precision}
            unit={unit}
            disabled={node.locked}
            state={keyState === 'none' ? undefined : keyState}
            onGestureStart={() => store.beginGesture()}
            onGestureEnd={() => store.endGesture()}
            onChange={(next) => {
              const vector = [...value];
              vector[axis] = next;
              store.setProperty(node.id, property, vector);
            }}
          />
        ))}
      </div>
    </div>
  );
}

export function TransformSection({ node }: { node: SceneNode }) {
  const scene = useActiveScene();
  const properties = animatableProperties(node, scene.dimension);
  const is2d = scene.dimension === '2d';
  const has = (property: AnimProperty) => properties.includes(property);
  if (!has('position') && !has('rotation') && !has('scale')) return null;
  return (
    <Section title="Transformation">
      {has('position') ? <VectorRow node={node} property="position" axes={[0, 1, 2]} step={0.05} precision={3} /> : null}
      {has('rotation') ? <VectorRow node={node} property="rotation" axes={is2d ? [2] : [0, 1, 2]} step={1} precision={1} unit="°" /> : null}
      {has('scale') ? <VectorRow node={node} property="scale" axes={is2d ? [0, 1] : [0, 1, 2]} step={0.05} precision={3} /> : null}
      {node.locked ? <p className={styles.locked}>Composant verrouillé : déverrouillez-le pour le modifier.</p> : null}
    </Section>
  );
}

/** Champ scalaire animable (champ de vision, zoom). */
export function ScalarKeyField({ node, property, label, step, precision, min, max, unit }: { node: SceneNode; property: 'fov' | 'zoom'; label: string; step: number; precision: number; min: number; max: number; unit?: string }) {
  const store = useStudioStore();
  const evaluation = useEvaluation();
  const keyState = useKeyState(node.id, property);
  const value = evaluatedValue(evaluation.get(node.id), node, property)[0] ?? 0;
  return (
    <div className={styles.vectorRow}>
      <div className={styles.vectorLabel}>
        <KeyButton node={node} property={property} />
        <span>{label}</span>
      </div>
      <NumberField
        label={label}
        short="↔"
        value={value}
        step={step}
        precision={precision}
        min={min}
        max={max}
        unit={unit}
        disabled={node.locked}
        state={keyState === 'none' ? undefined : keyState}
        onGestureStart={() => store.beginGesture()}
        onGestureEnd={() => store.endGesture()}
        onChange={(next) => store.setProperty(node.id, property, [next])}
      />
    </div>
  );
}

export default function PropertiesInspector({ collapsed, onToggleCollapsed }: { collapsed: boolean; onToggleCollapsed: () => void }) {
  const store = useStudioStore();
  const scene = useActiveScene();
  const selectedId = useStudio((state) => state.selectedId);
  const node = selectedId ? scene.nodes[selectedId] : undefined;

  return (
    <Panel
      title="Inspecteur"
      regionLabel="Inspecteur de propriétés"
      icon={<SlidersHorizontal size={14} strokeWidth={2} />}
      side="right"
      collapsed={collapsed}
      onToggleCollapsed={onToggleCollapsed}
    >
      {!node ? (
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>Aucun composant sélectionné</p>
          <p>Sélectionnez un élément dans la hiérarchie ou le viewport pour afficher et modifier ses propriétés.</p>
          <button type="button" className={styles.linkButton} onClick={() => store.select(scene.rootId)}>
            Propriétés de la scène
          </button>
        </div>
      ) : (
        <div className={styles.inspector} key={node.id}>
          <InspectorHeader node={node} />
          {node.kind === 'root' ? <SceneProperties /> : null}
          {node.kind !== 'root' && node.kind !== 'animationPlayer' ? <TransformSection node={node} /> : null}
          {node.kind === 'camera' ? <CameraProperties node={node} /> : null}
          {node.kind === 'light' ? <LightProperties node={node} /> : null}
          {node.kind === 'skeleton' || node.kind === 'bone' || node.kind === 'control' ? <SkeletonProperties node={node} /> : null}
          {node.kind === 'animationPlayer' ? <AnimationProperties /> : null}
          {['mesh', 'environment', 'sprite', 'model', 'group'].includes(node.kind) ? <ObjectProperties node={node} /> : null}
        </div>
      )}
    </Panel>
  );
}

function InspectorHeader({ node }: { node: SceneNode }) {
  const store = useStudioStore();
  const scene = useActiveScene();
  const Icon = nodeIcon(node, scene.nodes);
  return (
    <div className={styles.header}>
      <div className={styles.identity}>
        <span className={styles.identityIcon} aria-hidden="true">
          <Icon size={16} strokeWidth={2} />
        </span>
        <div className={styles.identityText}>
          <p className={styles.identityType}>{nodeTypeLabel(node, scene.dimension)}</p>
          <p className={styles.identityName}>{node.name}</p>
        </div>
        {node.kind !== 'root' ? (
          <div className={styles.identityActions}>
            <button
              type="button"
              className={styles.flag}
              aria-pressed={!node.visible}
              aria-label={node.visible ? 'Masquer' : 'Afficher'}
              data-tip={node.visible ? 'Masquer' : 'Afficher'}
              onClick={() => store.toggleVisible(node.id)}
            >
              {node.visible ? <Eye size={14} strokeWidth={2} aria-hidden="true" /> : <EyeOff size={14} strokeWidth={2} aria-hidden="true" />}
            </button>
            <button
              type="button"
              className={styles.flag}
              aria-pressed={node.locked}
              aria-label={node.locked ? 'Déverrouiller' : 'Verrouiller'}
              data-tip={node.locked ? 'Déverrouiller' : 'Verrouiller'}
              onClick={() => store.toggleLocked(node.id)}
            >
              {node.locked ? <Lock size={14} strokeWidth={2} aria-hidden="true" /> : <LockOpen size={14} strokeWidth={2} aria-hidden="true" />}
            </button>
          </div>
        ) : null}
      </div>
      <TextField label="Nom" value={node.name} onCommit={(value) => (node.kind === 'root' ? store.renameScene(value) : store.renameNode(node.id, value))} />
    </div>
  );
}
