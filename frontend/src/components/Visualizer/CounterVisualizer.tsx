// PyTrace - Counter visualizer: badge pills showing "key:count"

import type { FC } from 'react';
import CollectionLabel from './CollectionLabel';

interface Props {
  varName: string;
  items: Record<string, number>;
  badge?: string | null;
}

const MAX_PILLS = 20;

const CounterVisualizer: FC<Props> = ({ varName, items, badge }) => {
  const entries = Object.entries(items);
  const display = entries.slice(0, MAX_PILLS);
  const overflow = entries.length - display.length;

  return (
    <div>
      <CollectionLabel varName={varName} badge={badge ?? 'Counter'} />
      <div className="mt-1 flex flex-wrap items-center gap-1">
        {display.map(([key, count]) => (
          <span
            key={key}
            className="px-2 py-0.5 rounded-full text-[11px] font-mono text-[#dcdcaa] border border-[#dcdcaa]/40"
            style={{ background: '#dcdcaa18' }}
          >
            {key}:{count}
          </span>
        ))}
        {overflow > 0 && (
          <span className="text-[#6b6b6b] text-[11px] px-1">+{overflow} more</span>
        )}
      </div>
    </div>
  );
};

export default CounterVisualizer;
