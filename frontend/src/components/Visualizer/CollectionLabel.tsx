// PyTrace - Shared "varName = [role badge]" header used by all collection visualizers

import type { FC } from 'react';

interface Props {
  varName: string;
  badge?: string | null;
}

const CollectionLabel: FC<Props> = ({ varName, badge }) => (
  <div className="flex items-center gap-1.5">
    <span className="text-[#9cdcfe] text-xs font-mono">{varName}</span>
    <span className="text-[#6b6b6b] text-xs font-mono">=</span>
    {badge && (
      <span
        className="text-[10px] font-mono px-1 py-px rounded text-[#c586c0] border border-[#c586c0]/30"
        style={{ background: '#c586c018' }}
      >
        {badge}
      </span>
    )}
  </div>
);

export default CollectionLabel;
