// PyTrace - Single node in the RECURSION TREE: function call + args + return
// value, color-coded by depth, click to jump to its step, collapsible subtree.

import type { FC } from 'react';
import type { RecursionNode } from '../../types/trace';
import { DEPTH_COLORS } from '../../lib/depthColors';
import { formatArg, formatArgs } from '../../lib/recursionTree';

interface Props {
  node: RecursionNode;
  activeStepIndex: number | null;
  visible: Set<number>;
  collapsed: Set<number>;
  onToggle: (stepIndex: number) => void;
  onJump: (stepIndex: number) => void;
}

const RecursionNodeView: FC<Props> = ({ node, activeStepIndex, visible, collapsed, onToggle, onJump }) => {
  const color = DEPTH_COLORS[node.depth % DEPTH_COLORS.length];
  const isActive = node.step_index === activeStepIndex;
  const isCollapsed = collapsed.has(node.step_index);
  const visibleChildren = node.children.filter((c) => visible.has(c.step_index));
  const hasChildren = visibleChildren.length > 0;

  return (
    <div className="flex flex-col">
      <div
        onClick={() => onJump(node.step_index)}
        className={`flex items-center gap-1 cursor-pointer rounded px-1.5 py-0.5 text-[11px] font-mono ${
          isActive ? 'bg-[#264f78]' : 'hover:bg-[#2a2a2a]'
        }`}
        style={{ borderLeft: `2px solid ${color}` }}
        title="Click to jump to this step"
      >
        {hasChildren ? (
          <button
            onClick={(e) => { e.stopPropagation(); onToggle(node.step_index); }}
            className="text-[#6b6b6b] w-3 shrink-0 text-center"
          >
            {isCollapsed ? '▸' : '▾'}
          </button>
        ) : (
          <span className="w-3 shrink-0" />
        )}
        <span style={{ color }} className="font-semibold">{node.fn_name}</span>
        <span className="text-[#9cdcfe] truncate">({formatArgs(node.args)})</span>
        {node.return_value !== null && node.return_value !== undefined && (
          <span className="text-[#6b6b6b] shrink-0">&rarr; {formatArg(node.return_value)}</span>
        )}
      </div>

      {hasChildren && !isCollapsed && (
        <div className="ml-3 border-l border-[#3c3c3c] pl-2 flex flex-col gap-0.5 mt-0.5">
          {visibleChildren.map((child) => (
            <RecursionNodeView
              key={child.step_index}
              node={child}
              activeStepIndex={activeStepIndex}
              visible={visible}
              collapsed={collapsed}
              onToggle={onToggle}
              onJump={onJump}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default RecursionNodeView;
