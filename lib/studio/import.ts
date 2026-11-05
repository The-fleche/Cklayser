'use client';

/**
 * Import de fichiers dans les assets du projet.
 *
 *  - images (PNG, JPEG, WebP, SVG) → Textures : utilisables comme sprite
 *    (2D) ou comme plan texturé (3D) ;
 *  - modèles glTF binaires (.glb) → Characters ;
 *  - sons (MP3, WAV, OGG) → Audio (prévisualisation ; pas encore de piste
 *    audio dans la timeline).
 *
 * Les fichiers légers (≤ 1,5 Mo) sont intégrés au projet (data URL) et
 * survivent à l'enregistrement ; les plus lourds restent disponibles pour la
 * session en cours seulement (URL locale), ce qui est signalé dans le
 * navigateur d'assets. Le stockage en ligne n'existe pas encore.
 */
import { uid } from './factory';
import type { StudioStore } from './store';
import type { StudioAsset } from './types';

const INLINE_LIMIT = 1.5 * 1024 * 1024;

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function classify(file: File): Pick<StudioAsset, 'type' | 'folder'> | null {
  const name = file.name.toLowerCase();
  if (file.type.startsWith('image/') || /\.(png|jpe?g|webp|svg)$/.test(name)) return { type: 'texture', folder: 'textures' };
  if (name.endsWith('.glb')) return { type: 'model', folder: 'characters' };
  if (file.type.startsWith('audio/') || /\.(mp3|wav|ogg)$/.test(name)) return { type: 'audio', folder: 'audio' };
  return null;
}

export const ACCEPTED_FILES = '.png,.jpg,.jpeg,.webp,.svg,.glb,.mp3,.wav,.ogg';

export async function importFiles(files: FileList | File[], store: StudioStore): Promise<StudioAsset[]> {
  const imported: StudioAsset[] = [];
  for (const file of Array.from(files)) {
    const kind = classify(file);
    if (!kind) {
      store.notify(`« ${file.name} » : format non pris en charge (images, .glb, audio).`, 'error');
      continue;
    }
    let url: string;
    let sessionOnly = false;
    if (file.size <= INLINE_LIMIT) {
      try {
        url = await readAsDataUrl(file);
      } catch {
        store.notify(`Lecture de « ${file.name} » impossible.`, 'error');
        continue;
      }
    } else {
      url = URL.createObjectURL(file);
      sessionOnly = true;
    }
    const asset: StudioAsset = {
      id: uid('ast'),
      name: file.name.replace(/\.[^.]+$/, '').slice(0, 48),
      origin: 'import',
      url,
      size: file.size,
      mime: file.type,
      sessionOnly,
      ...kind,
    };
    store.addAsset(asset);
    imported.push(asset);
  }
  return imported;
}
