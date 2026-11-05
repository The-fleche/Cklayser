/**
 * CKlayser Studio — projet de démonstration.
 *
 * « Échos d'Aélith — Atelier » : deux scènes.
 *  1. L'atelier (3D) : Aélith, personnage rigué (Skeleton3D, 7 bones), un
 *     tour de potier qui tourne avec son vase, deux caméras de scène et un
 *     clip de 4 s (salut de la main, regard, travelling de caméra).
 *  2. Brindille (2D) : pantin 2D (Skeleton2D) et un caillou qui rebondit.
 *
 * Les identifiants sont fixes pour que la démo soit reproductible (tests).
 */
import { attach, buildCharacter, key, lookAtRotation, makeCamera, makeClip, makeControl, makeLight, makeMesh, makeNode, makeSprite, track } from './factory';
import type { SceneNode, StudioAsset, StudioProject, StudioScene, Vec3 } from './types';

function atelierScene(): StudioScene {
  const nodes: Record<string, SceneNode> = {};
  const root = makeNode('root', 'L’atelier', {}, 'atelier-root');
  attach(nodes, root, null);
  const world = makeNode('group', 'World', {}, 'atelier-world');
  attach(nodes, world, root.id);

  const ground = makeMesh('plane', 'Environment', '#3b2a1d');
  ground.id = 'atelier-env';
  ground.kind = 'environment';
  ground.mesh!.size = [18, 18, 0];
  ground.mesh!.roughness = 0.95;
  attach(nodes, ground, world.id);

  const sun = makeLight('Light', 'directional', [4, 7, 3.5], '#ffe0b8', 2.4);
  sun.id = 'atelier-sun';
  attach(nodes, sun, world.id);
  const ambient = makeLight('Ambiance', 'ambient', [0, 0, 0], '#ffcfa6', 0.8);
  ambient.id = 'atelier-ambient';
  attach(nodes, ambient, world.id);

  const target: Vec3 = [0.2, 1.1, 0];
  const camStart: Vec3 = [4.4, 2.1, 5.8];
  const camEnd: Vec3 = [2.6, 1.55, 4.1];
  const mainCam = makeCamera('Cam_Principale', '3d', camStart, target);
  mainCam.id = 'atelier-cam-main';
  attach(nodes, mainCam, world.id);
  const sideCam = makeCamera('Cam_Profil', '3d', [-4.6, 1.5, 0.9], [0, 1.15, -0.2]);
  sideCam.id = 'atelier-cam-side';
  sideCam.camera!.fov = 34;
  attach(nodes, sideCam, world.id);

  const rig = buildCharacter(
    nodes,
    world.id,
    '3d',
    'Aélith',
    [-0.4, 0, 0.2],
    { body: '#be4d3d', head: '#f1d8bd', limbs: '#e0774a' },
    (k) => `aelith-${k}`,
  );
  const gaze = makeControl('Cible_Regard', [2.4, 1.6, 1.6], rig.bones.head);
  gaze.id = 'aelith-gaze';
  gaze.control!.influence = 0;
  gaze.control!.aimAxis = 'z';
  attach(nodes, gaze, rig.skeletonId);

  const props = makeNode('group', 'Props', {}, 'atelier-props');
  attach(nodes, props, world.id);
  const bench = makeMesh('box', 'Établi', '#5a3a24', [1.7, 0, -1]);
  bench.id = 'atelier-bench';
  bench.mesh!.size = [1.7, 0.8, 0.9];
  bench.transform.position[1] = 0.4;
  attach(nodes, bench, props.id);
  const wheel = makeMesh('cylinder', 'Tour_Potier', '#8a6a4a', [1.45, 0.8, -1]);
  wheel.id = 'atelier-wheel';
  wheel.mesh!.size = [0.62, 0.07, 0.62];
  wheel.transform.position[1] = 0.835;
  attach(nodes, wheel, props.id);
  const vase = makeMesh('vase', 'Vase_Argile', '#c7643c');
  vase.id = 'atelier-vase';
  vase.mesh!.size = [0.34, 0.5, 0.34];
  vase.transform.position = [0, 0.285, 0];
  attach(nodes, vase, wheel.id);
  const crate = makeMesh('box', 'Caisse', '#6b4a2e', [-2, 0, -1.4]);
  crate.id = 'atelier-crate';
  crate.mesh!.size = [0.6, 0.6, 0.6];
  crate.transform.position[1] = 0.3;
  crate.transform.rotation = [0, 22, 0];
  attach(nodes, crate, props.id);
  const lantern = makeLight('Lanterne', 'point', [2.3, 1.5, -1.3], '#fdcf7b', 14);
  lantern.id = 'atelier-lantern';
  attach(nodes, lantern, props.id);

  const clip = makeClip('Plan_01 · L’éveil', 96, 24);
  clip.id = 'atelier-clip';
  clip.tracks = [
    track(rig.characterId, 'position', [key(0, [-0.6, 0, 0.3]), key(96, [-0.1, 0, 0.6])]),
    track(rig.bones.torso!, 'rotation', [key(0, [0, 0, 0]), key(48, [6, 14, 0]), key(96, [0, 0, 0])]),
    track(rig.bones.head!, 'rotation', [key(0, [0, 0, 0]), key(28, [-4, -28, 0]), key(60, [8, 22, 4]), key(96, [0, 0, 0])]),
    track(rig.bones.armR!, 'rotation', [
      key(0, [0, 0, 168], 'easeOut'),
      key(20, [0, 0, 40]),
      key(32, [0, 0, 62]),
      key(44, [0, 0, 36]),
      key(56, [0, 0, 62]),
      key(78, [0, 0, 168]),
    ]),
    track(mainCam.id, 'position', [key(0, camStart), key(96, camEnd)]),
    track(mainCam.id, 'rotation', [key(0, lookAtRotation(camStart, target)), key(96, lookAtRotation(camEnd, target))]),
    track(mainCam.id, 'fov', [key(0, [42]), key(96, [32])]),
    track(wheel.id, 'rotation', [key(0, [0, 0, 0], 'linear'), key(96, [0, 360, 0], 'linear')]),
  ];

  return {
    id: 'scene-atelier',
    name: 'L’atelier',
    dimension: '3d',
    rootId: root.id,
    nodes,
    clips: [clip],
    activeClipId: clip.id,
    background: '#1d140e',
    viewer: {
      mainCameraId: mainCam.id,
      povs: [
        { cameraId: mainCam.id, label: 'Plan large' },
        { cameraId: sideCam.id, label: 'Profil' },
      ],
      transition: { type: 'cut', duration: 0.4 },
      freeCamera: { enabled: true, target: [0, 1, 0], minDistance: 2.5, maxDistance: 9, minPolar: 25, maxPolar: 92 },
    },
  };
}

function brindilleScene(): StudioScene {
  const nodes: Record<string, SceneNode> = {};
  const root = makeNode('root', 'Brindille salue', {}, 'brindille-root');
  attach(nodes, root, null);
  const world = makeNode('group', 'World', {}, 'brindille-world');
  attach(nodes, world, root.id);

  const backdrop = makeSprite('Décor', 18, 10, '#3d2818', [0, 0, -2], 'rect');
  backdrop.id = 'brindille-backdrop';
  backdrop.kind = 'environment';
  backdrop.sprite!.layer = -10;
  attach(nodes, backdrop, world.id);
  const sun = makeSprite('Soleil', 1.6, 1.6, '#fdcf7b', [4.6, 2.6, -1.5], 'ellipse');
  sun.id = 'brindille-sun';
  sun.sprite!.layer = -9;
  attach(nodes, sun, world.id);
  const hill = makeSprite('Colline', 14, 3.2, '#5b3a22', [1.5, -3.6, -1], 'ellipse');
  hill.id = 'brindille-hill';
  hill.sprite!.layer = -5;
  attach(nodes, hill, world.id);

  const cam = makeCamera('Camera2D', '2d', [0, 0, 10]);
  cam.id = 'brindille-cam';
  attach(nodes, cam, world.id);

  const rig = buildCharacter(
    nodes,
    world.id,
    '2d',
    'Brindille',
    [-1.4, -3, 0],
    { body: '#c96a3a', head: '#f3dcc0', limbs: '#9a4a2a' },
    (k) => `brindille-${k}`,
  );

  const pebble = makeSprite('Caillou', 1.1, 0.85, '#9c8e80', [2.4, -2.55, 0.2], 'ellipse');
  pebble.id = 'brindille-pebble';
  attach(nodes, pebble, world.id);

  const clip = makeClip('Salut', 72, 24);
  clip.id = 'brindille-clip';
  clip.tracks = [
    track(rig.bones.armL!, 'rotation', [
      key(0, [0, 0, -150], 'easeOut'),
      key(16, [0, 0, -30]),
      key(28, [0, 0, -55]),
      key(40, [0, 0, -25]),
      key(52, [0, 0, -55]),
      key(72, [0, 0, -150]),
    ]),
    track(rig.bones.head!, 'rotation', [key(0, [0, 0, 0]), key(24, [0, 0, 10]), key(48, [0, 0, -6]), key(72, [0, 0, 0])]),
    track(rig.bones.torso!, 'rotation', [key(0, [0, 0, 0]), key(36, [0, 0, -5]), key(72, [0, 0, 0])]),
    track(pebble.id, 'position', [
      key(0, [2.4, -2.55, 0.2], 'easeOut'),
      key(12, [2.4, -1.4, 0.2], 'easeIn'),
      key(24, [2.4, -2.55, 0.2], 'easeOut'),
      key(36, [2.4, -1.9, 0.2], 'easeIn'),
      key(48, [2.4, -2.55, 0.2], 'constant'),
    ]),
    track(pebble.id, 'scale', [key(0, [1, 1, 1]), key(22, [1, 1, 1], 'easeOut'), key(25, [1.18, 0.8, 1], 'easeOut'), key(32, [1, 1, 1])]),
    track(cam.id, 'zoom', [key(0, [1]), key(72, [1.12])]),
  ];

  return {
    id: 'scene-brindille',
    name: 'Brindille salue',
    dimension: '2d',
    rootId: root.id,
    nodes,
    clips: [clip],
    activeClipId: clip.id,
    background: '#24170f',
    viewer: {
      mainCameraId: cam.id,
      povs: [{ cameraId: cam.id, label: 'Plan principal' }],
      transition: { type: 'cut', duration: 0.3 },
      freeCamera: { enabled: false, target: [0, 0, 0], minDistance: 2, maxDistance: 10, minPolar: 20, maxPolar: 95 },
    },
  };
}

export const LIBRARY_ASSETS: StudioAsset[] = [
  { id: 'lib-mannequin', name: 'Mannequin argile', folder: 'characters', type: 'character', origin: 'library', preset: 'mannequin3d', dimension: '3d', color: '#be4d3d', description: 'Personnage 3D : Skeleton3D, 7 bones, corps lié.' },
  { id: 'lib-pantin', name: 'Pantin 2D', folder: 'characters', type: 'character', origin: 'library', preset: 'pantin2d', dimension: '2d', color: '#c96a3a', description: 'Personnage 2D : Skeleton2D, 7 bones, sprites liés.' },
  { id: 'lib-vase', name: 'Vase', folder: 'environments', type: 'primitive', origin: 'library', shape: 'vase', color: '#c7643c', dimension: '3d' },
  { id: 'lib-box', name: 'Caisse', folder: 'environments', type: 'primitive', origin: 'library', shape: 'box', color: '#6b4a2e', dimension: '3d' },
  { id: 'lib-sphere', name: 'Boule d’argile', folder: 'environments', type: 'primitive', origin: 'library', shape: 'sphere', color: '#e0774a', dimension: '3d' },
  { id: 'lib-cylinder', name: 'Colonne', folder: 'environments', type: 'primitive', origin: 'library', shape: 'cylinder', color: '#8a6a4a', dimension: '3d' },
  { id: 'lib-cone', name: 'Cône', folder: 'environments', type: 'primitive', origin: 'library', shape: 'cone', color: '#b17b0d', dimension: '3d' },
  { id: 'lib-torus', name: 'Anneau', folder: 'environments', type: 'primitive', origin: 'library', shape: 'torus', color: '#fdcf7b', dimension: '3d' },
  { id: 'lib-ground', name: 'Sol', folder: 'environments', type: 'environment', origin: 'library', preset: 'ground', color: '#3b2a1d', dimension: '3d' },
  { id: 'lib-backdrop', name: 'Toile de fond', folder: 'environments', type: 'environment', origin: 'library', preset: 'backdrop', color: '#3d2818', dimension: '2d' },
  { id: 'lib-mat-clay', name: 'Argile cuite', folder: 'materials', type: 'material', origin: 'library', color: '#be4d3d' },
  { id: 'lib-mat-ochre', name: 'Ocre', folder: 'materials', type: 'material', origin: 'library', color: '#b17b0d' },
  { id: 'lib-mat-gold', name: 'Or pâle', folder: 'materials', type: 'material', origin: 'library', color: '#fdcf7b' },
  { id: 'lib-mat-ivory', name: 'Ivoire', folder: 'materials', type: 'material', origin: 'library', color: '#f1d8bd' },
  { id: 'lib-mat-charcoal', name: 'Charbon', folder: 'materials', type: 'material', origin: 'library', color: '#2a1e14' },
  { id: 'lib-anim-spin', name: 'Rotation 360°', folder: 'animations', type: 'animation', origin: 'library', preset: 'spin', description: 'Ajoute des keyframes de rotation (Y en 3D, Z en 2D) sur tout le clip.' },
  { id: 'lib-anim-bounce', name: 'Rebond', folder: 'animations', type: 'animation', origin: 'library', preset: 'bounce', description: 'Ajoute un rebond vertical (keyframes de position).' },
  { id: 'lib-anim-sway', name: 'Balancement', folder: 'animations', type: 'animation', origin: 'library', preset: 'sway', description: 'Ajoute un balancement (keyframes de rotation Z).' },
];

export function createDemoProject(): StudioProject {
  return {
    version: 1,
    id: 'demo-echos-aelith',
    name: 'Échos d’Aélith — Atelier',
    scenes: [atelierScene(), brindilleScene()],
    activeSceneId: 'scene-atelier',
    assets: LIBRARY_ASSETS.map((asset) => ({ ...asset })),
    updatedAt: 0,
  };
}
