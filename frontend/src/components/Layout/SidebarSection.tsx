// PyTrace - Collapsible, vertically resizable sidebar section

import type { ReactNode, MouseEvent } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useTraceStore, type SectionId } from '../../store/traceStore';

interface SidebarSectionProps {
  id: SectionId;
  title: string;
  count?: number;
  children: ReactNode;
  background?: string;
  showHandle?: boolean;
  onHandleMouseDown?: (e: MouseEvent) => void;
}

export default function SidebarSection({
  id,
  title,
  count,
  children,
  background,
  showHandle = false,
  onHandleMouseDown,
}: SidebarSectionProps) {
  const collapsed = useTraceStore((s) => s.sectionCollapsed[id]);
  const size = useTraceStore((s) => s.sectionSizes[id]);
  const toggleSectionCollapsed = useTraceStore((s) => s.toggleSectionCollapsed);

  const style = collapsed
    ? { flex: '0 0 auto' as const, background }
    : { flex: `${size} 1 0%`, minHeight: 60, background };

  return (
    <div className="flex flex-col overflow-hidden border-b border-[#2d2d2d]" style={style}>
      <button
        type="button"
        onClick={() => toggleSectionCollapsed(id)}
        className="w-full px-3 py-1.5 flex items-center justify-between gap-2 shrink-0 hover:bg-[#2a2a2a] transition-colors"
      >
        <span className="text-[10px] font-bold uppercase tracking-widest text-[#555]">
          {title}
          {count !== undefined ? ` (${count})` : ''}
        </span>
        {collapsed ? (
          <ChevronRight size={13} className="text-[#6b6b6b]" />
        ) : (
          <ChevronDown size={13} className="text-[#6b6b6b]" />
        )}
      </button>

      {!collapsed && (
        <div className="flex-1 min-h-0 overflow-auto scrollbar-thin">
          {children}
        </div>
      )}

      {showHandle && !collapsed && (
        <div
          className="h-[3px] cursor-row-resize bg-[#3c3c3c] hover:bg-[#007acc] transition-colors shrink-0"
          onMouseDown={onHandleMouseDown}
        />
      )}
    </div>
  );
}
