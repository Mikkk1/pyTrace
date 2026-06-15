// PyTrace - Array panel: renders ArrayVisualizer for each array local with pointer arrows

import { useTraceStore } from '../../store/traceStore';
import { buildPointerIndices } from '../../lib/pointerDetector';
import ArrayVisualizer from './ArrayVisualizer';

export default function ArrayPanel() {
  const currStep = useTraceStore((s) => s.currentStep);

  if (!currStep) return null;

  const locals = currStep.locals as Record<string, unknown>;
  const arrayEntries = Object.entries(locals).filter(
    (entry): entry is [string, unknown[]] => Array.isArray(entry[1]) && entry[1].length > 0,
  );

  if (arrayEntries.length === 0) return null;

  return (
    <div className="p-2 flex flex-col gap-3">
      {arrayEntries.map(([name, items]) => (
        <ArrayVisualizer
          key={name}
          varName={name}
          items={items}
          pointerIndices={buildPointerIndices(locals, items.length)}
        />
      ))}
    </div>
  );
}
