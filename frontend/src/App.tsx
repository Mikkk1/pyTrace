// PyTrace - Phase 6: resizable/collapsible sidebar sections + Live REPL mode

import { useState, useCallback, useEffect, useRef } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import CodeEditor from './components/Editor/CodeEditor';
import CollectionsPanel from './components/Visualizer/CollectionsPanel';
import VariablePanel from './components/Visualizer/VariablePanel';
import CallStack from './components/Visualizer/CallStack';
import ComplexityPanel from './components/Visualizer/ComplexityPanel';
import RecursionTree from './components/Visualizer/RecursionTree';
import StepControls from './components/Controls/StepControls';
import TestCaseInput from './components/Editor/TestCaseInput';
import Header from './components/Layout/Header';
import Footer from './components/Layout/Footer';
import SidebarSection from './components/Layout/SidebarSection';
import { PopoutToggleButton, PopoutNotice } from './components/Layout/PopoutControl';
import { useTraceStore, type SectionId } from './store/traceStore';
import { useTracer } from './hooks/useTracer';
import { isCollectionValue, filterDataLocals } from './lib/collections';
import { parseError } from './lib/errorHints';
import { isRecursiveTrace } from './lib/recursionTree';
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

const SECTION_ORDER: SectionId[] = ['arrays', 'variables', 'callStack', 'complexity', 'recursionTree'];
const LIVE_DEBOUNCE_MS = 600;

export default function App() {
  const [inputs, setInputs] = useState<Record<string, unknown> | null>(null);
  const [inputsError, setInputsError] = useState<string | null>(null);
  const [analyseResult, setAnalyseResult] = useState<AnalyzeResult | null>(null);
  const [analyseError, setAnalyseError] = useState<string | null>(null);
  const [analyseLoading, setAnalyseLoading] = useState(false);

  // Resizable sidebar (fraction of window width): editor min 25%, sidebar min 40% / max 75%.
  const [sidebarFrac, setSidebarFrac] = useState(0.45);
  const draggingSidebar = useRef(false);

  // Vertical section resize (drag handle between two SidebarSections)
  const sectionsRef = useRef<HTMLDivElement>(null);
  const sectionResize = useRef<{ a: SectionId; b: SectionId; lastY: number; containerH: number } | null>(null);

  const setCode     = useTraceStore((s) => s.setCode);
  const code        = useTraceStore((s) => s.code);
  const isLoading   = useTraceStore((s) => s.isLoading);
  const error       = useTraceStore((s) => s.error);
  const liveError   = useTraceStore((s) => s.liveError);
  const notes       = useTraceStore((s) => s.notes);
  const totalSteps  = useTraceStore((s) => s.totalSteps);
  const setStepIdx  = useTraceStore((s) => s.setCurrentStepIndex);
  const mode        = useTraceStore((s) => s.mode);
  const currStep    = useTraceStore((s) => s.currentStep);
  const result      = useTraceStore((s) => s.result);
  const steps       = useTraceStore((s) => s.steps);
  const sectionCollapsed   = useTraceStore((s) => s.sectionCollapsed);
  const adjustSectionSizes = useTraceStore((s) => s.adjustSectionSizes);
  const sessionId   = useTraceStore((s) => s.sessionId);
  const popoutOpen  = useTraceStore((s) => s.popoutOpen);
  const setPopoutOpen = useTraceStore((s) => s.setPopoutOpen);
  const popoutWindowRef = useRef<Window | null>(null);

  const { runTrace, runTraceLive } = useTracer();
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

  // Sidebar width drag + section vertical resize drag
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (draggingSidebar.current) {
        const w = window.innerWidth - e.clientX;
        const frac = w / window.innerWidth;
        setSidebarFrac(Math.max(0.40, Math.min(0.75, frac)));
        return;
      }
      const rs = sectionResize.current;
      if (rs && rs.containerH > 0) {
        const deltaPx = e.clientY - rs.lastY;
        if (deltaPx !== 0) {
          const deltaFrac = deltaPx / rs.containerH;
          const minFrac = 60 / rs.containerH;
          adjustSectionSizes(rs.a, rs.b, deltaFrac, minFrac);
          rs.lastY = e.clientY;
        }
      }
    };
    const onUp = () => { draggingSidebar.current = false; sectionResize.current = null; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [adjustSectionSizes]);

  // Live Mode: debounced auto-rerun on every code/input change
  useEffect(() => {
    if (mode !== 'live') return;
    if (inputsError || inputs === null) return;
    const codeToRun = code || DEFAULT_CODE;
    const timer = setTimeout(() => {
      runTraceLive(codeToRun, inputs);
    }, LIVE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [mode, code, inputs, inputsError, runTraceLive]);

  // Detachable visualizer popout: poll for the user closing the window directly
  useEffect(() => {
    if (!popoutOpen) return;
    const interval = setInterval(() => {
      if (popoutWindowRef.current?.closed) {
        popoutWindowRef.current = null;
        setPopoutOpen(false);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [popoutOpen, setPopoutOpen]);

  const handleTogglePopout = () => {
    if (popoutOpen) {
      popoutWindowRef.current?.close();
      popoutWindowRef.current = null;
      setPopoutOpen(false);
      return;
    }
    popoutWindowRef.current = window.open(
      `/visualizer?session=${sessionId}`,
      'pytrace-vis',
      'width=900,height=800',
    );
    setPopoutOpen(true);
  };

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

  // RECURSION TREE auto-appears only when the trace actually recurses
  // (same function name appears more than once in a call stack).
  const showRecursionTree = !!result?.recursion_tree && isRecursiveTrace(steps);
  const visibleSections = SECTION_ORDER.filter((id) => id !== 'recursionTree' || showRecursionTree);

  // Find the next non-collapsed, visible section after `from`, for resize-handle pairing
  const nextExpandedSection = (from: SectionId): SectionId | null => {
    const idx = visibleSections.indexOf(from);
    for (let i = idx + 1; i < visibleSections.length; i++) {
      if (!sectionCollapsed[visibleSections[i]]) return visibleSections[i];
    }
    return null;
  };

  const startSectionResize = (a: SectionId, b: SectionId | null) => (e: ReactMouseEvent) => {
    if (!b) return;
    e.preventDefault();
    const containerH = sectionsRef.current?.getBoundingClientRect().height ?? 600;
    sectionResize.current = { a, b, lastY: e.clientY, containerH };
  };

  // Section header counts (non-data variables — functions, dunders, modules —
  // are excluded from both COLLECTIONS and VARIABLES, Phase 7 Bug 1).
  const rawLocals = (currStep?.locals ?? {}) as Record<string, unknown>;
  const currentFnName = currStep?.call_stack[0]?.name;
  const locals = filterDataLocals(rawLocals, currentFnName);
  const collectionsCount = Object.values(locals).filter(isCollectionValue).length;
  const variableCount = Object.keys(locals).length - collectionsCount;

  const displayError = mode === 'live' ? (inputsError ?? liveError) : (inputsError ?? error);

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
          onMouseDown={() => { draggingSidebar.current = true; }}
        />

        {/* Sidebar */}
        <aside
          className="shrink-0 flex flex-col overflow-hidden border-l border-[#2d2d2d]"
          style={{ width: `${sidebarFrac * 100}%`, background: '#1e1e1e' }}
        >
          <PopoutToggleButton popoutOpen={popoutOpen} onToggle={handleTogglePopout} />

          {popoutOpen ? (
            <PopoutNotice onReattach={handleTogglePopout} />
          ) : (
          <div ref={sectionsRef} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <SidebarSection
              id="arrays"
              title="COLLECTIONS"
              count={collectionsCount}
              showHandle={!sectionCollapsed.arrays && nextExpandedSection('arrays') !== null}
              onHandleMouseDown={startSectionResize('arrays', nextExpandedSection('arrays'))}
            >
              <CollectionsPanel />
            </SidebarSection>

            <SidebarSection
              id="variables"
              title="VARIABLES"
              count={variableCount}
              showHandle={!sectionCollapsed.variables && nextExpandedSection('variables') !== null}
              onHandleMouseDown={startSectionResize('variables', nextExpandedSection('variables'))}
            >
              <VariablePanel />
            </SidebarSection>

            <SidebarSection
              id="callStack"
              title="CALL STACK"
              background="#1a1a1a"
              showHandle={!sectionCollapsed.callStack && nextExpandedSection('callStack') !== null}
              onHandleMouseDown={startSectionResize('callStack', nextExpandedSection('callStack'))}
            >
              <CallStack />
            </SidebarSection>

            <SidebarSection
              id="complexity"
              title="COMPLEXITY"
              background="#1a1a1a"
              showHandle={!sectionCollapsed.complexity && nextExpandedSection('complexity') !== null}
              onHandleMouseDown={startSectionResize('complexity', nextExpandedSection('complexity'))}
            >
              <ComplexityPanel
                result={analyseResult}
                isLoading={analyseLoading}
                error={analyseError}
              />
            </SidebarSection>

            {showRecursionTree && (
              <SidebarSection
                id="recursionTree"
                title="RECURSION TREE"
                background="#1a1a1a"
                showHandle={false}
              >
                <RecursionTree />
              </SidebarSection>
            )}
          </div>
          )}
        </aside>
      </div>

      {/* Bottom bar */}
      <div className="shrink-0 border-t border-[#3c3c3c] bg-[#252526]">

        {/* Inputs + Run */}
        <div className="px-3 py-1.5 flex items-center gap-2 border-b border-[#3c3c3c]">
          <TestCaseInput onChange={handleInputsChange} />
          {mode === 'trace' && (
            <button
              onClick={handleRun}
              disabled={isLoading || !!inputsError || inputs === null}
              className="shrink-0 flex items-center gap-1.5 px-3 py-1 rounded bg-[#007acc] hover:bg-[#1a8ad4] text-white text-xs font-semibold disabled:opacity-40 transition-colors"
            >
              {isLoading ? 'Running...' : '▶ Run'}
            </button>
          )}
        </div>

        {/* Step controls (Trace Mode only) */}
        {mode === 'trace' && <StepControls />}

        {/* Preprocessing notes (auto-fixed LeetCode code) */}
        {notes.length > 0 && !displayError && (
          <div className="px-3 py-1 border-t border-[#007acc]/30 bg-[#007acc]/10 text-[#9cdcfe] text-xs flex items-center gap-1.5">
            <span className="text-[#007acc]">⚡</span>
            <span>Auto-fixed: {notes.join(' · ')}</span>
          </div>
        )}

        {/* Error */}
        {displayError && (() => {
          const { type, message, hint } = parseError(displayError);
          return (
            <div className="px-3 py-1.5 border-t border-red-900/50 bg-red-950/50 text-xs font-mono">
              <div className="text-red-400">
                <span className="font-bold">{type}</span>
                {message && <span>: {message}</span>}
              </div>
              {hint && <div className="text-red-300/70 mt-0.5">{hint}</div>}
            </div>
          );
        })()}
        {mode === 'trace' && !isLoading && totalSteps === 0 && !error && !inputsError && notes.length === 0 && (
          <div className="px-3 py-1 border-t border-[#3c3c3c] text-[#6b6b6b] text-xs">
            Enter inputs and click Run to start tracing.
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
