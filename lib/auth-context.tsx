'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User as FirebaseUser,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth, googleProvider } from './firebase';
import { User } from '@/types';
import { logger } from './logger';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
          photoURL: firebaseUser.photoURL || null,
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      console.log('[DEBUG] signInWithGoogle called');
      console.log('[DEBUG] auth object:', auth);
      console.log('[DEBUG] googleProvider object:', googleProvider);
      console.log('[DEBUG] typeof window:', typeof window);
      
      setLoading(true);
      
      console.log('[DEBUG] About to call signInWithPopup...');
      const result = await signInWithPopup(auth, googleProvider);
      console.log('[DEBUG] signInWithPopup succeeded:', result);
      
    } catch (error) {
      console.error('[DEBUG] signInWithGoogle ERROR:', error);
      console.error('[DEBUG] Error code:', (error as any).code);
      console.error('[DEBUG] Error message:', (error as any).message);
      console.error('[DEBUG] Full error object:', JSON.stringify(error, null, 2));
      
      logger.error('Error signing in with Google', error as Error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      setUser(null);
    } catch (error) {
      logger.error('Error signing out', error as Error, { uid: user?.uid });
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
