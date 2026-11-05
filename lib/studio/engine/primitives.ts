/**
 * Moteur du Studio — géométries, textures procédurales et couleurs.
 *
 * Les couleurs de l'éditeur (grille, axes, bones, sélection) sont lues dans
 * les variables CSS globales (app/globals.css, section « Studio ») : aucune
 * valeur codée en dur côté composants.
 */
import * as THREE from 'three';
import type { PrimitiveShape, SpriteShape, Vec3 } from '../types';

export interface EditorTheme {
  gridMajor: string;
  gridMinor: string;
  axisX: string;
  axisY: string;
  axisZ: string;
  bone: string;
  boneSelected: string;
  selection: string;
  camera: string;
  cameraActive: string;
  light: string;
  control: string;
  letterbox: string;
}

const FALLBACK: EditorTheme = {
  gridMajor: '#5a4636',
  gridMinor: '#33261c',
  axisX: '#e0604a',
  axisY: '#8fcf6a',
  axisZ: '#5f9be0',
  bone: '#fdcf7b',
  boneSelected: '#e16330',
  selection: '#fdcf7b',
  camera: '#ddd0c6',
  cameraActive: '#e0774a',
  light: '#fdcf7b',
  control: '#e16330',
  letterbox: '#0f0a06',
};

/** Lit les couleurs de l'éditeur dans les variables CSS (--studio-…). */
export function readEditorTheme(element: Element): EditorTheme {
  const style = getComputedStyle(element);
  const read = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback;
  return {
    gridMajor: read('--studio-grid-major', FALLBACK.gridMajor),
    gridMinor: read('--studio-grid-minor', FALLBACK.gridMinor),
    axisX: read('--studio-axis-x', FALLBACK.axisX),
    axisY: read('--studio-axis-y', FALLBACK.axisY),
    axisZ: read('--studio-axis-z', FALLBACK.axisZ),
    bone: read('--studio-bone', FALLBACK.bone),
    boneSelected: read('--studio-bone-selected', FALLBACK.boneSelected),
    selection: read('--studio-selection', FALLBACK.selection),
    camera: read('--studio-camera', FALLBACK.camera),
    cameraActive: read('--studio-camera-active', FALLBACK.cameraActive),
    light: read('--studio-light', FALLBACK.light),
    control: read('--studio-control', FALLBACK.control),
    letterbox: read('--studio-letterbox', FALLBACK.letterbox),
  };
}

/** Profil de vase (tour de potier) pour LatheGeometry, hauteur 1, rayon max 0,5. */
const VASE_PROFILE: [number, number][] = [
  [0, 0],
  [0.3, 0],
  [0.36, 0.06],
  [0.47, 0.3],
  [0.5, 0.45],
  [0.44, 0.62],
  [0.26, 0.8],
  [0.2, 0.9],
  [0.26, 1],
  [0.22, 1],
  [0.16, 0.9],
];

export function createGeometry(shape: PrimitiveShape, size: Vec3): THREE.BufferGeometry {
  const [w, h, d] = size;
  switch (shape) {
    case 'box':
      return new THREE.BoxGeometry(w, h, d);
    case 'sphere': {
      const geometry = new THREE.SphereGeometry(0.5, 32, 20);
      geometry.scale(w, h, d);
      return geometry;
    }
    case 'cylinder':
      return new THREE.CylinderGeometry(w / 2, w / 2, h, 32);
    case 'cone':
      return new THREE.ConeGeometry(w / 2, h, 32);
    case 'capsule': {
      const radius = Math.min(w, d) / 2;
      const geometry = new THREE.CapsuleGeometry(radius, Math.max(0.001, h - radius * 2), 6, 16);
      geometry.scale(1, 1, d / w || 1);
      return geometry;
    }
    case 'plane':
      return new THREE.PlaneGeometry(w, h);
    case 'torus': {
      const geometry = new THREE.TorusGeometry(w / 2 - h / 2, h / 2, 16, 48);
      geometry.rotateX(Math.PI / 2);
      return geometry;
    }
    case 'vase': {
      const points = VASE_PROFILE.map(([x, y]) => new THREE.Vector2(x * w, y * h - h / 2));
      return new THREE.LatheGeometry(points, 40);
    }
  }
}

const spriteTextures = new Map<string, THREE.CanvasTexture>();

/**
 * Texture blanche d'une forme de sprite (teintée ensuite par la couleur du
 * matériau). Mise en cache par forme et proportions.
 */
export function spriteShapeTexture(shape: SpriteShape, width: number, height: number): THREE.Texture {
  const ratio = Math.round((width / Math.max(0.001, height)) * 10) / 10;
  const cacheKey = `${shape}:${ratio}`;
  const cached = spriteTextures.get(cacheKey);
  if (cached) return cached;
  const canvas = document.createElement('canvas');
  const base = 256;
  canvas.width = ratio >= 1 ? base : Math.max(16, Math.round(base * ratio));
  canvas.height = ratio >= 1 ? Math.max(16, Math.round(base / ratio)) : base;
  const context = canvas.getContext('2d')!;
  context.fillStyle = '#ffffff';
  const { width: cw, height: ch } = canvas;
  if (shape === 'ellipse') {
    context.beginPath();
    context.ellipse(cw / 2, ch / 2, cw / 2 - 1, ch / 2 - 1, 0, 0, Math.PI * 2);
    context.fill();
  } else if (shape === 'rounded') {
    const radius = Math.min(cw, ch) * 0.42;
    context.beginPath();
    context.roundRect(1, 1, cw - 2, ch - 2, radius);
    context.fill();
    // Léger dégradé d'ombre pour donner du volume au papier découpé.
    const gradient = context.createLinearGradient(0, 0, cw, 0);
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, 'rgba(0,0,0,0.18)');
    context.globalCompositeOperation = 'source-atop';
    context.fillStyle = gradient;
    context.fillRect(0, 0, cw, ch);
  } else {
    context.fillRect(0, 0, cw, ch);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  spriteTextures.set(cacheKey, texture);
  return texture;
}

const imageTextures = new Map<string, THREE.Texture>();
const loader = typeof window === 'undefined' ? null : new THREE.TextureLoader();

export function imageTexture(url: string, onLoad: () => void): THREE.Texture | null {
  if (!loader) return null;
  const cached = imageTextures.get(url);
  if (cached) return cached;
  const texture = loader.load(url, onLoad);
  texture.colorSpace = THREE.SRGBColorSpace;
  imageTextures.set(url, texture);
  return texture;
}

/** Forme de bone 3D (octaèdre allongé façon Blender), axe +Y, longueur 1. */
export function boneGeometry3D(): THREE.BufferGeometry {
  const w = 0.1;
  const neck = 0.18;
  const vertices = [
    [0, 0, 0],
    [w, neck, w],
    [w, neck, -w],
    [-w, neck, -w],
    [-w, neck, w],
    [0, 1, 0],
  ] as const;
  const faces = [
    [0, 1, 2],
    [0, 2, 3],
    [0, 3, 4],
    [0, 4, 1],
    [5, 2, 1],
    [5, 3, 2],
    [5, 4, 3],
    [5, 1, 4],
  ];
  const positions: number[] = [];
  for (const face of faces) for (const index of face) positions.push(...vertices[index]!);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}

/** Forme de bone 2D (losange plat dans le plan XY), axe +Y, longueur 1. */
export function boneGeometry2D(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(0.12, 0.16);
  shape.lineTo(0, 1);
  shape.lineTo(-0.12, 0.16);
  shape.closePath();
  return new THREE.ShapeGeometry(shape);
}

export function disposeObject(object: THREE.Object3D): void {
  object.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
    if (Array.isArray(material)) material.forEach((item) => item.dispose());
    else material?.dispose();
  });
}
