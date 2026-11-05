/**
 * CKlayser Studio — fabrique de composants, de squelettes et de clips.
 *
 * Fonctions pures qui produisent des données conformes à lib/studio/types.ts.
 * Utilisées par la scène de démonstration, le menu « Ajouter » de la
 * hiérarchie et le glisser-déposer des assets.
 */
import { DEFAULT_BEZIER } from './animation';
import type {
  AnimationClip,
  Interpolation,
  Keyframe,
  NodeKind,
  PrimitiveShape,
  RigPart,
  SceneDimension,
  SceneNode,
  SpritePart,
  StudioScene,
  Track,
  Transform,
  Vec3,
} from './types';

let counter = 0;
/** Identifiant court et unique (horodatage + compteur + aléa). */
export function uid(prefix = 'n'): string {
  counter = (counter + 1) % 1_000_000;
  return `${prefix}-${Date.now().toString(36)}${counter.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export const identity = (): Transform => ({ position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] });

export function transform(position: Vec3 = [0, 0, 0], rotation: Vec3 = [0, 0, 0], scale: Vec3 = [1, 1, 1]): Transform {
  return { position, rotation, scale };
}

export function makeNode(kind: NodeKind, name: string, extra: Partial<SceneNode> = {}, id: string = uid(kind.slice(0, 3))): SceneNode {
  return {
    id,
    name,
    kind,
    parentId: null,
    children: [],
    transform: identity(),
    visible: true,
    locked: false,
    ...extra,
  };
}

/** Ajoute `node` comme enfant de `parentId` (mutation d'un brouillon). */
export function attach(nodes: Record<string, SceneNode>, node: SceneNode, parentId: string | null, index?: number): void {
  node.parentId = parentId;
  nodes[node.id] = node;
  if (!parentId) return;
  const parent = nodes[parentId];
  if (!parent) return;
  if (index === undefined || index < 0 || index > parent.children.length) parent.children.push(node.id);
  else parent.children.splice(index, 0, node.id);
}

/** Vecteur de rotation (degrés, ordre YXZ) qui oriente l'axe −Z de `from` vers `to`. */
export function lookAtRotation(from: Vec3, to: Vec3): Vec3 {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const dz = to[2] - from[2];
  const horizontal = Math.hypot(dx, dz);
  const yaw = Math.atan2(-dx, -dz);
  const pitch = Math.atan2(dy, horizontal);
  const round = (value: number) => Math.round(value * 10) / 10;
  return [round((pitch * 180) / Math.PI), round((yaw * 180) / Math.PI), 0];
}

/* -------------------------------------------------------------------------
   Composants simples
   ------------------------------------------------------------------------- */

const SHAPE_SIZE: Record<PrimitiveShape, Vec3> = {
  box: [1, 1, 1],
  sphere: [1, 1, 1],
  cylinder: [0.8, 1, 0.8],
  capsule: [0.5, 1.2, 0.5],
  cone: [0.8, 1, 0.8],
  plane: [2, 2, 0],
  torus: [1, 0.3, 1],
  vase: [0.5, 0.8, 0.5],
};

export const SHAPE_LABELS: Record<PrimitiveShape, string> = {
  box: 'Cube',
  sphere: 'Sphère',
  cylinder: 'Cylindre',
  capsule: 'Capsule',
  cone: 'Cône',
  plane: 'Plan',
  torus: 'Tore',
  vase: 'Vase',
};

export function makeMesh(shape: PrimitiveShape, name = SHAPE_LABELS[shape], color = '#c4693f', position: Vec3 = [0, 0, 0]): SceneNode {
  const size = SHAPE_SIZE[shape];
  const lift = shape === 'plane' ? 0 : size[1] / 2;
  return makeNode('mesh', name, {
    transform: transform([position[0], position[1] + lift, position[2]], shape === 'plane' ? [-90, 0, 0] : [0, 0, 0]),
    mesh: { shape, size: [...size], color, roughness: 0.75, metalness: 0 },
  });
}

export function makeSprite(name: string, width: number, height: number, color: string, position: Vec3 = [0, 0, 0], shape: 'rect' | 'rounded' | 'ellipse' = 'rounded'): SceneNode {
  return makeNode('sprite', name, {
    transform: transform(position),
    sprite: { width, height, color, shape, pivot: [0.5, 0.5], layer: 0 },
  });
}

export function makeCamera(name: string, dimension: SceneDimension, position: Vec3, target: Vec3 = [0, 1, 0]): SceneNode {
  return makeNode('camera', name, {
    transform: transform(position, dimension === '2d' ? [0, 0, 0] : lookAtRotation(position, target)),
    camera: {
      projection: dimension === '2d' ? 'orthographic' : 'perspective',
      fov: 40,
      zoom: 1,
      near: 0.1,
      far: 200,
      aspect: 16 / 9,
      background: '#1b130d',
    },
  });
}

export function makeLight(name: string, type: 'directional' | 'point' | 'ambient', position: Vec3 = [3, 5, 2], color = '#ffe6c7', intensity = 1.5): SceneNode {
  return makeNode('light', name, {
    transform: transform(position),
    light: { type, color, intensity, castShadow: type === 'directional' },
  });
}

export function makeControl(name: string, position: Vec3, targetBoneId?: string): SceneNode {
  return makeNode('control', name, {
    transform: transform(position),
    control: { radius: 0.12, influence: targetBoneId ? 1 : 0.5, constraint: targetBoneId ? 'aim' : 'none', targetBoneId },
  });
}

/* -------------------------------------------------------------------------
   Personnages rigués (squelette + corps lié aux bones)
   ------------------------------------------------------------------------- */

interface BoneSpec {
  key: string;
  name: string;
  parent: string | null;
  position: Vec3;
  rotation: Vec3;
  length: number;
}

const MANNEQUIN_BONES: BoneSpec[] = [
  { key: 'hips', name: 'Hips', parent: null, position: [0, 0.95, 0], rotation: [0, 0, 0], length: 0.12 },
  { key: 'torso', name: 'Torso', parent: 'hips', position: [0, 0.12, 0], rotation: [0, 0, 0], length: 0.48 },
  { key: 'head', name: 'Head', parent: 'torso', position: [0, 0.5, 0], rotation: [0, 0, 0], length: 0.3 },
  { key: 'armL', name: 'Arm_L', parent: 'torso', position: [0.24, 0.44, 0], rotation: [0, 0, -168], length: 0.32 },
  { key: 'forearmL', name: 'Forearm_L', parent: 'armL', position: [0, 0.32, 0], rotation: [0, 0, 0], length: 0.3 },
  { key: 'armR', name: 'Arm_R', parent: 'torso', position: [-0.24, 0.44, 0], rotation: [0, 0, 168], length: 0.32 },
  { key: 'forearmR', name: 'Forearm_R', parent: 'armR', position: [0, 0.32, 0], rotation: [0, 0, 0], length: 0.3 },
  { key: 'legL', name: 'Leg_L', parent: 'hips', position: [0.11, 0, 0], rotation: [0, 0, 180], length: 0.46 },
  { key: 'shinL', name: 'Shin_L', parent: 'legL', position: [0, 0.46, 0], rotation: [0, 0, 0], length: 0.46 },
  { key: 'legR', name: 'Leg_R', parent: 'hips', position: [-0.11, 0, 0], rotation: [0, 0, 180], length: 0.46 },
  { key: 'shinR', name: 'Shin_R', parent: 'legR', position: [0, 0.46, 0], rotation: [0, 0, 0], length: 0.46 },
];

const PANTIN_BONES: BoneSpec[] = [
  { key: 'hips', name: 'Bassin', parent: null, position: [0, 1.25, 0], rotation: [0, 0, 0], length: 0.2 },
  { key: 'torso', name: 'Tronc', parent: 'hips', position: [0, 0.2, 0], rotation: [0, 0, 0], length: 0.85 },
  { key: 'head', name: 'Tête', parent: 'torso', position: [0, 0.85, 0], rotation: [0, 0, 0], length: 0.6 },
  { key: 'armL', name: 'Bras_G', parent: 'torso', position: [0.28, 0.72, 0], rotation: [0, 0, -150], length: 0.42 },
  { key: 'forearmL', name: 'AvantBras_G', parent: 'armL', position: [0, 0.42, 0], rotation: [0, 0, 0], length: 0.4 },
  { key: 'armR', name: 'Bras_D', parent: 'torso', position: [-0.28, 0.72, 0], rotation: [0, 0, 150], length: 0.42 },
  { key: 'forearmR', name: 'AvantBras_D', parent: 'armR', position: [0, 0.42, 0], rotation: [0, 0, 0], length: 0.4 },
  { key: 'legL', name: 'Cuisse_G', parent: 'hips', position: [0.16, 0, 0], rotation: [0, 0, 180], length: 0.62 },
  { key: 'shinL', name: 'Mollet_G', parent: 'legL', position: [0, 0.62, 0], rotation: [0, 0, 0], length: 0.6 },
  { key: 'legR', name: 'Cuisse_D', parent: 'hips', position: [-0.16, 0, 0], rotation: [0, 0, 180], length: 0.62 },
  { key: 'shinR', name: 'Mollet_D', parent: 'legR', position: [0, 0.62, 0], rotation: [0, 0, 0], length: 0.6 },
];

/** Parties du corps 3D : primitive, dimensions, décalage le long du bone. */
type Tint = 'body' | 'head' | 'limbs' | 'eyes';

const MANNEQUIN_PARTS: { bone: string; shape: PrimitiveShape; size: Vec3; offset: Vec3; tint: Tint }[] = [
  { bone: 'hips', shape: 'box', size: [0.34, 0.18, 0.2], offset: [0, 0.04, 0], tint: 'body' },
  { bone: 'torso', shape: 'capsule', size: [0.36, 0.56, 0.24], offset: [0, 0.24, 0], tint: 'body' },
  { bone: 'head', shape: 'sphere', size: [0.27, 0.31, 0.27], offset: [0, 0.16, 0], tint: 'head' },
  { bone: 'head', shape: 'sphere', size: [0.045, 0.06, 0.03], offset: [0.055, 0.18, 0.123], tint: 'eyes' },
  { bone: 'head', shape: 'sphere', size: [0.045, 0.06, 0.03], offset: [-0.055, 0.18, 0.123], tint: 'eyes' },
  { bone: 'armL', shape: 'capsule', size: [0.1, 0.4, 0.1], offset: [0, 0.16, 0], tint: 'limbs' },
  { bone: 'forearmL', shape: 'capsule', size: [0.09, 0.36, 0.09], offset: [0, 0.15, 0], tint: 'limbs' },
  { bone: 'forearmL', shape: 'sphere', size: [0.1, 0.11, 0.08], offset: [0, 0.32, 0], tint: 'head' },
  { bone: 'armR', shape: 'capsule', size: [0.1, 0.4, 0.1], offset: [0, 0.16, 0], tint: 'limbs' },
  { bone: 'forearmR', shape: 'capsule', size: [0.09, 0.36, 0.09], offset: [0, 0.15, 0], tint: 'limbs' },
  { bone: 'forearmR', shape: 'sphere', size: [0.1, 0.11, 0.08], offset: [0, 0.32, 0], tint: 'head' },
  { bone: 'legL', shape: 'capsule', size: [0.15, 0.54, 0.15], offset: [0, 0.23, 0], tint: 'limbs' },
  { bone: 'shinL', shape: 'capsule', size: [0.12, 0.52, 0.12], offset: [0, 0.22, 0], tint: 'limbs' },
  { bone: 'shinL', shape: 'box', size: [0.11, 0.07, 0.24], offset: [0, 0.45, 0.06], tint: 'body' },
  { bone: 'legR', shape: 'capsule', size: [0.15, 0.54, 0.15], offset: [0, 0.23, 0], tint: 'limbs' },
  { bone: 'shinR', shape: 'capsule', size: [0.12, 0.52, 0.12], offset: [0, 0.22, 0], tint: 'limbs' },
  { bone: 'shinR', shape: 'box', size: [0.11, 0.07, 0.24], offset: [0, 0.45, 0.06], tint: 'body' },
];

/** Parties du pantin 2D : sprite, dimensions, décalage, ordre d'affichage. */
const PANTIN_PARTS: { bone: string; size: [number, number]; offset: [number, number]; shape: 'rounded' | 'ellipse'; layer: number; tint: Tint }[] = [
  { bone: 'armR', size: [0.22, 0.52], offset: [0, 0.2], shape: 'rounded', layer: -2, tint: 'limbs' },
  { bone: 'forearmR', size: [0.2, 0.5], offset: [0, 0.2], shape: 'rounded', layer: -2, tint: 'limbs' },
  { bone: 'forearmR', size: [0.24, 0.24], offset: [0, 0.44], shape: 'ellipse', layer: -2, tint: 'head' },
  { bone: 'legR', size: [0.28, 0.72], offset: [0, 0.3], shape: 'rounded', layer: -1, tint: 'limbs' },
  { bone: 'shinR', size: [0.24, 0.7], offset: [0, 0.28], shape: 'rounded', layer: -1, tint: 'limbs' },
  { bone: 'shinR', size: [0.36, 0.2], offset: [0, 0.6], shape: 'ellipse', layer: -1, tint: 'body' },
  { bone: 'legL', size: [0.28, 0.72], offset: [0, 0.3], shape: 'rounded', layer: 0, tint: 'limbs' },
  { bone: 'shinL', size: [0.24, 0.7], offset: [0, 0.28], shape: 'rounded', layer: 0, tint: 'limbs' },
  { bone: 'shinL', size: [0.36, 0.2], offset: [0, 0.6], shape: 'ellipse', layer: 0, tint: 'body' },
  { bone: 'hips', size: [0.55, 0.38], offset: [0, 0.05], shape: 'rounded', layer: 1, tint: 'body' },
  { bone: 'torso', size: [0.75, 1.1], offset: [0, 0.42], shape: 'rounded', layer: 2, tint: 'body' },
  { bone: 'head', size: [0.75, 0.75], offset: [0, 0.32], shape: 'ellipse', layer: 3, tint: 'head' },
  { bone: 'head', size: [0.09, 0.13], offset: [0.14, 0.36], shape: 'ellipse', layer: 5, tint: 'eyes' },
  { bone: 'head', size: [0.09, 0.13], offset: [-0.14, 0.36], shape: 'ellipse', layer: 5, tint: 'eyes' },
  { bone: 'armL', size: [0.22, 0.52], offset: [0, 0.2], shape: 'rounded', layer: 4, tint: 'limbs' },
  { bone: 'forearmL', size: [0.2, 0.5], offset: [0, 0.2], shape: 'rounded', layer: 4, tint: 'limbs' },
  { bone: 'forearmL', size: [0.24, 0.24], offset: [0, 0.44], shape: 'ellipse', layer: 4, tint: 'head' },
];

export interface RigIds {
  characterId: string;
  skeletonId: string;
  bodyId: string;
  playerId: string;
  bones: Record<string, string>;
}

/**
 * Crée un personnage complet : groupe, corps (mesh / sprite) lié au
 * squelette (skinning pondéré par défaut), Skeleton3D / Skeleton2D et ses
 * 11 bones (bras et jambes en deux segments, compatibles IK),
 * AnimationPlayer.
 */
export function buildCharacter(
  nodes: Record<string, SceneNode>,
  parentId: string,
  dimension: SceneDimension,
  name: string,
  position: Vec3,
  palette: { body: string; head: string; limbs: string; eyes?: string },
  fixedIds?: (key: string) => string,
  options: { deformation?: 'rigid' | 'weighted'; withPlayer?: boolean } = {},
): RigIds {
  const id = (key: string, prefix: string) => (fixedIds ? fixedIds(key) : uid(prefix));
  const specs = dimension === '3d' ? MANNEQUIN_BONES : PANTIN_BONES;

  const character = makeNode('group', name, { transform: transform(position) }, id('character', 'grp'));
  attach(nodes, character, parentId);

  const bodyId = id('body', 'msh');
  const skeleton = makeNode(
    'skeleton',
    dimension === '3d' ? 'Skeleton3D' : 'Skeleton2D',
    { skeleton: { showBones: true, deformation: options.deformation ?? 'weighted', boneColor: '#fdcf7b' } },
    id('skeleton', 'skl'),
  );

  const bones: Record<string, string> = {};
  for (const spec of specs) bones[spec.key] = id(`bone-${spec.key}`, 'bon');

  if (dimension === '3d') {
    const parts: RigPart[] = MANNEQUIN_PARTS.map((part) => ({
      boneId: bones[part.bone]!,
      shape: part.shape,
      size: [...part.size],
      offset: [...part.offset],
      color: part.tint === 'eyes' ? (palette.eyes ?? '#2a1a12') : palette[part.tint],
    }));
    attach(
      nodes,
      makeNode(
        'mesh',
        'Corps (Mesh)',
        { mesh: { shape: 'box', size: [1, 1, 1], color: palette.body, roughness: 0.8, metalness: 0, skin: { skeletonId: skeleton.id, parts } } },
        bodyId,
      ),
      character.id,
    );
  } else {
    const parts: SpritePart[] = PANTIN_PARTS.map((part) => ({
      boneId: bones[part.bone]!,
      width: part.size[0],
      height: part.size[1],
      offset: [...part.offset],
      color: part.tint === 'eyes' ? (palette.eyes ?? '#2a1a12') : palette[part.tint],
      shape: part.shape,
      layer: part.layer,
    }));
    attach(
      nodes,
      makeNode(
        'sprite',
        'Corps (Sprite)',
        {
          sprite: { width: 1, height: 1, color: palette.body, shape: 'rounded', pivot: [0.5, 0.5], layer: 2, skin: { skeletonId: skeleton.id, parts } },
        },
        bodyId,
      ),
      character.id,
    );
  }

  attach(nodes, skeleton, character.id);
  for (const spec of specs) {
    const bone = makeNode(
      'bone',
      spec.name,
      { transform: transform([...spec.position], [...spec.rotation]), bone: { length: spec.length, color: '#fdcf7b' } },
      bones[spec.key],
    );
    attach(nodes, bone, spec.parent ? bones[spec.parent]! : skeleton.id);
  }

  let playerId = '';
  if (options.withPlayer !== false) {
    const player = makeNode('animationPlayer', 'AnimationPlayer', {}, id('player', 'anp'));
    attach(nodes, player, character.id);
    playerId = player.id;
  }

  return { characterId: character.id, skeletonId: skeleton.id, bodyId, playerId, bones };
}

/** Point de contrôle IK : l'extrémité de `endBoneKey` (avant-bras, tibia) rejoint le point. */
export function makeIkTarget(name: string, position: Vec3, endBoneId: string, bend: 1 | -1, id?: string): SceneNode {
  const node = makeControl(name, position);
  if (id) node.id = id;
  node.control = { radius: 0.1, influence: 1, constraint: 'ik', targetBoneId: endBoneId, bend };
  return node;
}

/* -------------------------------------------------------------------------
   Animation
   ------------------------------------------------------------------------- */

export function key(frame: number, value: number[], interpolation: Interpolation = 'easeInOut'): Keyframe {
  return { id: uid('k'), frame, value, interpolation, bezier: [...DEFAULT_BEZIER] };
}

export function track(nodeId: string, property: Track['property'], keys: Keyframe[]): Track {
  return { id: uid('trk'), nodeId, property, keys: [...keys].sort((a, b) => a.frame - b.frame) };
}

export function makeClip(name: string, duration = 96, fps = 24): AnimationClip {
  return { id: uid('clip'), name, duration, fps, speed: 1, loop: true, defaultInterpolation: 'easeInOut', tracks: [] };
}

/* -------------------------------------------------------------------------
   Scène vide
   ------------------------------------------------------------------------- */

export function makeEmptyScene(name: string, dimension: SceneDimension): StudioScene {
  const nodes: Record<string, SceneNode> = {};
  const root = makeNode('root', name);
  attach(nodes, root, null);
  const world = makeNode('group', 'World');
  attach(nodes, world, root.id);
  const camera = makeCamera(dimension === '3d' ? 'Camera3D' : 'Camera2D', dimension, dimension === '3d' ? [4, 2.5, 6] : [0, 0, 10], [0, 0.8, 0]);
  attach(nodes, camera, world.id);
  if (dimension === '3d') {
    attach(nodes, makeLight('Soleil', 'directional', [4, 7, 3], '#ffe2bd', 2.2), world.id);
    attach(nodes, makeLight('Ambiance', 'ambient', [0, 0, 0], '#ffd9b8', 0.6), world.id);
    const ground = makeMesh('plane', 'Sol', '#3a2a1e');
    ground.kind = 'environment';
    ground.mesh!.size = [16, 16, 0];
    attach(nodes, ground, world.id);
  } else {
    const backdrop = makeSprite('Décor', 16, 9, '#3a2618', [0, 0, -1], 'rect');
    backdrop.kind = 'environment';
    backdrop.sprite!.layer = -10;
    attach(nodes, backdrop, world.id);
  }
  const clip = makeClip('Clip_01');
  return {
    id: uid('scn'),
    name,
    dimension,
    rootId: root.id,
    nodes,
    clips: [clip],
    activeClipId: clip.id,
    background: dimension === '3d' ? '#1d140e' : '#24170f',
    viewer: {
      mainCameraId: camera.id,
      povs: [{ cameraId: camera.id, label: 'Plan principal' }],
      transition: { type: 'cut', duration: 0.5 },
      freeCamera: { enabled: false, target: [0, 1, 0], minDistance: 2, maxDistance: 10, minPolar: 20, maxPolar: 95 },
    },
  };
}
