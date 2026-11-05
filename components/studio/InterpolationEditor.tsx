'use client';

/**
 * InterpolationEditor — détail de la keyframe sélectionnée.
 *
 *  - type d'interpolation vers la keyframe suivante (Linéaire, Bézier,
 *    Constante, Ease In, Ease Out, Ease In Out) ;
 *  - courbe tracée (temps → progression) ; en Bézier, deux poignées
 *    déplaçables (souris ou flèches du clavier) ;
 *  - image et valeur de la keyframe, modifiables.
 * Plusieurs keyframes sélectionnées : le type choisi s'applique à toutes.
 */
import { useRef } from 'react';
import { INTERPOLATIONS, PROPERTY_LABELS, bezierFor, easing, getActiveClip } from '@/lib/studio/animation';
import { useActiveScene, useStudio, useStudioStore } from '@/lib/studio/store';
import type { Keyframe as KeyframeData } from '@/lib/studio/types';
import { NumberField } from './ui';
import styles from './Timeline.module.css';

const W = 196;
const H = 120;
const M = 14;

export default function InterpolationEditor() {
  const store = useStudioStore();
  const scene = useActiveScene();
  const selectedKeys = useStudio((state) => state.selectedKeys);
  const clip = getActiveClip(scene)!;
  const svgRef = useRef<SVGSVGElement>(null);
  const handleDrag = useRef<0 | 1 | null>(null);

  const first = selectedKeys[0];
  const track = first ? clip.tracks.find((item) => item.id === first.trackId) : undefined;
  const index = track ? track.keys.findIndex((item) => item.id === first?.keyId) : -1;
  const key: KeyframeData | undefined = track?.keys[index];
  const next = track?.keys[index + 1];
  const node = track ? scene.nodes[track.nodeId] : undefined;

  if (!key || !track || !node) {
    return (
      <aside className={styles.interp} aria-label="Interpolation">
        <p className={styles.interpTitle}>Interpolation</p>
        <p className={styles.interpEmpty}>Sélectionnez une keyframe (losange) pour régler sa courbe vers la suivante.</p>
      </aside>
    );
  }

  const bezier = bezierFor(key.interpolation, key.bezier);
  const toX = (t: number) => M + t * (W - M * 2);
  const toY = (v: number) => H - M - v * (H - M * 2);
  const points: string[] = [];
  for (let i = 0; i <= 48; i += 1) {
    const t = i / 48;
    points.push(`${toX(t).toFixed(1)},${toY(easing(key.interpolation, t, key.bezier)).toFixed(1)}`);
  }
  const multiple = selectedKeys.length > 1;
  const editable = key.interpolation === 'bezier';

  const setHandle = (handle: 0 | 1, x: number, y: number) => {
    const values: KeyframeData['bezier'] = [...bezier];
    values[handle * 2] = Math.min(1, Math.max(0, Math.round(x * 100) / 100));
    values[handle * 2 + 1] = Math.min(1.5, Math.max(-0.5, Math.round(y * 100) / 100));
    store.setKeyBezier(key.id, values);
  };

  const pointer = (clientX: number, clientY: number) => {
    const rect = svgRef.current!.getBoundingClientRect();
    const sx = ((clientX - rect.left) / rect.width) * W;
    const sy = ((clientY - rect.top) / rect.height) * H;
    return { x: (sx - M) / (W - M * 2), y: (H - M - sy) / (H - M * 2) };
  };

  return (
    <aside className={styles.interp} aria-label="Interpolation de la keyframe">
      <p className={styles.interpTitle}>
        {multiple ? `${selectedKeys.length} keyframes` : `${node.name} · ${PROPERTY_LABELS[track.property]}`}
      </p>
      <div className={styles.interpTypes} role="radiogroup" aria-label="Type d’interpolation">
        {INTERPOLATIONS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="radio"
            aria-checked={key.interpolation === item.id}
            className={styles.interpType}
            onClick={() => store.setKeysInterpolation(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <svg
        ref={svgRef}
        className={styles.curve}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Courbe ${INTERPOLATIONS.find((item) => item.id === key.interpolation)?.label} de l’image ${key.frame} à ${next ? `l’image ${next.frame}` : 'la fin'}`}
        onPointerMove={(event) => {
          if (handleDrag.current === null) return;
          const point = pointer(event.clientX, event.clientY);
          setHandle(handleDrag.current, point.x, point.y);
        }}
        onPointerUp={() => {
          if (handleDrag.current !== null) store.endGesture();
          handleDrag.current = null;
        }}
      >
        <rect x={M} y={M} width={W - M * 2} height={H - M * 2} className={styles.curveFrame} />
        <line x1={M} y1={toY(0)} x2={W - M} y2={toY(1)} className={styles.curveDiagonal} />
        {editable ? (
          <>
            <line x1={toX(0)} y1={toY(0)} x2={toX(bezier[0])} y2={toY(bezier[1])} className={styles.handleLine} />
            <line x1={toX(1)} y1={toY(1)} x2={toX(bezier[2])} y2={toY(bezier[3])} className={styles.handleLine} />
          </>
        ) : null}
        <polyline points={points.join(' ')} className={styles.curveLine} />
        <rect x={toX(0) - 4} y={toY(0) - 4} width={8} height={8} transform={`rotate(45 ${toX(0)} ${toY(0)})`} className={styles.curveKey} />
        <rect x={toX(1) - 4} y={toY(1) - 4} width={8} height={8} transform={`rotate(45 ${toX(1)} ${toY(1)})`} className={styles.curveKey} />
        {editable
          ? ([0, 1] as const).map((handle) => (
              <circle
                key={handle}
                cx={toX(bezier[handle * 2]!)}
                cy={toY(bezier[handle * 2 + 1]!)}
                r={5.5}
                tabIndex={0}
                role="slider"
                aria-label={`Poignée ${handle === 0 ? 'de sortie' : 'd’entrée'} : temps ${bezier[handle * 2]}, valeur ${bezier[handle * 2 + 1]}`}
                aria-valuenow={bezier[handle * 2 + 1]}
                aria-valuemin={-0.5}
                aria-valuemax={1.5}
                className={styles.handle}
                onPointerDown={(event) => {
                  event.preventDefault();
                  (event.currentTarget.ownerSVGElement as SVGSVGElement).setPointerCapture(event.pointerId);
                  store.beginGesture();
                  handleDrag.current = handle;
                }}
                onKeyDown={(event) => {
                  const step = event.shiftKey ? 0.1 : 0.02;
                  let x = bezier[handle * 2]!;
                  let y = bezier[handle * 2 + 1]!;
                  if (event.key === 'ArrowLeft') x -= step;
                  else if (event.key === 'ArrowRight') x += step;
                  else if (event.key === 'ArrowUp') y += step;
                  else if (event.key === 'ArrowDown') y -= step;
                  else return;
                  event.preventDefault();
                  setHandle(handle, x, y);
                }}
              />
            ))
          : null}
      </svg>
      <p className={styles.interpRange}>
        Image {key.frame} → {next ? `image ${next.frame}` : 'dernière keyframe'}
        {editable ? ` · (${bezier.map((value) => value.toFixed(2)).join(', ')})` : ''}
      </p>

      {!multiple ? (
        <div className={styles.keyFields}>
          <NumberField
            label="Image de la keyframe"
            short="i"
            value={key.frame}
            min={0}
            max={clip.duration}
            step={1}
            precision={0}
            onChange={(frame) => {
              store.selectKeys([{ trackId: track.id, keyId: key.id }]);
              store.moveKeys(new Map([[key.id, key.frame]]), Math.round(frame) - key.frame);
              store.resolveKeyCollisions();
            }}
          />
          {key.value.map((value, axis) => (
            <NumberField
              key={axis}
              label={`Valeur ${key.value.length > 1 ? ['X', 'Y', 'Z'][axis] : ''}`}
              short={key.value.length > 1 ? ['X', 'Y', 'Z'][axis] : 'V'}
              axis={key.value.length > 1 ? (['x', 'y', 'z'] as const)[axis] : undefined}
              value={value}
              step={track.property === 'rotation' ? 1 : 0.05}
              precision={track.property === 'rotation' ? 1 : 3}
              onGestureStart={() => store.beginGesture()}
              onGestureEnd={() => store.endGesture()}
              onChange={(next) => {
                const values = [...key.value];
                values[axis] = next;
                store.setKeyValue(key.id, values);
              }}
            />
          ))}
        </div>
      ) : null}
    </aside>
  );
}
