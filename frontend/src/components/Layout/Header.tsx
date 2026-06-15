// PyTrace - Header with VS Code color scheme

import { useState, useCallback } from 'react';
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

  const [shareState, setShareState] = useState<'idle' | 'copying' | 'copied' | 'error'>('idle');

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
        {totalSteps > 0 && (
          <span>
            step <span className="text-[#cccccc]">{stepIdx + 1}</span>
            <span className="text-[#3c3c3c]">/</span>
            <span className="text-[#cccccc]">{totalSteps}</span>
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5">
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
