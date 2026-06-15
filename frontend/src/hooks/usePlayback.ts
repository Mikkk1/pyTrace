// PyTrace — Auto-playback hook.
// Drives the step cursor forward at a configurable speed using setInterval.
// All mutable values accessed inside the interval callback are stored in refs
// to avoid stale-closure bugs.

import { useRef, useEffect, useCallback, useState } from 'react';
import { useTraceStore } from '../store/traceStore';

/** Speed multiplier options (steps per second = BASE_SPS * multiplier). */
export const SPEED_OPTIONS = [0.25, 0.5, 1, 2, 4] as const;
export type SpeedOption = (typeof SPEED_OPTIONS)[number];

/** Base steps-per-second at 1× speed. */
const BASE_SPS = 2;

export interface UsePlaybackReturn {
  isPlaying: boolean;
  speed: SpeedOption;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  setSpeed: (s: SpeedOption) => void;
  reset: () => void;
}

export function usePlayback(): UsePlaybackReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeedState] = useState<SpeedOption>(1);

  // Refs so the interval callback always reads latest values.
  const isPlayingRef = useRef(false);
  const speedRef = useRef<SpeedOption>(1);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Store selectors — stable references from Zustand.
  const totalSteps = useTraceStore((s) => s.totalSteps);
  const stepIdx = useTraceStore((s) => s.currentStepIndex);
  const setStepIdx = useTraceStore((s) => s.setCurrentStepIndex);

  // Keep refs in sync with state/store.
  const totalStepsRef = useRef(totalSteps);
  const stepIdxRef = useRef(stepIdx);
  useEffect(() => { totalStepsRef.current = totalSteps; }, [totalSteps]);
  useEffect(() => { stepIdxRef.current = stepIdx; }, [stepIdx]);

  const clearInterval_ = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startInterval = useCallback(() => {
    clearInterval_();
    const ms = Math.round(1000 / (BASE_SPS * speedRef.current));
    intervalRef.current = setInterval(() => {
      const next = stepIdxRef.current + 1;
      if (next >= totalStepsRef.current) {
        // Reached the end — stop playing.
        clearInterval_();
        isPlayingRef.current = false;
        setIsPlaying(false);
        return;
      }
      stepIdxRef.current = next;
      setStepIdx(next);
    }, ms);
  }, [clearInterval_, setStepIdx]);

  const play = useCallback(() => {
    // Don't start if already at the end.
    if (stepIdxRef.current >= totalStepsRef.current - 1) return;
    isPlayingRef.current = true;
    setIsPlaying(true);
    startInterval();
  }, [startInterval]);

  const pause = useCallback(() => {
    isPlayingRef.current = false;
    setIsPlaying(false);
    clearInterval_();
  }, [clearInterval_]);

  const togglePlay = useCallback(() => {
    if (isPlayingRef.current) {
      pause();
    } else {
      play();
    }
  }, [pause, play]);

  const setSpeed = useCallback(
    (s: SpeedOption) => {
      speedRef.current = s;
      setSpeedState(s);
      // Restart interval with new speed if currently playing.
      if (isPlayingRef.current) {
        startInterval();
      }
    },
    [startInterval],
  );

  const reset = useCallback(() => {
    pause();
    stepIdxRef.current = 0;
    setStepIdx(0);
  }, [pause, setStepIdx]);

  // Pause automatically when totalSteps drops to 0 (new trace started).
  useEffect(() => {
    if (totalSteps === 0) {
      pause();
    }
  }, [totalSteps, pause]);

  // Clean up interval on unmount.
  useEffect(() => () => clearInterval_(), [clearInterval_]);

  return { isPlaying, speed, play, pause, togglePlay, setSpeed, reset };
}
