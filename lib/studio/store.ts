'use client';

/**
 * CKlayser Studio — store central de l'éditeur.
 *
 * Une seule source de vérité pour les cinq zones (hiérarchie, assets,
 * viewport, timeline, inspecteur) : le projet (sérialisable) + l'état
 * d'interface (sélection, temps, outil, mode de vue…).
 *
 *  - Les composants s'abonnent via useStudio(selector) (useSyncExternalStore).
 *  - Toute modification du projet passe par `edit()` : copie, mutation du
 *    brouillon, historique (annuler / rétablir, 100 niveaux).
 *  - Les gestes continus (gizmo, glisser de keyframes, champs numériques
 *    glissés) sont regroupés : beginGesture() … endGesture() = une seule
 *    entrée d'historique.
 *  - Règle de keyframing (façon Blender) : modifier une propriété animée
 *    sans enregistrement automatique crée une valeur temporaire (surcharge),
 *    visible jusqu'au prochain changement d'image ; le losange ◆ de
 *    l'inspecteur l'enregistre en keyframe. Avec l'enregistrement
 *    automatique, chaque modification crée ou met à jour la keyframe de
 *    l'image courante.
 */
import { createContext, useContext, useSyncExternalStore } from 'react';
import {
  animatableProperties,
  baseValue,
  evaluateScene,
  evaluatedValue,
  findTrack,
  getActiveClip,
  overrideKey,
  type Evaluation,
  type Overrides,
} from './animation';
import { createDemoProject, LIBRARY_ASSETS } from './demo';
import {
  attach,
  buildCharacter,
  key as makeKey,
  makeCamera,
  makeClip,
  makeControl,
  makeEmptyScene,
  makeLight,
  makeMesh,
  makeNode,
  makeSprite,
  uid,
  SHAPE_LABELS,
} from './factory';
import type {
  AnimProperty,
  AnimationClip,
  Interpolation,
  KeyRef,
  Keyframe,
  NodeKind,
  PrimitiveShape,
  Projection,
  SceneDimension,
  SceneNode,
  StudioAsset,
  StudioProject,
  StudioScene,
  Tool,
  Track,
  Vec3,
  ViewMode,
} from './types';

export const STUDIO_STORAGE_KEY = 'cklayser:studio:projet';
const HISTORY_LIMIT = 100;

export interface ClipboardKey {
  nodeId: string;
  property: AnimProperty;
  offset: number;
  value: number[];
  interpolation: Interpolation;
  bezier: Keyframe['bezier'];
}

export interface StudioSettings {
  grid: boolean;
  bones: boolean;
  cameraPreview: boolean;
  snap: boolean;
  snapStep: number;
}

export interface StudioState {
  project: StudioProject;
  selectedId: string | null;
  selectedKeys: KeyRef[];
  /** Image courante (décimale pendant la lecture). */
  frame: number;
  playing: boolean;
  autoKey: boolean;
  tool: Tool;
  viewMode: ViewMode;
  /** Caméra de scène utilisée par les modes « caméra » et « aperçu ». */
  viewCameraId: string | null;
  /** Projection de la caméra de CRÉATION (vue éditeur), indépendante des caméras de scène. */
  editorProjection: Projection;
  settings: StudioSettings;
  overrides: Overrides;
  canUndo: boolean;
  canRedo: boolean;
  saveState: 'saved' | 'dirty';
  lastSavedAt: number | null;
  clipboard: ClipboardKey[];
  expanded: Record<string, boolean>;
  collapsedTracks: Record<string, boolean>;
  /** Pixels par image dans la timeline. */
  timelineZoom: number;
  /** Message d'état (barre de statut + annonce lecteur d'écran). */
  message: { id: number; text: string; tone: 'info' | 'error' } | null;
  /** Demande de cadrage de la vue éditeur sur la sélection (compteur). */
  frameRequest: number;
}

type Listener = () => void;

function cloneProject(project: StudioProject): StudioProject {
  return structuredClone(project);
}

export function getActiveScene(project: StudioProject): StudioScene {
  return project.scenes.find((scene) => scene.id === project.activeSceneId) ?? project.scenes[0]!;
}

export function isDescendant(scene: StudioScene, nodeId: string, ancestorId: string): boolean {
  let current = scene.nodes[nodeId];
  while (current && current.parentId) {
    if (current.parentId === ancestorId) return true;
    current = scene.nodes[current.parentId];
  }
  return false;
}

function subtreeIds(scene: StudioScene, nodeId: string): string[] {
  const ids: string[] = [];
  const walk = (id: string) => {
    const node = scene.nodes[id];
    if (!node) return;
    ids.push(id);
    node.children.forEach(walk);
  };
  walk(nodeId);
  return ids;
}

/** Parcours en profondeur de la hiérarchie (ordre d'affichage). */
export function flattenTree(scene: StudioScene, expanded?: Record<string, boolean>): { node: SceneNode; depth: number }[] {
  const out: { node: SceneNode; depth: number }[] = [];
  const walk = (id: string, depth: number) => {
    const node = scene.nodes[id];
    if (!node) return;
    out.push({ node, depth });
    if (expanded && expanded[id] === false) return;
    node.children.forEach((child) => walk(child, depth + 1));
  };
  walk(scene.rootId, 0);
  return out;
}

function sortKeys(trackItem: Track): void {
  trackItem.keys.sort((a, b) => a.frame - b.frame);
}

function defaultParent(scene: StudioScene, selectedId: string | null, kind: NodeKind): string {
  const selected = selectedId ? scene.nodes[selectedId] : undefined;
  if (kind === 'bone' || kind === 'control') {
    if (selected && (selected.kind === 'bone' || selected.kind === 'skeleton')) return selected.id;
    const skeleton = Object.values(scene.nodes).find((node) => node.kind === 'skeleton');
    if (skeleton) return skeleton.id;
  }
  if (selected && (selected.kind === 'group' || selected.kind === 'root' || selected.kind === 'bone')) return selected.id;
  if (selected?.parentId) return selected.parentId;
  const root = scene.nodes[scene.rootId]!;
  return root.children.find((id) => scene.nodes[id]?.kind === 'group') ?? root.id;
}

/* -------------------------------------------------------------------------
   Sauvegarde locale
   ------------------------------------------------------------------------- */

function isProject(value: unknown): value is StudioProject {
  if (!value || typeof value !== 'object') return false;
  const project = value as Partial<StudioProject>;
  return project.version === 1 && Array.isArray(project.scenes) && project.scenes.length > 0 && typeof project.activeSceneId === 'string';
}

/** Valide un projet importé (fichier JSON ou sauvegarde locale). */
export function parseProject(text: string): StudioProject | null {
  try {
    const data: unknown = JSON.parse(text);
    if (!isProject(data)) return null;
    for (const scene of data.scenes) {
      if (!scene.nodes || !scene.nodes[scene.rootId] || !Array.isArray(scene.clips) || scene.clips.length === 0) return null;
    }
    // Les fichiers de session (URL locales) ne survivent pas au rechargement.
    data.assets = (data.assets ?? []).filter((asset) => !asset.sessionOnly);
    for (const library of LIBRARY_ASSETS) {
      if (!data.assets.some((asset) => asset.id === library.id)) data.assets.push({ ...library });
    }
    return data;
  } catch {
    return null;
  }
}

export function serializeProject(project: StudioProject): string {
  return JSON.stringify({ ...project, assets: project.assets.filter((asset) => !asset.sessionOnly) }, null, 2);
}

/* -------------------------------------------------------------------------
   Store
   ------------------------------------------------------------------------- */

export class StudioStore {
  private state: StudioState;
  private listeners = new Set<Listener>();
  private past: StudioProject[] = [];
  private future: StudioProject[] = [];
  private gestureStart: StudioProject | null = null;
  private evalCache: { scene: StudioScene; frame: number; overrides: Overrides; result: Evaluation } | null = null;
  private raf = 0;
  private lastTick = 0;
  private messageId = 0;

  constructor(project: StudioProject = createDemoProject(), savedAt: number | null = null) {
    const scene = getActiveScene(project);
    this.state = {
      project,
      selectedId: null,
      selectedKeys: [],
      frame: 0,
      playing: false,
      autoKey: false,
      tool: 'move',
      viewMode: 'edit',
      viewCameraId: scene.viewer.mainCameraId,
      editorProjection: scene.dimension === '2d' ? 'orthographic' : 'perspective',
      settings: { grid: true, bones: true, cameraPreview: true, snap: false, snapStep: 0.25 },
      overrides: {},
      canUndo: false,
      canRedo: false,
      saveState: 'saved',
      lastSavedAt: savedAt,
      clipboard: [],
      expanded: {},
      collapsedTracks: {},
      timelineZoom: 9,
      message: null,
      frameRequest: 0,
    };
  }

  /* ----- abonnement ----- */
  getState = (): StudioState => this.state;

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private set(patch: Partial<StudioState>): void {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((listener) => listener());
  }

  get scene(): StudioScene {
    return getActiveScene(this.state.project);
  }

  get clip(): AnimationClip {
    return getActiveClip(this.scene)!;
  }

  notify(text: string, tone: 'info' | 'error' = 'info'): void {
    this.messageId += 1;
    this.set({ message: { id: this.messageId, text, tone } });
  }

  /** Évaluation de la scène active à l'image courante (mémoïsée). */
  getEvaluation(): Evaluation {
    const scene = this.scene;
    const { frame, overrides } = this.state;
    const cache = this.evalCache;
    if (cache && cache.scene === scene && cache.frame === frame && cache.overrides === overrides) return cache.result;
    const result = evaluateScene(scene, frame, overrides);
    this.evalCache = { scene, frame, overrides, result };
    return result;
  }

  /* ----- historique ----- */

  /**
   * Modifie le projet : copie profonde, mutation du brouillon, historique.
   * @param mutate reçoit le brouillon du projet et celui de la scène active ;
   *               renvoie false pour annuler la modification.
   */
  edit(mutate: (scene: StudioScene, project: StudioProject) => void | false, options: { keepOverrides?: boolean } = {}): boolean {
    const before = this.state.project;
    const draft = cloneProject(before);
    const scene = getActiveScene(draft);
    if (mutate(scene, draft) === false) return false;
    draft.updatedAt = Date.now();
    if (!this.gestureStart) {
      this.past.push(before);
      if (this.past.length > HISTORY_LIMIT) this.past.shift();
      this.future = [];
    }
    this.set({
      project: draft,
      canUndo: this.past.length > 0 || Boolean(this.gestureStart),
      canRedo: this.future.length > 0,
      saveState: 'dirty',
      overrides: options.keepOverrides ? this.state.overrides : {},
    });
    return true;
  }

  beginGesture(): void {
    if (!this.gestureStart) this.gestureStart = this.state.project;
  }

  endGesture(): void {
    const start = this.gestureStart;
    this.gestureStart = null;
    if (!start || start === this.state.project) return;
    this.past.push(start);
    if (this.past.length > HISTORY_LIMIT) this.past.shift();
    this.future = [];
    this.set({ canUndo: true, canRedo: false });
  }

  undo = (): void => {
    const previous = this.past.pop();
    if (!previous) return;
    this.future.push(this.state.project);
    this.restore(previous);
    this.notify('Action annulée.');
  };

  redo = (): void => {
    const next = this.future.pop();
    if (!next) return;
    this.past.push(this.state.project);
    this.restore(next);
    this.notify('Action rétablie.');
  };

  private restore(project: StudioProject): void {
    const scene = getActiveScene(project);
    const selectedId = this.state.selectedId && scene.nodes[this.state.selectedId] ? this.state.selectedId : null;
    this.set({
      project,
      selectedId,
      selectedKeys: [],
      overrides: {},
      canUndo: this.past.length > 0,
      canRedo: this.future.length > 0,
      saveState: 'dirty',
    });
  }

  /* ----- sélection et interface ----- */

  select = (id: string | null): void => {
    if (id === this.state.selectedId) return;
    const scene = this.scene;
    const expanded = { ...this.state.expanded };
    // Déplie les ancêtres pour que l'élément soit visible dans la hiérarchie.
    let parentId = id ? scene.nodes[id]?.parentId : null;
    while (parentId) {
      expanded[parentId] = true;
      parentId = scene.nodes[parentId]?.parentId ?? null;
    }
    this.set({ selectedId: id, expanded });
  };

  setTool = (tool: Tool): void => this.set({ tool });

  setViewMode = (viewMode: ViewMode): void => {
    const scene = this.scene;
    let viewCameraId = this.state.viewCameraId;
    if (!viewCameraId || scene.nodes[viewCameraId]?.kind !== 'camera') {
      viewCameraId = scene.viewer.mainCameraId ?? Object.values(scene.nodes).find((node) => node.kind === 'camera')?.id ?? null;
    }
    if (viewMode !== 'edit' && !viewCameraId) {
      this.notify('Ajoutez une caméra à la scène pour utiliser ce mode.', 'error');
      return;
    }
    this.set({ viewMode, viewCameraId });
  };

  /** Passe le viewport sur la vue d'une caméra de scène. */
  viewThroughCamera = (cameraId: string): void => {
    if (this.scene.nodes[cameraId]?.kind !== 'camera') return;
    this.set({ viewMode: 'camera', viewCameraId: cameraId, selectedId: cameraId });
  };

  /** Choisit la caméra de scène des modes caméra / aperçu (sans changer de mode). */
  setViewCamera = (cameraId: string): void => {
    if (this.scene.nodes[cameraId]?.kind !== 'camera') return;
    this.set({ viewCameraId: cameraId });
  };

  setEditorProjection = (editorProjection: Projection): void => this.set({ editorProjection });

  setSetting = <K extends keyof StudioSettings>(name: K, value: StudioSettings[K]): void =>
    this.set({ settings: { ...this.state.settings, [name]: value } });

  toggleExpanded = (id: string, value?: boolean): void =>
    this.set({ expanded: { ...this.state.expanded, [id]: value ?? this.state.expanded[id] === false } });

  toggleTrackGroup = (nodeId: string): void =>
    this.set({ collapsedTracks: { ...this.state.collapsedTracks, [nodeId]: !this.state.collapsedTracks[nodeId] } });

  setTimelineZoom = (zoom: number): void => this.set({ timelineZoom: Math.min(40, Math.max(2, zoom)) });

  requestFrameSelection = (): void => this.set({ frameRequest: this.state.frameRequest + 1 });

  setAutoKey = (autoKey: boolean): void => this.set({ autoKey });

  /* ----- temps et lecture ----- */

  setFrame = (frame: number): void => {
    const clip = this.clip;
    const clamped = Math.min(clip.duration, Math.max(0, frame));
    if (clamped === this.state.frame) return;
    // Changer d'image abandonne les valeurs temporaires non enregistrées.
    this.set({ frame: clamped, overrides: {} });
  };

  play = (): void => {
    if (this.state.playing) return;
    const clip = this.clip;
    if (!clip.loop && this.state.frame >= clip.duration) this.set({ frame: 0 });
    this.set({ playing: true, overrides: {} });
    this.lastTick = performance.now();
    const tick = (now: number) => {
      const current = this.clip;
      const delta = ((now - this.lastTick) / 1000) * current.fps * current.speed;
      this.lastTick = now;
      let next = this.state.frame + delta;
      if (next > current.duration) {
        if (current.loop) next %= current.duration || 1;
        else {
          this.set({ frame: current.duration, playing: false });
          return;
        }
      }
      if (next < 0) next = current.loop ? current.duration + next : 0;
      this.set({ frame: next });
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  };

  pause = (): void => {
    cancelAnimationFrame(this.raf);
    if (this.state.playing) this.set({ playing: false, frame: Math.round(this.state.frame) });
  };

  togglePlay = (): void => (this.state.playing ? this.pause() : this.play());

  stepFrame = (delta: number): void => {
    this.pause();
    this.setFrame(Math.round(this.state.frame) + delta);
  };

  /** Va à la keyframe précédente (-1) ou suivante (+1) des pistes visibles. */
  jumpToKey = (direction: 1 | -1): void => {
    this.pause();
    const frames = new Set<number>();
    const selected = this.state.selectedId;
    for (const trackItem of this.clip.tracks) {
      if (selected && trackItem.nodeId !== selected) continue;
      trackItem.keys.forEach((keyframe) => frames.add(keyframe.frame));
    }
    if (frames.size === 0) for (const trackItem of this.clip.tracks) trackItem.keys.forEach((keyframe) => frames.add(keyframe.frame));
    const sorted = [...frames].sort((a, b) => a - b);
    const current = Math.round(this.state.frame);
    const target = direction > 0 ? sorted.find((frame) => frame > current) : [...sorted].reverse().find((frame) => frame < current);
    if (target !== undefined) this.setFrame(target);
  };

  /* ----- propriétés et keyframes ----- */

  /**
   * Modifie une propriété (inspecteur ou viewport) en respectant la règle de
   * keyframing décrite en tête de fichier.
   */
  setProperty = (nodeId: string, property: AnimProperty, value: number[]): void => {
    const node = this.scene.nodes[nodeId];
    if (!node || node.locked) return;
    const frame = Math.round(this.state.frame);
    const existing = findTrack(this.clip, nodeId, property);

    if (existing) {
      const keyAtFrame = existing.keys.find((keyframe) => keyframe.frame === frame);
      if (this.state.autoKey || keyAtFrame) {
        this.edit((scene) => {
          const trackItem = findTrack(getActiveClip(scene), nodeId, property)!;
          const target = trackItem.keys.find((keyframe) => keyframe.frame === frame);
          if (target) target.value = value.slice();
          else {
            trackItem.keys.push(makeKey(frame, value.slice(), getActiveClip(scene)!.defaultInterpolation));
            sortKeys(trackItem);
          }
        });
        return;
      }
      this.set({ overrides: { ...this.state.overrides, [overrideKey(nodeId, property)]: value.slice() } });
      return;
    }

    if (this.state.autoKey) {
      this.edit((scene) => {
        const clip = getActiveClip(scene)!;
        clip.tracks.push({ id: uid('trk'), nodeId, property, keys: [makeKey(frame, value.slice(), clip.defaultInterpolation)] });
      });
      return;
    }

    this.edit((scene) => {
      const target = scene.nodes[nodeId]!;
      if (property === 'fov' || property === 'zoom') {
        if (target.camera) target.camera[property] = value[0] ?? target.camera[property];
      } else {
        target.transform[property] = [value[0] ?? 0, value[1] ?? 0, value[2] ?? 0];
      }
    });
  };

  /** Enregistre la valeur affichée d'une propriété en keyframe à l'image courante. */
  insertKey = (nodeId: string, property: AnimProperty): void => {
    const node = this.scene.nodes[nodeId];
    if (!node) return;
    const value = evaluatedValue(this.getEvaluation().get(nodeId), node, property);
    const frame = Math.round(this.state.frame);
    this.edit((scene) => {
      const clip = getActiveClip(scene)!;
      let trackItem = findTrack(clip, nodeId, property);
      if (!trackItem) {
        trackItem = { id: uid('trk'), nodeId, property, keys: [] };
        clip.tracks.push(trackItem);
      }
      const existing = trackItem.keys.find((keyframe) => keyframe.frame === frame);
      if (existing) existing.value = value;
      else trackItem.keys.push(makeKey(frame, value, clip.defaultInterpolation));
      sortKeys(trackItem);
    });
    this.notify(`Keyframe ${property === 'rotation' ? 'de rotation' : property === 'scale' ? 'd’échelle' : property === 'position' ? 'de position' : ''} enregistrée à l’image ${frame}.`);
  };

  /** Clés sur toutes les propriétés animables du composant (raccourci K). */
  insertKeysForNode = (nodeId: string): void => {
    const scene = this.scene;
    const node = scene.nodes[nodeId];
    if (!node) return;
    const properties = animatableProperties(node, scene.dimension);
    if (properties.length === 0) {
      this.notify('Ce composant n’a pas de propriété animable.', 'error');
      return;
    }
    const evaluation = this.getEvaluation().get(nodeId);
    const frame = Math.round(this.state.frame);
    this.edit((draft) => {
      const clip = getActiveClip(draft)!;
      for (const property of properties) {
        const value = evaluatedValue(evaluation, node, property);
        let trackItem = findTrack(clip, nodeId, property);
        if (!trackItem) {
          trackItem = { id: uid('trk'), nodeId, property, keys: [] };
          clip.tracks.push(trackItem);
        }
        const existing = trackItem.keys.find((keyframe) => keyframe.frame === frame);
        if (existing) existing.value = value;
        else trackItem.keys.push(makeKey(frame, value, clip.defaultInterpolation));
        sortKeys(trackItem);
      }
    });
    this.notify(`Keyframes de « ${node.name} » enregistrées à l’image ${frame}.`);
  };

  /** Supprime la keyframe d'une propriété à l'image courante. */
  removeKeyAtFrame = (nodeId: string, property: AnimProperty): void => {
    const frame = Math.round(this.state.frame);
    this.edit((scene) => {
      const clip = getActiveClip(scene)!;
      const trackItem = findTrack(clip, nodeId, property);
      if (!trackItem) return false;
      const before = trackItem.keys.length;
      trackItem.keys = trackItem.keys.filter((keyframe) => keyframe.frame !== frame);
      if (trackItem.keys.length === before) return false;
      // Une piste vide disparaît ; la valeur courante devient la valeur de base.
      if (trackItem.keys.length === 0) {
        clip.tracks = clip.tracks.filter((item) => item !== trackItem);
      }
    });
  };

  selectKeys = (refs: KeyRef[], mode: 'replace' | 'toggle' | 'add' = 'replace'): void => {
    if (mode === 'replace') {
      this.set({ selectedKeys: refs });
      return;
    }
    const current = [...this.state.selectedKeys];
    for (const ref of refs) {
      const index = current.findIndex((item) => item.keyId === ref.keyId);
      if (index >= 0) {
        if (mode === 'toggle') current.splice(index, 1);
      } else current.push(ref);
    }
    this.set({ selectedKeys: current });
  };

  deleteSelectedKeys = (): void => {
    const ids = new Set(this.state.selectedKeys.map((ref) => ref.keyId));
    if (ids.size === 0) return;
    this.edit((scene) => {
      const clip = getActiveClip(scene)!;
      for (const trackItem of clip.tracks) trackItem.keys = trackItem.keys.filter((keyframe) => !ids.has(keyframe.id));
      clip.tracks = clip.tracks.filter((trackItem) => trackItem.keys.length > 0);
    });
    this.set({ selectedKeys: [] });
    this.notify(`${ids.size} keyframe${ids.size > 1 ? 's' : ''} supprimée${ids.size > 1 ? 's' : ''}.`);
  };

  /**
   * Déplace les keyframes sélectionnées de `delta` images par rapport à leur
   * position d'origine (appelé en continu pendant un glisser).
   */
  moveKeys = (origin: Map<string, number>, delta: number): void => {
    const duration = this.clip.duration;
    let clampedDelta = delta;
    for (const frame of origin.values()) {
      clampedDelta = Math.max(clampedDelta, -frame);
      clampedDelta = Math.min(clampedDelta, duration - frame);
    }
    this.edit((scene) => {
      const clip = getActiveClip(scene)!;
      for (const trackItem of clip.tracks) {
        let moved = false;
        for (const keyframe of trackItem.keys) {
          const start = origin.get(keyframe.id);
          if (start !== undefined) {
            keyframe.frame = start + clampedDelta;
            moved = true;
          }
        }
        if (moved) sortKeys(trackItem);
      }
    });
  };

  /** Fin d'un glisser de keyframes : une clé déplacée remplace celle qu'elle recouvre. */
  resolveKeyCollisions = (): void => {
    const moving = new Set(this.state.selectedKeys.map((ref) => ref.keyId));
    const clip = this.clip;
    const collides = clip.tracks.some((trackItem) =>
      trackItem.keys.some((keyframe) => !moving.has(keyframe.id) && trackItem.keys.some((other) => other !== keyframe && moving.has(other.id) && other.frame === keyframe.frame)),
    );
    if (!collides) return;
    this.edit((scene) => {
      for (const trackItem of getActiveClip(scene)!.tracks) {
        trackItem.keys = trackItem.keys.filter(
          (keyframe) => moving.has(keyframe.id) || !trackItem.keys.some((other) => moving.has(other.id) && other.frame === keyframe.frame),
        );
      }
    });
  };

  setKeysInterpolation = (interpolation: Interpolation): void => {
    const ids = new Set(this.state.selectedKeys.map((ref) => ref.keyId));
    if (ids.size === 0) return;
    this.edit((scene) => {
      for (const trackItem of getActiveClip(scene)!.tracks) {
        for (const keyframe of trackItem.keys) if (ids.has(keyframe.id)) keyframe.interpolation = interpolation;
      }
    });
  };

  setKeyBezier = (keyId: string, bezier: Keyframe['bezier']): void => {
    this.edit((scene) => {
      for (const trackItem of getActiveClip(scene)!.tracks) {
        const keyframe = trackItem.keys.find((item) => item.id === keyId);
        if (keyframe) {
          keyframe.bezier = bezier;
          keyframe.interpolation = 'bezier';
        }
      }
    });
  };

  setKeyValue = (keyId: string, value: number[]): void => {
    this.edit((scene) => {
      for (const trackItem of getActiveClip(scene)!.tracks) {
        const keyframe = trackItem.keys.find((item) => item.id === keyId);
        if (keyframe) keyframe.value = value;
      }
    });
  };

  copyKeys = (): void => {
    const ids = new Set(this.state.selectedKeys.map((ref) => ref.keyId));
    const copied: ClipboardKey[] = [];
    for (const trackItem of this.clip.tracks) {
      for (const keyframe of trackItem.keys) {
        if (ids.has(keyframe.id)) {
          copied.push({ nodeId: trackItem.nodeId, property: trackItem.property, offset: keyframe.frame, value: keyframe.value.slice(), interpolation: keyframe.interpolation, bezier: [...keyframe.bezier] });
        }
      }
    }
    if (copied.length === 0) return;
    const first = Math.min(...copied.map((item) => item.offset));
    copied.forEach((item) => (item.offset -= first));
    this.set({ clipboard: copied });
    this.notify(`${copied.length} keyframe${copied.length > 1 ? 's' : ''} copiée${copied.length > 1 ? 's' : ''}.`);
  };

  /** Colle les clés copiées à partir de l'image courante. */
  pasteKeys = (): void => {
    const clipboard = this.state.clipboard;
    if (clipboard.length === 0) return;
    const start = Math.round(this.state.frame);
    const pasted: KeyRef[] = [];
    this.edit((scene) => {
      const clip = getActiveClip(scene)!;
      for (const item of clipboard) {
        if (!scene.nodes[item.nodeId]) continue;
        const frame = Math.min(clip.duration, start + item.offset);
        let trackItem = findTrack(clip, item.nodeId, item.property);
        if (!trackItem) {
          trackItem = { id: uid('trk'), nodeId: item.nodeId, property: item.property, keys: [] };
          clip.tracks.push(trackItem);
        }
        trackItem.keys = trackItem.keys.filter((keyframe) => keyframe.frame !== frame);
        const keyframe: Keyframe = { id: uid('k'), frame, value: item.value.slice(), interpolation: item.interpolation, bezier: [...item.bezier] };
        trackItem.keys.push(keyframe);
        sortKeys(trackItem);
        pasted.push({ trackId: trackItem.id, keyId: keyframe.id });
      }
    });
    this.set({ selectedKeys: pasted });
    this.notify(`${pasted.length} keyframe${pasted.length > 1 ? 's' : ''} collée${pasted.length > 1 ? 's' : ''} à l’image ${start}.`);
  };

  /* ----- clips ----- */

  updateClip = (patch: Partial<Omit<AnimationClip, 'id' | 'tracks'>>): void => {
    this.edit((scene) => {
      const clip = getActiveClip(scene)!;
      Object.assign(clip, patch);
      if (patch.duration !== undefined) {
        clip.duration = Math.max(1, Math.round(patch.duration));
      }
    });
    if (this.state.frame > this.clip.duration) this.setFrame(this.clip.duration);
  };

  addClip = (): void => {
    const clip = makeClip(`Clip_${String(this.scene.clips.length + 1).padStart(2, '0')}`, this.clip.duration, this.clip.fps);
    this.edit((scene) => {
      scene.clips.push(clip);
      scene.activeClipId = clip.id;
    });
    this.set({ frame: 0, selectedKeys: [] });
    this.notify(`Clip « ${clip.name} » créé.`);
  };

  setActiveClip = (clipId: string): void => {
    this.edit((scene) => {
      if (!scene.clips.some((clip) => clip.id === clipId)) return false;
      scene.activeClipId = clipId;
    });
    this.set({ frame: 0, selectedKeys: [] });
  };

  /* ----- composants ----- */

  /** Modifie les données propres à un composant (matériau, caméra, lumière…). */
  updateNode = (nodeId: string, mutate: (node: SceneNode, scene: StudioScene) => void): void => {
    this.edit((scene) => {
      const node = scene.nodes[nodeId];
      if (!node) return false;
      mutate(node, scene);
    }, { keepOverrides: true });
  };

  renameNode = (nodeId: string, name: string): void => {
    const trimmed = name.trim().slice(0, 60);
    if (!trimmed) return;
    this.updateNode(nodeId, (node) => {
      node.name = trimmed;
    });
  };

  toggleVisible = (nodeId: string): void => this.updateNode(nodeId, (node) => void (node.visible = !node.visible));

  toggleLocked = (nodeId: string): void => this.updateNode(nodeId, (node) => void (node.locked = !node.locked));

  deleteNode = (nodeId: string): void => {
    const scene = this.scene;
    const node = scene.nodes[nodeId];
    if (!node || node.kind === 'root') return;
    const ids = new Set(subtreeIds(scene, nodeId));
    this.edit((draft) => {
      const parent = node.parentId ? draft.nodes[node.parentId] : undefined;
      if (parent) parent.children = parent.children.filter((id) => id !== nodeId);
      ids.forEach((id) => delete draft.nodes[id]);
      for (const clip of draft.clips) clip.tracks = clip.tracks.filter((trackItem) => !ids.has(trackItem.nodeId));
      if (draft.viewer.mainCameraId && ids.has(draft.viewer.mainCameraId)) draft.viewer.mainCameraId = null;
      draft.viewer.povs = draft.viewer.povs.filter((pov) => !ids.has(pov.cameraId));
      for (const other of Object.values(draft.nodes)) {
        if (other.mesh?.skin) other.mesh.skin.parts = other.mesh.skin.parts.filter((part) => !ids.has(part.boneId));
        if (other.sprite?.skin) other.sprite.skin.parts = other.sprite.skin.parts.filter((part) => !ids.has(part.boneId));
        if (other.control?.targetBoneId && ids.has(other.control.targetBoneId)) {
          other.control.targetBoneId = undefined;
          other.control.constraint = 'none';
        }
      }
    });
    const patch: Partial<StudioState> = { selectedKeys: [] };
    if (this.state.selectedId && ids.has(this.state.selectedId)) patch.selectedId = node.parentId;
    if (this.state.viewCameraId && ids.has(this.state.viewCameraId)) {
      patch.viewCameraId = this.scene.viewer.mainCameraId;
      if (!patch.viewCameraId) patch.viewMode = 'edit';
    }
    this.set(patch);
    this.notify(`« ${node.name} » supprimé${ids.size > 1 ? ` (avec ${ids.size - 1} enfant${ids.size > 2 ? 's' : ''})` : ''}.`);
  };

  /**
   * Déplace un composant dans la hiérarchie (glisser-déposer).
   * @param position « inside » : dernier enfant de targetId ; « before » /
   *                 « after » : frère de targetId.
   */
  moveNode = (nodeId: string, targetId: string, position: 'inside' | 'before' | 'after'): boolean => {
    const scene = this.scene;
    const node = scene.nodes[nodeId];
    const target = scene.nodes[targetId];
    if (!node || !target || node.kind === 'root' || nodeId === targetId) return false;
    const parentId = position === 'inside' ? targetId : target.parentId;
    if (!parentId) return false;
    if (parentId === nodeId || isDescendant(scene, parentId, nodeId)) {
      this.notify('Impossible de placer un composant dans l’un de ses enfants.', 'error');
      return false;
    }
    const parent = scene.nodes[parentId]!;
    if (node.kind === 'bone' && parent.kind !== 'bone' && parent.kind !== 'skeleton') {
      this.notify('Un bone doit rester dans un squelette (Skeleton) ou sous un autre bone.', 'error');
      return false;
    }
    return this.edit((draft) => {
      const moving = draft.nodes[nodeId]!;
      const oldParent = moving.parentId ? draft.nodes[moving.parentId] : undefined;
      if (oldParent) oldParent.children = oldParent.children.filter((id) => id !== nodeId);
      const newParent = draft.nodes[parentId]!;
      let index = newParent.children.length;
      if (position !== 'inside') {
        index = newParent.children.indexOf(targetId);
        if (position === 'after') index += 1;
      }
      newParent.children.splice(index, 0, nodeId);
      moving.parentId = parentId;
    });
  };

  /** Crée un composant et le sélectionne. */
  addNode = (kind: NodeKind, options: { shape?: PrimitiveShape; lightType?: 'directional' | 'point' | 'ambient'; parentId?: string } = {}): string | null => {
    const scene = this.scene;
    const parentId = options.parentId ?? defaultParent(scene, this.state.selectedId, kind);
    const parent = scene.nodes[parentId];
    if (!parent) return null;
    if (kind === 'bone' && parent.kind !== 'skeleton' && parent.kind !== 'bone') {
      this.notify('Sélectionnez un squelette ou un bone pour y ajouter un bone.', 'error');
      return null;
    }
    const is2d = scene.dimension === '2d';
    let created: SceneNode;
    let createdId = '';
    switch (kind) {
      case 'group':
        created = makeNode('group', 'Groupe');
        break;
      case 'mesh':
        created = makeMesh(options.shape ?? 'box', SHAPE_LABELS[options.shape ?? 'box'], '#c4693f');
        break;
      case 'sprite':
        created = makeSprite('Sprite', 1.2, 1.2, '#e0774a', [0, 0, 0.1]);
        break;
      case 'camera': {
        const count = Object.values(scene.nodes).filter((node) => node.kind === 'camera').length + 1;
        created = makeCamera(is2d ? `Camera2D_${count}` : `Camera3D_${count}`, scene.dimension, is2d ? [0, 0, 10] : [3, 2, 5], [0, 1, 0]);
        break;
      }
      case 'light':
        created = makeLight(options.lightType === 'point' ? 'Lumière ponctuelle' : options.lightType === 'ambient' ? 'Ambiance' : 'Lumière', options.lightType ?? 'directional', options.lightType === 'point' ? [0, 2, 1] : [3, 5, 2]);
        break;
      case 'bone': {
        const parentLength = parent.kind === 'bone' ? (parent.bone?.length ?? 0.4) : 0;
        created = makeNode('bone', `Bone_${Object.values(scene.nodes).filter((node) => node.kind === 'bone').length + 1}`, {
          transform: { position: [0, parentLength, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
          bone: { length: 0.4, color: '#fdcf7b' },
        });
        break;
      }
      case 'control':
        created = makeControl('Point_Controle', [0, parent.kind === 'bone' ? (parent.bone?.length ?? 0.4) : 0.5, 0.3]);
        break;
      case 'skeleton': {
        created = makeNode(is2d ? 'skeleton' : 'skeleton', is2d ? 'Skeleton2D' : 'Skeleton3D', {
          skeleton: { showBones: true, deformation: 'rigid', boneColor: '#fdcf7b' },
        });
        const bone = makeNode('bone', 'Bone_Racine', { bone: { length: 0.5, color: '#fdcf7b' } });
        createdId = created.id;
        this.edit((draft) => {
          attach(draft.nodes, created, parentId);
          attach(draft.nodes, bone, created.id);
        });
        this.set({ selectedId: createdId, expanded: { ...this.state.expanded, [parentId]: true, [createdId]: true } });
        this.notify('Squelette créé avec un bone racine.');
        return createdId;
      }
      case 'animationPlayer':
        created = makeNode('animationPlayer', 'AnimationPlayer');
        break;
      default:
        created = makeNode('group', 'Groupe');
    }
    createdId = created.id;
    this.edit((draft) => attach(draft.nodes, created, parentId));
    this.set({ selectedId: createdId, expanded: { ...this.state.expanded, [parentId]: true } });
    this.notify(`« ${created.name} » ajouté à « ${parent.name} ».`);
    return createdId;
  };

  /* ----- caméras du spectateur ----- */

  updateViewer = (mutate: (viewer: StudioScene['viewer'], scene: StudioScene) => void): void => {
    this.edit((scene) => mutate(scene.viewer, scene), { keepOverrides: true });
  };

  /* ----- scènes ----- */

  setActiveScene = (sceneId: string): void => {
    if (sceneId === this.state.project.activeSceneId) return;
    this.pause();
    const project = { ...this.state.project, activeSceneId: sceneId };
    const scene = getActiveScene(project);
    // Changer de scène n'est pas une modification du contenu : hors historique.
    this.set({
      project,
      selectedId: null,
      selectedKeys: [],
      frame: 0,
      overrides: {},
      viewMode: 'edit',
      viewCameraId: scene.viewer.mainCameraId,
      editorProjection: scene.dimension === '2d' ? 'orthographic' : 'perspective',
      tool: this.state.tool,
    });
  };

  addScene = (dimension: SceneDimension): void => {
    const count = this.state.project.scenes.length + 1;
    const scene = makeEmptyScene(`Scène ${count} (${dimension.toUpperCase()})`, dimension);
    this.edit((_active, project) => {
      project.scenes.push(scene);
    });
    this.setActiveScene(scene.id);
    this.notify(`Scène ${dimension.toUpperCase()} « ${scene.name} » créée.`);
  };

  renameScene = (name: string): void => {
    const trimmed = name.trim().slice(0, 60);
    if (!trimmed) return;
    this.edit((scene) => {
      scene.name = trimmed;
      const root = scene.nodes[scene.rootId];
      if (root) root.name = trimmed;
    });
  };

  deleteScene = (): void => {
    const project = this.state.project;
    if (project.scenes.length <= 1) {
      this.notify('Un projet contient au moins une scène.', 'error');
      return;
    }
    const removed = this.scene;
    this.edit((_scene, draft) => {
      draft.scenes = draft.scenes.filter((scene) => scene.id !== removed.id);
      draft.activeSceneId = draft.scenes[0]!.id;
    });
    const next = this.scene;
    this.set({ selectedId: null, selectedKeys: [], frame: 0, viewMode: 'edit', viewCameraId: next.viewer.mainCameraId });
    this.notify(`Scène « ${removed.name} » supprimée.`);
  };

  renameProject = (name: string): void => {
    const trimmed = name.trim().slice(0, 80);
    if (!trimmed) return;
    this.edit((_scene, project) => {
      project.name = trimmed;
    });
  };

  /* ----- assets ----- */

  addAsset = (asset: StudioAsset): void => {
    this.edit((_scene, project) => {
      project.assets.push(asset);
    }, { keepOverrides: true });
    this.notify(`« ${asset.name} » importé.`);
  };

  removeAsset = (assetId: string): void => {
    const project = this.state.project;
    const asset = project.assets.find((item) => item.id === assetId);
    if (!asset) return;
    const used = project.scenes.some((scene) =>
      Object.values(scene.nodes).some((node) => node.sprite?.assetId === assetId || node.mesh?.textureAssetId === assetId || node.model?.assetId === assetId),
    );
    if (used) {
      this.notify(`« ${asset.name} » est utilisé dans une scène : supprimez d’abord les composants qui l’emploient.`, 'error');
      return;
    }
    this.edit((_scene, draft) => {
      draft.assets = draft.assets.filter((item) => item.id !== assetId);
    }, { keepOverrides: true });
    if (asset.url?.startsWith('blob:')) URL.revokeObjectURL(asset.url);
    this.notify(`« ${asset.name} » supprimé des assets.`);
  };

  /**
   * Utilise un asset : instancie un composant dans la scène, ou l'applique
   * au composant ciblé (matériau, préréglage d'animation).
   * @returns l'identifiant du composant créé ou modifié.
   */
  useAsset = (assetId: string, options: { targetId?: string | null; position?: Vec3 } = {}): string | null => {
    const asset = this.state.project.assets.find((item) => item.id === assetId);
    if (!asset) return null;
    const scene = this.scene;
    const is2d = scene.dimension === '2d';
    const target = options.targetId ? scene.nodes[options.targetId] : undefined;
    const position: Vec3 = options.position ?? [0, 0, 0];

    if (asset.type === 'material') {
      if (!target || (!target.mesh && !target.sprite)) {
        this.notify('Déposez un matériau sur un objet de la scène (viewport ou hiérarchie).', 'error');
        return null;
      }
      this.updateNode(target.id, (node) => {
        if (node.mesh) {
          node.mesh.color = asset.color ?? node.mesh.color;
          node.mesh.skin?.parts.forEach((part) => (part.color = asset.color ?? part.color));
        }
        if (node.sprite) node.sprite.color = asset.color ?? node.sprite.color;
      });
      this.select(target.id);
      this.notify(`Matériau « ${asset.name} » appliqué à « ${target.name} ».`);
      return target.id;
    }

    if (asset.type === 'animation') {
      const node = target ?? (this.state.selectedId ? scene.nodes[this.state.selectedId] : undefined);
      if (!node || node.kind === 'root' || node.kind === 'animationPlayer') {
        this.notify('Déposez une animation sur un objet, un bone ou une caméra.', 'error');
        return null;
      }
      const clip = this.clip;
      const end = clip.duration;
      const base = node.transform;
      this.edit((draft) => {
        const draftClip = getActiveClip(draft)!;
        const upsert = (property: AnimProperty, keys: Keyframe[]) => {
          draftClip.tracks = draftClip.tracks.filter((trackItem) => !(trackItem.nodeId === node.id && trackItem.property === property));
          draftClip.tracks.push({ id: uid('trk'), nodeId: node.id, property, keys });
        };
        if (asset.preset === 'spin') {
          const axis = is2d ? 2 : 1;
          const from = [...base.rotation];
          const to = [...base.rotation];
          to[axis] = (to[axis] ?? 0) + 360;
          upsert('rotation', [makeKey(0, from, 'linear'), makeKey(end, to, 'linear')]);
        } else if (asset.preset === 'bounce') {
          const low = [...base.position];
          const high = [...base.position];
          high[1] = (high[1] ?? 0) + 0.8;
          const half = Math.round(end / 2);
          upsert('position', [makeKey(0, low, 'easeOut'), makeKey(half, high, 'easeIn'), makeKey(end, low, 'easeOut')]);
        } else {
          const left = [...base.rotation];
          const right = [...base.rotation];
          left[2] = (left[2] ?? 0) - 12;
          right[2] = (right[2] ?? 0) + 12;
          const q = Math.round(end / 4);
          upsert('rotation', [makeKey(0, [...base.rotation]), makeKey(q, left), makeKey(q * 3, right), makeKey(end, [...base.rotation])]);
        }
      });
      this.select(node.id);
      this.notify(`Animation « ${asset.name} » ajoutée à « ${node.name} » (${end} images).`);
      return node.id;
    }

    if (asset.type === 'audio') {
      this.notify('Les pistes audio ne sont pas encore prises en charge par la timeline.', 'error');
      return null;
    }

    if (asset.dimension && asset.dimension !== scene.dimension) {
      this.notify(`« ${asset.name} » est un asset ${asset.dimension.toUpperCase()} : ouvrez une scène ${asset.dimension.toUpperCase()}.`, 'error');
      return null;
    }

    const parentId =
      target && (target.kind === 'group' || target.kind === 'root' || target.kind === 'bone') ? target.id : defaultParent(scene, null, 'group');

    if (asset.type === 'character') {
      let ids: { characterId: string } | null = null;
      this.edit((draft) => {
        ids = buildCharacter(
          draft.nodes,
          parentId,
          draft.dimension,
          asset.preset === 'pantin2d' ? 'Pantin' : 'Mannequin',
          is2d ? [position[0], position[1], 0] : [position[0], 0, position[2]],
          { body: asset.color ?? '#be4d3d', head: '#f1d8bd', limbs: '#e0774a' },
        );
      });
      const created = (ids as { characterId: string } | null)?.characterId ?? null;
      if (created) this.set({ selectedId: created, expanded: { ...this.state.expanded, [parentId]: true } });
      this.notify(`Personnage « ${asset.name} » ajouté (squelette et AnimationPlayer inclus).`);
      return created;
    }

    let node: SceneNode;
    if (asset.type === 'primitive') {
      node = makeMesh(asset.shape ?? 'box', asset.name, asset.color, [position[0], 0, position[2]]);
    } else if (asset.type === 'environment') {
      if (asset.preset === 'backdrop') {
        node = makeSprite(asset.name, 16, 9, asset.color ?? '#3d2818', [0, 0, -1.5], 'rect');
        node.sprite!.layer = -10;
      } else {
        node = makeMesh('plane', asset.name, asset.color ?? '#3b2a1d');
        node.mesh!.size = [12, 12, 0];
      }
      node.kind = 'environment';
    } else if (asset.type === 'texture') {
      if (is2d) {
        node = makeSprite(asset.name, 2, 2, '#ffffff', [position[0], position[1], 0.1], 'rect');
        node.sprite!.assetId = asset.id;
      } else {
        node = makeMesh('plane', asset.name, '#ffffff', [position[0], 1, position[2]]);
        node.transform.rotation = [0, 0, 0];
        node.mesh!.textureAssetId = asset.id;
      }
    } else if (asset.type === 'model') {
      node = makeNode('model', asset.name, { model: { assetId: asset.id }, transform: { position: [position[0], 0, position[2]], rotation: [0, 0, 0], scale: [1, 1, 1] } });
    } else {
      return null;
    }
    if (is2d && node.kind === 'mesh') return null;
    this.edit((draft) => attach(draft.nodes, node, parentId));
    this.set({ selectedId: node.id, expanded: { ...this.state.expanded, [parentId]: true } });
    this.notify(`« ${node.name} » ajouté à la scène.`);
    return node.id;
  };

  /* ----- fichiers ----- */

  save = (): boolean => {
    try {
      window.localStorage.setItem(STUDIO_STORAGE_KEY, serializeProject(this.state.project));
      const now = Date.now();
      this.set({ saveState: 'saved', lastSavedAt: now });
      this.notify('Projet enregistré dans ce navigateur.');
      return true;
    } catch {
      this.notify('Enregistrement impossible (stockage du navigateur plein ou bloqué). Exportez le projet en fichier.', 'error');
      return false;
    }
  };

  loadProject = (project: StudioProject, message: string): void => {
    this.pause();
    this.past = [];
    this.future = [];
    const scene = getActiveScene(project);
    this.set({
      project,
      selectedId: null,
      selectedKeys: [],
      frame: 0,
      overrides: {},
      viewMode: 'edit',
      viewCameraId: scene.viewer.mainCameraId,
      editorProjection: scene.dimension === '2d' ? 'orthographic' : 'perspective',
      canUndo: false,
      canRedo: false,
      saveState: 'dirty',
      expanded: {},
    });
    this.notify(message);
  };

  resetDemo = (): void => this.loadProject(createDemoProject(), 'Projet de démonstration rechargé.');

  dispose(): void {
    cancelAnimationFrame(this.raf);
    this.listeners.clear();
  }
}

/* -------------------------------------------------------------------------
   Accès React
   ------------------------------------------------------------------------- */


export const StudioStoreContext = createContext<StudioStore | null>(null);

export function useStudioStore(): StudioStore {
  const store = useContext(StudioStoreContext);
  if (!store) throw new Error('useStudioStore doit être utilisé dans <StudioApp>.');
  return store;
}

/** Abonnement à une partie de l'état. Le sélecteur doit renvoyer une valeur stable. */
export function useStudio<T>(selector: (state: StudioState) => T): T {
  const store = useStudioStore();
  return useSyncExternalStore(
    store.subscribe,
    () => selector(store.getState()),
    () => selector(store.getState()),
  );
}

export function useActiveScene(): StudioScene {
  return useStudio((state) => getActiveScene(state.project));
}

/** Évaluation (transformations animées) de la scène à l'image courante. */
export function useEvaluation(): Evaluation {
  const store = useStudioStore();
  // S'abonne aux trois entrées de l'évaluation, puis lit le cache du store.
  useStudio((state) => state.frame);
  useStudio((state) => state.overrides);
  useActiveScene();
  return store.getEvaluation();
}

export { baseValue };
