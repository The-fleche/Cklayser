'use client';

/**
 * DevStateToggle — commutateur visiteur / membre (développement uniquement).
 *
 * Rôle : basculer l'interface entre l'état visiteur et l'état membre pour les
 * revues et les captures. Il écrit le paramètre d'URL ?state=guest|member,
 * qui pilote aussi l'état sans ce commutateur (liens partageables).
 *
 * Props : aucune. Rendu uniquement si NODE_ENV === 'development'
 * (voir app/layout.tsx).
 *
 * États : « Visiteur » ou « Membre » sélectionné (aria-pressed).
 */
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAppState } from '@/lib/app-state';
import type { ViewerState } from '@/lib/types';
import styles from './DevStateToggle.module.css';

const OPTIONS: Array<{ value: ViewerState; label: string }> = [
  { value: 'guest', label: 'Visiteur' },
  { value: 'member', label: 'Membre' },
];

export default function DevStateToggle() {
  const { viewer } = useAppState();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const select = (value: ViewerState) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('state', value);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <div className={styles.toggle} role="group" aria-label="État de démonstration (développement)">
      <span className={styles.caption} aria-hidden="true">
        dev
      </span>
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          className={styles.option}
          aria-pressed={viewer === option.value}
          onClick={() => select(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
