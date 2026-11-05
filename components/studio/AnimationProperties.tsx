'use client';

/**
 * AnimationProperties — AnimationPlayer : clip actif de la scène.
 *
 * Nom, durée (images), cadence, vitesse de lecture, boucle, interpolation
 * par défaut des nouvelles keyframes ; liste des pistes animées
 * (cliquables) ; création d'un nouveau clip.
 */
import { Plus } from 'lucide-react';
import { INTERPOLATIONS, PROPERTY_LABELS, getActiveClip } from '@/lib/studio/animation';
import { useActiveScene, useStudioStore } from '@/lib/studio/store';
import type { Interpolation } from '@/lib/studio/types';
import { Note, NumberField, Section, SelectField, TextField, Toggle } from './ui';
import styles from './Inspector.module.css';

export default function AnimationProperties() {
  const store = useStudioStore();
  const scene = useActiveScene();
  const clip = getActiveClip(scene);
  if (!clip) return null;
  const gesture = { onGestureStart: () => store.beginGesture(), onGestureEnd: () => store.endGesture() };
  const keyCount = clip.tracks.reduce((total, track) => total + track.keys.length, 0);

  return (
    <>
      <Section
        title="Clip d’animation"
        actions={
          <button type="button" className={styles.miniAction} aria-label="Nouveau clip" data-tip="Nouveau clip" onClick={store.addClip}>
            <Plus size={14} strokeWidth={2} aria-hidden="true" />
          </button>
        }
      >
        {scene.clips.length > 1 ? (
          <SelectField label="Clip actif" value={clip.id} options={scene.clips.map((item) => ({ value: item.id, label: item.name }))} onChange={store.setActiveClip} />
        ) : null}
        <TextField label="Nom du clip" value={clip.name} onCommit={(name) => store.updateClip({ name: name.trim().slice(0, 60) })} />
        <div className={styles.pair}>
          <NumberField label="Durée (images)" short="D" value={clip.duration} min={1} max={14400} step={1} precision={0} onChange={(value) => store.updateClip({ duration: value })} {...gesture} />
          <SelectField
            label="Cadence"
            value={String(clip.fps)}
            options={['12', '24', '25', '30', '60'].map((value) => ({ value, label: `${value} i/s` }))}
            onChange={(value) => store.updateClip({ fps: Number(value) })}
          />
        </div>
        <p className={styles.derived}>
          Durée : {(clip.duration / clip.fps).toFixed(2).replace('.', ',')} s · {keyCount} keyframe{keyCount > 1 ? 's' : ''} sur {clip.tracks.length} piste
          {clip.tracks.length > 1 ? 's' : ''}
        </p>
        <NumberField label="Vitesse de lecture" short="×" value={clip.speed} min={0.1} max={4} step={0.05} unit="×" onChange={(value) => store.updateClip({ speed: value })} {...gesture} />
        <Toggle label="Lecture en boucle" checked={clip.loop} onChange={(loop) => store.updateClip({ loop })} />
        <SelectField<Interpolation>
          label="Interpolation"
          value={clip.defaultInterpolation}
          options={INTERPOLATIONS.map((item) => ({ value: item.id, label: item.label }))}
          onChange={(value) => store.updateClip({ defaultInterpolation: value })}
        />
        <Note>L’interpolation choisie s’applique aux nouvelles keyframes. Celle de chaque keyframe se règle dans la timeline.</Note>
      </Section>

      <Section title={`Pistes animées (${clip.tracks.length})`}>
        {clip.tracks.length === 0 ? (
          <Note>Aucune piste. Sélectionnez un composant, puis K ou le losange ◆ d’une propriété pour créer une keyframe.</Note>
        ) : (
          <ul className={styles.trackList}>
            {clip.tracks.map((track) => {
              const target = scene.nodes[track.nodeId];
              return (
                <li key={track.id}>
                  <button type="button" className={styles.boneLink} onClick={() => store.select(track.nodeId)}>
                    <span>{target?.name ?? '—'}</span>
                    <span className={styles.boneMeta}>
                      {PROPERTY_LABELS[track.property]} · {track.keys.length}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Section>
    </>
  );
}
