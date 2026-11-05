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
  { key: 'armL', name: 'Arm_L', parent: 'torso', position: [0.24, 0.44, 0], rotation: [0, 0, -168], length: 0.62 },
  { key: 'armR', name: 'Arm_R', parent: 'torso', position: [-0.24, 0.44, 0], rotation: [0, 0, 168], length: 0.62 },
  { key: 'legL', name: 'Leg_L', parent: 'hips', position: [0.11, 0, 0], rotation: [0, 0, 180], length: 0.9 },
  { key: 'legR', name: 'Leg_R', parent: 'hips', position: [-0.11, 0, 0], rotation: [0, 0, 180], length: 0.9 },
];

const PANTIN_BONES: BoneSpec[] = [
  { key: 'hips', name: 'Bassin', parent: null, position: [0, 1.25, 0], rotation: [0, 0, 0], length: 0.2 },
  { key: 'torso', name: 'Tronc', parent: 'hips', position: [0, 0.2, 0], rotation: [0, 0, 0], length: 0.85 },
  { key: 'head', name: 'Tête', parent: 'torso', position: [0, 0.85, 0], rotation: [0, 0, 0], length: 0.6 },
  { key: 'armL', name: 'Bras_G', parent: 'torso', position: [0.28, 0.72, 0], rotation: [0, 0, -150], length: 0.8 },
  { key: 'armR', name: 'Bras_D', parent: 'torso', position: [-0.28, 0.72, 0], rotation: [0, 0, 150], length: 0.8 },
  { key: 'legL', name: 'Jambe_G', parent: 'hips', position: [0.16, 0, 0], rotation: [0, 0, 180], length: 1.2 },
  { key: 'legR', name: 'Jambe_D', parent: 'hips', position: [-0.16, 0, 0], rotation: [0, 0, 180], length: 1.2 },
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
 * squelette, Skeleton3D / Skeleton2D et ses bones, AnimationPlayer.
 */
export function buildCharacter(
  nodes: Record<string, SceneNode>,
  parentId: string,
  dimension: SceneDimension,
  name: string,
  position: Vec3,
  palette: { body: string; head: string; limbs: string },
  fixedIds?: (key: string) => string,
): RigIds {
  const id = (key: string, prefix: string) => (fixedIds ? fixedIds(key) : uid(prefix));
  const specs = dimension === '3d' ? MANNEQUIN_BONES : PANTIN_BONES;

  const character = makeNode('group', name, { transform: transform(position) }, id('character', 'grp'));
  attach(nodes, character, parentId);

  const bodyId = id('body', 'msh');
  const skeleton = makeNode(
    'skeleton',
    dimension === '3d' ? 'Skeleton3D' : 'Skeleton2D',
    { skeleton: { showBones: true, deformation: 'rigid', boneColor: '#fdcf7b' } },
    id('skeleton', 'skl'),
  );

  const bones: Record<string, string> = {};
  for (const spec of specs) bones[spec.key] = id(`bone-${spec.key}`, 'bon');

  const color = (key: string) => (key === 'head' ? palette.head : key === 'torso' || key === 'hips' ? palette.body : palette.limbs);

  if (dimension === '3d') {
    const partShape: Record<string, { shape: PrimitiveShape; size: Vec3 }> = {
      hips: { shape: 'box', size: [0.34, 0.16, 0.2] },
      torso: { shape: 'capsule', size: [0.36, 0.5, 0.24] },
      head: { shape: 'sphere', size: [0.27, 0.31, 0.27] },
      armL: { shape: 'capsule', size: [0.1, 0.62, 0.1] },
      armR: { shape: 'capsule', size: [0.1, 0.62, 0.1] },
      legL: { shape: 'capsule', size: [0.13, 0.88, 0.13] },
      legR: { shape: 'capsule', size: [0.13, 0.88, 0.13] },
    };
    const parts: RigPart[] = specs.map((spec) => {
      const part = partShape[spec.key]!;
      return {
        boneId: bones[spec.key]!,
        shape: part.shape,
        size: part.size,
        offset: [0, spec.key === 'hips' ? 0.04 : spec.key === 'head' ? 0.16 : spec.length / 2, 0],
        color: color(spec.key),
      };
    });
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
    const partSize: Record<string, [number, number]> = {
      hips: [0.55, 0.35],
      torso: [0.75, 1.05],
      head: [0.75, 0.75],
      armL: [0.22, 0.85],
      armR: [0.22, 0.85],
      legL: [0.26, 1.25],
      legR: [0.26, 1.25],
    };
    const layer: Record<string, number> = { armR: -1, legR: -1, hips: 1, legL: 0, torso: 2, head: 3, armL: 4 };
    const parts: SpritePart[] = specs.map((spec) => ({
      boneId: bones[spec.key]!,
      width: partSize[spec.key]![0],
      height: partSize[spec.key]![1],
      offset: [0, spec.key === 'hips' ? 0.05 : spec.key === 'head' ? 0.32 : spec.length / 2],
      color: color(spec.key),
      shape: spec.key === 'head' ? 'ellipse' : 'rounded',
      layer: layer[spec.key] ?? 0,
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
      { transform: transform(spec.position, spec.rotation), bone: { length: spec.length, color: '#fdcf7b' } },
      bones[spec.key],
    );
    attach(nodes, bone, spec.parent ? bones[spec.parent]! : skeleton.id);
  }

  const player = makeNode('animationPlayer', 'AnimationPlayer', {}, id('player', 'anp'));
  attach(nodes, player, character.id);

  return { characterId: character.id, skeletonId: skeleton.id, bodyId, playerId: player.id, bones };
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
