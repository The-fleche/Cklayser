'use client';

/**
 * NotificationsPanel — cloche du header et panneau de notifications fictives.
 *
 * Rôle : signaler les nouveautés (épisodes en avance, publications des
 * chaînes, forums, adhésions).
 *
 * Props : aucune (données : data/mock.ts, état lu/non lu : AppStateProvider).
 *
 * États :
 *  - fermé / ouvert (motif « disclosure » : aria-expanded + aria-controls) ;
 *  - non lues : pastille orange sur la cloche, doublée d'un texte accessible
 *    (« 3 non lues ») — jamais signalé par la couleur seule ;
 *  - « Tout marquer comme lu » vide la pastille ;
 *  - fermeture : clic extérieur, Échap (le focus revient sur la cloche).
 */
import { BadgeCheck, Bell, Clock, MessagesSquare, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useId, useRef, useState } from 'react';
import { notifications } from '@/data/mock';
import { useAppState } from '@/lib/app-state';
import { useDismiss } from '@/lib/hooks';
import type { NotificationItem } from '@/lib/types';
import IconButton from '@/components/ui/IconButton';
import styles from './NotificationsPanel.module.css';

const kindIcon: Record<NotificationItem['kind'], typeof Bell> = {
  episode: Clock,
  channel: Sparkles,
  community: MessagesSquare,
  membership: BadgeCheck,
};

export default function NotificationsPanel() {
  const { unreadIds, markAllNotificationsRead, markNotificationRead } = useAppState();
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const titleId = `${panelId}-titre`;
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const unreadCount = unreadIds.length;

  useDismiss(
    [buttonRef, panelRef],
    (reason) => {
      setOpen(false);
      if (reason === 'escape') buttonRef.current?.focus();
    },
    open,
  );

  return (
    <div className={styles.wrapper}>
      <IconButton
        ref={buttonRef}
        label="Notifications"
        indicator={unreadCount > 0 ? `${unreadCount} non lue${unreadCount > 1 ? 's' : ''}` : undefined}
        variant="plain"
        size={44}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className={styles.bell}
      >
        <Bell size={30} strokeWidth={2} />
      </IconButton>

      <div
        ref={panelRef}
        id={panelId}
        role="region"
        aria-labelledby={titleId}
        className={styles.panel}
        hidden={!open}
      >
        <div className={styles.header}>
          <h2 id={titleId} className={styles.title}>
            Notifications
          </h2>
          {unreadCount > 0 ? (
            <button type="button" className={styles.markAll} onClick={markAllNotificationsRead}>
              Tout marquer comme lu
            </button>
          ) : (
            <span className={styles.allRead}>Tout est lu</span>
          )}
        </div>

        <ul className={styles.list}>
          {notifications.map((item) => {
            const Icon = kindIcon[item.kind];
            const unread = unreadIds.includes(item.id);
            return (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className={`${styles.item} ${unread ? styles.unread : ''}`}
                  onClick={() => {
                    markNotificationRead(item.id);
                    setOpen(false);
                  }}
                >
                  <span className={styles.iconWrap} aria-hidden="true">
                    <Icon size={18} strokeWidth={1.75} />
                  </span>
                  <span className={styles.text}>
                    <span className={styles.itemTitle}>
                      {item.title}
                      {unread ? <span className="sr-only"> (non lue)</span> : null}
                    </span>
                    <span className={styles.body}>{item.body}</span>
                    <span className={styles.time}>{item.time}</span>
                  </span>
                  {unread ? <span className={styles.dot} aria-hidden="true" /> : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
