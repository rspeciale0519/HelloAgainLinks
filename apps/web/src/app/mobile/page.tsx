'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function MobileRoot() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/mobile/home');
  }, [router]);
  return null;
}
