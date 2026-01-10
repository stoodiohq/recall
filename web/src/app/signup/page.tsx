'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SignupPage() {
  const router = useRouter();

  useEffect(() => {
    router.push('/signup/plan');
  }, [router]);

  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-text-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
