import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError } from "../lib/api";

interface QueryState<T> {
  data: T | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

export function useQuery<T>(url: string, enabled = true) {
  const [state, setState] = useState<QueryState<T>>({
    data: null,
    isLoading: enabled,
    isError: false,
    error: null,
  });
  const abortRef = useRef<AbortController | null>(null);

  const refetch = useCallback(() => {
    if (!enabled) return;
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setState((s) => ({ ...s, isLoading: true, isError: false, error: null }));
    api<T>(url, { signal: abortRef.current.signal })
      .then((data) => setState({ data, isLoading: false, isError: false, error: null }))
      .catch((err: ApiError) => {
        if (err.message === "The user aborted a request.") return;
        setState({ data: null, isLoading: false, isError: true, error: err });
      });
  }, [url, enabled]);

  useEffect(() => {
    refetch();
    return () => abortRef.current?.abort();
  }, [refetch]);

  return { ...state, refetch };
}

interface MutationState {
  isPending: boolean;
  isError: boolean;
  error: Error | null;
}

export function useMutation<TInput = unknown, TOutput = unknown>(options: {
  mutationFn: (data: TInput) => Promise<TOutput>;
  onSuccess?: (data: TOutput) => void;
  onError?: (err: Error) => void;
}) {
  const [state, setState] = useState<MutationState>({
    isPending: false,
    isError: false,
    error: null,
  });

  const mutate = useCallback(
    async (data: TInput) => {
      setState({ isPending: true, isError: false, error: null });
      try {
        const result = await options.mutationFn(data);
        setState({ isPending: false, isError: false, error: null });
        options.onSuccess?.(result);
        return result;
      } catch (err) {
        const e = err as Error;
        setState({ isPending: false, isError: true, error: e });
        options.onError?.(e);
        throw e;
      }
    },
    [options]
  );

  return { ...state, mutate };
}
