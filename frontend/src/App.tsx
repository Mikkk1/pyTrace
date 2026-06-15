// PyTrace - Phase 4 App with VS Code color scheme + resizable panels

import { useState, useCallback, useEffect, useRef } from 'react';
import CodeEditor from './components/Editor/CodeEditor';
import ArrayPanel from './components/Visualizer/ArrayPanel';
import VariablePanel from './components/Visualizer/VariablePanel';
import CallStack from './components/Visualizer/CallStack';
import ComplexityPanel from './components/Visualizer/ComplexityPanel';
import StepControls from './components/Controls/StepControls';
import TestCaseInput from './components/Editor/TestCaseInput';
import Header from './components/Layout/Header';
import Footer from './components/Layout/Footer';
import { useTraceStore } from './store/traceStore';
import { useTracer } from './hooks/useTracer';
import { getSnippet, type AnalyzeResult } from './lib/api';

const DEFAULT_CODE = `def two_sum(nums, target):
    seen = {}
    for i, n in enumerate(nums):
        complement = target - n
        if complement in seen:
            return [seen[complement], i]
        seen[n] = i
    return []

result = two_sum(nums, target)
`;

function PanelLabel({ title }: { title: string }) {
  return (
    <div className="px-3 py-1.5 border-b border-[#2d2d2d] shrink-0 flex items-center gap-2">
      <span className="text-[10px] font-bold uppercase tracking-widest text-[#555]">
        {title}
      </span>
    </div>
  );
}

function ArraySection() {
  const currStep = useTraceStore((s) => s.currentStep);
  const hasArrays =
    !!currStep &&
    Object.values(currStep.locals as Record<string, unknown>).some(
      (v) => Array.isArray(v) && v.length > 0,
    );

  if (!hasArrays) return null;

  return (
    <div className="shrink-0 border-b border-[#2d2d2d] max-h-48 overflow-auto scrollbar-thin">
      <PanelLabel title="Arrays" />
      <ArrayPanel />
    </div>
  );
}

export default function App() {
  const [inputs, setInputs] = useState<Record<string, unknown> | null>(null);
  const [inputsError, setInputsError] = useState<string | null>(null);
  const [analyseResult, setAnalyseResult] = useState<AnalyzeResult | null>(null);
  const [analyseError, setAnalyseError] = useState<string | null>(null);
  const [analyseLoading, setAnalyseLoading] = useState(false);

  // Resizable sidebar
  const [sidebarW, setSidebarW] = useState(300);
  const dragging = useRef(false);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const w = window.innerWidth - e.clientX;
      setSidebarW(Math.max(220, Math.min(540, w)));
    };
    const onUp = () => { dragging.current = false; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  const setCode     = useTraceStore((s) => s.setCode);
  const code        = useTraceStore((s) => s.code);
  const isLoading   = useTraceStore((s) => s.isLoading);
  const error       = useTraceStore((s) => s.error);
  const notes       = useTraceStore((s) => s.notes);
  const totalSteps  = useTraceStore((s) => s.totalSteps);
  const setStepIdx  = useTraceStore((s) => s.setCurrentStepIndex);

  const { runTrace } = useTracer();
  const inputsRef = useRef<Record<string, unknown>>({});
  useEffect(() => { inputsRef.current = inputs ?? {}; }, [inputs]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setCode(DEFAULT_CODE); }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('s');
    if (!token) return;
    (async () => {
      try {
        const snippet = await getSnippet(token);
        setCode(snippet.code);
        const result = await runTrace(snippet.code, snippet.inputs);
        if (result && snippet.initial_step > 0)
          setStepIdx(Math.min(snippet.initial_step, result.total_steps - 1));
        window.history.replaceState({}, '', window.location.pathname);
      } catch { /* ignore bad token */ }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleInputsChange = useCallback(
    (parsed: Record<string, unknown> | null, err: string | null) => {
      setInputs(parsed); setInputsError(err);
    }, [],
  );

  const handleAnalyseResult = useCallback(
    (result: AnalyzeResult | null, err: string | null) => {
      setAnalyseResult(result); setAnalyseError(err);
    }, [],
  );

  const handleRun = async () => {
    if (inputsError || inputs === null) return;
    await runTrace(code || DEFAULT_CODE, inputs);
    setAnalyseResult(null); setAnalyseError(null);
  };

  return (
    <div className="h-screen bg-[#1e1e1e] text-[#d4d4d4] flex flex-col overflow-hidden select-none">

      {/* Header */}
      <Header
        onAnalyseResult={handleAnalyseResult}
        analyseLoading={analyseLoading}
        setAnalyseLoading={setAnalyseLoading}
        currentInputs={inputsRef.current}
      />

      {/* Main */}
      <div className="flex flex-1 overflow-hidden">

        {/* Editor */}
        <div className="flex-1 min-w-0 overflow-hidden">
          <CodeEditor />
        </div>

        {/* Drag handle */}
        <div
          className="w-[3px] cursor-col-resize bg-[#3c3c3c] hover:bg-[#007acc] transition-colors shrink-0"
          onMouseDown={() => { dragging.current = true; }}
        />

        {/* Sidebar */}
        <aside
          className="shrink-0 flex flex-col overflow-hidden border-l border-[#2d2d2d]"
          style={{ width: sidebarW, background: '#1e1e1e' }}
        >
          {/* Arrays section */}
          <ArraySection />

          {/* Variables section */}
          <div className="flex flex-col flex-1 overflow-hidden border-b border-[#2d2d2d]">
            <PanelLabel title="Variables" />
            <div className="flex-1 overflow-auto scrollbar-thin">
              <VariablePanel />
            </div>
          </div>

          {/* Call Stack section */}
          <div className="shrink-0 border-b border-[#2d2d2d]" style={{ background: '#1a1a1a' }}>
            <PanelLabel title="Call Stack" />
            <div className="max-h-28 overflow-auto">
              <CallStack />
            </div>
          </div>

          {/* Complexity section */}
          <div className="shrink-0 p-2" style={{ background: '#1a1a1a' }}>
            <ComplexityPanel
              result={analyseResult}
              isLoading={analyseLoading}
              error={analyseError}
            />
          </div>
        </aside>
      </div>

      {/* Bottom bar */}
      <div className="shrink-0 border-t border-[#3c3c3c] bg-[#252526]">

        {/* Inputs + Run */}
        <div className="px-3 py-1.5 flex items-center gap-2 border-b border-[#3c3c3c]">
          <TestCaseInput onChange={handleInputsChange} />
          <button
            onClick={handleRun}
            disabled={isLoading || !!inputsError || inputs === null}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1 rounded bg-[#007acc] hover:bg-[#1a8ad4] text-white text-xs font-semibold disabled:opacity-40 transition-colors"
          >
            {isLoading ? 'Running...' : '▶ Run'}
          </button>
        </div>

        {/* Step controls */}
        <StepControls />

        {/* Preprocessing notes (auto-fixed LeetCode code) */}
        {notes.length > 0 && !error && (
          <div className="px-3 py-1 border-t border-[#007acc]/30 bg-[#007acc]/10 text-[#9cdcfe] text-xs flex items-center gap-1.5">
            <span className="text-[#007acc]">⚡</span>
            <span>Auto-fixed: {notes.join(' · ')}</span>
          </div>
        )}

        {/* Error */}
        {(inputsError ?? error) && (
          <div className="px-3 py-1 border-t border-red-900/50 bg-red-950/50 text-red-400 text-xs font-mono">
            {inputsError ?? error}
          </div>
        )}
        {!isLoading && totalSteps === 0 && !error && !inputsError && notes.length === 0 && (
          <div className="px-3 py-1 border-t border-[#3c3c3c] text-[#6b6b6b] text-xs">
            Enter inputs and click Run to start tracing.
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
