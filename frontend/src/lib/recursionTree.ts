// PyTrace - Helpers for the RECURSION TREE panel: recursion detection,
// active-node lookup, visible-node capping, and compact arg/return formatting.

import type { RecursionNode, TraceStep } from '../types/trace';

export const MAX_RECURSION_TREE_NODES = 30;
export const MAX_RECURSION_TREE_DEPTH = 6;

/** True if any step's call stack contains the same function name more than once. */
export function isRecursiveTrace(steps: TraceStep[]): boolean {
  for (const step of steps) {
    const seen = new Set<string>();
    for (const frame of step.call_stack) {
      if (seen.has(frame.name)) return true;
      seen.add(frame.name);
    }
  }
  return false;
}

export function countNodes(node: RecursionNode): number {
  return 1 + node.children.reduce((sum, c) => sum + countNodes(c), 0);
}

export function treeMaxDepth(node: RecursionNode): number {
  return node.children.reduce((m, c) => Math.max(m, treeMaxDepth(c)), node.depth);
}

/**
 * Pre-order set of step_index values to render, capped at maxNodes total
 * and maxDepth levels deep ("Showing first N nodes").
 */
export function collectVisibleNodes(
  root: RecursionNode,
  maxNodes = MAX_RECURSION_TREE_NODES,
  maxDepth = MAX_RECURSION_TREE_DEPTH,
): Set<number> {
  const visible = new Set<number>();

  function visit(node: RecursionNode) {
    if (visible.size >= maxNodes || node.depth > maxDepth) return;
    visible.add(node.step_index);
    for (const child of node.children) {
      if (visible.size >= maxNodes) break;
      visit(child);
    }
  }

  visit(root);
  return visible;
}

/**
 * step_index of the recursion-tree node corresponding to the currently active
 * call frame, or null if none matches. The active node is the deepest node
 * whose fn_name/depth match the current call stack and whose call happened
 * at or before currentStepIndex (siblings never overlap in a single thread,
 * so the most recent matching call is the active one).
 */
export function findActiveStepIndex(
  root: RecursionNode,
  currentStep: TraceStep,
  currentStepIndex: number,
): number | null {
  const targetDepth = currentStep.call_stack.length - 1;
  const targetName = currentStep.call_stack[0]?.name;
  if (targetDepth < 0 || !targetName) return null;

  let best: number | null = null;

  function visit(node: RecursionNode) {
    if (
      node.depth === targetDepth &&
      node.fn_name === targetName &&
      node.step_index <= currentStepIndex &&
      (best === null || node.step_index > best)
    ) {
      best = node.step_index;
    }
    for (const child of node.children) visit(child);
  }

  visit(root);
  return best;
}

/** Compact one-value representation for recursion-node args/return values. */
export function formatArg(v: unknown): string {
  if (v === null || v === undefined) return 'None';
  if (typeof v === 'boolean') return v ? 'True' : 'False';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'string') return v.length > 12 ? `"${v.slice(0, 11)}…"` : `"${v}"`;
  if (Array.isArray(v)) return `[${v.length}]`;
  if (typeof v === 'object') {
    const obj = v as Record<string, unknown>;
    if (typeof obj.__type__ === 'string') return `${obj.__type__}(…)`;
    return '{...}';
  }
  return String(v);
}

/** Compact "k=v, k2=v2" representation of a recursion node's args. */
export function formatArgs(args: Record<string, unknown>): string {
  return Object.entries(args).map(([k, v]) => `${k}=${formatArg(v)}`).join(', ');
}
