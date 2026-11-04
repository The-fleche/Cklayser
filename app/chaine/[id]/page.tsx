/**
 * /chaine/[id] — page d'une chaîne : présentation, Suivre / Adhérer, séries.
 */
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ChannelView from '@/components/catalog/ChannelView';
import { getChannel } from '@/lib/catalog';

interface ChannelPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: ChannelPageProps): Promise<Metadata> {
  const { id } = await params;
  return { title: getChannel(id)?.name ?? 'Chaîne introuvable' };
}

export default async function ChannelPage({ params }: ChannelPageProps) {
  const { id } = await params;
  const channel = getChannel(id);
  if (!channel) notFound();
  return <ChannelView channel={channel} />;
}
