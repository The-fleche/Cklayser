'use client';

/**
 * ForumHome — page « Fandoms & Forums ».
 *
 * Rôle : communautés par série, puis liste des discussions (fictives et
 * créées par le membre), filtrable par communauté et par catégorie, triable.
 * Le bouton « Nouvelle discussion » ouvre un formulaire de publication.
 *
 * Props : aucune.
 *
 * États :
 *  - filtres  communauté (boutons aria-pressed), catégorie (radios), tri ;
 *  - formulaire ouvert / fermé ; erreurs reliées aux champs ;
 *  - visiteur : publier ou aimer ouvre la création de compte.
 */
import { Flame, MessageCircle, MessageSquarePlus, Pin, Users, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useId, useMemo, useRef, useState, type FormEvent } from 'react';
import { fandoms, forumTags, forumThreads } from '@/data/forum';
import { useAppState } from '@/lib/app-state';
import { formatSubscribers, getAllSeries, getSeries } from '@/lib/catalog';
import { FORUM_BODY_MAX, FORUM_TITLE_MAX, ME, ageFrom, formatAge, getTagLabel } from '@/lib/forum';
import { useForumStore } from '@/lib/forum-store';
import type { ForumTag } from '@/lib/types';
import Button from '@/components/ui/Button';
import KeyframeDiamond from '@/components/ui/KeyframeDiamond';
import catalog from '@/components/catalog/catalog.module.css';
import ForumAuthorLine from './ForumAuthorLine';
import styles from './forum.module.css';

type SortKey = 'recent' | 'popular' | 'replies';

interface ListItem {
  id: string;
  title: string;
  seriesId?: string;
  tag: ForumTag;
  authorId: string;
  ageMinutes: number;
  likes: number;
  replies: number;
  pinned: boolean;
  excerpt: string;
}

export default function ForumHome() {
  const router = useRouter();
  const uid = useId();
  const { isMember, openAuthDialog, announce } = useAppState();
  const { myThreads, myReplies, isLiked, addThread } = useForumStore();
  const [community, setCommunity] = useState<string | 'all'>('all');
  const [tag, setTag] = useState<ForumTag | 'all'>('all');
  const [sort, setSort] = useState<SortKey>('recent');
  const [composing, setComposing] = useState(false);

  /* ----- Liste fusionnée ---------------------------------------------------- */
  const items = useMemo<ListItem[]>(() => {
    const now = Date.now();
    const mine: ListItem[] = myThreads.map((thread) => ({
      id: thread.id,
      title: thread.title,
      seriesId: thread.seriesId,
      tag: thread.tag,
      authorId: ME,
      ageMinutes: ageFrom(thread.createdAt, now),
      likes: isLiked(thread.id) ? 1 : 0,
      replies: myReplies[thread.id]?.length ?? 0,
      pinned: false,
      excerpt: thread.body.join(' '),
    }));
    const mock: ListItem[] = forumThreads.map((thread) => ({
      id: thread.id,
      title: thread.title,
      seriesId: thread.seriesId,
      tag: thread.tag,
      authorId: thread.authorId,
      ageMinutes: thread.ageMinutes,
      likes: thread.likes + (isLiked(thread.id) ? 1 : 0),
      replies: thread.replies.length + (myReplies[thread.id]?.length ?? 0),
      pinned: Boolean(thread.pinned),
      excerpt: thread.body.join(' '),
    }));
    const filtered = [...mine, ...mock].filter(
      (item) => (community === 'all' || item.seriesId === community) && (tag === 'all' || item.tag === tag),
    );
    return filtered.sort((a, b) => {
      if (sort === 'popular') return b.likes - a.likes;
      if (sort === 'replies') return b.replies - a.replies;
      return Number(b.pinned) - Number(a.pinned) || a.ageMinutes - b.ageMinutes;
    });
  }, [community, isLiked, myReplies, myThreads, sort, tag]);

  const openComposer = () => {
    if (!isMember) {
      openAuthDialog('signup', 'Créez un compte gratuit pour lancer une discussion.');
      return;
    }
    setComposing(true);
  };

  const communityName = community === 'all' ? undefined : getSeries(community)?.title;

  return (
    <div className={catalog.page}>
      <p className={catalog.kicker}>
        <KeyframeDiamond size={6} />
        Communauté
      </p>
      <div className={styles.titleRow}>
        <h1 className={catalog.title}>Fandoms &amp; Forums</h1>
        <Button
          variant="primary"
          size="md"
          icon={<MessageSquarePlus size={18} strokeWidth={2} aria-hidden="true" />}
          onClick={openComposer}
          aria-expanded={composing}
        >
          Nouvelle discussion
        </Button>
      </div>
      <p className={catalog.lead}>
        Théories, fan art, coulisses de l’animation : retrouvez les autres spectateurs et les équipes des chaînes.
      </p>

      {composing ? (
        <NewThreadForm
          onCancel={() => setComposing(false)}
          defaultSeriesId={community === 'all' ? undefined : community}
          onSubmit={(input) => {
            const id = addThread(input);
            announce('Discussion publiée.');
            router.push(`/fandoms/${id}`);
          }}
          idPrefix={uid}
        />
      ) : null}

      {/* ----- Communautés ----- */}
      <section className={catalog.section} aria-labelledby={`${uid}-communautes`}>
        <h2 id={`${uid}-communautes`} className={catalog.sectionTitle}>
          Communautés
        </h2>
        <ul className={styles.fandoms}>
          {fandoms.map((fandom) => {
            const series = getSeries(fandom.seriesId);
            if (!series) return null;
            const active = community === fandom.seriesId;
            return (
              <li key={fandom.seriesId}>
                <button
                  type="button"
                  className={styles.fandom}
                  aria-pressed={active}
                  onClick={() => setCommunity(active ? 'all' : fandom.seriesId)}
                >
                  <span className={styles.fandomImage}>
                    <Image src={series.image} alt="" fill sizes="220px" />
                  </span>
                  <span className={styles.fandomText}>
                    <span className={styles.fandomName}>{series.title}</span>
                    <span className={styles.fandomMeta}>
                      <Users size={13} strokeWidth={2} aria-hidden="true" /> {formatSubscribers(fandom.members)} membres
                      <span className={styles.online}>
                        <span className={styles.onlineDot} aria-hidden="true" />
                        {fandom.online} en ligne
                      </span>
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {/* ----- Discussions ----- */}
      <section className={catalog.section} aria-labelledby={`${uid}-discussions`}>
        <div className={catalog.sectionHeader}>
          <h2 id={`${uid}-discussions`} className={catalog.sectionTitle}>
            {communityName ? `Discussions · ${communityName}` : 'Discussions récentes'}
          </h2>
          <label className={catalog.selectLabel}>
            Trier par
            <select className={catalog.select} value={sort} onChange={(event) => setSort(event.target.value as SortKey)}>
              <option value="recent">Les plus récentes</option>
              <option value="popular">Les plus aimées</option>
              <option value="replies">Les plus commentées</option>
            </select>
          </label>
        </div>

        <div className={styles.filters}>
          <fieldset className={catalog.filterGroup}>
            <legend className="sr-only">Catégorie</legend>
            {[{ id: 'all' as const, label: 'Tout' }, ...forumTags].map((item) => (
              <label key={item.id} className={catalog.chip}>
                <input type="radio" name={`${uid}-tag`} checked={tag === item.id} onChange={() => setTag(item.id)} />
                {item.label}
              </label>
            ))}
          </fieldset>
          {community !== 'all' ? (
            <button type="button" className={catalog.reset} onClick={() => setCommunity('all')}>
              Toutes les communautés
            </button>
          ) : null}
        </div>

        <p className={catalog.count} aria-live="polite">
          {items.length} discussion{items.length > 1 ? 's' : ''}
        </p>

        {items.length === 0 ? (
          <div className={catalog.empty}>
            <p>Aucune discussion ici pour l’instant. Lancez la première !</p>
            <Button variant="primary" size="sm" onClick={openComposer}>
              Nouvelle discussion
            </Button>
          </div>
        ) : (
          <ul className={styles.threads}>
            {items.map((item) => {
              const series = item.seriesId ? getSeries(item.seriesId) : undefined;
              return (
                <li key={item.id}>
                  <article className={styles.thread}>
                    <div className={styles.threadTop}>
                      <span className={styles.tag}>{getTagLabel(item.tag)}</span>
                      {series ? <span className={styles.seriesPill}>{series.title}</span> : null}
                      {item.pinned ? (
                        <span className={styles.pinned}>
                          <Pin size={13} strokeWidth={2.25} aria-hidden="true" /> Épinglé
                        </span>
                      ) : null}
                      {item.likes >= 200 ? (
                        <span className={styles.hot}>
                          <Flame size={13} strokeWidth={2.25} aria-hidden="true" /> Populaire
                        </span>
                      ) : null}
                    </div>
                    <h3 className={styles.threadTitle}>
                      <Link href={`/fandoms/${item.id}`} className={styles.threadLink}>
                        {item.title}
                      </Link>
                    </h3>
                    <p className={styles.excerpt}>{item.excerpt}</p>
                    <div className={styles.threadFooter}>
                      <ForumAuthorLine authorId={item.authorId} age={formatAge(item.ageMinutes)} size={28} />
                      <span className={styles.stats}>
                        <span>
                          <MessageCircle size={15} strokeWidth={2} aria-hidden="true" />
                          {item.replies}
                          <span className="sr-only"> réponses</span>
                        </span>
                        <span>
                          <span aria-hidden="true">♥</span> {item.likes}
                          <span className="sr-only"> j’aime</span>
                        </span>
                      </span>
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

/* ========================================================================== */

interface NewThreadInput {
  title: string;
  seriesId?: string;
  tag: ForumTag;
  body: string[];
}

function NewThreadForm({
  onSubmit,
  onCancel,
  defaultSeriesId,
  idPrefix,
}: {
  onSubmit: (input: NewThreadInput) => void;
  onCancel: () => void;
  defaultSeriesId?: string;
  idPrefix: string;
}) {
  const [title, setTitle] = useState('');
  const [seriesId, setSeriesId] = useState(defaultSeriesId ?? '');
  const [tag, setTag] = useState<ForumTag>('episode');
  const [body, setBody] = useState('');
  const [errors, setErrors] = useState<{ title?: string; body?: string }>({});
  const titleRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const id = (name: string) => `${idPrefix}-nouveau-${name}`;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const found: typeof errors = {};
    if (title.trim().length < 8) found.title = 'Le titre doit compter au moins 8 caractères.';
    if (body.trim().length < 10) found.body = 'Le message doit compter au moins 10 caractères.';
    setErrors(found);
    if (found.title) return titleRef.current?.focus();
    if (found.body) return bodyRef.current?.focus();
    onSubmit({
      title: title.trim(),
      seriesId: seriesId || undefined,
      tag,
      body: body
        .split(/\n{2,}/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean),
    });
  };

  return (
    <form className={styles.composer} onSubmit={submit} noValidate aria-labelledby={id('titre-form')}>
      <div className={styles.composerHeader}>
        <h2 id={id('titre-form')} className={styles.composerTitle}>
          Nouvelle discussion
        </h2>
        <button type="button" className={styles.close} onClick={onCancel} aria-label="Fermer le formulaire">
          <X size={20} strokeWidth={2} aria-hidden="true" />
        </button>
      </div>

      <div className={styles.field}>
        <label htmlFor={id('titre')} className={styles.label}>
          Titre
        </label>
        <input
          ref={titleRef}
          id={id('titre')}
          className={styles.input}
          value={title}
          maxLength={FORUM_TITLE_MAX}
          onChange={(event) => setTitle(event.target.value)}
          aria-invalid={Boolean(errors.title)}
          aria-describedby={errors.title ? id('titre-erreur') : undefined}
          autoFocus
        />
        {errors.title ? (
          <p id={id('titre-erreur')} className={styles.error}>
            {errors.title}
          </p>
        ) : null}
      </div>

      <div className={styles.fieldRow}>
        <div className={styles.field}>
          <label htmlFor={id('communaute')} className={styles.label}>
            Communauté
          </label>
          <select id={id('communaute')} className={styles.input} value={seriesId} onChange={(event) => setSeriesId(event.target.value)}>
            <option value="">Discussion générale</option>
            {getAllSeries().map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <label htmlFor={id('categorie')} className={styles.label}>
            Catégorie
          </label>
          <select id={id('categorie')} className={styles.input} value={tag} onChange={(event) => setTag(event.target.value as ForumTag)}>
            {forumTags.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={styles.field}>
        <label htmlFor={id('message')} className={styles.label}>
          Message
        </label>
        <textarea
          ref={bodyRef}
          id={id('message')}
          className={`${styles.input} ${styles.textarea}`}
          rows={5}
          value={body}
          maxLength={FORUM_BODY_MAX}
          onChange={(event) => setBody(event.target.value)}
          aria-invalid={Boolean(errors.body)}
          aria-describedby={[id('message-aide'), errors.body ? id('message-erreur') : ''].filter(Boolean).join(' ')}
        />
        <p id={id('message-aide')} className={styles.help}>
          Une ligne vide sépare deux paragraphes. Pensez à signaler les divulgâcheurs.
        </p>
        {errors.body ? (
          <p id={id('message-erreur')} className={styles.error}>
            {errors.body}
          </p>
        ) : null}
      </div>

      <div className={styles.composerActions}>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" variant="primary" size="md">
          Publier
        </Button>
      </div>
    </form>
  );
}
