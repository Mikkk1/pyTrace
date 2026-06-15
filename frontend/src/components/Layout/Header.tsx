// PyTrace - Header with VS Code color scheme

import { useState, useCallback, useEffect } from 'react';
import { Github, Linkedin } from 'lucide-react';
import { useTraceStore } from '../../store/traceStore';
import { postAnalyze, createSnippet, type AnalyzeResult } from '../../lib/api';

interface Props {
  onAnalyseResult: (result: AnalyzeResult | null, error: string | null) => void;
  analyseLoading: boolean;
  setAnalyseLoading: (v: boolean) => void;
  currentInputs: Record<string, unknown>;
}

export default function Header({ onAnalyseResult, analyseLoading, setAnalyseLoading, currentInputs }: Props) {
  const code        = useTraceStore((s) => s.code) ?? '';
  const totalSteps  = useTraceStore((s) => s.totalSteps);
  const stepIdx     = useTraceStore((s) => s.currentStepIndex);
  const currentStep = useTraceStore((s) => s.currentStep);
  const mode        = useTraceStore((s) => s.mode);
  const setMode     = useTraceStore((s) => s.setMode);
  const isLoading   = useTraceStore((s) => s.isLoading);

  const [shareState, setShareState] = useState<'idle' | 'copying' | 'copied' | 'error'>('idle');

  // Ctrl+Shift+L toggles Trace/Live mode
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        setMode(mode === 'live' ? 'trace' : 'live');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [mode, setMode]);

  const handleAnalyse = useCallback(async () => {
    if (!code.trim() || analyseLoading) return;
    setAnalyseLoading(true);
    onAnalyseResult(null, null);
    try {
      const result = await postAnalyze(code);
      onAnalyseResult(result, null);
    } catch (err: unknown) {
      onAnalyseResult(null, err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setAnalyseLoading(false);
    }
  }, [code, analyseLoading, setAnalyseLoading, onAnalyseResult]);

  const handleShare = useCallback(async () => {
    if (!code.trim()) return;
    setShareState('copying');
    try {
      const { url } = await createSnippet(code, currentInputs, stepIdx);
      await navigator.clipboard.writeText(url);
      setShareState('copied');
      setTimeout(() => setShareState('idle'), 2500);
    } catch {
      setShareState('error');
      setTimeout(() => setShareState('idle'), 2500);
    }
  }, [code, currentInputs, stepIdx]);

  const shareLabel =
    shareState === 'copying' ? 'Copying...'
    : shareState === 'copied' ? 'Copied!'
    : shareState === 'error'  ? 'Error'
    : 'Share';

  return (
    <header className="shrink-0 flex items-center justify-between px-4 py-0 h-9 border-b border-[#3c3c3c] bg-[#323233]">

      {/* Logo */}
      <div className="flex items-center gap-2">
        <span className="text-[#007acc] font-bold text-sm tracking-tight">PyTrace</span>
        <span className="text-[#6b6b6b] text-xs hidden sm:inline">Python DSA Visualizer</span>
      </div>

      {/* Step info */}
      <div className="flex items-center gap-3 text-xs text-[#858585]">
        {currentStep && (
          <span>
            line <span className="text-[#dcdcaa]">{currentStep.line}</span>
            <span className="mx-1 text-[#3c3c3c]">|</span>
            <span className="text-[#9cdcfe]">{currentStep.event}</span>
          </span>
        )}
        {mode === 'live' ? (
          <span className="flex items-center gap-1.5 font-semibold">
            {isLoading && <span className="w-1.5 h-1.5 rounded-full bg-[#4ec9b0] animate-pulse" />}
            <span className="text-[#4ec9b0]">Live</span>
          </span>
        ) : (
          totalSteps > 0 && (
            <span>
              step <span className="text-[#cccccc]">{stepIdx + 1}</span>
              <span className="text-[#3c3c3c]">/</span>
              <span className="text-[#cccccc]">{totalSteps}</span>
            </span>
          )
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5">
        {/* Trace / Live mode toggle */}
        <div
          className="flex items-center rounded-full overflow-hidden border border-[#454545] text-[10px] font-semibold mr-1"
          title="Toggle Trace/Live mode (Ctrl+Shift+L)"
        >
          <button
            onClick={() => setMode('trace')}
            className={`px-2.5 py-1 transition-colors ${
              mode === 'trace' ? 'bg-[#007acc] text-white' : 'bg-[#2d2d2d] text-[#858585] hover:text-[#cccccc]'
            }`}
          >
            Trace
          </button>
          <button
            onClick={() => setMode('live')}
            className={`px-2.5 py-1 transition-colors flex items-center gap-1 ${
              mode === 'live' ? 'bg-[#16825d] text-white' : 'bg-[#2d2d2d] text-[#858585] hover:text-[#cccccc]'
            }`}
          >
            {mode === 'live' && isLoading && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#4ec9b0] animate-pulse" />
            )}
            Live
          </button>
        </div>

        <button
          onClick={handleAnalyse}
          disabled={analyseLoading || !code.trim()}
          className="px-2.5 py-1 rounded text-xs font-medium bg-[#2d2d2d] hover:bg-[#3c3c3c] border border-[#454545] text-[#cccccc] disabled:opacity-40 transition-colors"
        >
          {analyseLoading ? 'Analysing...' : 'Analyse'}
        </button>
        <button
          onClick={handleShare}
          disabled={shareState === 'copying' || !code.trim()}
          className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors disabled:opacity-40 ${
            shareState === 'copied'
              ? 'bg-[#16825d] border-[#16825d] text-white'
              : shareState === 'error'
              ? 'bg-red-800 border-red-700 text-white'
              : 'bg-[#2d2d2d] hover:bg-[#3c3c3c] border-[#454545] text-[#cccccc]'
          }`}
        >
          {shareLabel}
        </button>

        {/* Developer links */}
        <div className="flex items-center gap-1 ml-1 pl-2 border-l border-[#3c3c3c]">
          <a
            href="https://github.com/Mikkk1"
            target="_blank"
            rel="noopener noreferrer"
            title="GitHub"
            className="w-6 h-6 flex items-center justify-center rounded text-[#858585] hover:text-[#cccccc] hover:bg-[#3c3c3c] transition-colors"
          >
            <Github size={14} />
          </a>
          <a
            href="https://linkedin.com/in/sarim-zahid-4b3636265"
            target="_blank"
            rel="noopener noreferrer"
            title="LinkedIn"
            className="w-6 h-6 flex items-center justify-center rounded text-[#858585] hover:text-[#cccccc] hover:bg-[#3c3c3c] transition-colors"
          >
            <Linkedin size={14} />
          </a>
        </div>
      </div>
    </header>
  );
}
