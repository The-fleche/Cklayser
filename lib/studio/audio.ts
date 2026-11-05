'use client';

/**
 * Audio de CKlayser Studio et du lecteur temps réel.
 *
 *  - synthWavUrl(kind, seconds) : ambiances de la bibliothèque, générées
 *    dans le navigateur (WAV PCM 16 bits, 22 050 Hz) : aucun fichier à
 *    télécharger, rien de lourd dans le projet ;
 *  - assetUrl(asset) : URL jouable d'un asset audio (fichier importé ou
 *    synthèse) ;
 *  - getAudioInfo(url) : durée et forme d'onde (crêtes) pour la timeline ;
 *  - AudioPlayback : lecture des pistes d'un clip, synchronisée sur le
 *    temps de l'animation (Web Audio : départ, décalage, volume, vitesse) ;
 *  - bindStudioAudio(store) : branche la lecture sur le store du Studio.
 */
import type { AudioRef, StudioAsset, SynthKind } from './types';

const SAMPLE_RATE = 22050;

/* -------------------------------------------------------------------------
   Synthèse
   ------------------------------------------------------------------------- */

function seeded(seed: number): () => number {
  let state = seed >>> 0 || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return ((state >>> 0) % 100000) / 100000;
  };
}

function synthesize(kind: SynthKind, seconds: number): Float32Array {
  const length = Math.round(seconds * SAMPLE_RATE);
  const data = new Float32Array(length);
  const random = seeded(kind.length * 7919 + Math.round(seconds * 13));
  const tau = Math.PI * 2;
  let noise = 0;
  let noiseSlow = 0;

  // Notes ponctuelles (carillons, pincements) : [instant, fréquence, amplitude, déclin].
  const notes: [number, number, number, number][] = [];
  if (kind === 'atelier') for (let t = 0.4; t < seconds; t += 1.6) notes.push([t, [660, 880, 990][notes.length % 3]!, 0.18, 2.4]);
  if (kind === 'fete') {
    const scale = [392, 440, 523, 587, 659, 784];
    for (let t = 0, i = 0; t < seconds; t += 0.25, i += 1) notes.push([t, scale[(i * 3 + (i >> 2)) % scale.length]!, i % 4 === 0 ? 0.22 : 0.13, 5]);
  }
  if (kind === 'nuit') for (let t = 0.3; t < seconds; t += 0.9 + random() * 0.6) notes.push([t, 4100 + random() * 500, 0.05, 30]);
  if (kind === 'espace') for (let t = 1; t < seconds; t += 2.2) notes.push([t, 1320 + random() * 200, 0.08, 1.2]);

  for (let i = 0; i < length; i += 1) {
    const t = i / SAMPLE_RATE;
    let value = 0;
    const white = random() * 2 - 1;
    noise += (white - noise) * 0.08;
    noiseSlow += (white - noiseSlow) * 0.01;
    switch (kind) {
      case 'atelier':
        value += 0.16 * Math.sin(tau * 98 * t) * (0.75 + 0.25 * Math.sin(tau * 0.4 * t));
        value += 0.08 * Math.sin(tau * 147 * t);
        value += 0.05 * noiseSlow;
        break;
      case 'vent':
        value += 0.5 * noiseSlow * (0.55 + 0.45 * Math.sin(tau * 0.18 * t + 1));
        value += 0.06 * Math.sin(tau * 82 * t);
        break;
      case 'nuit':
        value += 0.07 * (Math.sin(tau * 220 * t) + Math.sin(tau * 277 * t) + Math.sin(tau * 330 * t)) * (0.7 + 0.3 * Math.sin(tau * 0.25 * t));
        break;
      case 'espace':
        value += 0.16 * Math.sin(tau * 55 * t) + 0.06 * Math.sin(tau * 110.4 * t) * (0.5 + 0.5 * Math.sin(tau * 0.3 * t));
        value += 0.03 * Math.sin(tau * 880 * t + 3 * Math.sin(tau * 0.5 * t));
        break;
      case 'mer':
        value += 0.55 * noise * (0.3 + 0.7 * Math.max(0, Math.sin(tau * 0.16 * t)) ** 2);
        value += 0.05 * Math.sin(tau * 65 * t);
        break;
      case 'fete':
        value += 0.05 * Math.sin(tau * 98 * t);
        // Pulsation légère (grosse caisse) à 120 bpm.
        {
          const beat = t % 0.5;
          value += 0.3 * Math.sin(tau * (60 - beat * 60) * beat) * Math.exp(-beat * 18);
        }
        break;
    }
    for (const [start, frequency, amplitude, decay] of notes) {
      const local = t - start;
      if (local < 0 || local > 4) continue;
      value += amplitude * Math.sin(tau * frequency * local) * Math.exp(-local * decay) * Math.min(1, local * 200);
    }
    // Fondus d'entrée et de sortie.
    const fade = Math.min(1, t / 0.3, (seconds - t) / 0.4);
    data[i] = value * Math.max(0, fade);
  }
  let peak = 0;
  for (const sample of data) peak = Math.max(peak, Math.abs(sample));
  if (peak > 0) for (let i = 0; i < length; i += 1) data[i] = (data[i]! / peak) * 0.6;
  return data;
}

function encodeWav(samples: Float32Array): string {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const write = (offset: number, text: string) => [...text].forEach((char, i) => view.setUint8(offset + i, char.charCodeAt(0)));
  write(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  write(8, 'WAVE');
  write(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, 'data');
  view.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i += 1) view.setInt16(44 + i * 2, Math.max(-1, Math.min(1, samples[i]!)) * 0x7fff, true);
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return `data:audio/wav;base64,${btoa(binary)}`;
}

const synthCache = new Map<string, string>();

export function synthWavUrl(kind: SynthKind, seconds: number): string {
  const key = `${kind}:${seconds}`;
  let url = synthCache.get(key);
  if (!url) {
    url = encodeWav(synthesize(kind, seconds));
    synthCache.set(key, url);
  }
  return url;
}

export function assetUrl(asset: StudioAsset | undefined): string | undefined {
  if (!asset) return undefined;
  if (asset.url) return asset.url;
  if (asset.synth && typeof window !== 'undefined') return synthWavUrl(asset.synth.kind, asset.synth.seconds);
  return undefined;
}

/* -------------------------------------------------------------------------
   Décodage, forme d'onde
   ------------------------------------------------------------------------- */

let context: AudioContext | null = null;

export function audioContext(): AudioContext | null {
  if (typeof window === 'undefined' || !('AudioContext' in window)) return null;
  context ??= new AudioContext();
  return context;
}

const buffers = new Map<string, Promise<AudioBuffer>>();

export function getBuffer(url: string): Promise<AudioBuffer> {
  let promise = buffers.get(url);
  if (!promise) {
    const ctx = audioContext();
    if (!ctx) return Promise.reject(new Error('Web Audio indisponible'));
    promise = fetch(url)
      .then((response) => response.arrayBuffer())
      .then((data) => ctx.decodeAudioData(data));
    buffers.set(url, promise);
  }
  return promise;
}

export interface AudioInfo {
  duration: number;
  /** Crêtes normalisées (0..1), une par colonne. */
  peaks: number[];
}

const infos = new Map<string, Promise<AudioInfo>>();

export function getAudioInfo(url: string, columns = 240): Promise<AudioInfo> {
  const key = `${url.length}:${url.slice(-64)}:${columns}`;
  let promise = infos.get(key);
  if (!promise) {
    promise = getBuffer(url).then((buffer) => {
      const channel = buffer.getChannelData(0);
      const step = Math.max(1, Math.floor(channel.length / columns));
      const peaks: number[] = [];
      let max = 0;
      for (let c = 0; c < columns; c += 1) {
        let peak = 0;
        for (let i = c * step; i < Math.min(channel.length, (c + 1) * step); i += 1) peak = Math.max(peak, Math.abs(channel[i]!));
        peaks.push(peak);
        max = Math.max(max, peak);
      }
      return { duration: buffer.duration, peaks: peaks.map((value) => (max > 0 ? value / max : 0)) };
    });
    infos.set(key, promise);
  }
  return promise;
}

/* -------------------------------------------------------------------------
   Lecture synchronisée
   ------------------------------------------------------------------------- */

export class AudioPlayback {
  private sources: { source: AudioBufferSourceNode; gain: GainNode }[] = [];
  private token = 0;
  private masterMuted = false;

  setMuted(muted: boolean): void {
    this.masterMuted = muted;
    for (const { gain } of this.sources) gain.gain.value = muted ? 0 : gain.gain.value;
  }

  /** Démarre toutes les pistes à partir de l'image `frame`. */
  start(refs: AudioRef[], frame: number, fps: number, speed: number, resolve: (assetId: string) => string | undefined): void {
    this.stop();
    const ctx = audioContext();
    if (!ctx || refs.length === 0) return;
    void ctx.resume();
    const token = ++this.token;
    for (const ref of refs) {
      if (ref.muted) continue;
      const url = resolve(ref.assetId);
      if (!url) continue;
      const requestedAt = ctx.currentTime;
      void getBuffer(url)
        .then((buffer) => {
          if (token !== this.token) return;
          // Temps écoulé pendant le décodage : on rattrape.
          const elapsed = (ctx.currentTime - requestedAt) * speed;
          const offset = (frame - ref.start) / fps + elapsed;
          if (offset >= buffer.duration) return;
          const source = ctx.createBufferSource();
          source.buffer = buffer;
          source.playbackRate.value = speed;
          const gain = ctx.createGain();
          gain.gain.value = this.masterMuted ? 0 : ref.volume;
          source.connect(gain).connect(ctx.destination);
          if (offset >= 0) source.start(0, offset);
          else source.start(ctx.currentTime + -offset / speed, 0);
          this.sources.push({ source, gain });
        })
        .catch(() => undefined);
    }
  }

  stop(): void {
    this.token += 1;
    for (const { source } of this.sources) {
      try {
        source.stop();
      } catch {
        /* déjà arrêtée */
      }
    }
    this.sources = [];
  }
}

/* -------------------------------------------------------------------------
   Branchement sur le store du Studio
   ------------------------------------------------------------------------- */

interface StoreLike {
  subscribe: (listener: () => void) => () => void;
  getState: () => { playing: boolean; frame: number; project: { assets: StudioAsset[] } };
  readonly clip: { fps: number; speed: number; audio?: AudioRef[] };
}

export function bindStudioAudio(store: StoreLike): () => void {
  const playback = new AudioPlayback();
  let playing = false;
  let lastFrame = 0;
  let lastAudio: AudioRef[] | undefined;
  let lastSpeed = 1;
  const restart = () => {
    const state = store.getState();
    const clip = store.clip;
    playback.start(clip.audio ?? [], state.frame, clip.fps, clip.speed, (id) => assetUrl(state.project.assets.find((asset) => asset.id === id)));
  };
  const unsubscribe = store.subscribe(() => {
    const state = store.getState();
    const clip = store.clip;
    if (state.playing && !playing) restart();
    else if (!state.playing && playing) playback.stop();
    else if (state.playing && (state.frame < lastFrame - 0.5 || clip.audio !== lastAudio || clip.speed !== lastSpeed)) restart();
    playing = state.playing;
    lastFrame = state.frame;
    lastAudio = clip.audio;
    lastSpeed = clip.speed;
  });
  return () => {
    unsubscribe();
    playback.stop();
  };
}
