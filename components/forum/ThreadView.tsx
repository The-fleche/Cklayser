'use client';

/**
 * ThreadView — page d'une discussion : message d'ouverture, réponses,
 * « j'aime » et formulaire de réponse.
 *
 * Props :
 *  - threadId  discussion fictive (data/forum.ts) ou créée par le membre
 *              (identifiant « u-… », retrouvée dans ce navigateur)
 *
 * États : discussion introuvable (sujet du membre effacé ou autre
 * navigateur) ; visiteur → répondre / aimer ouvre la création de compte ;
 * le membre peut supprimer une discussion qu'il a créée.
 */
import { ArrowLeft, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useId, useRef, useState, type FormEvent } from 'react';
import { useAppState } from '@/lib/app-state';
import { getSeries } from '@/lib/catalog';
import { FORUM_BODY_MAX, ME, ageFrom, formatAge, getForumAuthor, getMockThread, getTagLabel } from '@/lib/forum';
import { useForumStore } from '@/lib/forum-store';
import Button from '@/components/ui/Button';
import catalog from '@/components/catalog/catalog.module.css';
import ForumAuthorLine from './ForumAuthorLine';
import LikeButton from './LikeButton';
import styles from './forum.module.css';

interface DisplayReply {
  key: string;
  authorId: string;
  ageMinutes: number;
  likes: number;
  body: string;
}

export default function ThreadView({ threadId }: { threadId: string }) {
  const router = useRouter();
  const uid = useId();
  const { isMember, openAuthDialog, announce, profile } = useAppState();
  const { myThreads, myReplies, addReply, removeThread } = useForumStore();
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const replyRef = useRef<HTMLTextAreaElement>(null);
  const now = Date.now();

  const mock = getMockThread(threadId);
  const mine = mock ? undefined : myThreads.find((thread) => thread.id === threadId);

  if (!mock && !mine) {
    return (
      <div className={catalog.page}>
        <BackLink />
        <h1 className={catalog.title}>Discussion introuvable</h1>
        <p className={catalog.lead}>
          Elle a peut-être été supprimée, ou publiée depuis un autre navigateur (les contributions de démonstration
          restent dans le navigateur qui les a créées).
        </p>
      </div>
    );
  }

  const thread = mock
    ? { ...mock, ageMinutes: mock.ageMinutes }
    : {
        id: mine!.id,
        title: mine!.title,
        seriesId: mine!.seriesId,
        tag: mine!.tag,
        authorId: ME,
        ageMinutes: ageFrom(mine!.createdAt, now),
        likes: 0,
        body: mine!.body,
        pinned: false,
        replies: [],
      };

  const replies: DisplayReply[] = [
    ...thread.replies.map((reply) => ({ key: reply.id, authorId: reply.authorId, ageMinutes: reply.ageMinutes, likes: reply.likes, body: reply.body })),
    ...(myReplies[thread.id] ?? []).map((reply) => ({
      key: reply.id,
      authorId: ME,
      ageMinutes: ageFrom(reply.createdAt, now),
      likes: 0,
      body: reply.body,
    })),
  ];
  const series = thread.seriesId ? getSeries(thread.seriesId) : undefined;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isMember) {
      openAuthDialog('signup', 'Créez un compte gratuit pour répondre.');
      return;
    }
    if (draft.trim().length < 2) {
      setError('Écrivez au moins quelques mots avant de publier.');
      replyRef.current?.focus();
      return;
    }
    addReply(thread.id, draft.trim());
    setDraft('');
    setError('');
    announce('Réponse publiée.');
  };

  const remove = () => {
    removeThread(thread.id);
    announce('Discussion supprimée.');
    router.push('/fandoms');
  };

  const authorName = (authorId: string) => (authorId === ME ? profile.name : (getForumAuthor(authorId)?.name ?? 'Membre'));

  return (
    <div className={catalog.page}>
      <BackLink />

      <article className={styles.post} aria-labelledby={`${uid}-titre`}>
        <div className={styles.threadTop}>
          <span className={styles.tag}>{getTagLabel(thread.tag)}</span>
          {series ? (
            <Link href={`/serie/${series.id}`} className={styles.seriesPill}>
              {series.title}
            </Link>
          ) : null}
        </div>
        <h1 id={`${uid}-titre`} className={styles.postTitle}>
          {thread.title}
        </h1>
        <ForumAuthorLine authorId={thread.authorId} age={formatAge(thread.ageMinutes)} size={40} />
        <div className={styles.postBody}>
          {thread.body.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>
        <div className={styles.postActions}>
          <LikeButton likeKey={thread.id} count={thread.likes} label="la discussion" />
          {mine ? (
            <Button
              variant="ghost"
              size="sm"
              icon={<Trash2 size={16} strokeWidth={2} aria-hidden="true" />}
              onClick={remove}
            >
              Supprimer
            </Button>
          ) : null}
        </div>
      </article>

      <section className={catalog.section} aria-labelledby={`${uid}-reponses`}>
        <h2 id={`${uid}-reponses`} className={catalog.sectionTitle}>
          {replies.length} réponse{replies.length > 1 ? 's' : ''}
        </h2>
        <ol className={styles.replies}>
          {replies.map((reply) => {
            const author = getForumAuthor(reply.authorId);
            return (
              <li key={reply.key} className={`${styles.reply} ${author?.channelId ? styles.replyTeam : ''}`}>
                <ForumAuthorLine authorId={reply.authorId} age={formatAge(reply.ageMinutes)} />
                <p className={styles.replyBody}>{reply.body}</p>
                <LikeButton
                  likeKey={`${thread.id}/${reply.key}`}
                  count={reply.likes}
                  label={`la réponse de ${authorName(reply.authorId)}`}
                />
              </li>
            );
          })}
        </ol>

        <form className={styles.replyForm} onSubmit={submit} noValidate>
          <label htmlFor={`${uid}-reponse`} className={styles.label}>
            Votre réponse
          </label>
          <textarea
            ref={replyRef}
            id={`${uid}-reponse`}
            className={`${styles.input} ${styles.textarea}`}
            rows={3}
            maxLength={FORUM_BODY_MAX}
            placeholder={isMember ? 'Partagez votre avis…' : 'Connectez-vous pour répondre'}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${uid}-reponse-erreur` : undefined}
          />
          {error ? (
            <p id={`${uid}-reponse-erreur`} className={styles.error}>
              {error}
            </p>
          ) : null}
          <div className={styles.composerActions}>
            <Button type="submit" variant="primary" size="md">
              Répondre
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}

function BackLink() {
  return (
    <Link href="/fandoms" className={styles.back}>
      <ArrowLeft size={18} strokeWidth={2} aria-hidden="true" />
      Fandoms &amp; Forums
    </Link>
  );
}
