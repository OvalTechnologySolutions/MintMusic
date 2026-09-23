import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { apiAsUser } from '@/lib/server-api';
import { CrateBuilderShell } from '@/components/cratebuilder/CrateBuilderShell';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'CrateBuilder',
  description: 'MintMusic internal artist discovery and outreach',
  robots: { index: false, follow: false },
};

export default async function CrateBuilderPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/');
  }

  try {
    // Probe admin access — non-admins get 403 from API
    await apiAsUser('/v1/cratebuilder/dashboard');
  } catch (err) {
    const message = err instanceof Error ? err.message : '';
    if (message.includes('Unauthorized') || message.includes('admin')) {
      return (
        <main className="min-h-svh bg-[var(--mm-onyx)] text-[var(--mm-paper)] px-6 py-16">
          <h1 className="font-[family-name:var(--font-urbanist)] text-3xl font-semibold">
            CrateBuilder
          </h1>
          <p className="mt-4 max-w-lg text-[var(--studio-gray)]">
            You do not have administrator access. Ask an operator to add your email to{' '}
            <code className="text-[var(--mm-mint-soft)]">CRATEBUILDER_ADMIN_EMAILS</code> or set
            your role to <code className="text-[var(--mm-mint-soft)]">admin</code>.
          </p>
        </main>
      );
    }
    throw err;
  }

  return <CrateBuilderShell userEmail={session.user.email ?? ''} />;
}
