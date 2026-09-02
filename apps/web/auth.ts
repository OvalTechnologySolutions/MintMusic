import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import GitHub from 'next-auth/providers/github';
import type { CreatorStatus, UserRole } from '@mintmusic/shared';
import { webConfig } from './lib/config';

async function syncUserWithApi(payload: {
  email: string;
  name: string;
  image?: string | null;
  provider: string;
  providerAccountId: string;
}): Promise<{ id: string; role: UserRole; creatorStatus: CreatorStatus } | null> {
  const appBase = (process.env.AUTH_URL ?? webConfig.appUrl).replace(/\/$/, '');

  const secret = process.env.INTERNAL_API_SECRET;
  if (!secret) {
    console.error('[auth] INTERNAL_API_SECRET is not configured');
    return null;
  }

  try {
    const res = await fetch(`${appBase}/api/auth/sync-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Secret': secret,
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('[auth] sync-user failed:', res.status, err);
      return null;
    }

    const data = (await res.json()) as {
      user: { id: string; role: UserRole; creatorStatus: CreatorStatus };
    };
    return data.user;
  } catch (err) {
    console.error('[auth] sync-user error:', err);
    return null;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    }),
  ],
  trustHost: true,
  pages: {
    signIn: '/login',
  },
  session: { strategy: 'jwt' },
  callbacks: {
    async signIn({ user, account }) {
      if (!account?.provider || !user.email) return false;

      const synced = await syncUserWithApi({
        email: user.email,
        name: user.name ?? user.email,
        image: user.image,
        provider: account.provider,
        providerAccountId: account.providerAccountId ?? account.id,
      });

      if (!synced) return false;

      user.id = synced.id;
      (user as { role?: UserRole }).role = synced.role;
      (user as { creatorStatus?: CreatorStatus }).creatorStatus =
        synced.creatorStatus;
      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.role = (user as { role?: UserRole }).role ?? 'collector';
        token.creatorStatus =
          (user as { creatorStatus?: CreatorStatus }).creatorStatus ?? 'none';
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId as string;
        session.user.role = (token.role as UserRole) ?? 'collector';
        session.user.creatorStatus =
          (token.creatorStatus as CreatorStatus) ?? 'none';
      }
      return session;
    },
  },
});
