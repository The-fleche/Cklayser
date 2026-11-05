/**
 * CKlayser Studio — modèle de données commun.
 *
 * Toutes les zones de l'éditeur (hiérarchie, inspecteur, viewport, timeline,
 * assets) lisent et modifient CES données, via le store central
 * (lib/studio/store.ts). Rien n'est dupliqué dans les composants.
 *
 * Tout ce qui est décrit ici est sérialisable en JSON (pas de classes, pas de
 * références circulaires) : c'est le format de projet que le lecteur CKlayser
 * pourra recevoir pour reconstruire la scène en temps réel.
 *
 * Conventions :
 *  - transformations LOCALES (relatives au parent) ;
 *  - positions en unités de scène (1 unité ≈ 1 mètre en 3D) ;
 *  - rotations en degrés, ordre d'Euler YXZ (lacet, puis tangage, puis
 *    roulis : l'ordre par défaut de Godot, naturel pour caméras et
 *    personnages) ;
 *  - temps exprimé en images (frames) ; la cadence est portée par le clip.
 */

export type Vec3 = [number, number, number];

export interface Transform {
  position: Vec3;
  rotation: Vec3;
  scale: Vec3;
}

export type SceneDimension = '3d' | '2d';

/** Types de composants de la hiérarchie. */
export type NodeKind =
  | 'root' // racine de la scène (une par scène)
  | 'group' // nœud de regroupement (World, Props…)
  | 'environment' // décor / ciel / sol
  | 'light'
  | 'camera' // Camera3D ou Camera2D selon la dimension de la scène
  | 'mesh' // modèle 3D (primitive ou corps lié à un squelette)
  | 'sprite' // sprite 2D
  | 'model' // modèle importé (glTF / GLB)
  | 'skeleton' // Skeleton3D ou Skeleton2D
  | 'bone'
  | 'control' // point de contrôle d'un squelette
  | 'animationPlayer';

export type PrimitiveShape = 'box' | 'sphere' | 'cylinder' | 'capsule' | 'cone' | 'plane' | 'torus' | 'vase';

export type SpriteShape = 'rect' | 'rounded' | 'ellipse';

/** Partie rigide d'un corps, liée à un bone (« skinning » rigide). */
export interface RigPart {
  boneId: string;
  shape: PrimitiveShape;
  /** Dimensions de la primitive (largeur, hauteur, profondeur). */
  size: Vec3;
  /** Décalage local par rapport au bone. */
  offset: Vec3;
  color: string;
}

export interface MeshData {
  shape: PrimitiveShape;
  size: Vec3;
  color: string;
  roughness: number;
  metalness: number;
  /** Texture (asset image importé), plaquée sur la primitive. */
  textureAssetId?: string;
  /** Corps lié à un squelette : les parties suivent les bones. */
  skin?: { skeletonId: string; parts: RigPart[] };
}

export interface SpriteData {
  /** Asset image (texture) ou forme procédurale si absent. */
  assetId?: string;
  width: number;
  height: number;
  color: string;
  shape: SpriteShape;
  /** Point d'ancrage (0..1) : pivot du sprite. */
  pivot: [number, number];
  /** Ordre d'affichage en 2D. */
  layer: number;
  skin?: { skeletonId: string; parts: SpritePart[] };
}

export interface SpritePart {
  boneId: string;
  width: number;
  height: number;
  /** Décalage le long du bone. */
  offset: [number, number];
  color: string;
  shape: SpriteShape;
  layer: number;
}

export interface LightData {
  type: 'directional' | 'point' | 'ambient';
  color: string;
  intensity: number;
  castShadow: boolean;
}

export type Projection = 'perspective' | 'orthographic';

export interface CameraData {
  projection: Projection;
  /** Champ de vision vertical (perspective), en degrés. */
  fov: number;
  /** Focale équivalente 35 mm, dérivée du champ de vision. */
  zoom: number;
  near: number;
  far: number;
  /** Rapport d'image du rendu (16/9 par défaut). */
  aspect: number;
  /** Rendu : fond et contour de cadre. */
  background: string;
}

export interface BoneData {
  length: number;
  /** Couleur d'affichage du bone dans le viewport. */
  color: string;
}

export interface ControlData {
  /** Rayon d'influence (unités de scène). */
  radius: number;
  /** Influence de la contrainte, 0 à 1. */
  influence: number;
  /** Contrainte : le bone ciblé s'oriente vers ce point. */
  constraint: 'none' | 'aim';
  targetBoneId?: string;
  /** Axe du bone orienté vers le point : Y (le long du bone) ou Z (l'avant, ex. regard). */
  aimAxis?: 'y' | 'z';
}

export interface SkeletonData {
  showBones: boolean;
  /** Mode de déformation. Seul « rigid » est implémenté (voir README). */
  deformation: 'rigid' | 'weighted';
  boneColor: string;
}

export interface SceneNode {
  id: string;
  name: string;
  kind: NodeKind;
  parentId: string | null;
  /** Ordre des enfants : identifiants. */
  children: string[];
  transform: Transform;
  visible: boolean;
  locked: boolean;
  mesh?: MeshData;
  sprite?: SpriteData;
  light?: LightData;
  camera?: CameraData;
  bone?: BoneData;
  control?: ControlData;
  skeleton?: SkeletonData;
  model?: { assetId: string };
}

/* -------------------------------------------------------------------------
   Animation
   ------------------------------------------------------------------------- */

export type Interpolation = 'linear' | 'bezier' | 'constant' | 'easeIn' | 'easeOut' | 'easeInOut';

/** Propriétés animables. Les vecteurs ont 3 composantes, les scalaires 1. */
export type AnimProperty = 'position' | 'rotation' | 'scale' | 'fov' | 'zoom';

export interface Keyframe {
  id: string;
  frame: number;
  value: number[];
  /** Interpolation vers la keyframe SUIVANTE. */
  interpolation: Interpolation;
  /** Poignées de Bézier (x1, y1, x2, y2), normalisées 0..1. */
  bezier: [number, number, number, number];
}

export interface Track {
  id: string;
  nodeId: string;
  property: AnimProperty;
  keys: Keyframe[];
}

export interface AnimationClip {
  id: string;
  name: string;
  /** Durée en images. */
  duration: number;
  fps: number;
  speed: number;
  loop: boolean;
  defaultInterpolation: Interpolation;
  tracks: Track[];
}

/* -------------------------------------------------------------------------
   Caméras du spectateur (diffusion)
   ------------------------------------------------------------------------- */

export interface ViewerCameraSettings {
  /** Caméra principale de diffusion. */
  mainCameraId: string | null;
  /** Points de vue alternatifs proposés au spectateur (boutons du lecteur). */
  povs: { cameraId: string; label: string }[];
  /** Transition au changement de point de vue. */
  transition: { type: 'cut' | 'fade' | 'blend'; duration: number };
  /** Caméra libre (scènes 3D compatibles) : limites imposées par le créateur. */
  freeCamera: {
    enabled: boolean;
    target: Vec3;
    minDistance: number;
    maxDistance: number;
    /** Angle vertical autorisé, en degrés (0 = au-dessus, 180 = en dessous). */
    minPolar: number;
    maxPolar: number;
  };
}

export interface StudioScene {
  id: string;
  name: string;
  dimension: SceneDimension;
  rootId: string;
  nodes: Record<string, SceneNode>;
  clips: AnimationClip[];
  activeClipId: string;
  viewer: ViewerCameraSettings;
  background: string;
}

/* -------------------------------------------------------------------------
   Assets
   ------------------------------------------------------------------------- */

export type AssetFolder = 'characters' | 'environments' | 'materials' | 'animations' | 'textures' | 'audio';

export type AssetType = 'model' | 'primitive' | 'texture' | 'character' | 'environment' | 'animation' | 'material' | 'audio';

export interface StudioAsset {
  id: string;
  name: string;
  folder: AssetFolder;
  type: AssetType;
  /** Fourni avec le Studio, ou importé par le créateur. */
  origin: 'library' | 'import';
  /** Primitive (assets de bibliothèque) ou couleur de matériau. */
  shape?: PrimitiveShape;
  /** Modèle de personnage ou préréglage d'animation de la bibliothèque. */
  preset?: 'mannequin3d' | 'pantin2d' | 'spin' | 'bounce' | 'sway' | 'ground' | 'backdrop';
  dimension?: SceneDimension;
  description?: string;
  color?: string;
  /** Fichier importé : URL locale (session) ou data URL (images légères). */
  url?: string;
  size?: number;
  mime?: string;
  /** Une URL de session ne survit pas au rechargement de la page. */
  sessionOnly?: boolean;
}

export interface StudioProject {
  version: 1;
  id: string;
  name: string;
  scenes: StudioScene[];
  activeSceneId: string;
  assets: StudioAsset[];
  updatedAt: number;
}

/* -------------------------------------------------------------------------
   État d'interface (non sérialisé dans le projet)
   ------------------------------------------------------------------------- */

export type Tool = 'select' | 'move' | 'rotate' | 'scale' | 'pose';

/** edit : caméra de création libre ; camera : vue de la caméra de scène ;
 *  preview : rendu final (sans gizmos ni éléments d'édition). */
export type ViewMode = 'edit' | 'camera' | 'preview';

export interface KeyRef {
  trackId: string;
  keyId: string;
}
