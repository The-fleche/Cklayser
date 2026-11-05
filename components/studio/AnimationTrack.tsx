'use client';

/**
 * AnimationTrack — une ligne de la timeline, côté pistes.
 *
 *  - variant « group »    : ligne du composant ; losanges de résumé (une
 *    image où au moins une de ses pistes a une keyframe) ;
 *  - variant « property » : piste d'une propriété (Position, Rotation…) ;
 *    double-clic sur une zone vide : keyframe à cette image.
 *
 * Les interactions de sélection et de glisser sont centralisées dans
 * AnimationTimeline (callbacks) : la ligne ne fait que les relayer.
 */
import type { KeyboardEvent, PointerEvent } from 'react';
import { INTERPOLATIONS, PROPERTY_LABELS } from '@/lib/studio/animation';
import type { AnimProperty, Interpolation, KeyRef, SceneNode } from '@/lib/studio/types';
import Keyframe from './Keyframe';
import { frameToX } from './TimelineRuler';
import styles from './Timeline.module.css';

export interface TrackKey {
  ref: KeyRef;
  frame: number;
  interpolation: Interpolation;
}

export interface SummaryKey {
  frame: number;
  refs: KeyRef[];
}

interface AnimationTrackProps {
  variant: 'group' | 'property';
  node: SceneNode;
  property?: AnimProperty;
  keys?: TrackKey[];
  summary?: SummaryKey[];
  zoom: number;
  width: number;
  selectedIds: Set<string>;
  alternate: boolean;
  selectedNode: boolean;
  onKeyPointerDown: (event: PointerEvent<HTMLButtonElement>, refs: KeyRef[]) => void;
  onKeyKeyDown: (event: KeyboardEvent<HTMLButtonElement>, refs: KeyRef[]) => void;
  onAddKey?: (frame: number) => void;
}

const interpLabel = (interpolation: Interpolation) => INTERPOLATIONS.find((item) => item.id === interpolation)?.label ?? interpolation;

export default function AnimationTrack({
  variant,
  node,
  property,
  keys = [],
  summary = [],
  zoom,
  width,
  selectedIds,
  alternate,
  selectedNode,
  onKeyPointerDown,
  onKeyKeyDown,
  onAddKey,
}: AnimationTrackProps) {
  return (
    <div
      className={`${styles.trackRow} ${variant === 'group' ? styles.trackGroup : ''} ${alternate ? styles.trackAlt : ''} ${selectedNode ? styles.trackSelected : ''}`}
      style={{ width }}
      onDoubleClick={(event) => {
        if (variant !== 'property' || !onAddKey) return;
        const rect = event.currentTarget.getBoundingClientRect();
        onAddKey(Math.max(0, Math.round((event.clientX - rect.left - 14) / zoom)));
      }}
    >
      {variant === 'group'
        ? summary.map((item) => (
            <Keyframe
              key={item.frame}
              summary
              x={frameToX(item.frame, zoom)}
              selected={item.refs.every((ref) => selectedIds.has(ref.keyId))}
              label={`Keyframes de ${node.name} à l’image ${item.frame} (${item.refs.length})`}
              onPointerDown={(event) => onKeyPointerDown(event, item.refs)}
              onKeyDown={(event) => onKeyKeyDown(event, item.refs)}
            />
          ))
        : keys.map((item) => (
            <Keyframe
              key={item.ref.keyId}
              x={frameToX(item.frame, zoom)}
              interpolation={item.interpolation}
              selected={selectedIds.has(item.ref.keyId)}
              label={`Keyframe ${PROPERTY_LABELS[property!].toLowerCase()} de ${node.name}, image ${item.frame}, ${interpLabel(item.interpolation)}`}
              onPointerDown={(event) => onKeyPointerDown(event, [item.ref])}
              onKeyDown={(event) => onKeyKeyDown(event, [item.ref])}
            />
          ))}
      {variant === 'property' && keys.length > 1
        ? keys.slice(0, -1).map((item, index) => {
            const next = keys[index + 1]!;
            return (
              <span
                key={`seg-${item.ref.keyId}`}
                className={styles.segment}
                data-interp={item.interpolation}
                style={{ left: frameToX(item.frame, zoom), width: frameToX(next.frame, zoom) - frameToX(item.frame, zoom) }}
                aria-hidden="true"
              />
            );
          })
        : null}
    </div>
  );
}
