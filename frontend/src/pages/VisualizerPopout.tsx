// PyTrace - Full-screen popout window mirroring the sidebar visualization
// panels, synced from the main window via BroadcastChannel (Phase 7 Section 4).

import { useEffect, useState, type ReactNode } from 'react';
import { useTraceStore } from '../store/traceStore';
import CollectionsPanel from '../components/Visualizer/CollectionsPanel';
import VariablePanel from '../components/Visualizer/VariablePanel';
import CallStack from '../components/Visualizer/CallStack';
import RecursionTree from '../components/Visualizer/RecursionTree';
import { isRecursiveTrace } from '../lib/recursionTree';
import { channelName, type RequestStateMessage, type StepUpdateMessage } from '../lib/broadcast';

const WAIT_TIMEOUT_MS = 5000;

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col border border-[#2d2d2d] rounded overflow-hidden bg-[#1a1a1a] min-h-0">
      <div className="shrink-0 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-[#555] border-b border-[#2d2d2d]">
        {title}
      </div>
      <div className="flex-1 min-h-0 overflow-auto scrollbar-thin">{children}</div>
    </div>
  );
}

export default function VisualizerPopout() {
  const [connected, setConnected] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const result = useTraceStore((s) => s.result);
  const steps = useTraceStore((s) => s.steps);

  useEffect(() => {
    const sessionId = new URLSearchParams(window.location.search).get('session');
    if (!sessionId) return;

    const channel = new BroadcastChannel(channelName(sessionId));
    const timeout = setTimeout(() => setTimedOut(true), WAIT_TIMEOUT_MS);

    channel.onmessage = (event: MessageEvent<StepUpdateMessage>) => {
      const msg = event.data;
      if (msg.type !== 'STEP_UPDATE') return;
      clearTimeout(timeout);
      setConnected(true);
      useTraceStore.setState({
        result: msg.result,
        steps: msg.steps,
        totalSteps: msg.steps.length,
        currentStepIndex: msg.currentStepIndex,
        currentStep: msg.step,
      });
    };

    const request: RequestStateMessage = { type: 'REQUEST_STATE' };
    channel.postMessage(request);

    return () => {
      clearTimeout(timeout);
      channel.close();
    };
  }, []);

  const showRecursionTree = !!result?.recursion_tree && isRecursiveTrace(steps);

  return (
    <div className="h-screen bg-[#1e1e1e] text-[#d4d4d4] flex flex-col overflow-hidden">
      <div className="shrink-0 px-3 py-2 border-b border-[#2d2d2d] bg-[#252526]">
        <span className="text-sm font-semibold text-[#cccccc]">PyTrace — Live Visualization</span>
      </div>

      {!connected ? (
        <div className="flex-1 flex items-center justify-center text-[#6b6b6b] text-sm">
          {timedOut ? 'Waiting for main window...' : null}
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-auto grid grid-cols-2 gap-2 p-2">
          <Panel title="COLLECTIONS">
            <CollectionsPanel />
          </Panel>
          <Panel title="VARIABLES">
            <VariablePanel />
          </Panel>
          <Panel title="CALL STACK">
            <CallStack />
          </Panel>
          {showRecursionTree && (
            <Panel title="RECURSION TREE">
              <RecursionTree />
            </Panel>
          )}
        </div>
      )}
    </div>
  );
}
