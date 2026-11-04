/**
 * Profil : règles de validation, initiales et traitement de la photo.
 *
 * Fonctions pures (sauf resizeAvatar, qui utilise le navigateur), partagées
 * par l'état applicatif et la page /profil.
 */
import { universes } from '@/data/mock';
import type { UniverseId, UserProfile } from '@/lib/types';

export const NAME_MIN = 2;
export const NAME_MAX = 40;
export const HANDLE_MIN = 3;
export const HANDLE_MAX = 20;
export const BIO_MAX = 160;
/** Taille maximale du fichier choisi, avant recadrage. */
export const AVATAR_FILE_MAX_BYTES = 8 * 1024 * 1024;
/** Côté de la photo enregistrée (carré), en px. */
export const AVATAR_SIZE = 256;

const HANDLE_PATTERN = /^[a-z0-9._]+$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ProfileField = 'name' | 'handle' | 'email' | 'bio';
export type ProfileErrors = Partial<Record<ProfileField, string>>;

/** « Inès Morel » → « IM » ; « Lou » → « L ». */
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts.at(-1)?.[0] ?? '') : '';
  return (first + last).toLocaleUpperCase('fr-FR') || '?';
}

/** Saisie libre → pseudo normalisé (sans « @ », minuscules, sans espaces). */
export function normalizeHandle(value: string): string {
  return value.trim().replace(/^@+/, '').toLocaleLowerCase('fr-FR');
}

/** Vérifie les champs texte ; renvoie un message par champ en erreur. */
export function validateProfile(profile: UserProfile): ProfileErrors {
  const errors: ProfileErrors = {};
  const name = profile.name.trim();
  if (name.length < NAME_MIN) errors.name = `Le nom doit compter au moins ${NAME_MIN} caractères.`;
  else if (name.length > NAME_MAX) errors.name = `Le nom ne peut pas dépasser ${NAME_MAX} caractères.`;

  const handle = profile.handle;
  if (handle.length < HANDLE_MIN || handle.length > HANDLE_MAX) {
    errors.handle = `Le pseudo doit compter entre ${HANDLE_MIN} et ${HANDLE_MAX} caractères.`;
  } else if (!HANDLE_PATTERN.test(handle)) {
    errors.handle = 'Le pseudo ne peut contenir que des lettres minuscules sans accent, des chiffres, « . » et « _ ».';
  }

  if (!EMAIL_PATTERN.test(profile.email.trim())) {
    errors.email = 'Saisissez une adresse e-mail valide, par exemple nom@exemple.fr.';
  }

  if (profile.bio.length > BIO_MAX) errors.bio = `La présentation ne peut pas dépasser ${BIO_MAX} caractères.`;
  return errors;
}

const UNIVERSE_IDS = new Set<string>(universes.map((item) => item.id));

/**
 * Relit un profil stocké (données non fiables) : chaque champ invalide ou
 * absent reprend la valeur par défaut.
 */
export function restoreProfile(stored: unknown, fallback: UserProfile): UserProfile {
  if (!stored || typeof stored !== 'object') return fallback;
  const data = stored as Record<string, unknown>;
  const text = (key: keyof UserProfile, defaultValue: string) =>
    typeof data[key] === 'string' ? (data[key] as string) : defaultValue;
  const flag = (key: keyof UserProfile, defaultValue: boolean) =>
    typeof data[key] === 'boolean' ? (data[key] as boolean) : defaultValue;

  const avatar = data.avatar;
  const restored: UserProfile = {
    ...fallback,
    name: text('name', fallback.name),
    handle: text('handle', fallback.handle),
    email: text('email', fallback.email),
    bio: text('bio', fallback.bio),
    avatar:
      avatar === null
        ? undefined
        : typeof avatar === 'string' && (avatar.startsWith('data:image/') || avatar.startsWith('/'))
          ? avatar
          : fallback.avatar,
    favoriteUniverses: Array.isArray(data.favoriteUniverses)
      ? (data.favoriteUniverses.filter((id) => typeof id === 'string' && UNIVERSE_IDS.has(id)) as UniverseId[])
      : fallback.favoriteUniverses,
    notifyNewEpisodes: flag('notifyNewEpisodes', fallback.notifyNewEpisodes),
    notifyChannelNews: flag('notifyChannelNews', fallback.notifyChannelNews),
  };
  return Object.keys(validateProfile(restored)).length === 0 ? restored : fallback;
}

/**
 * Charge une image choisie par l'utilisateur, la recadre au centre en carré
 * et la réduit à AVATAR_SIZE px. Renvoie une data URL JPEG (≈ 15 à 30 ko),
 * assez légère pour être conservée dans le navigateur.
 */
export async function resizeAvatar(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Ce fichier n’est pas une image.');
  if (file.size > AVATAR_FILE_MAX_BYTES) throw new Error('Image trop lourde : 8 Mo au maximum.');

  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.decoding = 'async';
    image.src = url;
    await image.decode().catch(() => {
      throw new Error('Impossible de lire cette image. Essayez un fichier JPEG, PNG ou WebP.');
    });

    const side = Math.min(image.naturalWidth, image.naturalHeight);
    const canvas = document.createElement('canvas');
    canvas.width = AVATAR_SIZE;
    canvas.height = AVATAR_SIZE;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Le recadrage n’est pas disponible dans ce navigateur.');
    context.imageSmoothingQuality = 'high';
    context.drawImage(
      image,
      (image.naturalWidth - side) / 2,
      (image.naturalHeight - side) / 2,
      side,
      side,
      0,
      0,
      AVATAR_SIZE,
      AVATAR_SIZE,
    );
    return canvas.toDataURL('image/jpeg', 0.86);
  } finally {
    URL.revokeObjectURL(url);
  }
}
