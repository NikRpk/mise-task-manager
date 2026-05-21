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
  surfaceMuted: string; // For subtle backgrounds like day headers
  text: string;
  textSecondary: string;
  border: string;
}

export const colorSchemes: ColorScheme[] = [
  {
    id: 'mise',
    name: 'Classic Green',
    primary: '#009646',
    secondary: '#125034',
    success: '#00a61c',
    warning: '#f6c400',
    error: '#f30047',
    background: '#fffdfa',
    surface: '#ffffff',
    surfaceMuted: '#f8fafc',
    text: '#0f172a',
    textSecondary: '#64748b',
    border: '#e2e8f0',
  },
  {
    id: 'ocean',
    name: 'Ocean Blue',
    primary: '#0066CC',
    secondary: '#004080',
    success: '#00B4D8',
    warning: '#FFB703',
    error: '#f30047',
    background: '#f0f9ff',
    surface: '#ffffff',
    surfaceMuted: '#e0f2fe',
    text: '#0f172a',
    textSecondary: '#64748b',
    border: '#bae6fd',
  },
  {
    id: 'purple',
    name: 'Purple Professional',
    primary: '#7C3AED',
    secondary: '#5B21B6',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#f30047',
    background: '#faf5ff',
    surface: '#ffffff',
    surfaceMuted: '#f3e8ff',
    text: '#0f172a',
    textSecondary: '#64748b',
    border: '#e9d5ff',
  },
  {
    id: 'coral',
    name: 'Coral Sunset',
    primary: '#F97316',
    secondary: '#C2410C',
    success: '#10B981',
    warning: '#EAB308',
    error: '#f30047',
    background: '#fff7ed',
    surface: '#ffffff',
    surfaceMuted: '#ffedd5',
    text: '#0f172a',
    textSecondary: '#64748b',
    border: '#fed7aa',
  },
  {
    id: 'teal',
    name: 'Teal Modern',
    primary: '#14B8A6',
    secondary: '#0F766E',
    success: '#22C55E',
    warning: '#F59E0B',
    error: '#f30047',
    background: '#f0fdfa',
    surface: '#ffffff',
    surfaceMuted: '#ccfbf1',
    text: '#0f172a',
    textSecondary: '#64748b',
    border: '#99f6e4',
  },
  {
    id: 'ruby',
    name: 'Ruby Red',
    primary: '#DC2626',
    secondary: '#991B1B',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#f30047',
    background: '#fef2f2',
    surface: '#ffffff',
    surfaceMuted: '#fee2e2',
    text: '#0f172a',
    textSecondary: '#64748b',
    border: '#fecaca',
  },
  {
    id: 'forest',
    name: 'Forest Green',
    primary: '#15803D',
    secondary: '#14532D',
    success: '#22C55E',
    warning: '#EAB308',
    error: '#f30047',
    background: '#f0fdf4',
    surface: '#ffffff',
    surfaceMuted: '#dcfce7',
    text: '#0f172a',
    textSecondary: '#64748b',
    border: '#bbf7d0',
  },
  {
    id: 'indigo',
    name: 'Indigo Night',
    primary: '#4F46E5',
    secondary: '#312E81',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#f30047',
    background: '#eef2ff',
    surface: '#ffffff',
    surfaceMuted: '#e0e7ff',
    text: '#0f172a',
    textSecondary: '#64748b',
    border: '#c7d2fe',
  },
  {
    id: 'amber',
    name: 'Amber Gold',
    primary: '#D97706',
    secondary: '#92400E',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#f30047',
    background: '#fffbeb',
    surface: '#ffffff',
    surfaceMuted: '#fef3c7',
    text: '#0f172a',
    textSecondary: '#64748b',
    border: '#fde68a',
  },
  {
    id: 'slate',
    name: 'Slate Professional',
    primary: '#475569',
    secondary: '#1E293B',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#f30047',
    background: '#f8fafc',
    surface: '#ffffff',
    surfaceMuted: '#f1f5f9',
    text: '#0f172a',
    textSecondary: '#64748b',
    border: '#e2e8f0',
  },
];

interface ThemeContextType {
  currentScheme: ColorScheme;
  setScheme: (schemeId: string) => void;
  setCustomScheme: (scheme: ColorScheme) => void;
  applyCustomColors: (colors: Partial<ColorScheme>) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [currentScheme, setCurrentScheme] = useState<ColorScheme>(colorSchemes[0]);

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
    root.style.setProperty('--color-surface-muted', scheme.surfaceMuted);
    root.style.setProperty('--color-text', scheme.text);
    root.style.setProperty('--color-text-secondary', scheme.textSecondary);
    root.style.setProperty('--color-border', scheme.border);
  };

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
            if (data.colorScheme === 'custom' && data.customColorScheme) {
              setCurrentScheme(data.customColorScheme);
              applyScheme(data.customColorScheme);
            } else {
              // 'hellofresh' is a legacy color scheme ID — map to 'mise'
              const resolvedId = data.colorScheme === 'hellofresh' ? 'mise' : data.colorScheme;
              const scheme = colorSchemes.find(s => s.id === resolvedId);
              if (scheme) {
                setCurrentScheme(scheme);
                applyScheme(scheme);
              }
            }
          }
        } else if (res.status === 401) {
          // User not authenticated yet, ignore silently
          logger.debug('Theme: waiting for authentication');
        }
      } catch {
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

  const setScheme = (schemeId: string) => {
    // 'hellofresh' is a legacy color scheme ID — map to 'mise'
    const resolvedId = schemeId === 'hellofresh' ? 'mise' : schemeId;
    const scheme = colorSchemes.find(s => s.id === resolvedId);
    if (scheme) {
      setCurrentScheme(scheme);
      applyScheme(scheme);
    }
  };

  const setCustomScheme = (scheme: ColorScheme) => {
    setCurrentScheme(scheme);
    applyScheme(scheme);
  };

  const applyCustomColors = (colors: Partial<ColorScheme>) => {
    const updatedScheme = {
      ...currentScheme,
      ...colors,
      id: 'custom',
      name: 'Custom',
    };
    setCurrentScheme(updatedScheme);
    applyScheme(updatedScheme);
  };

  return (
    <ThemeContext.Provider value={{ currentScheme, setScheme, setCustomScheme, applyCustomColors }}>
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
