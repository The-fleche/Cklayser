/**
 * /chaine/[id] — page d'une chaîne de créateur, « Bientôt disponible ».
 */
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Avatar from '@/components/ui/Avatar';
import ComingSoon from '@/components/ui/ComingSoon';
import { series } from '@/data/mock';
import { formatSubscribers, getChannel } from '@/lib/catalog';

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

  const titles = series.filter((item) => item.channelId === channel.id).map((item) => item.title);

  return (
    <ComingSoon
      kicker="Chaîne · Bientôt disponible"
      title={channel.name}
      description={`${formatSubscribers(channel.subscribers)} abonnés • ${channel.specialty}. La page de la chaîne, ses séries et son espace membres arrivent bientôt.`}
      highlights={titles.length > 0 ? titles.map((title) => `Série : ${title}`) : undefined}
    >
      <Avatar src={channel.avatar} size={72} ring />
    </ComingSoon>
  );
}
