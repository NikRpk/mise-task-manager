/**
 * Simple Cache Context
 * Lightweight in-memory caching with TTL support
 * No external dependencies - works with any React version
 */

'use client';

import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

interface CacheContextValue {
  get: <T>(key: string) => T | null;
  set: <T>(key: string, data: T, ttl?: number) => void;
  invalidate: (key: string) => void;
  invalidatePattern: (pattern: RegExp) => void;
  clear: () => void;
}

const CacheContext = createContext<CacheContextValue | null>(null);

const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

export function CacheProvider({ children }: { children: ReactNode }) {
  const [cache, setCache] = useState<Map<string, CacheEntry<unknown>>>(new Map());

  // Cleanup expired entries every minute
  useEffect(() => {
    const cleanup = setInterval(() => {
      setCache(prev => {
        const now = Date.now();
        const newCache = new Map(prev);
        let hasChanges = false;

        for (const [key, entry] of newCache.entries()) {
          if (now > entry.timestamp) {
            newCache.delete(key);
            hasChanges = true;
          }
        }

        return hasChanges ? newCache : prev;
      });
    }, 60 * 1000); // Every minute

    return () => clearInterval(cleanup);
  }, []);

  const get = useCallback(<T,>(key: string): T | null => {
    const entry = cache.get(key);
    if (!entry) return null;

    // Check if expired - just return null, let the cleanup interval handle deletion
    if (Date.now() > entry.timestamp) {
      return null;
    }

    return entry.data as T;
  }, [cache]);

  const set = useCallback(<T,>(key: string, data: T, ttl: number = DEFAULT_TTL) => {
    setCache(prev => {
      const newCache = new Map(prev);
      newCache.set(key, {
        data,
        timestamp: Date.now() + ttl,
      });
      return newCache;
    });
  }, []);

  const invalidate = useCallback((key: string) => {
    setCache(prev => {
      const newCache = new Map(prev);
      newCache.delete(key);
      return newCache;
    });
  }, []);

  const invalidatePattern = useCallback((pattern: RegExp) => {
    setCache(prev => {
      const newCache = new Map(prev);
      let hasChanges = false;

      for (const key of newCache.keys()) {
        if (pattern.test(key)) {
          newCache.delete(key);
          hasChanges = true;
        }
      }

      return hasChanges ? newCache : prev;
    });
  }, []);

  const clear = useCallback(() => {
    setCache(new Map());
  }, []);

  return (
    <CacheContext.Provider value={{ get, set, invalidate, invalidatePattern, clear }}>
      {children}
    </CacheContext.Provider>
  );
}

export function useCache() {
  const context = useContext(CacheContext);
  if (!context) {
    throw new Error('useCache must be used within a CacheProvider');
  }
  return context;
}

/**
 * Hook for cached data fetching with automatic revalidation
 */
export function useCachedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: {
    ttl?: number;
    enabled?: boolean;
    onSuccess?: (data: T) => void;
    onError?: (error: Error) => void;
  } = {}
) {
  const { get, set } = useCache();
  const [data, setData] = useState<T | null>(() => get<T>(key));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const { ttl = DEFAULT_TTL, enabled = true, onSuccess, onError } = options;

  const refetch = useCallback(async () => {
    if (!enabled) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await fetcher();
      set(key, result, ttl);
      setData(result);
      onSuccess?.(result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Fetch failed');
      setError(error);
      onError?.(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [key, fetcher, set, ttl, enabled, onSuccess, onError]);

  // Initial fetch
  useEffect(() => {
    if (!enabled) return;

    const cached = get<T>(key);
    if (cached) {
      setData(cached);
    } else {
      refetch();
    }
  }, [key, enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    data,
    isLoading,
    error,
    refetch,
  };
}
