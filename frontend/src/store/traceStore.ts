// PyTrace — Zustand store for trace state

import { create } from 'zustand';
import type { TraceResult, TraceStep } from '../types/trace';

export type AppMode = 'trace' | 'live';

export type SectionId = 'arrays' | 'variables' | 'callStack' | 'complexity';

const DEFAULT_SECTION_SIZES: Record<SectionId, number> = {
  arrays: 0.30,
  variables: 0.35,
  callStack: 0.20,
  complexity: 0.15,
};

const DEFAULT_SECTION_COLLAPSED: Record<SectionId, boolean> = {
  arrays: false,
  variables: false,
  callStack: false,
  complexity: true,
};

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

  // Live REPL mode
  mode: AppMode;
  liveError: string | null;

  // Sidebar section layout (fractions of expanded sidebar height, persisted across steps)
  sectionSizes: Record<SectionId, number>;
  sectionCollapsed: Record<SectionId, boolean>;

  // Actions
  setResult: (result: TraceResult) => void;
  setCurrentStepIndex: (index: number) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setCode: (code: string) => void;
  reset: () => void;

  setMode: (mode: AppMode) => void;
  setLiveError: (error: string | null) => void;
  applyLiveResult: (result: TraceResult) => void;

  toggleSectionCollapsed: (id: SectionId) => void;
  adjustSectionSizes: (a: SectionId, b: SectionId, deltaFrac: number, minFrac: number) => void;
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

  mode: 'trace',
  liveError: null,

  sectionSizes: { ...DEFAULT_SECTION_SIZES },
  sectionCollapsed: { ...DEFAULT_SECTION_COLLAPSED },

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

  setMode: (mode) => set({ mode }),

  setLiveError: (error) => set({ liveError: error }),

  applyLiveResult: (result) => {
    if (result.error && result.steps.length === 0) {
      // No steps captured at all (e.g. SyntaxError) — keep the existing
      // visualization on screen, surface the error separately.
      set({ liveError: result.error, notes: result.notes ?? [] });
      return;
    }
    // Either no error, or an error with steps captured before the crash —
    // show the last captured step so panels reflect pre-crash state.
    const lastIndex = Math.max(0, result.steps.length - 1);
    set({
      result,
      steps: result.steps,
      totalSteps: result.total_steps,
      error: null,
      liveError: result.error ?? null,
      notes: result.notes ?? [],
      currentStepIndex: lastIndex,
      currentStep: result.steps[lastIndex] ?? null,
    });
  },

  toggleSectionCollapsed: (id) =>
    set((state) => ({
      sectionCollapsed: { ...state.sectionCollapsed, [id]: !state.sectionCollapsed[id] },
    })),

  adjustSectionSizes: (a, b, deltaFrac, minFrac) =>
    set((state) => {
      const sizes = state.sectionSizes;
      let newA = sizes[a] + deltaFrac;
      let newB = sizes[b] - deltaFrac;
      if (newA < minFrac) {
        const diff = minFrac - newA;
        newA = minFrac;
        newB -= diff;
      }
      if (newB < minFrac) {
        const diff = minFrac - newB;
        newB = minFrac;
        newA -= diff;
      }
      return { sectionSizes: { ...sizes, [a]: newA, [b]: newB } };
    }),
}));
