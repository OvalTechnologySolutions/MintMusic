import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import GitHub from 'next-auth/providers/github';
import type { CreatorStatus, UserRole } from '@mintmusic/shared';
import { webConfig } from './lib/config';

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

      try {
        const res = await fetch(`${webConfig.apiUrl}/v1/auth/oauth`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: user.email,
            name: user.name ?? user.email,
            image: user.image,
            provider: account.provider,
            providerAccountId: account.providerAccountId ?? account.id,
          }),
        });

        if (!res.ok) return false;

        const data = (await res.json()) as { user: { id: string; role: UserRole; creatorStatus: CreatorStatus } };
        user.id = data.user.id;
        (user as { role?: UserRole }).role = data.user.role;
        (user as { creatorStatus?: CreatorStatus }).creatorStatus =
          data.user.creatorStatus;
        return true;
      } catch {
        return false;
      }
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
