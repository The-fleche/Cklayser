/**
 * Icônes et libellés des types de composants (hiérarchie, inspecteur,
 * timeline).
 */
import {
  Bone,
  Box,
  Clapperboard,
  Crosshair,
  Film,
  Image as ImageIcon,
  Lightbulb,
  Mountain,
  Package,
  Sun,
  SunDim,
  Video,
  Layers,
  PersonStanding,
  type LucideIcon,
} from 'lucide-react';
import type { SceneDimension, SceneNode } from '@/lib/studio/types';

/** @param nodes composants de la scène : un groupe qui contient un squelette est un personnage. */
export function nodeIcon(node: SceneNode, nodes?: Record<string, SceneNode>): LucideIcon {
  switch (node.kind) {
    case 'root':
      return Clapperboard;
    case 'group':
      return nodes && node.children.some((id) => nodes[id]?.kind === 'skeleton') ? PersonStanding : Layers;
    case 'environment':
      return Mountain;
    case 'light':
      return node.light?.type === 'ambient' ? SunDim : node.light?.type === 'point' ? Lightbulb : Sun;
    case 'camera':
      return Video;
    case 'mesh':
      return Box;
    case 'sprite':
      return ImageIcon;
    case 'model':
      return Package;
    case 'skeleton':
      return Bone;
    case 'bone':
      return Bone;
    case 'control':
      return Crosshair;
    case 'animationPlayer':
      return Film;
  }
}

/** Type affiché à côté du nom (Godot-like). */
export function nodeTypeLabel(node: SceneNode, dimension: SceneDimension): string {
  switch (node.kind) {
    case 'root':
      return `Scène ${dimension.toUpperCase()}`;
    case 'group':
      return dimension === '3d' ? 'Node3D' : 'Node2D';
    case 'environment':
      return 'Décor';
    case 'light':
      return node.light?.type === 'ambient' ? 'AmbientLight' : node.light?.type === 'point' ? 'PointLight' : 'DirectionalLight';
    case 'camera':
      return dimension === '3d' ? 'Camera3D' : 'Camera2D';
    case 'mesh':
      return node.mesh?.skin ? 'Mesh lié' : 'Mesh';
    case 'sprite':
      return node.sprite?.skin ? 'Sprite lié' : 'Sprite2D';
    case 'model':
      return 'Modèle glTF';
    case 'skeleton':
      return dimension === '3d' ? 'Skeleton3D' : 'Skeleton2D';
    case 'bone':
      return 'Bone';
    case 'control':
      return 'Point de contrôle';
    case 'animationPlayer':
      return 'AnimationPlayer';
  }
}

/** Famille d'un composant (couleur d'icône dans la hiérarchie). */
export function nodeFamily(node: SceneNode): 'physical' | 'camera' | 'skeleton' | 'animation' | 'light' | 'structure' {
  switch (node.kind) {
    case 'camera':
      return 'camera';
    case 'skeleton':
    case 'bone':
    case 'control':
      return 'skeleton';
    case 'animationPlayer':
      return 'animation';
    case 'light':
      return 'light';
    case 'root':
    case 'group':
      return 'structure';
    default:
      return 'physical';
  }
}
