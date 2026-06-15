// PyTrace — Zustand store for trace state

import { create } from 'zustand';
import type { TraceResult, TraceStep } from '../types/trace';

interface TraceState {
  // Raw trace data
  result: TraceResult | null;
  steps: TraceStep[];
  totalSteps: number;

  // Playback cursor
  currentStepIndex: number;
  currentStep: TraceStep | null;

  // UI state
  isLoading: boolean;
  error: string | null;
  notes: string[];  // preprocessing notes from backend

  // Code in the editor
  code: string;

  // Actions
  setResult: (result: TraceResult) => void;
  setCurrentStepIndex: (index: number) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setCode: (code: string) => void;
  reset: () => void;
}

export const useTraceStore = create<TraceState>((set, get) => ({
  result: null,
  steps: [],
  totalSteps: 0,
  currentStepIndex: 0,
  currentStep: null,
  isLoading: false,
  error: null,
  notes: [],
  code: '',

  setResult: (result) =>
    set({
      result,
      steps: result.steps,
      totalSteps: result.total_steps,
      currentStepIndex: 0,
      currentStep: result.steps[0] ?? null,
      error: result.error ?? null,
      notes: result.notes ?? [],
    }),

  setCurrentStepIndex: (index) => {
    const { steps } = get();
    const clamped = Math.max(0, Math.min(index, steps.length - 1));
    set({ currentStepIndex: clamped, currentStep: steps[clamped] ?? null });
  },

  setLoading: (loading) => set({ isLoading: loading }),

  setError: (error) => set({ error }),

  setCode: (code) => set({ code }),

  reset: () =>
    set({
      result: null,
      steps: [],
      totalSteps: 0,
      currentStepIndex: 0,
      currentStep: null,
      error: null,
      notes: [],
    }),
}));
