// PyTrace - RECURSION TREE panel: call tree rooted at <module>, current-node
// highlight, click-to-jump, collapsible subtrees, capped at 30 nodes / depth 6.

import { useState } from 'react';
import { useTraceStore } from '../../store/traceStore';
import RecursionNodeView from './RecursionNodeView';
import {
  collectVisibleNodes,
  countNodes,
  findActiveStepIndex,
  treeMaxDepth,
  MAX_RECURSION_TREE_NODES,
  MAX_RECURSION_TREE_DEPTH,
} from '../../lib/recursionTree';

export default function RecursionTree() {
  const result = useTraceStore((s) => s.result);
  const currentStep = useTraceStore((s) => s.currentStep);
  const currentStepIndex = useTraceStore((s) => s.currentStepIndex);
  const setStepIndex = useTraceStore((s) => s.setCurrentStepIndex);
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());

  const tree = result?.recursion_tree;

  if (!tree) {
    return (
      <div className="flex items-center justify-center h-20 text-[#6b6b6b] text-xs">
        No recursion detected
      </div>
    );
  }

  const visible = collectVisibleNodes(tree);
  const truncated = countNodes(tree) > MAX_RECURSION_TREE_NODES || treeMaxDepth(tree) > MAX_RECURSION_TREE_DEPTH;
  const activeStepIndex = currentStep ? findActiveStepIndex(tree, currentStep, currentStepIndex) : null;

  const handleToggle = (stepIndex: number) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(stepIndex)) next.delete(stepIndex);
      else next.add(stepIndex);
      return next;
    });
  };

  return (
    <div className="p-2">
      <RecursionNodeView
        node={tree}
        activeStepIndex={activeStepIndex}
        visible={visible}
        collapsed={collapsed}
        onToggle={handleToggle}
        onJump={setStepIndex}
      />
      {truncated && (
        <div className="text-[10px] text-[#6b6b6b] mt-2 px-1.5">
          Showing first {MAX_RECURSION_TREE_NODES} nodes
        </div>
      )}
    </div>
  );
}
