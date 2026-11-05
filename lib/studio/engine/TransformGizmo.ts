/**
 * TransformGizmo — poignées de transformation (déplacement, rotation,
 * échelle) du composant sélectionné.
 *
 * Encapsule TransformControls (three/examples) et l'adapte au Studio :
 *  - outil → mode du gizmo ; outil « pose » : rotation des bones,
 *    déplacement des points de contrôle ;
 *  - scène 2D : seuls les axes du plan (X, Y) et la rotation Z ;
 *  - aimantation optionnelle (pas de grille, 15° en rotation) ;
 *  - émet début / changement / fin de geste vers le store (une entrée
 *    d'historique par geste).
 */
import * as THREE from 'three';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import type { AnimProperty, NodeKind, SceneDimension, Tool } from '../types';

export const HELPER_LAYER = 1;

export interface GizmoCallbacks {
  onStart: () => void;
  onChange: (property: AnimProperty, value: number[]) => void;
  onEnd: () => void;
  onDraggingChanged: (dragging: boolean) => void;
}

const RAD = 180 / Math.PI;
const round = (value: number) => Math.round(value * 1000) / 1000;

export class TransformGizmo {
  readonly controls: TransformControls;
  private mode: 'translate' | 'rotate' | 'scale' = 'translate';
  dragging = false;

  constructor(camera: THREE.Camera, domElement: HTMLElement, scene: THREE.Scene, callbacks: GizmoCallbacks) {
    this.controls = new TransformControls(camera, domElement);
    this.controls.setSize(0.85);
    const helper = this.controls.getHelper();
    helper.traverse((child) => child.layers.set(HELPER_LAYER));
    this.controls.getRaycaster().layers.enableAll();
    scene.add(helper);

    this.controls.addEventListener('dragging-changed', (event) => {
      this.dragging = Boolean(event.value);
      callbacks.onDraggingChanged(this.dragging);
    });
    this.controls.addEventListener('mouseDown', () => callbacks.onStart());
    this.controls.addEventListener('mouseUp', () => callbacks.onEnd());
    this.controls.addEventListener('objectChange', () => {
      const object = this.controls.object;
      if (!object) return;
      if (this.mode === 'translate') callbacks.onChange('position', object.position.toArray().map(round));
      else if (this.mode === 'rotate') callbacks.onChange('rotation', [object.rotation.x * RAD, object.rotation.y * RAD, object.rotation.z * RAD].map((v) => Math.round(v * 100) / 100));
      else callbacks.onChange('scale', object.scale.toArray().map(round));
    });
  }

  setCamera(camera: THREE.Camera): void {
    if (this.controls.camera !== camera) this.controls.camera = camera;
  }

  /** Attache le gizmo à `object` selon l'outil, ou le masque. */
  configure(object: THREE.Object3D | null, kind: NodeKind | null, tool: Tool, dimension: SceneDimension, snap: { enabled: boolean; step: number }): void {
    let mode: 'translate' | 'rotate' | 'scale' | null = null;
    if (object && kind && kind !== 'root' && kind !== 'animationPlayer') {
      if (tool === 'move') mode = 'translate';
      else if (tool === 'rotate') mode = 'rotate';
      else if (tool === 'scale') mode = 'scale';
      else if (tool === 'pose') mode = kind === 'bone' ? 'rotate' : kind === 'control' ? 'translate' : null;
      if (kind === 'control' && mode !== null) mode = 'translate';
      if (kind === 'camera' && mode === 'scale') mode = null;
      if (kind === 'light' && mode === 'scale') mode = null;
    }

    if (!object || !mode) {
      if (this.controls.object) this.controls.detach();
      return;
    }
    this.mode = mode;
    this.controls.setMode(mode);
    this.controls.setSpace(mode === 'rotate' || kind === 'bone' ? 'local' : 'world');
    const is2d = dimension === '2d';
    this.controls.showX = !(is2d && mode === 'rotate');
    this.controls.showY = !(is2d && mode === 'rotate');
    this.controls.showZ = !is2d || mode === 'rotate';
    this.controls.setTranslationSnap(snap.enabled ? snap.step : null);
    this.controls.setRotationSnap(snap.enabled ? THREE.MathUtils.degToRad(15) : null);
    this.controls.setScaleSnap(snap.enabled ? 0.1 : null);
    if (this.controls.object !== object) this.controls.attach(object);
  }

  dispose(): void {
    this.controls.detach();
    this.controls.getHelper().removeFromParent();
    this.controls.dispose();
  }
}
