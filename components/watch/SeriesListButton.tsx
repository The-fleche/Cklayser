'use client';

/**
 * SeriesListButton — « Ma liste » sur la page de présentation d'une série.
 * Visiteur : ouvre la création de compte (géré par toggleFavorite).
 */
import { Check, Plus } from 'lucide-react';
import { useAppState } from '@/lib/app-state';
import Button from '@/components/ui/Button';

export default function SeriesListButton({ seriesId }: { seriesId: string }) {
  const { isMember, isFavorite, toggleFavorite } = useAppState();
  const saved = isMember && isFavorite(seriesId);
  return (
    <Button
      variant="secondary"
      size="md"
      aria-pressed={saved}
      icon={saved ? <Check size={18} strokeWidth={2.2} aria-hidden="true" /> : <Plus size={18} strokeWidth={2.2} aria-hidden="true" />}
      onClick={() => toggleFavorite(seriesId)}
    >
      {saved ? 'Dans Ma liste' : 'Ma liste'}
    </Button>
  );
}
