// PyTrace — Hook for running a trace against the backend

import { useCallback } from 'react';
import { postTrace } from '../lib/api';
import { useTraceStore } from '../store/traceStore';

export function useTracer() {
  const { setResult, setLoading, setError, reset, applyLiveResult, setLiveError } = useTraceStore();

  const runTrace = useCallback(
    async (
      code: string,
      inputs: Record<string, unknown>,
    ): Promise<import('../types/trace').TraceResult | null> => {
      reset();
      setLoading(true);
      setError(null);

      try {
        const result = await postTrace({ code, inputs });
        setResult(result);
        return result;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Unexpected error';
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [reset, setLoading, setError, setResult],
  );

  // Live Mode: re-trace without clearing the current visualization on error.
  const runTraceLive = useCallback(
    async (code: string, inputs: Record<string, unknown>): Promise<void> => {
      setLoading(true);
      try {
        const result = await postTrace({ code, inputs });
        applyLiveResult(result);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unexpected error';
        setLiveError(message);
      } finally {
        setLoading(false);
      }
    },
    [setLoading, applyLiveResult, setLiveError],
  );

  return { runTrace, runTraceLive };
}
