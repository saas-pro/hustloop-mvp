
"use client";

import { useState, useEffect, useRef } from 'react';
import { getAuth, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { getFirebaseApp } from '@/lib/firebase';

export function useFirebaseAuth() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const authRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && !authRef.current) {
      const app = getFirebaseApp();
      authRef.current = getAuth(app);
    }
    if (!authRef.current) return;
    const unsubscribe = onAuthStateChanged(authRef.current, (user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return { user, loading, auth: authRef.current };
}
