// PyTrace - Collections panel: renders str/list/set/dict/tuple locals as visual structures

import { useTraceStore } from '../../store/traceStore';
import { buildPointerIndices } from '../../lib/pointerDetector';
import { collectCollections, type SpecialObj } from '../../lib/collections';
import ArrayVisualizer from './ArrayVisualizer';
import SetVisualizer from './SetVisualizer';
import DictVisualizer from './DictVisualizer';

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
  const entries = collectCollections(locals);

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
        switch (kind) {
          case 'str': {
            const chars = Array.from(value as string);
            return (
              <ArrayVisualizer
                key={name}
                varName={name}
                items={chars}
                pointerIndices={buildPointerIndices(locals, chars.length)}
              />
            );
          }
          case 'list': {
            const items = value as unknown[];
            return (
              <ArrayVisualizer
                key={name}
                varName={name}
                items={items}
                pointerIndices={buildPointerIndices(locals, items.length)}
              />
            );
          }
          case 'tuple': {
            const items = (value as SpecialObj).items;
            return (
              <ArrayVisualizer
                key={name}
                varName={name}
                items={items}
                pointerIndices={buildPointerIndices(locals, items.length)}
              />
            );
          }
          case 'set':
            return (
              <SetVisualizer key={name} varName={name} items={(value as SpecialObj).items} />
            );
          case 'dict':
            return (
              <DictVisualizer key={name} varName={name} value={value as Record<string, unknown>} />
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
