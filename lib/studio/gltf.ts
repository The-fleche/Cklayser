'use client';

/**
 * Lecture d'un fichier glTF binaire (.glb) à l'import :
 *  - cadrage automatique (échelle, décalage vertical) partagé par le rendu
 *    et le squelette du Studio ;
 *  - squelette : bones (nom, parent, pose de repos, longueur) ;
 *  - animations : chaque clip est échantillonné à 24 i/s (AnimationMixer)
 *    et converti en keyframes linéaires de position / rotation (degrés,
 *    ordre YXZ, angles « déroulés » pour éviter les sauts de ±180°) /
 *    échelle. Les pistes constantes sont ignorées.
 *
 * Le résultat est sérialisable (stocké dans l'asset) : à l'instanciation,
 * le Studio crée des bones et des clips modifiables qui pilotent les bones
 * du fichier (SceneRenderer.driveModels).
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { GltfRig, Vec3 } from './types';

const FPS = 24;
const MAX_SECONDS = 30;
const MAX_CLIPS = 8;
const RAD = 180 / Math.PI;

export interface GltfInfo {
  fit: { scale: number; offsetY: number };
  rig?: GltfRig;
  meshCount: number;
}

const round = (value: number, digits = 4) => Math.round(value * 10 ** digits) / 10 ** digits;

function eulerDegrees(quaternion: THREE.Quaternion, previous?: number[]): Vec3 {
  const euler = new THREE.Euler().setFromQuaternion(quaternion, 'YXZ');
  const values = [euler.x * RAD, euler.y * RAD, euler.z * RAD];
  if (previous) {
    for (let i = 0; i < 3; i += 1) {
      while (values[i]! - previous[i]! > 180) values[i]! -= 360;
      while (values[i]! - previous[i]! < -180) values[i]! += 360;
    }
  }
  return [round(values[0]!, 2), round(values[1]!, 2), round(values[2]!, 2)];
}

/** Transformation locale d'un bone (racine : relative à la scène du fichier). */
function localTrs(bone: THREE.Object3D, isRoot: boolean): { position: THREE.Vector3; quaternion: THREE.Quaternion; scale: THREE.Vector3 } {
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  if (isRoot) bone.matrixWorld.decompose(position, quaternion, scale);
  else bone.matrix.decompose(position, quaternion, scale);
  return { position, quaternion, scale };
}

export async function inspectGltf(url: string): Promise<GltfInfo> {
  const gltf = await new GLTFLoader().loadAsync(url);
  const scene = gltf.scene;
  scene.updateMatrixWorld(true);

  // Cadrage (même règle que le moteur de rendu).
  const box = new THREE.Box3().setFromObject(scene);
  const size = box.getSize(new THREE.Vector3());
  const largest = Math.max(size.x, size.y, size.z);
  const scale = largest > 0 && (largest > 8 || largest < 0.2) ? 1.8 / largest : 1;
  const offsetY = -box.min.y * scale;
  let meshCount = 0;
  scene.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) meshCount += 1;
  });

  const bones: THREE.Bone[] = [];
  const seen = new Set<string>();
  scene.traverse((child) => {
    const bone = child as THREE.Bone;
    if (!bone.isBone) return;
    if (!bone.name || seen.has(bone.name)) bone.name = `${bone.name || 'Bone'}_${bones.length}`;
    seen.add(bone.name);
    bones.push(bone);
  });
  const fit = { scale: round(scale, 5), offsetY: round(offsetY, 4) };
  if (bones.length === 0) return { fit, meshCount };

  const isRoot = (bone: THREE.Object3D) => !(bone.parent as THREE.Bone | null)?.isBone;
  const rigBones: GltfRig['bones'] = bones.map((bone) => {
    const { position, quaternion, scale: boneScale } = localTrs(bone, isRoot(bone));
    const childBone = bone.children.find((child) => (child as THREE.Bone).isBone);
    const length = childBone ? childBone.position.length() : 0.1 / Math.max(scale, 1e-3);
    return {
      name: bone.name,
      parent: isRoot(bone) ? null : bone.parent!.name,
      position: [round(position.x), round(position.y), round(position.z)],
      rotation: eulerDegrees(quaternion),
      scale: [round(boneScale.x), round(boneScale.y), round(boneScale.z)],
      length: round(Math.max(length, 1e-3)),
    };
  });

  const clips: GltfRig['clips'] = [];
  const mixer = new THREE.AnimationMixer(scene);
  for (const clip of gltf.animations.slice(0, MAX_CLIPS)) {
    const frames = Math.max(1, Math.round(Math.min(clip.duration, MAX_SECONDS) * FPS));
    const action = mixer.clipAction(clip);
    action.play();
    const samples = new Map<string, { position: number[][]; rotation: number[][]; scale: number[][] }>();
    for (const bone of bones) samples.set(bone.name, { position: [], rotation: [], scale: [] });
    for (let frame = 0; frame <= frames; frame += 1) {
      mixer.setTime(frame / FPS);
      scene.updateMatrixWorld(true);
      for (const bone of bones) {
        const sample = samples.get(bone.name)!;
        const { position, quaternion, scale: boneScale } = localTrs(bone, isRoot(bone));
        sample.position.push([round(position.x), round(position.y), round(position.z)]);
        sample.rotation.push(eulerDegrees(quaternion, sample.rotation[sample.rotation.length - 1]));
        sample.scale.push([round(boneScale.x), round(boneScale.y), round(boneScale.z)]);
      }
    }
    action.stop();
    mixer.uncacheAction(clip);

    const tracks: GltfRig['clips'][number]['tracks'] = [];
    for (const [boneName, sample] of samples) {
      for (const property of ['position', 'rotation', 'scale'] as const) {
        const values = sample[property];
        const first = values[0]!;
        const constant = values.every((value) => value.every((component, i) => Math.abs(component - first[i]!) < (property === 'rotation' ? 0.05 : 1e-4)));
        if (constant) continue;
        tracks.push({ bone: boneName, property, frames: values.map((_, frame) => frame), values });
      }
    }
    clips.push({ name: clip.name || `Animation ${clips.length + 1}`, duration: frames, tracks });
  }
  mixer.stopAllAction();

  return { fit, rig: { bones: rigBones, clips }, meshCount };
}
