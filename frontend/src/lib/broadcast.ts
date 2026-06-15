// PyTrace - BroadcastChannel message types for the detachable visualizer
// popout window (Phase 7 Section 4).

import type { TraceResult, TraceStep } from '../types/trace';

export interface StepUpdateMessage {
  type: 'STEP_UPDATE';
  step: TraceStep | null;
  steps: TraceStep[];
  currentStepIndex: number;
  result: TraceResult | null;
}

export interface RequestStateMessage {
  type: 'REQUEST_STATE';
}

export type BroadcastMessage = StepUpdateMessage | RequestStateMessage;

export function channelName(sessionId: string): string {
  return `pytrace-${sessionId}`;
}
