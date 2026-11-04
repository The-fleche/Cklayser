/**
 * /fandoms — Fandoms & Forums : communautés et discussions (voir ForumHome).
 */
import type { Metadata } from 'next';
import ForumHome from '@/components/forum/ForumHome';

export const metadata: Metadata = { title: 'Fandoms & Forums' };

export default function FandomsPage() {
  return <ForumHome />;
}
