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
    id: 'ocean-blue',
    name: 'Ocean Blue',
    primary: '#0284c7',
    secondary: '#0369a1',
    success: '#0891b2',
    warning: '#f59e0b',
    error: '#dc2626',
    background: '#f8fafc',
    surface: '#ffffff',
    text: '#0f172a',
    textSecondary: '#64748b',
    border: '#e2e8f0',
  },
  {
    id: 'dark-mode',
    name: 'Dark Mode',
    primary: '#3b82f6',
    secondary: '#1e40af',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    background: '#0f172a',
    surface: '#1e293b',
    text: '#f1f5f9',
    textSecondary: '#94a3b8',
    border: '#334155',
  },
  {
    id: 'minimal-grey',
    name: 'Minimal Grey',
    primary: '#475569',
    secondary: '#334155',
    success: '#64748b',
    warning: '#94a3b8',
    error: '#64748b',
    background: '#f8fafc',
    surface: '#ffffff',
    text: '#0f172a',
    textSecondary: '#64748b',
    border: '#e2e8f0',
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
    root.style.setProperty('--color-background', scheme.background);
    root.style.setProperty('--color-text', scheme.text);
    root.style.setProperty('--color-foreground', scheme.text);
    root.style.setProperty('--color-surface', scheme.surface);
    root.style.setProperty('--color-border', scheme.border);
    
    // Extract RGB values for gradients
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result 
        ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
        : '0, 150, 70';
    };
    root.style.setProperty('--color-primary-rgb', hexToRgb(scheme.primary));
    root.style.setProperty('--color-text-secondary', scheme.textSecondary);
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
