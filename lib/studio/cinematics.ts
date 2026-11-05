/**
 * Construction des cinématiques temps réel des séries (format Studio).
 *
 * buildCinematic(cinematic, series) → { scene, assets } : une StudioScene
 * complète (décor, personnages riggés en skinning pondéré, caméras du
 * spectateur avec points de vue et transitions, clip animé, son de
 * synthèse). Le même format est joué par le lecteur public (ScenePlayer)
 * et ouvert dans le Studio.
 *
 * Chaque mise en scène (archetype) est déclinée en 3D ou en 2D selon le
 * format de la série ; la palette, le décor et l'ambiance sonore dépendent
 * de la série.
 */
import type { Cinematic } from '@/data/cinematics';
import type { Series } from '@/lib/types';
import { DEFAULT_BEZIER } from './animation';
import { attach, buildCharacter, lookAtRotation, makeCamera, makeClip, makeControl, makeIkTarget, makeLight, makeMesh, makeNode, makeSprite, uid, type RigIds } from './factory';
import type { AnimProperty, AudioRef, Interpolation, Keyframe, PrimitiveShape, SceneNode, StudioAsset, StudioScene, SynthKind, Track, Vec3 } from './types';

const FPS = 24;

type Theme =
  | 'ruines'
  | 'falaises'
  | 'fleches'
  | 'miroirs'
  | 'colonnes'
  | 'engrenages'
  | 'phare'
  | 'moulins'
  | 'atelier'
  | 'sel'
  | 'iles'
  | 'station'
  | 'dunes'
  | 'lanternes'
  | 'glace'
  | 'prairie';

interface Style {
  theme: Theme;
  sky: string;
  ground: string;
  prop: string;
  glow: string;
  hero: { body: string; head: string; limbs: string };
  friend: { body: string; head: string; limbs: string };
  synth: SynthKind;
}

const STYLES: Record<string, Style> = {
  'echos-aelith': { theme: 'ruines', sky: '#1f1612', ground: '#3d2c20', prop: '#8a7460', glow: '#fdcf7b', hero: { body: '#be4d3d', head: '#f1d8bd', limbs: '#e0774a' }, friend: { body: '#6b4a2e', head: '#e8cfb2', limbs: '#9a6a44' }, synth: 'atelier' },
  'lune-rousse': { theme: 'falaises', sky: '#2a1410', ground: '#4a2216', prop: '#6a2c1c', glow: '#f08a4b', hero: { body: '#8f2915', head: '#f3dcc0', limbs: '#c64a28' }, friend: { body: '#5b3a22', head: '#e8cfb2', limbs: '#7a4a2a' }, synth: 'vent' },
  'horizons-perdus': { theme: 'fleches', sky: '#24201c', ground: '#5a4a38', prop: '#b8a07a', glow: '#fdcf7b', hero: { body: '#2f6f7a', head: '#f1d8bd', limbs: '#c9a26a' }, friend: { body: '#7a5a3a', head: '#e8cfb2', limbs: '#a07850' }, synth: 'vent' },
  'jardin-des-miroirs': { theme: 'miroirs', sky: '#1a2420', ground: '#2f4a32', prop: '#cfe6e0', glow: '#fff3c4', hero: { body: '#5a7a4a', head: '#f3dcc0', limbs: '#8aa070' }, friend: { body: '#3a3a40', head: '#d8d0c8', limbs: '#5a5a62' }, synth: 'nuit' },
  'au-dela-des-brumes': { theme: 'colonnes', sky: '#1c1a20', ground: '#3a3438', prop: '#c2462e', glow: '#e8e0f0', hero: { body: '#4a4458', head: '#efe0d0', limbs: '#6a6478' }, friend: { body: '#c2462e', head: '#efe0d0', limbs: '#8a3020' }, synth: 'vent' },
  'cite-des-engrenages': { theme: 'engrenages', sky: '#1a1c22', ground: '#4a4038', prop: '#c9a24a', glow: '#ffd27a', hero: { body: '#8a5a2a', head: '#f1d8bd', limbs: '#b07a3a' }, friend: { body: '#4a5a6a', head: '#e8cfb2', limbs: '#6a7a8a' }, synth: 'espace' },
  'phare-ysolde': { theme: 'phare', sky: '#101820', ground: '#2a3438', prop: '#e8e0d0', glow: '#fff0b0', hero: { body: '#2f4a6a', head: '#f1d8bd', limbs: '#4a6a8a' }, friend: { body: '#6a3a2a', head: '#e8cfb2', limbs: '#8a5a3a' }, synth: 'mer' },
  'forge-des-vents': { theme: 'moulins', sky: '#2a1c12', ground: '#7a4a24', prop: '#b07040', glow: '#ff9a4a', hero: { body: '#8a3a1a', head: '#f1d8bd', limbs: '#c06030' }, friend: { body: '#5a4030', head: '#e8cfb2', limbs: '#7a5a40' }, synth: 'vent' },
  'atelier-des-golems': { theme: 'atelier', sky: '#1e1510', ground: '#4a3424', prop: '#9a6a44', glow: '#ff8a3a', hero: { body: '#be4d3d', head: '#f1d8bd', limbs: '#e0774a' }, friend: { body: '#8a6a50', head: '#a88a70', limbs: '#7a5a40' }, synth: 'atelier' },
  'veilleurs-de-sel': { theme: 'sel', sky: '#2a2420', ground: '#e8e0d4', prop: '#c8bcae', glow: '#ffd8a0', hero: { body: '#5a4a3a', head: '#f1d8bd', limbs: '#7a6a5a' }, friend: { body: '#3a4a5a', head: '#e8cfb2', limbs: '#5a6a7a' }, synth: 'vent' },
  'archipel-des-lucioles': { theme: 'iles', sky: '#0e1420', ground: '#2a4a3a', prop: '#4a6a4a', glow: '#d8ff8a', hero: { body: '#2a5a6a', head: '#f1d8bd', limbs: '#3a7a8a' }, friend: { body: '#6a4a7a', head: '#e8cfb2', limbs: '#8a6a9a' }, synth: 'nuit' },
  'derniere-orbite': { theme: 'station', sky: '#06080e', ground: '#2a2e36', prop: '#8a96a8', glow: '#8ad0ff', hero: { body: '#d8d8e0', head: '#f1d8bd', limbs: '#a8b0c0' }, friend: { body: '#c06030', head: '#e8cfb2', limbs: '#a85a30' }, synth: 'espace' },
  'cartographe-des-dunes': { theme: 'dunes', sky: '#3a2414', ground: '#c08040', prop: '#a86a34', glow: '#ffd890', hero: { body: '#2f5a6a', head: '#f1d8bd', limbs: '#c9a26a' }, friend: { body: '#8a4a2a', head: '#e8cfb2', limbs: '#a86a40' }, synth: 'vent' },
  'nuit-des-lanternes': { theme: 'lanternes', sky: '#140e1c', ground: '#2a1e28', prop: '#ff9a4a', glow: '#ffc06a', hero: { body: '#c64a28', head: '#f3dcc0', limbs: '#e06f34' }, friend: { body: '#4a3a6a', head: '#e8cfb2', limbs: '#6a5a8a' }, synth: 'fete' },
  'murmures-du-glacier': { theme: 'glace', sky: '#0c1420', ground: '#cfe0ea', prop: '#9ac0d8', glow: '#9affd8', hero: { body: '#c04a3a', head: '#f1d8bd', limbs: '#e0e0e8' }, friend: { body: '#3a5a7a', head: '#e8cfb2', limbs: '#e0e0e8' }, synth: 'vent' },
  'brindille-et-caillou': { theme: 'prairie', sky: '#3a5a6a', ground: '#5a7a3a', prop: '#7f9a52', glow: '#fdcf7b', hero: { body: '#c96a3a', head: '#f3dcc0', limbs: '#9a4a2a' }, friend: { body: '#9c8e80', head: '#b0a294', limbs: '#8a7c6e' }, synth: 'fete' },
};

const TRANSITIONS: Record<Cinematic['archetype'], StudioScene['viewer']['transition']> = {
  rencontre: { type: 'cut', duration: 0.3 },
  voyage: { type: 'blend', duration: 1.2 },
  contemplation: { type: 'fade', duration: 0.8 },
  fete: { type: 'blend', duration: 1 },
  decouverte: { type: 'cut', duration: 0.3 },
  orbite: { type: 'blend', duration: 1.5 },
};

/* -------------------------------------------------------------------------
   Outils
   ------------------------------------------------------------------------- */

function seeded(text: string): () => number {
  let state = 2166136261;
  for (const char of text) state = Math.imul(state ^ char.charCodeAt(0), 16777619);
  return () => {
    state = Math.imul(state ^ (state >>> 15), 2246822507);
    state = Math.imul(state ^ (state >>> 13), 3266489909);
    state ^= state >>> 16;
    return (state >>> 0) / 4294967296;
  };
}

const r2 = (value: number) => Math.round(value * 1000) / 1000;

function k(frame: number, value: number[], interpolation: Interpolation = 'easeInOut'): Keyframe {
  return { id: uid('k'), frame: Math.round(frame), value: value.map(r2), interpolation, bezier: [...DEFAULT_BEZIER] };
}

class Builder {
  readonly nodes: Record<string, SceneNode> = {};
  readonly tracks: Track[] = [];
  readonly rootId: string;
  readonly worldId: string;
  readonly cameras: { id: string; label: string }[] = [];

  constructor(name: string) {
    const root = makeNode('root', name);
    attach(this.nodes, root, null);
    this.rootId = root.id;
    const world = makeNode('group', 'World');
    attach(this.nodes, world, root.id);
    this.worldId = world.id;
  }

  add(node: SceneNode, parentId = this.worldId): SceneNode {
    attach(this.nodes, node, parentId);
    return node;
  }

  group(name: string, position: Vec3 = [0, 0, 0], parentId = this.worldId): SceneNode {
    return this.add(makeNode('group', name, { transform: { position, rotation: [0, 0, 0], scale: [1, 1, 1] } }), parentId);
  }

  track(nodeId: string, property: AnimProperty, keys: Keyframe[]): void {
    const existing = this.tracks.find((item) => item.nodeId === nodeId && item.property === property);
    if (existing) {
      existing.keys = [...existing.keys.filter((key) => !keys.some((item) => item.frame === key.frame)), ...keys].sort((a, b) => a.frame - b.frame);
      return;
    }
    this.tracks.push({ id: uid('trk'), nodeId, property, keys: [...keys].sort((a, b) => a.frame - b.frame) });
  }

  /** Caméra 3D qui suit une trajectoire en visant une cible (keyframes toutes les `step` images). */
  camera3d(name: string, label: string, frames: number, path: (t: number) => Vec3, target: (t: number) => Vec3, fov = 38, step = 12): string {
    const camera = this.add(makeCamera(name, '3d', path(0), target(0)));
    camera.camera!.fov = fov;
    camera.camera!.far = 300;
    const positions: Keyframe[] = [];
    const rotations: Keyframe[] = [];
    let previousYaw: number | null = null;
    for (let frame = 0; frame <= frames; frame += step) {
      const t = frame / frames;
      const position = path(t);
      const rotation = lookAtRotation(position, target(t));
      if (previousYaw !== null) {
        while (rotation[1] - previousYaw > 180) rotation[1] -= 360;
        while (rotation[1] - previousYaw < -180) rotation[1] += 360;
      }
      previousYaw = rotation[1];
      positions.push(k(frame, position, 'linear'));
      rotations.push(k(frame, rotation, 'linear'));
    }
    if (positions.length > 1 && positions[positions.length - 1]!.frame !== frames) {
      const position = path(1);
      const rotation = lookAtRotation(position, target(1));
      while (rotation[1] - previousYaw! > 180) rotation[1] -= 360;
      while (rotation[1] - previousYaw! < -180) rotation[1] += 360;
      positions.push(k(frames, position, 'linear'));
      rotations.push(k(frames, rotation, 'linear'));
    }
    camera.transform.position = positions[0]!.value as Vec3;
    camera.transform.rotation = rotations[0]!.value as Vec3;
    if (positions.length > 1 && JSON.stringify(positions[0]!.value) !== JSON.stringify(positions[positions.length - 1]!.value)) {
      this.track(camera.id, 'position', positions);
      this.track(camera.id, 'rotation', rotations);
    }
    this.cameras.push({ id: camera.id, label });
    return camera.id;
  }

  camera2d(name: string, label: string, position: Vec3, zoom = 1): string {
    const camera = this.add(makeCamera(name, '2d', [position[0], position[1], 10]));
    camera.camera!.zoom = zoom;
    this.cameras.push({ id: camera.id, label });
    return camera.id;
  }
}

/* -------------------------------------------------------------------------
   Décors
   ------------------------------------------------------------------------- */

function prop3d(builder: Builder, parentId: string, shape: PrimitiveShape, name: string, color: string, position: Vec3, size: Vec3, rotation: Vec3 = [0, 0, 0]): SceneNode {
  const mesh = makeMesh(shape, name, color);
  mesh.mesh!.size = size;
  mesh.transform.position = [position[0], position[1] + (shape === 'plane' ? 0 : size[1] / 2), position[2]];
  mesh.transform.rotation = rotation;
  return builder.add(mesh, parentId);
}

function decor3d(builder: Builder, style: Style, random: () => number): void {
  const ground = makeMesh('plane', 'Sol', style.ground);
  ground.kind = 'environment';
  ground.mesh!.size = [40, 40, 0];
  ground.mesh!.roughness = 0.95;
  builder.add(ground);
  builder.add(makeLight('Soleil', 'directional', [5, 8, 4], '#ffe6c8', 2.3));
  builder.add(makeLight('Ambiance', 'ambient', [0, 0, 0], style.glow, 0.7));
  const props = builder.group('Décor');
  const ring = (count: number, radius: number, make: (angle: number, index: number, x: number, z: number) => void) => {
    for (let i = 0; i < count; i += 1) {
      const angle = (i / count) * Math.PI * 2 + random() * 0.4;
      const distance = radius + random() * 2;
      make(angle, i, Math.cos(angle) * distance, Math.sin(angle) * distance - 1.5);
    }
  };
  const c = style.prop;
  switch (style.theme) {
    case 'ruines':
      ring(9, 5, (angle, i, x, z) => prop3d(builder, props.id, 'cylinder', `Colonne_${i + 1}`, c, [x, 0, z], [0.5, 1 + random() * 2.5, 0.5]));
      ring(5, 4, (angle, i, x, z) => prop3d(builder, props.id, 'box', `Bloc_${i + 1}`, c, [x, 0, z], [0.8, 0.5, 0.6], [0, random() * 90, random() * 20]));
      break;
    case 'falaises':
    case 'phare':
    case 'fleches':
    case 'colonnes':
      ring(8, 5.5, (angle, i, x, z) =>
        prop3d(builder, props.id, style.theme === 'fleches' ? 'cone' : 'cylinder', `Flèche_${i + 1}`, c, [x, 0, z], [0.6 + random() * 0.6, 2.5 + random() * 4, 0.6 + random() * 0.6]),
      );
      if (style.theme === 'colonnes') prop3d(builder, props.id, 'torus', 'Portail', '#c2462e', [0, 1.4, -4], [3, 0.35, 3], [90, 0, 0]);
      if (style.theme === 'phare') {
        prop3d(builder, props.id, 'cylinder', 'Phare', '#e8e0d0', [-3.5, 0, -4], [1.2, 6, 1.2]);
        const lamp = makeLight('Lanterne du phare', 'point', [-3.5, 6.3, -4], style.glow, 30);
        builder.add(lamp, props.id);
      }
      break;
    case 'miroirs':
      ring(7, 4.5, (angle, i, x, z) => prop3d(builder, props.id, 'plane', `Miroir_${i + 1}`, c, [x, 1.2, z], [1.2, 2.2, 0], [0, (-angle * 180) / Math.PI - 90, 0]));
      ring(10, 6, (angle, i, x, z) => prop3d(builder, props.id, 'cone', `Arbre_${i + 1}`, '#3a5a3a', [x, 0, z], [1, 2 + random() * 1.5, 1]));
      break;
    case 'engrenages':
    case 'station':
    case 'moulins':
      ring(6, 6, (angle, i, x, z) => prop3d(builder, props.id, 'cylinder', `Tour_${i + 1}`, c, [x, 0, z], [0.9, 2 + random() * 3, 0.9]));
      ring(4, 7, (angle, i, x, z) => prop3d(builder, props.id, 'torus', `Rouage_${i + 1}`, style.glow, [x, 2.5 + random() * 2, z], [1.4, 0.18, 1.4], [90, random() * 90, 0]));
      break;
    case 'atelier':
      prop3d(builder, props.id, 'cylinder', 'Four', '#6a3a24', [0, 0, -3], [1.6, 1.6, 1.6]);
      builder.add(makeLight('Braises', 'point', [0, 1.9, -3], '#ff8a3a', 20), props.id);
      ring(6, 4, (angle, i, x, z) => prop3d(builder, props.id, i % 2 ? 'vase' : 'box', `Pièce_${i + 1}`, c, [x, 0, z], [0.5, 0.7, 0.5]));
      break;
    case 'sel':
    case 'dunes':
    case 'glace':
      ring(8, 6, (angle, i, x, z) => prop3d(builder, props.id, style.theme === 'glace' ? 'cone' : 'sphere', `Relief_${i + 1}`, c, [x, -0.6, z], [3 + random() * 2, 1.6 + random() * 2, 3 + random() * 2]));
      break;
    case 'iles':
    case 'lanternes':
      ring(6, 5, (angle, i, x, z) => prop3d(builder, props.id, 'cone', `Île_${i + 1}`, c, [x, 1.5 + random() * 2, z], [1.6, 1.2, 1.6], [180, 0, 0]));
      ring(14, 3, (angle, i, x, z) => prop3d(builder, props.id, 'sphere', `Luciole_${i + 1}`, style.glow, [x, 1 + random() * 3, z], [0.12, 0.12, 0.12]));
      break;
    case 'prairie':
      ring(10, 5, (angle, i, x, z) => prop3d(builder, props.id, 'sphere', `Buisson_${i + 1}`, '#4a6a2a', [x, -0.2, z], [1, 0.8, 1]));
      break;
  }
}

function decor2d(builder: Builder, style: Style, random: () => number, width = 22): { far: string; near: string } {
  const sky = builder.add(makeSprite('Ciel', width * 1.6, 12, style.sky, [0, 0, -3], 'rect'));
  sky.kind = 'environment';
  sky.sprite!.layer = -20;
  const far = builder.group('Lointain', [0, 0, -2]);
  const near = builder.group('Proche', [0, 0, -1]);
  const astre = makeSprite('Astre', 1.8, 1.8, style.glow, [4.5, 2.6, 0], 'ellipse');
  astre.sprite!.layer = -19;
  builder.add(astre, far.id);
  for (let i = 0; i < 6; i += 1) {
    const x = -width / 2 + (i + random()) * (width / 6);
    const tall = style.theme === 'falaises' || style.theme === 'phare' || style.theme === 'lanternes';
    const hill = makeSprite(`Relief_${i + 1}`, tall ? 1.6 + random() : 5 + random() * 3, tall ? 4 + random() * 3 : 2 + random() * 1.5, style.prop, [x, -3.2, 0], tall ? 'rounded' : 'ellipse');
    hill.sprite!.layer = -15;
    hill.sprite!.pivot = [0.5, 0];
    builder.add(hill, far.id);
  }
  const ground = makeSprite('Sol', width * 1.6, 3, style.ground, [0, -4.5, 0], 'rect');
  ground.kind = 'environment';
  ground.sprite!.layer = -10;
  builder.add(ground, near.id);
  if (style.theme === 'phare') {
    const tower = makeSprite('Phare', 0.9, 5, '#e8e0d0', [-5, -3, 0], 'rounded');
    tower.sprite!.pivot = [0.5, 0];
    tower.sprite!.layer = -8;
    builder.add(tower, near.id);
  }
  if (style.theme === 'lanternes' || style.theme === 'prairie') {
    for (let i = 0; i < 8; i += 1) {
      const dot = makeSprite(`Lanterne_${i + 1}`, 0.25, 0.32, style.theme === 'prairie' ? '#f3e0a0' : style.glow, [-7 + i * 2 + random(), 0.5 + random() * 3, 0], 'ellipse');
      dot.sprite!.layer = -12;
      builder.add(dot, far.id);
    }
  }
  return { far: far.id, near: near.id };
}

/* -------------------------------------------------------------------------
   Personnages et gestes
   ------------------------------------------------------------------------- */

interface Actor {
  rig: RigIds;
  is2d: boolean;
}

function actor(builder: Builder, is2d: boolean, name: string, position: Vec3, palette: Style['hero'], facing = 0, scale = 1): Actor {
  const rig = buildCharacter(builder.nodes, builder.worldId, is2d ? '2d' : '3d', name, position, palette, undefined, { withPlayer: false });
  const character = builder.nodes[rig.characterId]!;
  if (!is2d) character.transform.rotation = [0, facing, 0];
  character.transform.scale = [scale, scale, scale];
  return { rig, is2d };
}

const REST = {
  armL: (is2d: boolean): Vec3 => [0, 0, is2d ? -150 : -168],
  armR: (is2d: boolean): Vec3 => [0, 0, is2d ? 150 : 168],
  hips: (is2d: boolean): Vec3 => [0, is2d ? 1.25 : 0.95, 0],
};

/** Salut de la main (bras droit ou gauche) entre deux images. */
function wave(builder: Builder, a: Actor, from: number, to: number, side: 'L' | 'R' = 'R'): void {
  const arm = side === 'R' ? a.rig.bones.armR! : a.rig.bones.armL!;
  const forearm = side === 'R' ? a.rig.bones.forearmR! : a.rig.bones.forearmL!;
  const rest = side === 'R' ? REST.armR(a.is2d) : REST.armL(a.is2d);
  const up: Vec3 = [0, 0, side === 'R' ? (a.is2d ? 35 : 40) : a.is2d ? -35 : -40];
  const sign = side === 'R' ? 1 : -1;
  const span = to - from;
  builder.track(arm, 'rotation', [k(from, rest, 'easeOut'), k(from + span * 0.25, up), k(to - span * 0.2, up, 'easeIn'), k(to, rest)]);
  const wiggle: Keyframe[] = [k(from, [0, 0, 0])];
  for (let i = 0; i < 4; i += 1) wiggle.push(k(from + span * (0.3 + i * 0.12), [0, 0, sign * (i % 2 ? 8 : 32)]));
  wiggle.push(k(to, [0, 0, 0]));
  builder.track(forearm, 'rotation', wiggle);
}

/** Cycle de marche (jambes, genoux, bras, bassin) sur [from, to]. */
function walk(builder: Builder, a: Actor, from: number, to: number, stride = 12): void {
  const { bones } = a.rig;
  const legKeys: Record<string, Keyframe[]> = { legL: [], legR: [], shinL: [], shinR: [], armL: [], armR: [], hips: [] };
  for (let frame = from, phase = 0; frame <= to; frame += stride / 2, phase += 1) {
    const s = phase % 2 === 0 ? 1 : -1;
    if (a.is2d) {
      legKeys.legL!.push(k(frame, [0, 0, 180 + 16 * s]));
      legKeys.legR!.push(k(frame, [0, 0, 180 - 16 * s]));
      legKeys.shinL!.push(k(frame, [0, 0, s > 0 ? -12 : 0]));
      legKeys.shinR!.push(k(frame, [0, 0, s < 0 ? 12 : 0]));
      legKeys.armL!.push(k(frame, [0, 0, -150 - 12 * s]));
      legKeys.armR!.push(k(frame, [0, 0, 150 - 12 * s]));
      legKeys.hips!.push(k(frame, [0, 1.25 - 0.05, 0]));
    } else {
      legKeys.legL!.push(k(frame, [-24 * s, 0, 180]));
      legKeys.legR!.push(k(frame, [24 * s, 0, 180]));
      legKeys.shinL!.push(k(frame, [s < 0 ? -32 : -6, 0, 0]));
      legKeys.shinR!.push(k(frame, [s > 0 ? -32 : -6, 0, 0]));
      legKeys.armL!.push(k(frame, [20 * s, 0, -168]));
      legKeys.armR!.push(k(frame, [-20 * s, 0, 168]));
      legKeys.hips!.push(k(frame, [0, 0.95 - 0.04, 0]));
    }
    if (frame + stride / 4 <= to) legKeys.hips!.push(k(frame + stride / 4, a.is2d ? [0, 1.25 + 0.03, 0] : [0, 0.95 + 0.02, 0]));
  }
  for (const [name, keys] of Object.entries(legKeys)) {
    const boneId = name === 'hips' ? bones.hips! : bones[name]!;
    builder.track(boneId, name === 'hips' ? 'position' : 'rotation', keys);
  }
}

/* -------------------------------------------------------------------------
   Mises en scène
   ------------------------------------------------------------------------- */

function stage(builder: Builder, cinematic: Cinematic, style: Style, is2d: boolean, frames: number, random: () => number): void {
  const centerY = is2d ? -3 : 0;
  switch (cinematic.archetype) {
    case 'rencontre': {
      const hero = actor(builder, is2d, 'Héroïne', is2d ? [-2, centerY, 0] : [-1.1, 0, 0], style.hero, 90);
      const pebble = style.theme === 'prairie';
      if (pebble) {
        const caillou = builder.add(makeSprite('Caillou', 1.3, 1, style.friend.body, [2, centerY + 0.45, 0.2], 'ellipse'));
        caillou.sprite!.layer = 2;
        builder.track(caillou.id, 'scale', [k(0, [1, 1, 1]), k(frames * 0.55, [1, 1, 1], 'easeOut'), k(frames * 0.6, [1.1, 0.9, 1]), k(frames * 0.7, [1, 1, 1])]);
      } else {
        const friend = actor(builder, is2d, 'Compagnon', is2d ? [2, centerY, 0] : [1.1, 0, 0], style.friend, -90);
        // Le compagnon s'incline puis répond au salut.
        builder.track(friend.rig.bones.torso!, 'rotation', [k(frames * 0.3, [0, 0, 0]), k(frames * 0.42, is2d ? [0, 0, 8] : [22, 0, 0]), k(frames * 0.55, [0, 0, 0])]);
        builder.track(friend.rig.bones.head!, 'rotation', [k(frames * 0.3, [0, 0, 0]), k(frames * 0.42, is2d ? [0, 0, 10] : [18, 0, 0]), k(frames * 0.55, [0, 0, 0])]);
        wave(builder, friend, frames * 0.58, frames * 0.95, 'L');
      }
      wave(builder, hero, frames * 0.08, frames * 0.5, 'R');
      builder.track(hero.rig.bones.head!, 'rotation', [k(0, [0, 0, 0]), k(frames * 0.6, is2d ? [0, 0, -8] : [6, 10, 0]), k(frames, [0, 0, 0])]);
      if (is2d) {
        builder.camera2d('Cam_Plan', 'Plan d’ensemble', [0, -0.8, 10], 1.05);
        builder.camera2d('Cam_Serre', 'Plan serré', [-1.2, -1.2, 10], 1.7);
      } else {
        builder.camera3d('Cam_Large', 'Plan large', frames, (t) => [0, 1.6, 6.5 - t * 1.2], () => [0, 1.1, 0], 40);
        builder.camera3d('Cam_Champ', 'Champ', frames, () => [2.6, 1.7, 1.4], () => [-1.1, 1.3, 0], 32);
        builder.camera3d('Cam_Contrechamp', 'Contrechamp', frames, () => [-2.6, 1.7, 1.4], () => [1.1, 1.3, 0], 32);
      }
      break;
    }
    case 'voyage': {
      const startX = is2d ? -6 : -5;
      const endX = is2d ? 6 : 5;
      const hero = actor(builder, is2d, 'Voyageur', is2d ? [startX, centerY, 0] : [startX, 0, 0.5], style.hero, 90);
      builder.track(hero.rig.characterId, 'position', [k(0, is2d ? [startX, centerY, 0] : [startX, 0, 0.5], 'linear'), k(frames, is2d ? [endX, centerY, 0] : [endX, 0, 0.5], 'linear')]);
      walk(builder, hero, 0, frames, 12);
      if (is2d) {
        const camera = builder.camera2d('Cam_Travelling', 'Travelling', [startX * 0.8, -1, 10], 1.15);
        builder.track(camera, 'position', [k(0, [startX * 0.8, -1, 10], 'linear'), k(frames, [endX * 0.8, -1, 10], 'linear')]);
        builder.camera2d('Cam_Panorama', 'Panorama', [0, 0, 10], 0.8);
        const far = Object.values(builder.nodes).find((node) => node.name === 'Lointain');
        // Parallaxe : le lointain suit en partie la caméra.
        if (far) builder.track(far.id, 'position', [k(0, [startX * 0.5, 0, -2], 'linear'), k(frames, [endX * 0.5, 0, -2], 'linear')]);
      } else {
        const x = (t: number) => startX + (endX - startX) * t;
        builder.camera3d('Cam_Travelling', 'Travelling', frames, (t) => [x(t) - 1.2, 1.5, 4.6], (t) => [x(t) + 0.6, 1, 0.5], 36);
        builder.camera3d('Cam_Panorama', 'Panorama', frames, () => [0, 4.5, 11], (t) => [x(t), 0.8, 0], 42);
        builder.camera3d('Cam_Devant', 'Face', frames, (t) => [x(t) + 3.2, 1.3, 1.2], (t) => [x(t), 1.2, 0.5], 34);
      }
      break;
    }
    case 'contemplation': {
      const hero = actor(builder, is2d, 'Rêveuse', is2d ? [-1.2, centerY, 0] : [0, 0, 1], style.hero, 0);
      const orbStart: Vec3 = is2d ? [1.4, centerY + 0.8, 0.1] : [1.2, 0.6, -1.4];
      const orbEnd: Vec3 = is2d ? [1.8, 2.6, 0.1] : [0.8, 3.6, -2.2];
      const orb = is2d ? builder.add(makeSprite('Astre', 0.7, 0.7, style.glow, orbStart, 'ellipse')) : prop3d(builder, builder.worldId, 'sphere', 'Astre', style.glow, orbStart, [0.4, 0.4, 0.4]);
      if (!is2d) {
        orb.transform.position = [...orbStart];
        builder.add(makeLight('Lueur', 'point', [0, 0, 0], style.glow, 12), orb.id);
      }
      builder.track(orb.id, 'position', [k(0, orbStart, 'easeIn'), k(frames * 0.85, orbEnd, 'easeOut'), k(frames, orbEnd)]);
      builder.track(orb.id, 'scale', [k(0, [0.6, 0.6, 0.6]), k(frames * 0.85, [1.4, 1.4, 1.4])]);
      // Le regard suit l'astre (contrainte « Viser » sur la tête).
      const toLocal = (p: Vec3): Vec3 => (is2d ? [p[0] + 1.2, p[1] - centerY, 0] : [p[0], p[1], p[2] - 1]);
      const gaze = makeControl('Regard', toLocal(orbStart), hero.rig.bones.head);
      gaze.control!.influence = is2d ? 0.45 : 0.75;
      gaze.control!.aimAxis = is2d ? 'y' : 'z';
      builder.add(gaze, hero.rig.skeletonId);
      builder.track(gaze.id, 'position', [k(0, toLocal(orbStart), 'easeIn'), k(frames * 0.85, toLocal(orbEnd), 'easeOut'), k(frames, toLocal(orbEnd))]);
      builder.track(hero.rig.bones.armL!, 'rotation', [k(frames * 0.3, REST.armL(is2d)), k(frames * 0.8, [0, 0, is2d ? -70 : -95])]);
      builder.track(hero.rig.bones.forearmL!, 'rotation', [k(frames * 0.3, [0, 0, 0]), k(frames * 0.8, [0, 0, is2d ? -20 : -15])]);
      if (is2d) {
        const camera = builder.camera2d('Cam_Grue', 'Grue', [0, -1.5, 10], 1.25);
        builder.track(camera, 'position', [k(0, [0, -1.5, 10]), k(frames, [0.4, 0.6, 10])]);
        builder.track(camera, 'zoom', [k(0, [1.25]), k(frames, [0.95])]);
        builder.camera2d('Cam_Visage', 'Visage', [-1.2, -0.6, 10], 2.4);
      } else {
        builder.camera3d('Cam_Grue', 'Grue', frames, (t) => [2.4 - t, 0.8 + t * 2.6, 5.2 - t], (t) => [0.4, 1.2 + t * 1.6, -0.5], 40);
        builder.camera3d('Cam_Visage', 'Visage', frames, () => [0.5, 1.5, 3.1], (t) => [0, 1.65 + t * 0.1, 1], 26);
        builder.camera3d('Cam_Contreplongee', 'Contre-plongée', frames, () => [-1.6, 0.4, 3], () => [0.6, 2.6, -1.5], 44);
      }
      break;
    }
    case 'fete': {
      const ronde = builder.group('Ronde', is2d ? [0, centerY, 0] : [0, 0, 0]);
      const palettes = [style.hero, style.friend, { body: style.prop, head: style.hero.head, limbs: style.friend.limbs }];
      if (!is2d) {
        const fire = prop3d(builder, builder.worldId, style.theme === 'lanternes' || style.theme === 'iles' ? 'sphere' : 'cone', 'Foyer', style.glow, [0, 0, 0], [0.6, 0.8, 0.6]);
        builder.add(makeLight('Lueur du foyer', 'point', [0, 1.2, 0], style.glow, 14), fire.id);
        builder.track(ronde.id, 'rotation', [k(0, [0, 0, 0], 'linear'), k(frames, [0, 120, 0], 'linear')]);
      } else {
        const fire = builder.add(makeSprite('Foyer', 0.9, 1.1, style.glow, [0, centerY + 0.5, -0.1], 'ellipse'));
        builder.track(fire.id, 'scale', [k(0, [1, 1, 1]), k(frames * 0.25, [1.15, 0.9, 1]), k(frames * 0.5, [1, 1.1, 1]), k(frames * 0.75, [1.12, 0.92, 1]), k(frames, [1, 1, 1])]);
      }
      palettes.forEach((palette, index) => {
        const angle = (index / 3) * Math.PI * 2;
        const position: Vec3 = is2d ? [(index - 1) * 3, 0, 0] : [Math.cos(angle) * 1.8, 0, Math.sin(angle) * 1.8];
        const facing = is2d ? 0 : (-angle * 180) / Math.PI - 90;
        const rig = buildCharacter(builder.nodes, ronde.id, is2d ? '2d' : '3d', ['Danseuse', 'Danseur', 'Ami'][index]!, position, palette, undefined, { withPlayer: false });
        if (!is2d) builder.nodes[rig.characterId]!.transform.rotation = [0, facing, 0];
        const a: Actor = { rig, is2d };
        // Sautillements déphasés et bras levés.
        const bounce: Keyframe[] = [];
        for (let frame = 0, i = 0; frame <= frames; frame += 6, i += 1) {
          const low = (i + index) % 2 === 0;
          bounce.push(k(frame, is2d ? [0, low ? 1.15 : 1.3, 0] : [0, low ? 0.88 : 1, 0]));
        }
        builder.track(rig.bones.hips!, 'position', bounce);
        wave(builder, a, frames * (0.05 + index * 0.1), frames * (0.6 + index * 0.1), index % 2 ? 'L' : 'R');
        if (is2d) builder.track(rig.characterId, 'position', [k(0, position), k(frames * 0.5, [position[0] + (index - 1) * -0.8, 0, 0]), k(frames, position)]);
      });
      if (is2d) {
        const camera = builder.camera2d('Cam_Fete', 'Plan d’ensemble', [0, -0.8, 10], 0.95);
        builder.track(camera, 'zoom', [k(0, [0.95]), k(frames * 0.5, [1.1]), k(frames, [0.95])]);
        builder.camera2d('Cam_Danseuse', 'Danseuse', [-3, -1.2, 10], 1.9);
      } else {
        builder.camera3d('Cam_Orbite', 'Orbite', frames, (t) => [Math.sin(t * 2) * 6.5, 2.4, Math.cos(t * 2) * 6.5], () => [0, 1, 0], 40, 6);
        builder.camera3d('Cam_Plongee', 'Plongée', frames, () => [0.01, 8, 0.01], () => [0, 0, 0], 50);
        builder.camera3d('Cam_Ras', 'Au ras du sol', frames, () => [3.2, 0.3, 3.2], () => [0, 1.2, 0], 34);
      }
      break;
    }
    case 'decouverte': {
      const hero = actor(builder, is2d, 'Exploratrice', is2d ? [0, centerY, 0] : [0, 0, 0.5], style.hero, 0);
      const { bones } = hero.rig;
      const kneel = frames * 0.35;
      const lift = frames * 0.6;
      // Les pieds restent plantés pendant que le bassin descend (IK).
      const feet = is2d
        ? [makeIkTarget('IK_Pied_G', [0.16, 0.05, 0], bones.shinL!, -1), makeIkTarget('IK_Pied_D', [-0.16, 0.05, 0], bones.shinR!, 1)]
        : [makeIkTarget('IK_Pied_G', [0.11, 0.04, 0.02], bones.shinL!, 1), makeIkTarget('IK_Pied_D', [-0.11, 0.04, 0.02], bones.shinR!, 1)];
      feet.forEach((foot) => builder.add(foot, hero.rig.skeletonId));
      builder.track(bones.hips!, 'position', [k(0, REST.hips(is2d)), k(kneel, is2d ? [0, 0.78, 0] : [0, 0.56, 0.05]), k(lift, is2d ? [0, 0.78, 0] : [0, 0.56, 0.05]), k(frames, REST.hips(is2d))]);
      builder.track(bones.torso!, 'rotation', [k(0, [0, 0, 0]), k(kneel, is2d ? [0, 0, 14] : [28, 0, 0]), k(lift, is2d ? [0, 0, 10] : [20, 0, 0]), k(frames, [0, 0, 0])]);
      // La main rejoint l'objet puis le soulève (IK de la main).
      const restHand: Vec3 = is2d ? [-0.69, 1.46, 0] : [-0.36, 0.92, 0.02];
      const ground: Vec3 = is2d ? [-0.85, 0.2, 0] : [-0.22, 0.12, 0.5];
      const raised: Vec3 = is2d ? [-0.6, 1.6, 0] : [-0.15, 1.15, 0.45];
      const hand = makeIkTarget('IK_Main_D', restHand, bones.forearmR!, is2d ? 1 : -1);
      builder.add(hand, hero.rig.skeletonId);
      builder.track(hand.id, 'position', [k(0, restHand), k(kneel * 0.6, restHand), k(kneel, ground), k(lift, ground), k(frames * 0.85, raised), k(frames, raised)]);
      // L'objet suit la main une fois saisi (coordonnées du monde).
      const offset: Vec3 = is2d ? [0, centerY, 0.2] : [0, 0, 0.5];
      const toWorld = (p: Vec3): Vec3 => [p[0] + offset[0], p[1] + offset[1], p[2] + offset[2]];
      const item = is2d ? builder.add(makeSprite('Objet', 0.38, 0.38, style.glow, toWorld(ground), 'ellipse')) : prop3d(builder, builder.worldId, 'sphere', 'Objet', style.glow, toWorld(ground), [0.14, 0.14, 0.14]);
      item.transform.position = toWorld(ground);
      if (!is2d) builder.add(makeLight('Éclat', 'point', [0, 0, 0], style.glow, 4), item.id);
      builder.track(item.id, 'position', [k(lift, toWorld(ground)), k(frames * 0.85, toWorld(raised)), k(frames, toWorld(raised))]);
      if (is2d) {
        const camera = builder.camera2d('Cam_Approche', 'Approche', [0, -1, 10], 1.1);
        builder.track(camera, 'zoom', [k(0, [1.1]), k(frames, [1.8])]);
        builder.track(camera, 'position', [k(0, [0, -1, 10]), k(frames, [-0.4, -1.8, 10])]);
        builder.camera2d('Cam_Objet', 'L’objet', [-0.8, -2.6, 10], 3);
      } else {
        builder.camera3d('Cam_Approche', 'Approche', frames, (t) => [1.8 - t * 0.8, 1.5 - t * 0.5, 4.8 - t * 2], () => [0, 0.7, 0.5], 38);
        builder.camera3d('Cam_Objet', 'L’objet', frames, () => [-1.4, 0.35, 2.2], () => [-0.2, 0.4, 1], 30);
      }
      break;
    }
    case 'orbite': {
      if (is2d) {
        stage(builder, { ...cinematic, archetype: 'contemplation' }, style, is2d, frames, random);
        return;
      }
      const hub = builder.group('Structure', [0, 2.5, -2]);
      for (let i = 0; i < 3; i += 1) {
        const ring = prop3d(builder, hub.id, 'torus', `Anneau_${i + 1}`, i === 1 ? style.glow : style.prop, [0, 0, 0], [4 - i * 1.1, 0.22, 4 - i * 1.1], [90, 0, 0]);
        ring.transform.position = [0, 0, 0];
        builder.track(ring.id, 'rotation', [k(0, [90, 0, 0], 'linear'), k(frames, [90 + (i % 2 ? -180 : 180), i * 40, 0], 'linear')]);
      }
      const core = prop3d(builder, hub.id, 'sphere', 'Noyau', style.glow, [0, 0, 0], [0.8, 0.8, 0.8]);
      core.transform.position = [0, 0, 0];
      builder.add(makeLight('Lueur', 'point', [0, 0, 0], style.glow, 18), core.id);
      const ship = prop3d(builder, builder.worldId, 'capsule', 'Vaisseau', '#d8d8e0', [0, 0, 0], [0.35, 1.1, 0.35], [0, 0, 90]);
      const shipKeys: Keyframe[] = [];
      for (let frame = 0; frame <= frames; frame += 12) {
        const a = (frame / frames) * Math.PI * 1.5;
        shipKeys.push(k(frame, [Math.cos(a) * 3.6, 2.8 + Math.sin(a * 2) * 0.4, Math.sin(a) * 3.6 - 2], 'linear'));
      }
      builder.track(ship.id, 'position', shipKeys);
      builder.track(ship.id, 'rotation', [k(0, [0, 0, 90], 'linear'), k(frames, [0, -270, 90], 'linear')]);
      const hero = actor(builder, false, 'Pilote', [0, 0, 3], style.hero, 180);
      builder.track(hero.rig.bones.head!, 'rotation', [k(0, [-20, 0, 0]), k(frames, [-25, 30, 0])]);
      builder.camera3d('Cam_Orbite', 'Orbite', frames, (t) => [Math.sin(t * 1.4 + 0.6) * 9, 3.5 + t * 1.5, Math.cos(t * 1.4 + 0.6) * 9 - 2], () => [0, 2.4, -2], 40, 6);
      builder.camera3d('Cam_Pilote', 'Pilote', frames, () => [0.6, 1.7, 5.2], () => [0, 2.6, -2], 46);
      builder.camera3d('Cam_Vaisseau', 'Vaisseau', frames, (t) => {
        const a = t * Math.PI * 1.5 - 0.35;
        return [Math.cos(a) * 5.4, 3.4, Math.sin(a) * 5.4 - 2];
      }, (t) => {
        const a = t * Math.PI * 1.5;
        return [Math.cos(a) * 3.6, 2.8, Math.sin(a) * 3.6 - 2];
      }, 36, 6);
      break;
    }
  }
}

/* -------------------------------------------------------------------------
   Point d'entrée
   ------------------------------------------------------------------------- */

export function buildCinematic(cinematic: Cinematic, series: Pick<Series, 'id' | 'title' | 'format'>): { scene: StudioScene; assets: StudioAsset[] } {
  const style = STYLES[series.id] ?? STYLES['echos-aelith']!;
  const is2d = series.format === '2D';
  const frames = Math.round(cinematic.seconds * FPS);
  const random = seeded(cinematic.id);
  const builder = new Builder(cinematic.title);

  if (is2d) decor2d(builder, style, random);
  else decor3d(builder, style, random);
  stage(builder, cinematic, style, is2d, frames, random);

  const audioAsset: StudioAsset = {
    id: `synth-${style.synth}-${cinematic.seconds}`,
    name: `Ambiance · ${series.title}`,
    folder: 'audio',
    type: 'audio',
    origin: 'library',
    synth: { kind: style.synth, seconds: cinematic.seconds },
  };
  const audio: AudioRef[] = [{ id: uid('aud'), assetId: audioAsset.id, start: 0, volume: 0.6, muted: false }];

  const clip = makeClip(cinematic.title, frames, FPS);
  clip.loop = false;
  clip.tracks = builder.tracks;
  clip.audio = audio;

  const nodes = builder.nodes;
  const player = makeNode('animationPlayer', 'AnimationPlayer');
  attach(nodes, player, builder.worldId);

  const main = builder.cameras[0]?.id ?? null;
  const scene: StudioScene = {
    id: `cinematique-${cinematic.id}`,
    name: cinematic.title,
    dimension: is2d ? '2d' : '3d',
    rootId: builder.rootId,
    nodes,
    clips: [clip],
    activeClipId: clip.id,
    background: style.sky,
    viewer: {
      mainCameraId: main,
      povs: builder.cameras.map((camera) => ({ cameraId: camera.id, label: camera.label })),
      transition: TRANSITIONS[cinematic.archetype],
      freeCamera: { enabled: !is2d, target: [0, 1, 0], minDistance: 2.5, maxDistance: 14, minPolar: 20, maxPolar: 88 },
    },
  };
  for (const id of builder.cameras.map((camera) => camera.id)) {
    const camera = nodes[id]?.camera;
    if (camera) camera.background = style.sky;
  }
  return { scene, assets: [audioAsset] };
}
