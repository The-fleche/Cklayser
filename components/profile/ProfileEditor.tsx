'use client';

/**
 * ProfileEditor — page « Mon profil ».
 *
 * Rôle : consulter et modifier le profil du membre : photo, nom, pseudo,
 * e-mail, présentation, univers préférés et notifications.
 *
 * Props : aucune (profil lu dans l'état partagé, voir lib/app-state.tsx).
 *
 * États :
 *  - visiteur         invitation à se connecter ;
 *  - brouillon        les modifications (photo comprise) restent un aperçu
 *                     tant qu'on n'a pas cliqué sur « Enregistrer » ;
 *  - erreurs          message sous chaque champ (aria-invalid,
 *                     aria-describedby) ; à l'envoi, le focus va au premier
 *                     champ en erreur ;
 *  - modifications non enregistrées : barre d'actions active, alerte du
 *                     navigateur si l'on quitte la page.
 *
 * Enregistrement : dans l'état partagé (header mis à jour aussitôt) et dans
 * ce navigateur (localStorage). Aucun serveur : c'est une démonstration.
 */
import { Bell, Camera, Check, RotateCcw, Trash2, Undo2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useId, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { universes } from '@/data/mock';
import { useAppState } from '@/lib/app-state';
import {
  BIO_MAX,
  HANDLE_MAX,
  NAME_MAX,
  getInitials,
  normalizeHandle,
  resizeAvatar,
  validateProfile,
  type ProfileErrors,
  type ProfileField,
} from '@/lib/profile';
import type { UniverseId, UserProfile } from '@/lib/types';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import KeyframeDiamond from '@/components/ui/KeyframeDiamond';
import styles from './ProfileEditor.module.css';

/** Ordre de parcours des champs pour placer le focus sur la première erreur. */
const FIELD_ORDER: ProfileField[] = ['name', 'handle', 'email', 'bio'];

function sameProfile(a: UserProfile, b: UserProfile): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export default function ProfileEditor() {
  const { isMember, openAuthDialog, profile, saveProfile, resetProfile, announce, favorites, followedChannels } = useAppState();
  const [draft, setDraft] = useState<UserProfile>(profile);
  const [errors, setErrors] = useState<ProfileErrors>({});
  const [photoError, setPhotoError] = useState('');
  const [photoBusy, setPhotoBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const fieldRefs = useRef<Partial<Record<ProfileField, HTMLInputElement | HTMLTextAreaElement | null>>>({});
  const uid = useId();
  const id = (name: string) => `${uid}-${name}`;

  // Le profil enregistré change (relecture du stockage, réinitialisation) :
  // le brouillon repart de lui.
  const [lastProfile, setLastProfile] = useState(profile);
  if (profile !== lastProfile) {
    setLastProfile(profile);
    setDraft(profile);
    setErrors({});
  }

  const dirty = useMemo(() => !sameProfile(draft, profile), [draft, profile]);

  // Alerte du navigateur si l'on quitte la page avec des modifications.
  useEffect(() => {
    if (!dirty) return undefined;
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  if (!isMember) {
    return (
      <div className={styles.page}>
        <p className={styles.kicker}>
          <KeyframeDiamond size={6} />
          Compte
        </p>
        <h1 className={styles.title}>Mon profil</h1>
        <div className={styles.guest}>
          <p>Connectez-vous pour modifier votre photo, votre nom et vos préférences.</p>
          <div className={styles.guestActions}>
            <Button variant="primary" onClick={() => openAuthDialog('login', 'Connectez-vous pour accéder à votre profil.')}>
              Se connecter
            </Button>
            <Button variant="secondary" onClick={() => openAuthDialog('signup')}>
              Créer un compte
            </Button>
          </div>
        </div>
      </div>
    );
  }

  /* ----- Mise à jour du brouillon ----------------------------------------- */
  const update = <K extends keyof UserProfile>(key: K, value: UserProfile[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    // L'erreur d'un champ disparaît dès qu'il redevient valide.
    if (key in errors) {
      setErrors((current) => {
        const next = validateProfile({ ...draft, [key]: value });
        return { ...current, [key]: next[key as ProfileField] };
      });
    }
  };

  const onText = (key: ProfileField) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    update(key, key === 'handle' ? normalizeHandle(event.target.value) : event.target.value);
  };

  const toggleUniverse = (universeId: UniverseId) => {
    const selected = draft.favoriteUniverses.includes(universeId);
    update(
      'favoriteUniverses',
      selected
        ? draft.favoriteUniverses.filter((value) => value !== universeId)
        : // Ordre du catalogue, quel que soit l'ordre des clics.
          universes.map((item) => item.id).filter((value) => value === universeId || draft.favoriteUniverses.includes(value)),
    );
  };

  /* ----- Photo ------------------------------------------------------------ */
  const onPhotoChosen = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = ''; // permet de choisir à nouveau le même fichier
    if (!file) return;
    setPhotoError('');
    setPhotoBusy(true);
    try {
      update('avatar', await resizeAvatar(file));
      announce('Nouvelle photo prête. Enregistrez pour l’appliquer.');
    } catch (error) {
      setPhotoError(error instanceof Error ? error.message : 'Impossible d’utiliser cette image.');
    } finally {
      setPhotoBusy(false);
    }
  };

  const removePhoto = () => {
    setPhotoError('');
    update('avatar', undefined);
  };

  /* ----- Enregistrement --------------------------------------------------- */
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleaned: UserProfile = {
      ...draft,
      name: draft.name.trim().replace(/\s+/g, ' '),
      email: draft.email.trim(),
      bio: draft.bio.trim(),
    };
    const found = validateProfile(cleaned);
    setErrors(found);
    const firstInvalid = FIELD_ORDER.find((field) => found[field]);
    if (firstInvalid) {
      fieldRefs.current[firstInvalid]?.focus();
      announce('Le profil n’a pas été enregistré : corrigez les champs signalés.');
      return;
    }
    const stored = saveProfile(cleaned);
    announce(
      stored
        ? 'Profil enregistré.'
        : 'Profil appliqué pour cette visite, mais le navigateur n’a pas pu le conserver.',
    );
  };

  const cancel = () => {
    setDraft(profile);
    setErrors({});
    setPhotoError('');
  };

  const reset = () => {
    resetProfile();
    announce('Profil de démonstration restauré.');
  };

  const describedBy = (field: ProfileField, hint?: string) =>
    [hint ? id(`${field}-aide`) : '', errors[field] ? id(`${field}-erreur`) : ''].filter(Boolean).join(' ') || undefined;

  const initials = getInitials(draft.name || profile.name);
  const photoChanged = draft.avatar !== profile.avatar;

  return (
    <div className={styles.page}>
      <p className={styles.kicker}>
        <KeyframeDiamond size={6} />
        Compte
      </p>
      <h1 className={styles.title}>Mon profil</h1>

      <form className={styles.layout} onSubmit={onSubmit} noValidate>
        {/* ----- Carte d'identité + photo ----- */}
        <section className={`${styles.panel} ${styles.identity}`} aria-labelledby={id('photo-titre')}>
          <h2 id={id('photo-titre')} className="sr-only">
            Photo de profil
          </h2>
          <div className={styles.avatarWrap}>
            <Avatar
              src={draft.avatar}
              initials={initials}
              size={128}
              ring
              alt={draft.avatar ? `Photo de profil de ${draft.name || profile.name}` : `Initiales ${initials}`}
            />
            {photoChanged ? <span className={styles.previewTag}>Aperçu</span> : null}
          </div>

          <div className={styles.identityText}>
            <p className={styles.identityName}>{draft.name.trim() || profile.name}</p>
            <p className={styles.identityHandle}>@{draft.handle || profile.handle}</p>
            <p className={styles.identityPlan}>{profile.plan}</p>
          </div>

          <div className={styles.photoActions}>
            <input
              ref={fileRef}
              id={id('fichier')}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
              className="sr-only"
              tabIndex={-1}
              aria-hidden="true"
              onChange={onPhotoChosen}
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              icon={<Camera size={18} strokeWidth={2} aria-hidden="true" />}
              onClick={() => fileRef.current?.click()}
              disabled={photoBusy}
              aria-describedby={id('photo-aide')}
            >
              {photoBusy ? 'Préparation…' : draft.avatar ? 'Changer la photo' : 'Ajouter une photo'}
            </Button>
            {draft.avatar ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                icon={<Trash2 size={18} strokeWidth={2} aria-hidden="true" />}
                onClick={removePhoto}
              >
                Retirer
              </Button>
            ) : null}
          </div>
          <p id={id('photo-aide')} className={styles.help}>
            JPEG, PNG ou WebP, 8 Mo au plus. L’image est recadrée en carré.
          </p>
          {photoError ? (
            <p className={styles.error} role="alert">
              {photoError}
            </p>
          ) : null}

          <dl className={styles.stats}>
            <div>
              <dt>Ma liste</dt>
              <dd>
                <Link href="/ma-liste">{favorites.length}</Link>
              </dd>
            </div>
            <div>
              <dt>Chaînes suivies</dt>
              <dd>
                <Link href="/chaines">{followedChannels.length}</Link>
              </dd>
            </div>
          </dl>
        </section>

        <div className={styles.fields}>
          {/* ----- Informations ----- */}
          <section className={styles.panel} aria-labelledby={id('infos-titre')}>
            <h2 id={id('infos-titre')} className={styles.panelTitle}>
              Informations
            </h2>

            <div className={styles.field}>
              <label htmlFor={id('name')} className={styles.label}>
                Nom affiché
              </label>
              <input
                ref={(element) => {
                  fieldRefs.current.name = element;
                }}
                id={id('name')}
                className={styles.input}
                type="text"
                autoComplete="name"
                maxLength={NAME_MAX + 10}
                value={draft.name}
                onChange={onText('name')}
                aria-invalid={Boolean(errors.name)}
                aria-describedby={describedBy('name')}
                required
              />
              {errors.name ? (
                <p id={id('name-erreur')} className={styles.error}>
                  {errors.name}
                </p>
              ) : null}
            </div>

            <div className={styles.field}>
              <label htmlFor={id('handle')} className={styles.label}>
                Pseudo
              </label>
              <div className={styles.prefixed}>
                <span className={styles.prefix} aria-hidden="true">
                  @
                </span>
                <input
                  ref={(element) => {
                    fieldRefs.current.handle = element;
                  }}
                  id={id('handle')}
                  className={styles.input}
                  type="text"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  maxLength={HANDLE_MAX + 5}
                  value={draft.handle}
                  onChange={onText('handle')}
                  aria-invalid={Boolean(errors.handle)}
                  aria-describedby={describedBy('handle', 'aide')}
                  required
                />
              </div>
              <p id={id('handle-aide')} className={styles.help}>
                Visible sur vos commentaires. Lettres minuscules, chiffres, « . » et « _ ».
              </p>
              {errors.handle ? (
                <p id={id('handle-erreur')} className={styles.error}>
                  {errors.handle}
                </p>
              ) : null}
            </div>

            <div className={styles.field}>
              <label htmlFor={id('email')} className={styles.label}>
                Adresse e-mail
              </label>
              <input
                ref={(element) => {
                  fieldRefs.current.email = element;
                }}
                id={id('email')}
                className={styles.input}
                type="email"
                autoComplete="email"
                inputMode="email"
                value={draft.email}
                onChange={onText('email')}
                aria-invalid={Boolean(errors.email)}
                aria-describedby={describedBy('email', 'aide')}
                required
              />
              <p id={id('email-aide')} className={styles.help}>
                Jamais affichée publiquement.
              </p>
              {errors.email ? (
                <p id={id('email-erreur')} className={styles.error}>
                  {errors.email}
                </p>
              ) : null}
            </div>

            <div className={styles.field}>
              <label htmlFor={id('bio')} className={styles.label}>
                Présentation <span className={styles.optional}>(facultatif)</span>
              </label>
              <textarea
                ref={(element) => {
                  fieldRefs.current.bio = element;
                }}
                id={id('bio')}
                className={`${styles.input} ${styles.textarea}`}
                rows={3}
                value={draft.bio}
                onChange={onText('bio')}
                aria-invalid={Boolean(errors.bio)}
                aria-describedby={describedBy('bio', 'aide')}
              />
              <p
                id={id('bio-aide')}
                className={`${styles.help} ${styles.counter} ${draft.bio.length > BIO_MAX ? styles.counterOver : ''}`}
              >
                {draft.bio.length} / {BIO_MAX} caractères
              </p>
              {errors.bio ? (
                <p id={id('bio-erreur')} className={styles.error}>
                  {errors.bio}
                </p>
              ) : null}
            </div>
          </section>

          {/* ----- Univers préférés ----- */}
          <fieldset className={styles.panel}>
            <legend className={styles.panelTitle}>Univers préférés</legend>
            <p className={styles.help}>Ils orientent vos recommandations sur l’accueil.</p>
            <div className={styles.chips}>
              {universes.map((universe) => {
                const checked = draft.favoriteUniverses.includes(universe.id);
                return (
                  <label key={universe.id} className={`${styles.chip} ${checked ? styles.chipOn : ''}`}>
                    <input
                      type="checkbox"
                      className={styles.chipInput}
                      checked={checked}
                      onChange={() => toggleUniverse(universe.id)}
                    />
                    {checked ? <Check size={16} strokeWidth={2.5} aria-hidden="true" /> : null}
                    {universe.name}
                  </label>
                );
              })}
            </div>
          </fieldset>

          {/* ----- Notifications ----- */}
          <fieldset className={styles.panel}>
            <legend className={styles.panelTitle}>
              <Bell size={18} strokeWidth={2} aria-hidden="true" /> Notifications
            </legend>
            <label className={styles.switchRow}>
              <span>
                <span className={styles.switchLabel}>Nouveaux épisodes</span>
                <span className={styles.help}>Quand une série de Ma liste publie un épisode.</span>
              </span>
              <input
                type="checkbox"
                role="switch"
                className={styles.switch}
                checked={draft.notifyNewEpisodes}
                onChange={(event) => update('notifyNewEpisodes', event.target.checked)}
              />
            </label>
            <label className={styles.switchRow}>
              <span>
                <span className={styles.switchLabel}>Actualités des chaînes</span>
                <span className={styles.help}>Annonces et coulisses des chaînes que vous suivez.</span>
              </span>
              <input
                type="checkbox"
                role="switch"
                className={styles.switch}
                checked={draft.notifyChannelNews}
                onChange={(event) => update('notifyChannelNews', event.target.checked)}
              />
            </label>
          </fieldset>

          {/* ----- Actions ----- */}
          <div className={styles.actions}>
            <p id={id('statut')} className={styles.status} aria-live="polite">
              {dirty ? 'Modifications non enregistrées' : 'Toutes les modifications sont enregistrées'}
            </p>
            <div className={styles.actionButtons}>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                icon={<Undo2 size={18} strokeWidth={2} aria-hidden="true" />}
                onClick={cancel}
                disabled={!dirty}
              >
                Annuler
              </Button>
              <Button type="submit" variant="primary" size="md" disabled={!dirty || photoBusy}>
                Enregistrer
              </Button>
            </div>
          </div>

          <button type="button" className={styles.resetLink} onClick={reset}>
            <RotateCcw size={14} strokeWidth={2} aria-hidden="true" />
            Restaurer le profil de démonstration
          </button>
        </div>
      </form>
    </div>
  );
}
