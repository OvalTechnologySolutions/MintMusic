import type { CreatorStatus, UserRole } from '@mintmusic/shared';
import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      creatorStatus: CreatorStatus;
    } & DefaultSession['user'];
  }

  interface User {
    role?: UserRole;
    creatorStatus?: CreatorStatus;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId?: string;
    role?: UserRole;
    creatorStatus?: CreatorStatus;
  }
}
