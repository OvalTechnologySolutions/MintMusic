import { Suspense } from 'react';
import LoginForm from './LoginForm';

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center px-6">
      <Suspense fallback={<div className="text-gray-400">Loading…</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
