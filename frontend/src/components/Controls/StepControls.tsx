// PyTrace - Compact centered step controls with SVG icon buttons

import type { ReactNode } from 'react';
import { useTraceStore } from '../../store/traceStore';
import { usePlayback, SPEED_OPTIONS, type SpeedOption } from '../../hooks/usePlayback';

// ---------------------------------------------------------------------------
// SVG Icons
// ---------------------------------------------------------------------------

const ResetIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
    <polyline points="3 3 3 8 8 8"/>
  </svg>
);

const SkipBackIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="19 20 9 12 19 4 19 20"/>
    <line x1="5" y1="19" x2="5" y2="5"/>
  </svg>
);

const PlayIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
    <polygon points="5 3 19 12 5 21 5 3"/>
  </svg>
);

const PauseIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
    <rect x="6" y="4" width="4" height="16"/>
    <rect x="14" y="4" width="4" height="16"/>
  </svg>
);

const SkipForwardIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="5 4 15 12 5 20 5 4"/>
    <line x1="19" y1="5" x2="19" y2="19"/>
  </svg>
);

// ---------------------------------------------------------------------------
// Icon Button
// ---------------------------------------------------------------------------

function IconBtn({
  onClick, disabled, title, primary, children,
}: {
  onClick: () => void; disabled?: boolean; title: string;
  primary?: boolean; children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`w-7 h-7 flex items-center justify-center rounded transition-colors disabled:opacity-25 ${
        primary
          ? 'bg-[#007acc] hover:bg-[#1a8ad4] text-white'
          : 'text-[#6b6b6b] hover:text-[#cccccc] hover:bg-[#3c3c3c]'
      }`}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function StepControls() {
  const totalSteps = useTraceStore((s) => s.totalSteps);
  const stepIdx    = useTraceStore((s) => s.currentStepIndex);
  const setStepIdx = useTraceStore((s) => s.setCurrentStepIndex);
  const { isPlaying, speed, togglePlay, setSpeed, reset } = usePlayback();

  const canBack  = stepIdx > 0;
  const canNext  = stepIdx < totalSteps - 1;
  const hasSteps = totalSteps > 0;

  return (
    <div className="flex justify-center py-2 px-4">
      <div className="flex items-center gap-2 w-full max-w-[50%]">

        {/* Playback buttons */}
        <div className="flex items-center gap-0.5">
          <IconBtn onClick={reset} disabled={!hasSteps} title="Reset to beginning">
            <ResetIcon />
          </IconBtn>
          <IconBtn onClick={() => setStepIdx(stepIdx - 1)} disabled={!canBack} title="Previous step (left arrow)">
            <SkipBackIcon />
          </IconBtn>
          <IconBtn onClick={togglePlay} disabled={!hasSteps} title={isPlaying ? 'Pause' : 'Play'} primary>
            {isPlaying ? <PauseIcon /> : <PlayIcon />}
          </IconBtn>
          <IconBtn onClick={() => setStepIdx(stepIdx + 1)} disabled={!canNext} title="Next step (right arrow)">
            <SkipForwardIcon />
          </IconBtn>
        </div>

        {/* Scrubber */}
        <input
          type="range"
          min={0}
          max={Math.max(totalSteps - 1, 0)}
          value={stepIdx}
          onChange={(e) => setStepIdx(Number(e.target.value))}
          disabled={!hasSteps}
          className="flex-1 h-[3px] accent-[#007acc] disabled:opacity-25 cursor-pointer"
        />

        {/* Step badge */}
        <span className="shrink-0 text-[11px] font-mono tabular-nums text-[#858585] bg-[#2d2d2d] border border-[#3c3c3c] rounded px-1.5 py-0.5 min-w-[52px] text-center">
          {hasSteps ? `${stepIdx + 1} / ${totalSteps}` : '-- / --'}
        </span>

        {/* Speed */}
        <select
          value={speed}
          onChange={(e) => setSpeed(Number(e.target.value) as SpeedOption)}
          className="shrink-0 bg-[#2d2d2d] border border-[#3c3c3c] text-[#858585] text-[11px] rounded px-1 py-0.5 focus:outline-none focus:border-[#007acc] cursor-pointer"
        >
          {SPEED_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}x</option>
          ))}
        </select>

      </div>
    </div>
  );
}
