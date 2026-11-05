/**
 * SceneRenderer — moteur de rendu du viewport (three.js), séparé de
 * l'interface React.
 *
 * Entrée : les données de scène (StudioScene) + l'évaluation de l'image
 * courante + l'état d'interface utile (sélection, outil, mode de vue).
 * Sortie : rendu WebGL et événements (sélection, transformations, pilotage
 * de caméra) renvoyés au store par des callbacks. Le moteur ne modifie
 * jamais les données lui-même.
 *
 * Deux familles de caméras, à ne jamais confondre :
 *  - la caméra de CRÉATION (editorCamera) : navigation libre du créateur,
 *    hors scène, jamais sérialisée ;
 *  - les caméras de SCÈNE (nœuds « camera ») : objets à part entière,
 *    animables, utilisées par les modes « caméra » et « aperçu » et par le
 *    lecteur public.
 *
 * Calques three.js : 0 = contenu rendu (ce que filment les caméras de
 * scène), 1 = aides d'édition (grille, bones, corps de caméra, icônes de
 * lumière, gizmo) visibles seulement depuis la caméra de création.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ViewHelper } from 'three/examples/jsm/helpers/ViewHelper.js';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { Evaluation } from '../animation';
import type { StudioSettings } from '../store';
import type { AnimProperty, Projection, SceneNode, StudioAsset, StudioScene, Tool, Transform, ViewMode } from '../types';
import { boneGeometry2D, boneGeometry3D, createGeometry, disposeObject, imageTexture, readEditorTheme, spriteShapeTexture, type EditorTheme } from './primitives';
import { HELPER_LAYER, TransformGizmo } from './TransformGizmo';

const DEG = Math.PI / 180;
const ORTHO_2D_HEIGHT = 9;

export interface RenderInput {
  scene: StudioScene;
  evaluation: Evaluation;
  assets: StudioAsset[];
  selectedId: string | null;
  tool: Tool;
  viewMode: ViewMode;
  viewCameraId: string | null;
  editorProjection: Projection;
  settings: StudioSettings;
  readOnly?: boolean;
}

export interface RendererCallbacks {
  onSelect: (nodeId: string | null) => void;
  onGestureStart: () => void;
  onProperty: (nodeId: string, property: AnimProperty, value: number[]) => void;
  onGestureEnd: () => void;
  /** Double-clic sur une caméra de scène : passer sur sa vue. */
  onViewCamera?: (cameraId: string) => void;
}

interface Entry {
  root: THREE.Object3D;
  content: THREE.Object3D;
  helper: THREE.Object3D;
  signature: string;
  camera?: THREE.PerspectiveCamera | THREE.OrthographicCamera;
  light?: THREE.Light;
  skinParts: THREE.Object3D[];
}

export interface FrameRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const gltfCache = new Map<string, Promise<GLTF>>();

function setLayer(object: THREE.Object3D, layer: number): void {
  object.traverse((child) => child.layers.set(layer));
}

function isVisibleInTree(object: THREE.Object3D): boolean {
  let current: THREE.Object3D | null = object;
  while (current) {
    if (!current.visible) return false;
    current = current.parent;
  }
  return true;
}

export class SceneRenderer {
  private readonly host: HTMLElement;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene3 = new THREE.Scene();
  private readonly world = new THREE.Group();
  private readonly perspective = new THREE.PerspectiveCamera(45, 1, 0.05, 500);
  private readonly ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, -500, 500);
  private editorCamera: THREE.PerspectiveCamera | THREE.OrthographicCamera = this.perspective;
  private readonly orbit: OrbitControls;
  private readonly gizmo: TransformGizmo;
  private readonly viewHelper: ViewHelper;
  private readonly grid = new THREE.Group();
  private readonly selectionBox = new THREE.Box3Helper(new THREE.Box3(), 0xffffff);
  private readonly freeCameraBounds = new THREE.Group();
  private readonly entries = new Map<string, Entry>();
  private readonly raycaster = new THREE.Raycaster();
  private readonly theme: EditorTheme;
  private readonly callbacks: RendererCallbacks;
  private readonly resizeObserver: ResizeObserver;
  private readonly timer = new THREE.Timer();
  private input: RenderInput | null = null;
  private dimension: '2d' | '3d' | null = null;
  private needsRender = true;
  private raf = 0;
  private pointerDown: { x: number; y: number; button: number; onGizmo: boolean; time: number } | null = null;
  private pilot: { x: number; y: number; mode: 'rotate' | 'pan'; started: boolean } | null = null;
  private width = 1;
  private height = 1;
  private disposed = false;
  private boneGeo3 = boneGeometry3D();
  private boneGeo2 = boneGeometry2D();
  private sceneId: string | null = null;

  constructor(host: HTMLElement, callbacks: RendererCallbacks) {
    this.host = host;
    this.callbacks = callbacks;
    this.theme = readEditorTheme(host);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.autoClear = false;
    this.renderer.domElement.setAttribute('aria-hidden', 'true');
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.touchAction = 'none';
    host.appendChild(this.renderer.domElement);

    this.scene3.add(this.world);
    this.perspective.layers.enable(HELPER_LAYER);
    this.ortho.layers.enable(HELPER_LAYER);
    this.raycaster.layers.enableAll();

    this.orbit = new OrbitControls(this.perspective, this.renderer.domElement);
    this.orbit.enableDamping = true;
    this.orbit.dampingFactor = 0.12;
    this.orbit.addEventListener('change', () => this.invalidate());

    this.gizmo = new TransformGizmo(this.perspective, this.renderer.domElement, this.scene3, {
      onStart: () => this.callbacks.onGestureStart(),
      onEnd: () => this.callbacks.onGestureEnd(),
      onChange: (property, value) => {
        const id = this.gizmo.controls.object?.userData.nodeId as string | undefined;
        if (id) this.callbacks.onProperty(id, property, value);
      },
      onDraggingChanged: (dragging) => {
        this.orbit.enabled = !dragging && this.input?.viewMode === 'edit';
        this.invalidate();
      },
    });

    this.viewHelper = new ViewHelper(this.perspective, this.renderer.domElement);
    Object.assign(this.viewHelper.location, { top: 12, right: 12, left: null, bottom: null });

    this.selectionBox.layers.set(HELPER_LAYER);
    (this.selectionBox.material as THREE.LineBasicMaterial).color.set(this.theme.selection);
    (this.selectionBox.material as THREE.LineBasicMaterial).depthTest = false;
    this.selectionBox.renderOrder = 999;
    this.selectionBox.visible = false;
    this.scene3.add(this.selectionBox);
    this.scene3.add(this.grid);
    this.scene3.add(this.freeCameraBounds);

    const element = this.renderer.domElement;
    element.addEventListener('pointerdown', this.onPointerDown);
    element.addEventListener('pointermove', this.onPointerMove);
    element.addEventListener('pointerup', this.onPointerUp);
    element.addEventListener('dblclick', this.onDoubleClick);
    element.addEventListener('wheel', this.onWheel, { passive: false });
    element.addEventListener('contextmenu', (event) => event.preventDefault());

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(host);
    this.resize();
    this.loop();
  }

  /* ======================================================================
     Cycle de vie
     ====================================================================== */

  invalidate(): void {
    this.needsRender = true;
  }

  private loop = (): void => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.loop);
    this.timer.update();
    const delta = this.timer.getDelta();
    if (this.viewHelper.animating) {
      this.viewHelper.update(delta);
      this.needsRender = true;
    }
    const orbitMoved = this.orbit.enabled ? this.orbit.update() : false;
    if (orbitMoved || this.needsRender) {
      this.needsRender = false;
      this.render();
    }
  };

  private resize(): void {
    const rect = this.host.getBoundingClientRect();
    this.width = Math.max(1, Math.floor(rect.width));
    this.height = Math.max(1, Math.floor(rect.height));
    this.renderer.setSize(this.width, this.height, false);
    this.renderer.domElement.style.width = `${this.width}px`;
    this.renderer.domElement.style.height = `${this.height}px`;
    this.perspective.aspect = this.width / this.height;
    this.perspective.updateProjectionMatrix();
    this.updateOrthoFrustum();
    this.invalidate();
  }

  private updateOrthoFrustum(): void {
    const aspect = this.width / this.height;
    const half = (this.dimension === '2d' ? ORTHO_2D_HEIGHT : this.orthoHeight()) / 2;
    this.ortho.left = -half * aspect;
    this.ortho.right = half * aspect;
    this.ortho.top = half;
    this.ortho.bottom = -half;
    this.ortho.updateProjectionMatrix();
  }

  private orthoHeight(): number {
    return Math.max(1, this.perspective.position.distanceTo(this.orbit.target) * Math.tan((this.perspective.fov * DEG) / 2) * 2);
  }

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.resizeObserver.disconnect();
    const element = this.renderer.domElement;
    element.removeEventListener('pointerdown', this.onPointerDown);
    element.removeEventListener('pointermove', this.onPointerMove);
    element.removeEventListener('pointerup', this.onPointerUp);
    element.removeEventListener('dblclick', this.onDoubleClick);
    element.removeEventListener('wheel', this.onWheel);
    this.gizmo.dispose();
    this.orbit.dispose();
    this.viewHelper.dispose();
    for (const entry of this.entries.values()) disposeObject(entry.root);
    this.boneGeo2.dispose();
    this.boneGeo3.dispose();
    this.renderer.dispose();
    element.remove();
  }

  /* ======================================================================
     Synchronisation avec les données
     ====================================================================== */

  update(input: RenderInput): void {
    const previous = this.input;
    this.input = input;
    const { scene } = input;

    if (scene.id !== this.sceneId || scene.dimension !== this.dimension) {
      this.sceneId = scene.id;
      this.setupForDimension(scene.dimension);
    }

    // 1. Création / suppression / reconstruction des objets.
    const alive = new Set(Object.keys(scene.nodes));
    for (const [id, entry] of this.entries) {
      if (!alive.has(id)) {
        if (this.gizmo.controls.object === entry.root) this.gizmo.controls.detach();
        entry.root.removeFromParent();
        disposeObject(entry.root);
        this.entries.delete(id);
      }
    }
    for (const node of Object.values(scene.nodes)) this.ensureEntry(node, input);

    // 2. Hiérarchie.
    for (const node of Object.values(scene.nodes)) {
      const entry = this.entries.get(node.id)!;
      const parent = node.parentId ? this.entries.get(node.parentId)?.root : this.world;
      if (parent && entry.root.parent !== parent) parent.add(entry.root);
    }

    // 3. Corps liés aux squelettes (parties attachées aux bones).
    for (const node of Object.values(scene.nodes)) this.syncSkin(node, input);

    // 4. Transformations animées et visibilité.
    const preview = input.viewMode === 'preview';
    for (const node of Object.values(scene.nodes)) {
      const entry = this.entries.get(node.id)!;
      const evaluated = input.evaluation.get(node.id);
      this.applyTransform(entry.root, evaluated?.transform ?? node.transform, node);
      entry.root.visible = node.visible;
      entry.helper.visible = !preview && node.visible;
      if (node.kind === 'bone' || node.kind === 'control') {
        const skeleton = this.findSkeleton(scene, node);
        entry.helper.visible = !preview && input.settings.bones && (skeleton?.skeleton?.showBones ?? true);
      }
      if (node.kind === 'camera' && entry.camera) this.syncSceneCamera(node, entry, evaluated?.fov, evaluated?.zoom);
      if (node.kind === 'camera') {
        // La caméra que l'on regarde à travers n'affiche pas son propre corps.
        entry.helper.visible = entry.helper.visible && !(input.viewMode !== 'edit' && input.viewCameraId === node.id);
      }
    }
    this.world.updateMatrixWorld(true);

    // 5. Contraintes des points de contrôle (orientation des bones).
    this.applyConstraints(scene);

    // 6. Mise en évidence de la sélection et gizmo.
    this.updateSelection(input);

    // 7. Aides de la scène.
    this.grid.visible = input.settings.grid && !preview;
    this.updateFreeCameraBounds(scene, input);
    this.scene3.background = new THREE.Color(scene.background);

    if (!previous || previous.viewMode !== input.viewMode || previous.viewCameraId !== input.viewCameraId) {
      this.orbit.enabled = input.viewMode === 'edit' && !this.gizmo.dragging;
    }
    if (!previous || previous.editorProjection !== input.editorProjection) this.setEditorProjection(input.editorProjection);
    this.invalidate();
  }

  private setupForDimension(dimension: '2d' | '3d'): void {
    this.dimension = dimension;
    this.grid.clear();
    const major = new THREE.Color(this.theme.gridMajor);
    const minor = new THREE.Color(this.theme.gridMinor);
    const grid = new THREE.GridHelper(dimension === '2d' ? 40 : 30, dimension === '2d' ? 40 : 30, major, minor);
    if (dimension === '2d') grid.rotation.x = Math.PI / 2;
    grid.position.z = dimension === '2d' ? -5 : 0;
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.9;
    if (dimension === '2d') {
      // En 2D, la grille reste derrière tous les sprites.
      (grid.material as THREE.Material).depthTest = false;
      grid.renderOrder = -1000;
    }
    this.grid.add(grid);
    // Axes X (rouge), Y (vert), Z (bleu).
    const axis = (from: THREE.Vector3, to: THREE.Vector3, color: string) => {
      const geometry = new THREE.BufferGeometry().setFromPoints([from, to]);
      const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9, depthTest: dimension === '3d' }));
      if (dimension === '2d') line.renderOrder = -999;
      this.grid.add(line);
    };
    const size = dimension === '2d' ? 20 : 15;
    const z = dimension === '2d' ? -4.99 : 0;
    axis(new THREE.Vector3(-size, 0, z + 0.001), new THREE.Vector3(size, 0, z + 0.001), this.theme.axisX);
    if (dimension === '2d') axis(new THREE.Vector3(0, -size, z + 0.001), new THREE.Vector3(0, size, z + 0.001), this.theme.axisY);
    else {
      axis(new THREE.Vector3(0, 0.001, -size), new THREE.Vector3(0, 0.001, size), this.theme.axisZ);
      axis(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1.2, 0), this.theme.axisY);
    }
    setLayer(this.grid, HELPER_LAYER);

    if (dimension === '2d') {
      this.ortho.position.set(0, 0, 50);
      this.ortho.zoom = 0.85;
      this.orbit.object = this.ortho;
      this.editorCamera = this.ortho;
      this.orbit.target.set(0, 0, 0);
      this.orbit.enableRotate = false;
      this.orbit.screenSpacePanning = true;
      this.orbit.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
      this.ortho.lookAt(0, 0, 0);
    } else {
      this.perspective.position.set(7.5, 4.6, 9.2);
      this.orbit.target.set(0.2, 0.8, -0.2);
      this.orbit.enableRotate = true;
      this.orbit.screenSpacePanning = true;
      this.orbit.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
      this.perspective.lookAt(this.orbit.target);
      this.orbit.object = this.perspective;
      this.editorCamera = this.perspective;
    }
    this.updateOrthoFrustum();
    this.orbit.update();
  }

  private setEditorProjection(projection: Projection): void {
    if (this.dimension === '2d') return;
    if (projection === 'orthographic' && this.editorCamera !== this.ortho) {
      this.updateOrthoFrustum();
      this.ortho.position.copy(this.perspective.position);
      this.ortho.quaternion.copy(this.perspective.quaternion);
      this.ortho.zoom = 1;
      this.ortho.updateProjectionMatrix();
      this.editorCamera = this.ortho;
    } else if (projection === 'perspective' && this.editorCamera !== this.perspective) {
      this.perspective.position.copy(this.ortho.position);
      this.perspective.quaternion.copy(this.ortho.quaternion);
      this.editorCamera = this.perspective;
    }
    this.orbit.object = this.editorCamera;
    (this.viewHelper as unknown as { camera: THREE.Camera }).camera = this.editorCamera;
    this.orbit.update();
    this.invalidate();
  }

  private applyTransform(object: THREE.Object3D, transform: Transform, node: SceneNode): void {
    const [px, py, pz] = transform.position;
    const [rx, ry, rz] = transform.rotation;
    const [sx, sy, sz] = transform.scale;
    object.position.set(px, py, pz);
    object.rotation.set(rx * DEG, ry * DEG, rz * DEG, 'YXZ');
    if (node.kind === 'camera' || node.kind === 'light') object.scale.set(1, 1, 1);
    else object.scale.set(sx || 0.0001, sy || 0.0001, sz || 0.0001);
  }

  private findSkeleton(scene: StudioScene, node: SceneNode): SceneNode | undefined {
    let current: SceneNode | undefined = node;
    while (current && current.kind !== 'skeleton') current = current.parentId ? scene.nodes[current.parentId] : undefined;
    return current;
  }

  /** Signature des données visuelles : si elle change, le contenu est reconstruit. */
  private signature(node: SceneNode, input: RenderInput): string {
    const asset = (id?: string) => (id ? input.assets.find((item) => item.id === id)?.url ?? 'missing' : '');
    return JSON.stringify([
      node.kind,
      node.mesh && { ...node.mesh, skin: undefined, tex: asset(node.mesh.textureAssetId) },
      node.sprite && { ...node.sprite, skin: undefined, tex: asset(node.sprite.assetId) },
      node.light,
      node.camera && { p: node.camera.projection, a: node.camera.aspect },
      node.bone,
      node.control,
      node.model && asset(node.model.assetId),
      input.scene.dimension,
    ]);
  }

  private ensureEntry(node: SceneNode, input: RenderInput): void {
    const signature = this.signature(node, input);
    let entry = this.entries.get(node.id);
    if (entry && entry.signature === signature) return;
    if (!entry) {
      const root = new THREE.Group();
      root.name = node.name;
      root.rotation.order = 'YXZ';
      root.userData.nodeId = node.id;
      entry = { root, content: new THREE.Group(), helper: new THREE.Group(), signature: '', skinParts: [] };
      root.add(entry.content, entry.helper);
      this.entries.set(node.id, entry);
    }
    // Reconstruction du contenu.
    for (const object of [entry.content, entry.helper]) {
      for (const child of [...object.children]) {
        child.removeFromParent();
        disposeObject(child);
      }
    }
    if (entry.light) {
      entry.light.removeFromParent();
      if ((entry.light as THREE.DirectionalLight).target) (entry.light as THREE.DirectionalLight).target.removeFromParent();
      entry.light.dispose();
      entry.light = undefined;
    }
    if (entry.camera) {
      entry.camera.removeFromParent();
      entry.camera = undefined;
    }
    entry.signature = signature;
    this.buildContent(node, entry, input);
  }

  private buildContent(node: SceneNode, entry: Entry, input: RenderInput): void {
    const is2d = input.scene.dimension === '2d';
    const mark = (object: THREE.Object3D, nodeId = node.id) => {
      object.traverse((child) => (child.userData.nodeId = nodeId));
      return object;
    };

    if ((node.kind === 'mesh' || node.kind === 'environment') && node.mesh && !node.mesh.skin) {
      const material = new THREE.MeshStandardMaterial({ color: node.mesh.color, roughness: node.mesh.roughness, metalness: node.mesh.metalness, side: node.mesh.shape === 'plane' ? THREE.DoubleSide : THREE.FrontSide });
      const assetUrl = node.mesh.textureAssetId ? input.assets.find((asset) => asset.id === node.mesh!.textureAssetId)?.url : undefined;
      if (assetUrl) material.map = imageTexture(assetUrl, () => this.invalidate());
      const mesh = new THREE.Mesh(createGeometry(node.mesh.shape, node.mesh.size), material);
      mesh.castShadow = node.kind !== 'environment';
      mesh.receiveShadow = true;
      entry.content.add(mark(mesh));
    }

    if (node.sprite && !node.sprite.skin) {
      const sprite = this.makeSpriteMesh(node.sprite.width, node.sprite.height, node.sprite.color, node.sprite.shape, node.sprite.layer, input, node.sprite.assetId);
      sprite.position.set((0.5 - node.sprite.pivot[0]) * node.sprite.width, (0.5 - node.sprite.pivot[1]) * node.sprite.height, 0);
      entry.content.add(mark(sprite));
    }

    if (node.kind === 'light' && node.light) {
      const { type, color, intensity, castShadow } = node.light;
      let light: THREE.Light;
      if (type === 'ambient') light = new THREE.AmbientLight(color, intensity);
      else if (type === 'point') {
        const point = new THREE.PointLight(color, intensity, 12, 1.6);
        light = point;
      } else {
        const directional = new THREE.DirectionalLight(color, intensity);
        directional.castShadow = castShadow;
        directional.shadow.mapSize.set(2048, 2048);
        directional.shadow.camera.left = -8;
        directional.shadow.camera.right = 8;
        directional.shadow.camera.top = 8;
        directional.shadow.camera.bottom = -8;
        directional.shadow.bias = -0.0005;
        directional.target.position.set(0, 0, 0);
        this.scene3.add(directional.target);
        light = directional;
      }
      entry.root.add(light);
      entry.light = light;
      if (type !== 'ambient') {
        const icon = new THREE.Mesh(new THREE.OctahedronGeometry(0.14), new THREE.MeshBasicMaterial({ color: this.theme.light, wireframe: true }));
        entry.helper.add(mark(icon));
        const core = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), new THREE.MeshBasicMaterial({ color: this.theme.light }));
        entry.helper.add(mark(core));
      }
    }

    if (node.kind === 'camera' && node.camera) {
      const data = node.camera;
      const camera =
        data.projection === 'orthographic' || is2d
          ? new THREE.OrthographicCamera(-1, 1, 1, -1, data.near, data.far)
          : new THREE.PerspectiveCamera(data.fov, data.aspect, data.near, data.far);
      camera.layers.set(0);
      entry.root.add(camera);
      entry.camera = camera;
      // Corps de caméra (sélectionnable) + cadre de visée.
      const bodyMaterial = new THREE.MeshBasicMaterial({ color: this.theme.camera, transparent: true, opacity: 0.55 });
      const body = new THREE.Mesh(new THREE.BoxGeometry(is2d ? 0.5 : 0.28, is2d ? 0.32 : 0.2, is2d ? 0.05 : 0.36), bodyMaterial);
      body.position.z = is2d ? 0 : 0.18;
      entry.helper.add(mark(body));
      if (!is2d) {
        const lens = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.16, 16, 1, true), bodyMaterial.clone());
        lens.rotation.x = -Math.PI / 2;
        lens.position.z = -0.06;
        entry.helper.add(mark(lens));
      }
      const frustum = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: this.theme.camera, transparent: true, opacity: 0.8 }));
      frustum.name = 'frustum';
      frustum.userData.pickable = false;
      entry.helper.add(frustum);
    }

    if (node.kind === 'bone' && node.bone) {
      const geometry = is2d ? this.boneGeo2 : this.boneGeo3;
      const material = new THREE.MeshBasicMaterial({ color: this.theme.bone, transparent: true, opacity: is2d ? 0.5 : 0.28, depthTest: false, side: THREE.DoubleSide });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.scale.setScalar(node.bone.length);
      mesh.scale.x = mesh.scale.z = is2d ? Math.min(1, node.bone.length * 1.6) : node.bone.length;
      mesh.renderOrder = 1000;
      mesh.userData.sharedGeometry = true;
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geometry), new THREE.LineBasicMaterial({ color: this.theme.bone, depthTest: false, transparent: true, opacity: 0.85 }));
      edges.renderOrder = 1001;
      edges.scale.copy(mesh.scale);
      const joint = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), new THREE.MeshBasicMaterial({ color: this.theme.bone, depthTest: false }));
      joint.renderOrder = 1002;
      entry.helper.add(mark(mesh), mark(edges), mark(joint));
      entry.helper.name = 'bone';
    }

    if (node.kind === 'control' && node.control) {
      const material = new THREE.MeshBasicMaterial({ color: this.theme.control, depthTest: false });
      const handle = new THREE.Mesh(is2d ? new THREE.CircleGeometry(0.09, 20) : new THREE.SphereGeometry(0.07, 16, 10), material);
      handle.renderOrder = 1003;
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(node.control.radius * 0.94, node.control.radius, 40),
        new THREE.MeshBasicMaterial({ color: this.theme.control, transparent: true, opacity: 0.6, depthTest: false, side: THREE.DoubleSide }),
      );
      ring.renderOrder = 1003;
      if (!is2d) ring.userData.billboard = true;
      entry.helper.add(mark(handle), mark(ring));
    }

    if (node.kind === 'model' && node.model) {
      const url = input.assets.find((asset) => asset.id === node.model!.assetId)?.url;
      if (url) this.loadModel(url, entry, node.id);
      else {
        const placeholder = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.6), new THREE.MeshBasicMaterial({ color: this.theme.control, wireframe: true }));
        placeholder.position.y = 0.3;
        entry.content.add(mark(placeholder));
      }
    }

    // Les aides d'édition ne sont jamais filmées par les caméras de scène.
    setLayer(entry.helper, HELPER_LAYER);
  }

  private makeSpriteMesh(width: number, height: number, color: string, shape: 'rect' | 'rounded' | 'ellipse', layer: number, input: RenderInput, assetId?: string): THREE.Mesh {
    const url = assetId ? input.assets.find((asset) => asset.id === assetId)?.url : undefined;
    const texture = url ? imageTexture(url, () => this.invalidate()) : spriteShapeTexture(shape, width, height);
    const material = new THREE.MeshBasicMaterial({ color: url ? '#ffffff' : color, map: texture, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    material.toneMapped = false;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
    mesh.renderOrder = layer;
    return mesh;
  }

  private loadModel(url: string, entry: Entry, nodeId: string): void {
    let promise = gltfCache.get(url);
    if (!promise) {
      promise = new GLTFLoader().loadAsync(url);
      gltfCache.set(url, promise);
    }
    promise
      .then((gltf) => {
        if (this.disposed || this.entries.get(nodeId) !== entry) return;
        const model = cloneSkinned(gltf.scene);
        // Mise à l'échelle automatique des modèles très grands ou très petits.
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const largest = Math.max(size.x, size.y, size.z);
        if (largest > 0 && (largest > 8 || largest < 0.2)) model.scale.multiplyScalar(1.8 / largest);
        const fitted = new THREE.Box3().setFromObject(model);
        model.position.y -= fitted.min.y;
        model.traverse((child) => {
          child.userData.nodeId = nodeId;
          if ((child as THREE.Mesh).isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        entry.content.add(model);
        this.invalidate();
      })
      .catch(() => {
        const placeholder = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.6), new THREE.MeshBasicMaterial({ color: this.theme.control, wireframe: true }));
        placeholder.userData.nodeId = nodeId;
        entry.content.add(placeholder);
        this.invalidate();
      });
  }

  /** Parties rigides d'un corps attachées à chaque bone de son squelette. */
  private syncSkin(node: SceneNode, input: RenderInput): void {
    const entry = this.entries.get(node.id);
    if (!entry) return;
    const skinSignature = JSON.stringify([node.mesh?.skin, node.sprite?.skin, node.sprite?.color, node.mesh?.color]);
    const hasSkin = Boolean(node.mesh?.skin || node.sprite?.skin);
    if (entry.root.userData.skinSignature === skinSignature && entry.skinParts.every((part) => part.parent)) {
      entry.skinParts.forEach((part) => (part.visible = node.visible && isVisibleInTree(entry.root)));
      return;
    }
    entry.root.userData.skinSignature = skinSignature;
    entry.skinParts.forEach((part) => {
      part.removeFromParent();
      disposeObject(part);
    });
    entry.skinParts = [];
    if (!hasSkin) return;
    // Clic sur le corps : sélectionne le personnage entier (parent du corps).
    const owner = node.parentId ?? node.id;

    if (node.mesh?.skin) {
      for (const part of node.mesh.skin.parts) {
        const bone = this.entries.get(part.boneId);
        if (!bone) continue;
        const mesh = new THREE.Mesh(
          createGeometry(part.shape, part.size),
          new THREE.MeshStandardMaterial({ color: part.color, roughness: node.mesh.roughness, metalness: node.mesh.metalness }),
        );
        mesh.position.set(...part.offset);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData.nodeId = owner;
        mesh.userData.boneId = part.boneId;
        mesh.userData.bodyId = node.id;
        bone.root.add(mesh);
        entry.skinParts.push(mesh);
      }
    }
    if (node.sprite?.skin) {
      for (const part of node.sprite.skin.parts) {
        const bone = this.entries.get(part.boneId);
        if (!bone) continue;
        const mesh = this.makeSpriteMesh(part.width, part.height, part.color, part.shape, node.sprite.layer * 10 + part.layer, input);
        mesh.position.set(part.offset[0], part.offset[1], 0);
        mesh.userData.nodeId = owner;
        mesh.userData.boneId = part.boneId;
        mesh.userData.bodyId = node.id;
        bone.root.add(mesh);
        entry.skinParts.push(mesh);
      }
    }
    entry.skinParts.forEach((part) => (part.visible = node.visible));
  }

  private syncSceneCamera(node: SceneNode, entry: Entry, fov?: number, zoom?: number): void {
    const camera = entry.camera!;
    const data = node.camera!;
    const is2d = this.dimension === '2d';
    let frameHalfW: number;
    let frameHalfH: number;
    let frameDepth: number;
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = fov ?? data.fov;
      camera.aspect = data.aspect;
      camera.near = data.near;
      camera.far = data.far;
      camera.updateProjectionMatrix();
      frameDepth = 1.4;
      frameHalfH = Math.tan((camera.fov * DEG) / 2) * frameDepth;
      frameHalfW = frameHalfH * data.aspect;
    } else {
      const z = zoom ?? data.zoom;
      const halfH = (is2d ? ORTHO_2D_HEIGHT : 6) / 2 / Math.max(0.05, z);
      camera.left = -halfH * data.aspect;
      camera.right = halfH * data.aspect;
      camera.top = halfH;
      camera.bottom = -halfH;
      camera.near = is2d ? 0.1 : data.near;
      camera.far = is2d ? 100 : data.far;
      camera.updateProjectionMatrix();
      frameHalfH = halfH;
      frameHalfW = halfH * data.aspect;
      frameDepth = is2d ? Math.max(0.1, node.transform.position[2]) : 1.4;
    }
    const frustum = entry.helper.getObjectByName('frustum') as THREE.LineSegments | undefined;
    if (frustum) {
      const d = -frameDepth;
      const corners = [
        [-frameHalfW, frameHalfH, d],
        [frameHalfW, frameHalfH, d],
        [frameHalfW, -frameHalfH, d],
        [-frameHalfW, -frameHalfH, d],
      ];
      const points: number[] = [];
      const push = (a: number[], b: number[]) => points.push(...a, ...b);
      for (let i = 0; i < 4; i += 1) {
        push(corners[i]!, corners[(i + 1) % 4]!);
        if (!is2d && camera instanceof THREE.PerspectiveCamera) push([0, 0, 0], corners[i]!);
      }
      // Repère « haut » du cadre.
      push([-frameHalfW * 0.3, frameHalfH * 1.08, d], [0, frameHalfH * 1.3, d]);
      push([0, frameHalfH * 1.3, d], [frameHalfW * 0.3, frameHalfH * 1.08, d]);
      frustum.geometry.dispose();
      frustum.geometry = new THREE.BufferGeometry();
      frustum.geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
      const active = this.input?.scene.viewer.mainCameraId === node.id;
      (frustum.material as THREE.LineBasicMaterial).color.set(active ? this.theme.cameraActive : this.theme.camera);
    }
  }

  private applyConstraints(scene: StudioScene): void {
    let changed = false;
    const target = new THREE.Vector3();
    const bonePos = new THREE.Vector3();
    const parentQuat = new THREE.Quaternion();
    const desired = new THREE.Quaternion();
    for (const node of Object.values(scene.nodes)) {
      const control = node.control;
      if (node.kind !== 'control' || !control || control.constraint !== 'aim' || !control.targetBoneId || control.influence <= 0) continue;
      const bone = this.entries.get(control.targetBoneId);
      const self = this.entries.get(node.id);
      if (!bone || !self || !bone.root.parent) continue;
      self.root.getWorldPosition(target);
      bone.root.getWorldPosition(bonePos);
      const direction = target.sub(bonePos);
      if (direction.lengthSq() < 1e-6) continue;
      direction.normalize();
      const axis = control.aimAxis === 'z' ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(0, 1, 0);
      if (this.dimension === '2d') direction.z = 0;
      bone.root.parent.getWorldQuaternion(parentQuat);
      desired.setFromUnitVectors(axis, direction.normalize());
      desired.premultiply(parentQuat.invert());
      bone.root.quaternion.slerp(desired, Math.min(1, control.influence));
      changed = true;
    }
    if (changed) this.world.updateMatrixWorld(true);
  }

  private updateSelection(input: RenderInput): void {
    const { scene, selectedId } = input;
    const node = selectedId ? scene.nodes[selectedId] : undefined;
    const entry = selectedId ? this.entries.get(selectedId) : undefined;

    // Couleur des bones : sélection en terracotta.
    for (const [id, item] of this.entries) {
      if (scene.nodes[id]?.kind !== 'bone') continue;
      const color = id === selectedId ? this.theme.boneSelected : this.theme.bone;
      item.helper.traverse((child) => {
        const material = (child as THREE.Mesh).material as THREE.MeshBasicMaterial | undefined;
        if (material && 'color' in material) material.color.set(color);
      });
    }

    const showBox = Boolean(entry && node && input.viewMode !== 'preview' && node.kind !== 'root' && node.kind !== 'bone' && node.kind !== 'control' && !(node.kind === 'light' && node.light?.type === 'ambient'));
    if (showBox && entry) {
      const box = new THREE.Box3();
      const expand = (object: THREE.Object3D) => {
        object.updateWorldMatrix(true, true);
        object.traverse((child) => {
          const mesh = child as THREE.Mesh;
          if (mesh.isMesh && isVisibleInTree(mesh) && mesh.layers.isEnabled(0) && mesh.geometry) {
            mesh.geometry.computeBoundingBox();
            if (mesh.geometry.boundingBox) box.union(mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld));
          }
        });
      };
      expand(entry.root);
      // Corps liés : la boîte englobe toutes les parties.
      for (const other of this.entries.values()) {
        for (const part of other.skinParts) {
          if (part.userData.nodeId === selectedId || part.userData.bodyId === selectedId) expand(part);
        }
      }
      if (box.isEmpty()) {
        expand(entry.helper);
        entry.helper.traverse((child) => {
          const mesh = child as THREE.Mesh;
          if (mesh.isMesh && mesh.geometry) {
            mesh.geometry.computeBoundingBox();
            if (mesh.geometry.boundingBox) box.union(mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld));
          }
        });
      }
      this.selectionBox.box.copy(box);
      this.selectionBox.visible = !box.isEmpty();
    } else {
      this.selectionBox.visible = false;
    }

    // On ne manipule pas au gizmo la caméra à travers laquelle on regarde : on la pilote.
    const lookingThrough = input.viewMode === 'camera' && input.viewCameraId === selectedId;
    const canTransform = Boolean(entry && node && !node.locked && !input.readOnly && input.viewMode !== 'preview' && !lookingThrough);
    const renderCamera = this.activeRenderCamera();
    this.gizmo.setCamera(renderCamera);
    this.gizmo.configure(canTransform && entry ? entry.root : null, node?.kind ?? null, input.tool, input.scene.dimension, {
      enabled: input.settings.snap,
      step: input.settings.snapStep,
    });
  }

  private updateFreeCameraBounds(scene: StudioScene, input: RenderInput): void {
    this.freeCameraBounds.clear();
    const settings = scene.viewer.freeCamera;
    if (scene.dimension !== '3d' || !settings.enabled || input.viewMode === 'preview' || input.selectedId !== scene.rootId) return;
    const make = (radius: number, opacity: number) => {
      const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(radius, 32, 16, 0, Math.PI * 2, settings.minPolar * DEG, (settings.maxPolar - settings.minPolar) * DEG),
        new THREE.MeshBasicMaterial({ color: this.theme.cameraActive, wireframe: true, transparent: true, opacity }),
      );
      sphere.position.set(...settings.target);
      return sphere;
    };
    this.freeCameraBounds.add(make(settings.minDistance, 0.35), make(settings.maxDistance, 0.18));
    setLayer(this.freeCameraBounds, HELPER_LAYER);
  }

  /* ======================================================================
     Rendu
     ====================================================================== */

  /** Caméra de scène utilisée par les modes caméra / aperçu. */
  private viewCamera(): THREE.PerspectiveCamera | THREE.OrthographicCamera | null {
    const input = this.input;
    if (!input || input.viewMode === 'edit' || !input.viewCameraId) return null;
    return this.entries.get(input.viewCameraId)?.camera ?? null;
  }

  private activeRenderCamera(): THREE.Camera {
    return this.viewCamera() ?? this.editorCamera;
  }

  /** Rectangle (pixels CSS) du cadre de la caméra de scène dans le viewport. */
  getFrameRect(aspect: number): FrameRect {
    const width = this.width;
    const height = this.height;
    const margin = 16;
    const availableW = width - margin * 2;
    const availableH = height - margin * 2;
    let frameW = availableW;
    let frameH = frameW / aspect;
    if (frameH > availableH) {
      frameH = availableH;
      frameW = frameH * aspect;
    }
    return { x: Math.round((width - frameW) / 2), y: Math.round((height - frameH) / 2), width: Math.round(frameW), height: Math.round(frameH) };
  }

  private render(): void {
    const input = this.input;
    const renderer = this.renderer;
    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, this.width, this.height);
    renderer.setClearColor(this.theme.letterbox, 1);
    renderer.clear();
    if (!input) return;

    const viewCamera = this.viewCamera();
    if (viewCamera) {
      const data = input.scene.nodes[input.viewCameraId!]?.camera;
      const rect = this.getFrameRect(data?.aspect ?? 16 / 9);
      const y = this.height - rect.y - rect.height;
      renderer.setScissorTest(true);
      renderer.setScissor(rect.x, y, rect.width, rect.height);
      renderer.setViewport(rect.x, y, rect.width, rect.height);
      // Mode caméra : on voit aussi les aides (bones, gizmo) ; aperçu : rendu final seul.
      if (input.viewMode === 'camera') viewCamera.layers.enable(HELPER_LAYER);
      else viewCamera.layers.set(0);
      this.grid.visible = false;
      renderer.render(this.scene3, viewCamera);
      viewCamera.layers.set(0);
      this.grid.visible = input.settings.grid && input.viewMode === 'edit';
      renderer.setScissorTest(false);
      return;
    }

    // Billboard des anneaux d'influence vers la caméra de création.
    for (const entry of this.entries.values()) {
      entry.helper.traverse((child) => {
        if (child.userData.billboard && child.parent) {
          child.quaternion.copy(child.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(this.editorCamera.quaternion));
        }
      });
    }

    renderer.render(this.scene3, this.editorCamera);

    // Incrustation : ce que filme la caméra sélectionnée (comme Godot).
    const selected = input.selectedId ? input.scene.nodes[input.selectedId] : undefined;
    const pipCamera = selected?.kind === 'camera' ? this.entries.get(selected.id)?.camera : undefined;
    if (pipCamera && input.settings.cameraPreview && selected?.camera) {
      const pipW = Math.min(300, Math.round(this.width * 0.3));
      const pipH = Math.round(pipW / selected.camera.aspect);
      const x = this.width - pipW - 14;
      const y = 14;
      renderer.setScissorTest(true);
      renderer.setScissor(x - 2, y - 2, pipW + 4, pipH + 4);
      renderer.setViewport(x - 2, y - 2, pipW + 4, pipH + 4);
      renderer.setClearColor(this.theme.selection, 1);
      renderer.clear();
      renderer.setScissor(x, y, pipW, pipH);
      renderer.setViewport(x, y, pipW, pipH);
      renderer.clear();
      const gridVisible = this.grid.visible;
      this.grid.visible = false;
      renderer.render(this.scene3, pipCamera);
      this.grid.visible = gridVisible;
      renderer.setScissorTest(false);
      renderer.setViewport(0, 0, this.width, this.height);
    }

    if (this.dimension === '3d') this.viewHelper.render(renderer);
  }

  /* ======================================================================
     Interaction
     ====================================================================== */

  private ndc(clientX: number, clientY: number): THREE.Vector2 | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const input = this.input;
    let x = clientX - rect.left;
    let y = clientY - rect.top;
    const viewCamera = this.viewCamera();
    if (viewCamera && input) {
      const data = input.scene.nodes[input.viewCameraId!]?.camera;
      const frame = this.getFrameRect(data?.aspect ?? 16 / 9);
      x -= frame.x;
      y -= frame.y;
      if (x < 0 || y < 0 || x > frame.width || y > frame.height) return null;
      return new THREE.Vector2((x / frame.width) * 2 - 1, -(y / frame.height) * 2 + 1);
    }
    return new THREE.Vector2((x / rect.width) * 2 - 1, -(y / rect.height) * 2 + 1);
  }

  /** Composant sous le pointeur (null si vide). */
  pick(clientX: number, clientY: number, options: { bonesOnly?: boolean } = {}): string | null {
    const input = this.input;
    const point = this.ndc(clientX, clientY);
    if (!input || !point) return null;
    const camera = this.activeRenderCamera();
    this.raycaster.setFromCamera(point, camera);
    this.raycaster.layers.set(0);
    if (input.viewMode !== 'preview') this.raycaster.layers.enable(HELPER_LAYER);
    const hits = this.raycaster.intersectObject(this.world, true).filter((hit) => {
      const object = hit.object;
      if (!object.userData.nodeId || object.userData.pickable === false) return false;
      if ((object as THREE.Line).isLine || (object as THREE.LineSegments).isLineSegments) return false;
      if (!isVisibleInTree(object)) return false;
      if (!object.layers.test(this.raycaster.layers)) return false;
      return true;
    });
    // Priorité aux aides (bones, points de contrôle, caméras), affichées par-dessus.
    const helperHit = hits.find((hit) => hit.object.layers.isEnabled(HELPER_LAYER));
    const pose = options.bonesOnly || input.tool === 'pose';
    if (pose) {
      const boneHit = hits.find((hit) => {
        const kind = input.scene.nodes[hit.object.userData.nodeId as string]?.kind;
        return kind === 'bone' || kind === 'control' || hit.object.userData.boneId;
      });
      if (!boneHit) return null;
      return (boneHit.object.userData.boneId as string | undefined) ?? (boneHit.object.userData.nodeId as string);
    }
    const hit = helperHit ?? hits[0];
    return hit ? (hit.object.userData.nodeId as string) : null;
  }

  /** Point du sol (3D, y = 0) ou du plan de scène (2D, z = 0) sous le pointeur. */
  groundPoint(clientX: number, clientY: number): [number, number, number] | null {
    const point = this.ndc(clientX, clientY);
    if (!point) return null;
    this.raycaster.setFromCamera(point, this.activeRenderCamera());
    const plane = this.dimension === '2d' ? new THREE.Plane(new THREE.Vector3(0, 0, 1), 0) : new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const hit = new THREE.Vector3();
    if (!this.raycaster.ray.intersectPlane(plane, hit)) return null;
    const round = (value: number) => Math.round(value * 100) / 100;
    return [round(hit.x), round(hit.y), round(hit.z)];
  }

  private onPointerDown = (event: PointerEvent): void => {
    const onGizmo = Boolean(this.gizmo.controls.object && (this.gizmo.controls as unknown as { axis: string | null }).axis);
    this.pointerDown = { x: event.clientX, y: event.clientY, button: event.button, onGizmo, time: performance.now() };
    if (this.dimension === '3d' && this.input?.viewMode === 'edit' && event.button === 0 && this.viewHelper.handleClick(event)) {
      this.viewHelper.center.copy(this.orbit.target);
      this.pointerDown = null;
      this.invalidate();
      return;
    }
    // Mode caméra : glisser hors gizmo pilote la caméra de scène.
    if (this.input?.viewMode === 'camera' && !onGizmo && !this.input.readOnly) {
      this.pilot = { x: event.clientX, y: event.clientY, mode: event.button === 0 && !event.shiftKey ? 'rotate' : 'pan', started: false };
      this.renderer.domElement.setPointerCapture(event.pointerId);
    }
  };

  private onPointerMove = (event: PointerEvent): void => {
    const pilot = this.pilot;
    const input = this.input;
    if (!pilot || !input || !input.viewCameraId) return;
    const dx = event.clientX - pilot.x;
    const dy = event.clientY - pilot.y;
    if (!pilot.started && Math.hypot(dx, dy) < 4) return;
    if (!pilot.started) {
      pilot.started = true;
      this.callbacks.onGestureStart();
    }
    pilot.x = event.clientX;
    pilot.y = event.clientY;
    const node = input.scene.nodes[input.viewCameraId];
    const entry = this.entries.get(input.viewCameraId);
    if (!node || !entry || node.locked) return;
    const is2d = this.dimension === '2d';
    const root = entry.root;
    if (pilot.mode === 'rotate' && !is2d) {
      // Lacet autour de l'axe vertical, tangage autour de l'axe local X.
      const euler = new THREE.Euler().copy(root.rotation);
      euler.order = 'YXZ';
      euler.y -= dx * 0.004;
      euler.x = THREE.MathUtils.clamp(euler.x - dy * 0.004, -Math.PI / 2 + 0.01, Math.PI / 2 - 0.01);
      this.callbacks.onProperty(node.id, 'rotation', [euler.x / DEG, euler.y / DEG, euler.z / DEG].map((v) => Math.round(v * 100) / 100));
    } else {
      const frame = this.getFrameRect(node.camera?.aspect ?? 16 / 9);
      const camera = entry.camera;
      let unitsPerPixel = 0.01;
      if (camera instanceof THREE.OrthographicCamera) unitsPerPixel = (camera.top - camera.bottom) / frame.height;
      else if (camera instanceof THREE.PerspectiveCamera) unitsPerPixel = (Math.tan((camera.fov * DEG) / 2) * 2 * 4) / frame.height;
      const offset = new THREE.Vector3(-dx * unitsPerPixel, dy * unitsPerPixel, 0).applyQuaternion(root.quaternion);
      const position = root.position.clone().add(offset);
      this.callbacks.onProperty(node.id, 'position', position.toArray().map((v) => Math.round(v * 1000) / 1000));
    }
  };

  private onPointerUp = (event: PointerEvent): void => {
    if (this.pilot) {
      const started = this.pilot.started;
      this.pilot = null;
      if (this.renderer.domElement.hasPointerCapture(event.pointerId)) this.renderer.domElement.releasePointerCapture(event.pointerId);
      if (started) {
        this.callbacks.onGestureEnd();
        return;
      }
    }
    const down = this.pointerDown;
    this.pointerDown = null;
    if (!down || down.onGizmo || this.gizmo.dragging || down.button !== 0) return;
    if (Math.hypot(event.clientX - down.x, event.clientY - down.y) > 4) return;
    if (this.input?.viewMode === 'preview') return;
    this.callbacks.onSelect(this.pick(event.clientX, event.clientY));
  };

  private onDoubleClick = (event: MouseEvent): void => {
    const id = this.pick(event.clientX, event.clientY);
    if (id && this.input?.scene.nodes[id]?.kind === 'camera') this.callbacks.onViewCamera?.(id);
  };

  /** Mode caméra : la molette rapproche la caméra de scène (ou change son zoom en 2D). */
  private onWheel = (event: WheelEvent): void => {
    const input = this.input;
    if (!input || input.viewMode !== 'camera' || !input.viewCameraId || input.readOnly) return;
    event.preventDefault();
    const node = input.scene.nodes[input.viewCameraId];
    const entry = this.entries.get(input.viewCameraId);
    if (!node || !entry || node.locked) return;
    this.callbacks.onGestureStart();
    if (entry.camera instanceof THREE.OrthographicCamera) {
      const current = input.evaluation.get(node.id)?.zoom ?? node.camera?.zoom ?? 1;
      const next = Math.min(10, Math.max(0.1, current * (event.deltaY > 0 ? 0.92 : 1.08)));
      this.callbacks.onProperty(node.id, 'zoom', [Math.round(next * 100) / 100]);
    } else {
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(entry.root.quaternion).multiplyScalar(event.deltaY > 0 ? -0.25 : 0.25);
      this.callbacks.onProperty(node.id, 'position', entry.root.position.clone().add(forward).toArray().map((v) => Math.round(v * 1000) / 1000));
    }
    this.callbacks.onGestureEnd();
  };

  /* ======================================================================
     Commandes de vue (caméra de création)
     ====================================================================== */

  /** Cadre la vue éditeur sur le composant sélectionné (touche F). */
  frameSelection(): void {
    const input = this.input;
    if (!input) return;
    const entry = input.selectedId ? this.entries.get(input.selectedId) : undefined;
    const box = new THREE.Box3();
    if (entry) {
      box.setFromObject(entry.root);
      for (const other of this.entries.values()) {
        for (const part of other.skinParts) if (part.userData.nodeId === input.selectedId) box.expandByObject(part);
      }
    }
    if (box.isEmpty()) box.setFromObject(this.world);
    if (box.isEmpty()) return;
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3()).length() || 1;
    if (this.dimension === '2d') {
      this.orbit.target.set(center.x, center.y, 0);
      this.ortho.position.set(center.x, center.y, 50);
      this.ortho.zoom = Math.min(4, Math.max(0.2, ORTHO_2D_HEIGHT / (size * 1.6)));
      this.ortho.updateProjectionMatrix();
    } else {
      const direction = this.editorCamera.position.clone().sub(this.orbit.target).normalize();
      this.orbit.target.copy(center);
      this.editorCamera.position.copy(center).add(direction.multiplyScalar(Math.max(1.5, size * 1.4)));
      if (this.editorCamera === this.ortho) {
        this.updateOrthoFrustum();
        this.ortho.zoom = Math.min(8, 6 / Math.max(0.5, size));
        this.ortho.updateProjectionMatrix();
      }
    }
    this.orbit.update();
    this.invalidate();
  }

  /** Vues prédéfinies de la caméra de création. */
  setView(view: 'front' | 'right' | 'top' | 'perspective'): void {
    if (this.dimension === '2d') return;
    const target = this.orbit.target.clone();
    const distance = Math.max(4, this.editorCamera.position.distanceTo(target));
    const offsets = {
      front: new THREE.Vector3(0, 0, 1),
      right: new THREE.Vector3(1, 0, 0),
      top: new THREE.Vector3(0, 1, 0.0001),
      perspective: new THREE.Vector3(0.6, 0.4, 0.75).normalize(),
    };
    this.editorCamera.position.copy(target).add(offsets[view].multiplyScalar(distance));
    this.editorCamera.lookAt(target);
    this.orbit.update();
    this.invalidate();
  }

  /** Image PNG du rendu courant (tests et vignettes). */
  snapshot(): string {
    this.render();
    return this.renderer.domElement.toDataURL('image/png');
  }
}
