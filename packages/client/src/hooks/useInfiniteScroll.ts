import { useState, useCallback, useRef } from "react";

interface UseInfiniteScrollOptions<T, P> {
  fetchFn: (params: P & { limit: number; offset: number }) => Promise<{
    data?: { items: T[]; hasMore: boolean };
    error?: unknown;
  }>;
  pageSize: number;
  initialOffset?: number;
}

interface UseInfiniteScrollResult<T> {
  items: T[];
  isLoading: boolean;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  reset: () => void;
}

export function useInfiniteScroll<T, P extends Record<string, unknown>>(
  options: UseInfiniteScrollOptions<T, P>,
): UseInfiniteScrollResult<T> {
  const { fetchFn, pageSize, initialOffset = 0 } = options;
  const [items, setItems] = useState<T[]>([]);
  const [offset, setOffset] = useState(initialOffset);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const loadingRef = useRef(false);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore) return;
    loadingRef.current = true;
    setIsLoading(true);
    try {
      const result = await fetchFn({ limit: pageSize, offset } as P & {
        limit: number;
        offset: number;
      });
      if (result.data) {
        setItems((prev) => [...prev, ...result.data!.items]);
        setHasMore(result.data!.hasMore);
        setOffset((prev) => prev + pageSize);
      }
    } catch {
      // error handled by RTK Query
    } finally {
      loadingRef.current = false;
      setIsLoading(false);
    }
  }, [fetchFn, pageSize, offset, hasMore]);

  const refresh = useCallback(async () => {
    setItems([]);
    setOffset(initialOffset);
    setHasMore(true);
    loadingRef.current = false;
  }, [initialOffset]);

  const reset = useCallback(() => {
    setItems([]);
    setOffset(initialOffset);
    setHasMore(true);
    setIsLoading(false);
    loadingRef.current = false;
  }, [initialOffset]);

  return { items, isLoading, hasMore, loadMore, refresh, reset };
}
