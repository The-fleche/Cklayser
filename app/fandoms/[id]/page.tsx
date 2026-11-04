/**
 * /fandoms/[id] — une discussion (voir ThreadView).
 * Identifiant fictif inconnu → 404 ; « u-… » = discussion créée par le
 * membre, retrouvée dans son navigateur.
 */
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ThreadView from '@/components/forum/ThreadView';
import { getMockThread } from '@/lib/forum';

interface ThreadPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: ThreadPageProps): Promise<Metadata> {
  const { id } = await params;
  return { title: getMockThread(id)?.title ?? 'Discussion' };
}

export default async function ThreadPage({ params }: ThreadPageProps) {
  const { id } = await params;
  if (!getMockThread(id) && !id.startsWith('u-')) notFound();
  return <ThreadView threadId={id} />;
}
