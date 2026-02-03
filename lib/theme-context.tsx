'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { auth } from './firebase';
import { logger } from './logger';

export interface ColorScheme {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  success: string;
  warning: string;
  error: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
}

export const colorSchemes: ColorScheme[] = [
  {
    id: 'hellofresh',
    name: 'HelloFresh Green',
    primary: '#009646',
    secondary: '#125034',
    success: '#00a61c',
    warning: '#f6c400',
    error: '#f30047',
    background: '#fffdfa',
    surface: '#ffffff',
    text: '#0f172a',
    textSecondary: '#64748b',
    border: '#e2e8f0',
  },
  {
    id: 'ocean',
    name: 'Ocean Blue',
    primary: '#0ea5e9',
    secondary: '#0369a1',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    background: '#f0f9ff',
    surface: '#ffffff',
    text: '#0f172a',
    textSecondary: '#64748b',
    border: '#e0f2fe',
  },
  {
    id: 'sunset',
    name: 'Sunset Orange',
    primary: '#f97316',
    secondary: '#c2410c',
    success: '#22c55e',
    warning: '#fbbf24',
    error: '#dc2626',
    background: '#fff7ed',
    surface: '#ffffff',
    text: '#0f172a',
    textSecondary: '#78716c',
    border: '#fed7aa',
  },
  {
    id: 'forest',
    name: 'Forest Green',
    primary: '#059669',
    secondary: '#065f46',
    success: '#10b981',
    warning: '#d97706',
    error: '#dc2626',
    background: '#f0fdf4',
    surface: '#ffffff',
    text: '#0f172a',
    textSecondary: '#6b7280',
    border: '#bbf7d0',
  },
  {
    id: 'purple',
    name: 'Royal Purple',
    primary: '#9333ea',
    secondary: '#6b21a8',
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
    background: '#faf5ff',
    surface: '#ffffff',
    text: '#0f172a',
    textSecondary: '#6b7280',
    border: '#e9d5ff',
  },
];

interface ThemeContextType {
  currentScheme: ColorScheme;
  setScheme: (schemeId: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [currentScheme, setCurrentScheme] = useState<ColorScheme>(colorSchemes[0]);

  useEffect(() => {
    // Load saved color scheme from settings
    const loadColorScheme = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          // Wait for auth to initialize
          logger.debug('Theme: waiting for authentication');
          return;
        }

        const token = await user.getIdToken();
        const res = await fetch('/api/settings', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (res.ok) {
          const data = await res.json();
          if (data.colorScheme) {
            const scheme = colorSchemes.find(s => s.id === data.colorScheme);
            if (scheme) {
              setCurrentScheme(scheme);
              applyScheme(scheme);
            }
          }
        } else if (res.status === 401) {
          // User not authenticated yet, ignore silently
          logger.debug('Theme: waiting for authentication');
        }
      } catch (error) {
        // Ignore network errors during initial load
        logger.debug('Theme: Failed to load color scheme (normal during initial load)');
      }
    };
    
    // Listen for auth state changes
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        loadColorScheme();
      }
    });
    
    return () => unsubscribe();
  }, []);

  const applyScheme = (scheme: ColorScheme) => {
    // Apply CSS variables to root (both formats for compatibility)
    const root = document.documentElement;
    
    // Base variables
    root.style.setProperty('--primary', scheme.primary);
    root.style.setProperty('--secondary', scheme.secondary);
    root.style.setProperty('--success', scheme.success);
    root.style.setProperty('--warning', scheme.warning);
    root.style.setProperty('--error', scheme.error);
    root.style.setProperty('--background', scheme.background);
    root.style.setProperty('--foreground', scheme.text);
    root.style.setProperty('--surface', scheme.surface);
    root.style.setProperty('--border', scheme.border);
    
    // Prefixed variables (--color-*)
    root.style.setProperty('--color-primary', scheme.primary);
    root.style.setProperty('--color-secondary', scheme.secondary);
    root.style.setProperty('--color-success', scheme.success);
    root.style.setProperty('--color-warning', scheme.warning);
    root.style.setProperty('--color-error', scheme.error);
    root.style.setProperty('--color-bg', scheme.background);
    root.style.setProperty('--color-surface', scheme.surface);
    root.style.setProperty('--color-text', scheme.text);
    root.style.setProperty('--color-text-secondary', scheme.textSecondary);
    root.style.setProperty('--color-border', scheme.border);
  };

  const setScheme = (schemeId: string) => {
    const scheme = colorSchemes.find(s => s.id === schemeId);
    if (scheme) {
      setCurrentScheme(scheme);
      applyScheme(scheme);
    }
  };

  return (
    <ThemeContext.Provider value={{ currentScheme, setScheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
