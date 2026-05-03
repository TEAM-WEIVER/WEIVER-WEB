'use client';

import { useEffect } from 'react';

import { useSignupStore, type SignupType } from '@/store/signup-store';

export function SignupTypeSync({ type }: { type: SignupType }) {
  const setType = useSignupStore((state) => state.setType);

  useEffect(() => {
    setType(type);
  }, [type, setType]);

  return null;
}
