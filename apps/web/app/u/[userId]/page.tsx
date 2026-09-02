import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { PublicUserProfile } from '@mintmusic/shared';
import LandingNav from '@/app/components/LandingNav';
import SocialLinksDisplay from '@/app/components/profile/SocialLinksDisplay';
import { webConfig } from '@/lib/config';

async function fetchPublicProfile(userId: string): Promise<PublicUserProfile | null> {
  const res = await fetch(
    `${webConfig.apiUrl.replace(/\/$/, '')}/v1/users/${userId}/public`,
    { next: { revalidate: 60 } }
  );
  if (res.status === 404) return null;
  if (!res.ok) return null;
  const data = (await res.json()) as { profile: PublicUserProfile };
  return data.profile;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const profile = await fetchPublicProfile(userId);
  if (!profile) return { title: 'Profile not found — MintMusic' };
  return {
    title: `${profile.name} — MintMusic`,
    description: `${profile.name} on MintMusic — ${profile.role === 'creator' ? 'Creator' : 'Collector'}`,
  };
}

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const profile = await fetchPublicProfile(userId);
  if (!profile) notFound();

  const isCreator = profile.role === 'creator';

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <LandingNav />
      <main className="max-w-3xl mx-auto px-6 pt-28 pb-16">
        <div className="bg-gray-800/50 rounded-2xl p-8 border border-gray-700">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-8">
            {profile.image ? (
              <Image
                src={profile.image}
                alt={profile.name}
                width={96}
                height={96}
                className="rounded-full border-2 border-green-500/50"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-500/30 to-purple-500/30 flex items-center justify-center text-3xl font-bold">
                {profile.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="text-center sm:text-left">
              <h1 className="text-3xl font-bold">{profile.name}</h1>
              <p className="text-green-400 capitalize mt-1">{profile.role}</p>
            </div>
          </div>

          <section className="mb-8">
            <h2 className="text-lg font-semibold mb-4 text-gray-300">Social & Streaming</h2>
            <SocialLinksDisplay links={profile.socialLinks} showEmptyHint />
          </section>

          <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-700">
            <Link
              href="/discover"
              className="px-5 py-2 rounded-full bg-green-500 hover:bg-green-400 text-black font-semibold text-sm transition-colors"
            >
              Discover music
            </Link>
            {isCreator && (
              <Link
                href="/creator/apply"
                className="px-5 py-2 rounded-full border border-gray-600 hover:border-green-500 text-sm transition-colors"
              >
                Become a creator
              </Link>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
