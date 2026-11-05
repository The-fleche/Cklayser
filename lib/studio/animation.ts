/**
 * CKlayser Studio — évaluation des animations (pur, sans DOM).
 *
 *  - easing(interpolation, t)     courbe d'interpolation normalisée 0..1 ;
 *  - sampleTrack(track, frame)    valeur d'une piste à une image donnée ;
 *  - evaluateScene(scene, frame)  transformations et paramètres animés de
 *                                 chaque nœud à l'image donnée.
 *
 * Le même code sert au viewport, à l'inspecteur et, à terme, au lecteur
 * public : une scène + un temps → un état reconstruit.
 */
import type { AnimProperty, AnimationClip, Interpolation, Keyframe, SceneNode, StudioScene, Track, Transform } from './types';

export const INTERPOLATIONS: { id: Interpolation; label: string }[] = [
  { id: 'linear', label: 'Linéaire' },
  { id: 'bezier', label: 'Bézier' },
  { id: 'constant', label: 'Constante' },
  { id: 'easeIn', label: 'Ease In' },
  { id: 'easeOut', label: 'Ease Out' },
  { id: 'easeInOut', label: 'Ease In Out' },
];

export const DEFAULT_BEZIER: [number, number, number, number] = [0.42, 0, 0.58, 1];

/** Poignées de Bézier équivalentes à chaque interpolation (pour l'éditeur de courbe). */
export function bezierFor(interpolation: Interpolation, custom: Keyframe['bezier']): [number, number, number, number] {
  switch (interpolation) {
    case 'linear':
      return [0.25, 0.25, 0.75, 0.75];
    case 'easeIn':
      return [0.42, 0, 1, 1];
    case 'easeOut':
      return [0, 0, 0.58, 1];
    case 'easeInOut':
      return [0.42, 0, 0.58, 1];
    case 'bezier':
      return custom;
    case 'constant':
      return [0, 0, 1, 0];
  }
}

/** Bézier cubique (0,0)-(x1,y1)-(x2,y2)-(1,1) : y pour un x donné (Newton + dichotomie). */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number, x: number): number {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sampleY = (t: number) => ((ay * t + by) * t + cy) * t;
  const slopeX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;

  let t = x;
  for (let i = 0; i < 8; i += 1) {
    const error = sampleX(t) - x;
    if (Math.abs(error) < 1e-6) return sampleY(t);
    const d = slopeX(t);
    if (Math.abs(d) < 1e-6) break;
    t -= error / d;
  }
  let lo = 0;
  let hi = 1;
  t = x;
  for (let i = 0; i < 30; i += 1) {
    const value = sampleX(t);
    if (Math.abs(value - x) < 1e-6) break;
    if (value < x) lo = t;
    else hi = t;
    t = (lo + hi) / 2;
  }
  return sampleY(t);
}

export function easing(interpolation: Interpolation, t: number, bezier: Keyframe['bezier'] = DEFAULT_BEZIER): number {
  const x = Math.min(1, Math.max(0, t));
  switch (interpolation) {
    case 'constant':
      return 0;
    case 'linear':
      return x;
    case 'easeIn':
      return x * x * x;
    case 'easeOut':
      return 1 - (1 - x) ** 3;
    case 'easeInOut':
      return x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;
    case 'bezier':
      return cubicBezier(bezier[0], bezier[1], bezier[2], bezier[3], x);
  }
}

/** Valeur d'une piste à l'image `frame` (les clés sont triées par image). */
export function sampleTrack(track: Track, frame: number): number[] | undefined {
  const keys = track.keys;
  const first = keys[0];
  if (!first) return undefined;
  if (frame <= first.frame) return first.value.slice();
  const last = keys[keys.length - 1]!;
  if (frame >= last.frame) return last.value.slice();

  for (let i = 0; i < keys.length - 1; i += 1) {
    const a = keys[i]!;
    const b = keys[i + 1]!;
    if (frame >= a.frame && frame <= b.frame) {
      const span = b.frame - a.frame;
      const t = span === 0 ? 1 : (frame - a.frame) / span;
      const k = easing(a.interpolation, t, a.bezier);
      return a.value.map((value, index) => value + ((b.value[index] ?? value) - value) * k);
    }
  }
  return last.value.slice();
}

export interface EvaluatedNode {
  transform: Transform;
  fov?: number;
  zoom?: number;
}

export type Evaluation = Map<string, EvaluatedNode>;

/** Surcharges temporaires (valeurs modifiées sans keyframe, façon Blender). */
export type Overrides = Record<string, number[]>;

export const overrideKey = (nodeId: string, property: AnimProperty) => `${nodeId}:${property}`;

export function getActiveClip(scene: StudioScene): AnimationClip | undefined {
  return scene.clips.find((clip) => clip.id === scene.activeClipId) ?? scene.clips[0];
}

/** Valeur de base (non animée) d'une propriété. */
export function baseValue(node: SceneNode, property: AnimProperty): number[] {
  switch (property) {
    case 'position':
    case 'rotation':
    case 'scale':
      return node.transform[property].slice();
    case 'fov':
      return [node.camera?.fov ?? 50];
    case 'zoom':
      return [node.camera?.zoom ?? 1];
  }
}

export function evaluateScene(scene: StudioScene, frame: number, overrides: Overrides = {}): Evaluation {
  const clip = getActiveClip(scene);
  const result: Evaluation = new Map();
  for (const node of Object.values(scene.nodes)) {
    result.set(node.id, {
      transform: {
        position: [...node.transform.position],
        rotation: [...node.transform.rotation],
        scale: [...node.transform.scale],
      },
      fov: node.camera?.fov,
      zoom: node.camera?.zoom,
    });
  }
  const apply = (nodeId: string, property: AnimProperty, value: number[]) => {
    const entry = result.get(nodeId);
    if (!entry) return;
    if (property === 'fov') entry.fov = value[0];
    else if (property === 'zoom') entry.zoom = value[0];
    else entry.transform[property] = [value[0] ?? 0, value[1] ?? 0, value[2] ?? 0];
  };
  for (const track of clip?.tracks ?? []) {
    const value = sampleTrack(track, frame);
    if (value) apply(track.nodeId, track.property, value);
  }
  for (const [key, value] of Object.entries(overrides)) {
    const [nodeId, property] = key.split(':') as [string, AnimProperty];
    apply(nodeId, property, value);
  }
  return result;
}

/** Valeur affichée d'une propriété (animée ou non) à l'image donnée. */
export function evaluatedValue(entry: EvaluatedNode | undefined, node: SceneNode, property: AnimProperty): number[] {
  if (!entry) return baseValue(node, property);
  if (property === 'fov') return [entry.fov ?? node.camera?.fov ?? 50];
  if (property === 'zoom') return [entry.zoom ?? node.camera?.zoom ?? 1];
  return entry.transform[property].slice();
}

export function findTrack(clip: AnimationClip | undefined, nodeId: string, property: AnimProperty): Track | undefined {
  return clip?.tracks.find((track) => track.nodeId === nodeId && track.property === property);
}

/** Propriétés animables selon le type de composant. */
export function animatableProperties(node: SceneNode, dimension: '2d' | '3d'): AnimProperty[] {
  if (node.kind === 'root' || node.kind === 'animationPlayer' || node.kind === 'skeleton') {
    return node.kind === 'skeleton' ? ['position', 'rotation', 'scale'] : [];
  }
  if (node.kind === 'camera') {
    return node.camera?.projection === 'orthographic' || dimension === '2d' ? ['position', 'rotation', 'zoom'] : ['position', 'rotation', 'fov'];
  }
  if (node.kind === 'bone') return ['position', 'rotation', 'scale'];
  if (node.kind === 'control') return ['position'];
  if (node.kind === 'light' && node.light?.type === 'ambient') return [];
  return ['position', 'rotation', 'scale'];
}

export const PROPERTY_LABELS: Record<AnimProperty, string> = {
  position: 'Position',
  rotation: 'Rotation',
  scale: 'Échelle',
  fov: 'Champ de vision',
  zoom: 'Zoom',
};

/** Image → « secondes:images » (ex. 1:12 à 24 i/s). */
export function formatTimecode(frame: number, fps: number): string {
  const whole = Math.max(0, Math.round(frame));
  const seconds = Math.floor(whole / fps);
  const rest = whole % fps;
  return `${seconds}:${String(rest).padStart(2, '0')}`;
}
