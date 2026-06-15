// PyTrace - Collections panel: renders str/list/matrix/deque/set/counter/dict/tuple
// locals as visual structures, with smart role badges and a heap "top" highlight.

import { useTraceStore } from '../../store/traceStore';
import { buildPointerIndices } from '../../lib/pointerDetector';
import { collectCollections, getRoleBadge, isHeapName, type SpecialObj, type CounterObj } from '../../lib/collections';
import ArrayVisualizer from './ArrayVisualizer';
import MatrixVisualizer from './MatrixVisualizer';
import DequeVisualizer from './DequeVisualizer';
import SetVisualizer from './SetVisualizer';
import CounterVisualizer from './CounterVisualizer';
import DictVisualizer from './DictVisualizer';

/** [i][j] cell to highlight in a matrix, if both `i` and `j` are valid in-range locals. */
function matrixHighlight(locals: Record<string, unknown>, rows: number, cols: number): [number, number] | null {
  const i = locals['i'];
  const j = locals['j'];
  if (typeof i === 'number' && typeof j === 'number' && Number.isInteger(i) && Number.isInteger(j)
    && i >= 0 && i < rows && j >= 0 && j < cols) {
    return [i, j];
  }
  return null;
}

export default function CollectionsPanel() {
  const currStep = useTraceStore((s) => s.currentStep);

  if (!currStep) {
    return (
      <div className="flex items-center justify-center h-20 text-[#6b6b6b] text-xs">
        Run code to see collections
      </div>
    );
  }

  const locals = currStep.locals as Record<string, unknown>;
  const currentFnName = currStep.call_stack[0]?.name;
  const entries = collectCollections(locals, currentFnName);

  if (entries.length === 0) {
    return (
      <div className="flex items-center justify-center h-20 text-[#6b6b6b] text-xs">
        No collections in scope
      </div>
    );
  }

  return (
    <div className="p-2 flex flex-col gap-3">
      {entries.map(({ name, kind, value }) => {
        const badge = getRoleBadge(name);
        switch (kind) {
          case 'str': {
            const chars = Array.from(value as string);
            return (
              <ArrayVisualizer
                key={name}
                varName={name}
                items={chars}
                pointerIndices={buildPointerIndices(locals, chars.length)}
                badge={badge}
              />
            );
          }
          case 'list': {
            const items = value as unknown[];
            const isHeap = isHeapName(name) || badge === 'heap';
            // Heaps don't have L/R/i/j-style pointers into their internal
            // array order, so suppress pointer highlights and let "top" stand alone.
            return (
              <ArrayVisualizer
                key={name}
                varName={name}
                items={items}
                pointerIndices={isHeap ? {} : buildPointerIndices(locals, items.length)}
                badge={badge}
                isHeap={isHeap}
              />
            );
          }
          case 'matrix': {
            const matrix = value as unknown[][];
            const rows = matrix.length;
            const cols = Math.max(...matrix.map((r) => (Array.isArray(r) ? r.length : 0)));
            return (
              <MatrixVisualizer
                key={name}
                varName={name}
                matrix={matrix}
                highlightCell={matrixHighlight(locals, rows, cols)}
                badge={badge}
              />
            );
          }
          case 'deque':
            return (
              <DequeVisualizer key={name} varName={name} items={(value as SpecialObj).items} badge={badge} />
            );
          case 'tuple': {
            const items = (value as SpecialObj).items;
            return (
              <ArrayVisualizer
                key={name}
                varName={name}
                items={items}
                pointerIndices={buildPointerIndices(locals, items.length)}
                badge={badge}
              />
            );
          }
          case 'set':
            return (
              <SetVisualizer key={name} varName={name} items={(value as SpecialObj).items} badge={badge} />
            );
          case 'counter':
            return (
              <CounterVisualizer key={name} varName={name} items={(value as unknown as CounterObj).items} badge={badge} />
            );
          case 'dict':
            return (
              <DictVisualizer key={name} varName={name} value={value as Record<string, unknown>} badge={badge} />
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
