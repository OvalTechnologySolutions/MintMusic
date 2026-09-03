import { Suspense } from 'react';
import LoginForm from './LoginForm';

export default function LoginPage() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-gray-900 px-4 py-[max(1rem,env(safe-area-inset-top))] text-white sm:px-6">
      <Suspense fallback={<div className="text-gray-400">Loading…</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
