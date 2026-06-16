// PyTrace — Zustand store for trace state

import { create } from 'zustand';
import type { TraceResult, TraceStep } from '../types/trace';
import { channelName, type StepUpdateMessage } from '../lib/broadcast';

export type AppMode = 'trace' | 'live';

export type SectionId = 'arrays' | 'variables' | 'callStack' | 'complexity' | 'recursionTree';

const DEFAULT_SECTION_SIZES: Record<SectionId, number> = {
  arrays: 0.30,
  variables: 0.35,
  callStack: 0.20,
  complexity: 0.15,
  recursionTree: 0.25,
};

const DEFAULT_SECTION_COLLAPSED: Record<SectionId, boolean> = {
  arrays: false,
  variables: false,
  callStack: false,
  complexity: true,
  recursionTree: false,
};

// Detachable visualizer popout (Phase 7 Section 4): each app instance gets a
// random session id, and broadcasts the current step to a channel named after
// it so a popout window opened with ?session=<id> can mirror the panels.
const sessionId = crypto.randomUUID();
const broadcastChannel = new BroadcastChannel(channelName(sessionId));

function broadcastStep(
  step: TraceStep | null,
  steps: TraceStep[],
  currentStepIndex: number,
  result: TraceResult | null,
): void {
  const message: StepUpdateMessage = { type: 'STEP_UPDATE', step, steps, currentStepIndex, result };
  broadcastChannel.postMessage(message);
}

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

  // Detachable visualizer popout
  sessionId: string;
  popoutOpen: boolean;
  setPopoutOpen: (open: boolean) => void;

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

  sessionId,
  popoutOpen: false,
  setPopoutOpen: (open) => set({ popoutOpen: open }),

  setResult: (result) => {
    const currentStepIndex = 0;
    const currentStep = result.steps[0] ?? null;
    set({
      result,
      steps: result.steps,
      totalSteps: result.total_steps,
      currentStepIndex,
      currentStep,
      error: result.error ?? null,
      notes: result.notes ?? [],
    });
    broadcastStep(currentStep, result.steps, currentStepIndex, result);
  },

  setCurrentStepIndex: (index) => {
    const { steps, result } = get();
    const clamped = Math.max(0, Math.min(index, steps.length - 1));
    const currentStep = steps[clamped] ?? null;
    set({ currentStepIndex: clamped, currentStep });
    broadcastStep(currentStep, steps, clamped, result);
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

  setMode: (mode) => {
    if (mode === 'live') {
      // Clear all Trace Mode state so stale steps / inputs-seeded variables
      // don't bleed into the Live Mode scratchpad namespace.
      set({
        mode,
        result: null,
        steps: [],
        totalSteps: 0,
        currentStepIndex: 0,
        currentStep: null,
        error: null,
        liveError: null,
        notes: [],
      });
    } else {
      // Switching back to Trace Mode — clear any live error so the banner
      // doesn't persist from the previous Live session.
      set({ mode, liveError: null });
    }
  },

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
    const currentStep = result.steps[lastIndex] ?? null;
    set({
      result,
      steps: result.steps,
      totalSteps: result.total_steps,
      error: null,
      liveError: result.error ?? null,
      notes: result.notes ?? [],
      currentStepIndex: lastIndex,
      currentStep,
    });
    broadcastStep(currentStep, result.steps, lastIndex, result);
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

// A freshly opened popout window has missed every prior STEP_UPDATE, so it
// asks for the current state on connect; reply with whatever we have now.
broadcastChannel.onmessage = (event: MessageEvent) => {
  if (event.data?.type !== 'REQUEST_STATE') return;
  const { currentStep, steps, currentStepIndex, result } = useTraceStore.getState();
  broadcastStep(currentStep, steps, currentStepIndex, result);
};
