'use client';

/**
 * PlaybackControls — transport de la timeline : début, keyframe
 * précédente, image précédente, lecture / pause, image suivante, keyframe
 * suivante, fin ; temps courant (secondes:images et numéro d'image),
 * durée totale, vitesse de lecture et boucle.
 */
import { ChevronFirst, ChevronLast, Pause, Play, Repeat, SkipBack, SkipForward, StepBack, StepForward } from 'lucide-react';
import { formatTimecode, getActiveClip } from '@/lib/studio/animation';
import { useActiveScene, useStudio, useStudioStore } from '@/lib/studio/store';
import { ToolButton } from './ui';
import styles from './Timeline.module.css';

const SPEEDS = [0.25, 0.5, 1, 1.5, 2];

export default function PlaybackControls() {
  const store = useStudioStore();
  const scene = useActiveScene();
  const clip = getActiveClip(scene)!;
  const playing = useStudio((state) => state.playing);
  const frame = useStudio((state) => state.frame);
  const shown = Math.round(frame);

  return (
    <div className={styles.transport}>
      <div className={styles.transportButtons} role="group" aria-label="Lecture">
        <ToolButton size="sm" label="Début" shortcut="Début" icon={<ChevronFirst size={16} strokeWidth={2} />} onClick={() => {
          store.pause();
          store.setFrame(0);
        }} />
        <ToolButton size="sm" label="Keyframe précédente" shortcut="Maj ←" icon={<SkipBack size={14} strokeWidth={2} />} onClick={() => store.jumpToKey(-1)} />
        <ToolButton size="sm" label="Image précédente" shortcut="←" icon={<StepBack size={15} strokeWidth={2} />} onClick={() => store.stepFrame(-1)} />
        <ToolButton
          label={playing ? 'Pause' : 'Lecture'}
          shortcut="Espace"
          tone="accent"
          className={styles.playButton}
          icon={playing ? <Pause size={16} strokeWidth={2.2} fill="currentColor" /> : <Play size={16} strokeWidth={2.2} fill="currentColor" />}
          onClick={store.togglePlay}
        />
        <ToolButton size="sm" label="Image suivante" shortcut="→" icon={<StepForward size={15} strokeWidth={2} />} onClick={() => store.stepFrame(1)} />
        <ToolButton size="sm" label="Keyframe suivante" shortcut="Maj →" icon={<SkipForward size={14} strokeWidth={2} />} onClick={() => store.jumpToKey(1)} />
        <ToolButton size="sm" label="Fin" shortcut="Fin" icon={<ChevronLast size={16} strokeWidth={2} />} onClick={() => {
          store.pause();
          store.setFrame(clip.duration);
        }} />
      </div>

      <p className={styles.timecode} aria-label={`Image ${shown} sur ${clip.duration}`}>
        <span className={styles.timecodeMain}>{formatTimecode(frame, clip.fps)}</span>
        <span className={styles.timecodeFrames}>
          <span className={styles.frameNumber}>{String(shown).padStart(3, '0')}</span> / {clip.duration}
        </span>
      </p>

      <label className={styles.speed}>
        <span className="sr-only">Vitesse de lecture</span>
        <select value={String(clip.speed)} onChange={(event) => store.updateClip({ speed: Number(event.target.value) })} data-tip="Vitesse de lecture">
          {(SPEEDS.includes(clip.speed) ? SPEEDS : [...SPEEDS, clip.speed].sort((a, b) => a - b)).map((speed) => (
            <option key={speed} value={speed}>
              {String(speed).replace('.', ',')}×
            </option>
          ))}
        </select>
      </label>
      <ToolButton size="sm" label="Lecture en boucle" pressed={clip.loop} icon={<Repeat size={14} strokeWidth={2} />} onClick={() => store.updateClip({ loop: !clip.loop })} />
    </div>
  );
}
