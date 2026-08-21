import { useState, useEffect, useCallback } from "react";
type Listener = () => void;
const listeners: Record<string, Set<Listener>> = {};

function emitInvalidate(queryKey: any[]) {
  const keyStr = JSON.stringify(queryKey);
  if (listeners[keyStr]) {
    listeners[keyStr].forEach((cb) => cb());
  }
}

function subscribe(queryKey: any[], cb: Listener) {
  const keyStr = JSON.stringify(queryKey);
  if (!listeners[keyStr]) listeners[keyStr] = new Set();
  listeners[keyStr].add(cb);
  return () => {
    listeners[keyStr].delete(cb);
  };
}

export function useQueryClient() {
  return {
    invalidateQueries: ({ queryKey }: { queryKey: any[] }) => {
      emitInvalidate(queryKey);
    },
  };
}

export function useQuery<T>({ queryKey, queryFn }: { queryKey: any[]; queryFn: () => Promise<T> }) {
  const [data, setData] = useState<T | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setIsError(false);
    setError(null);
    try {
      const res = await queryFn();
      setData(res);
    } catch (e: any) {
      setIsError(true);
      setError(e);
    } finally {
      setIsLoading(false);
    }
  }, [queryFn]);

  useEffect(() => {
    fetch();
    return subscribe(queryKey, fetch);
  }, [JSON.stringify(queryKey)]);

  return { data, isLoading, isError, error, refetch: fetch };
}

export function useMutation<TVariables, TData>({
  mutationFn,
  onSuccess,
  onError,
}: {
  mutationFn: (vars: TVariables) => Promise<TData>;
  onSuccess?: (data: TData) => void;
  onError?: (error: Error) => void;
}) {
  const [isPending, setIsPending] = useState(false);

  const mutate = async (vars?: TVariables) => {
    setIsPending(true);
    try {
      const data = await mutationFn(vars as TVariables);
      onSuccess?.(data);
    } catch (e: any) {
      onError?.(e);
    } finally {
      setIsPending(false);
    }
  };

  return { mutate, isPending };
}
