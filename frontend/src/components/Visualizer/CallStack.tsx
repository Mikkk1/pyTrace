// PyTrace - Call stack viewer (VS Code colors)

import { useTraceStore } from '../../store/traceStore';
import { DEPTH_COLORS } from '../../lib/depthColors';

export default function CallStack() {
  const currentStep = useTraceStore((s) => s.currentStep);

  if (!currentStep || currentStep.call_stack.length === 0) {
    return <div className="p-3 text-[#6b6b6b] text-xs text-center">No frames</div>;
  }

  return (
    <div className="p-2 space-y-0.5">
      {currentStep.call_stack.map((frame, i) => {
        const isTop = i === 0;
        const color = DEPTH_COLORS[frame.depth % DEPTH_COLORS.length];
        return (
          <div
            key={i}
            className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-mono ${
              isTop ? 'bg-[#2a2d2e]' : 'bg-[#2d2d2d]'
            }`}
            style={{ paddingLeft: `${8 + Math.min(frame.depth * 8, 32)}px` }}
          >
            <span style={{ color }} className="shrink-0 text-[10px]">
              {'▸'.repeat(Math.min(frame.depth + 1, 4))}
            </span>
            <span className={isTop ? 'text-[#dcdcaa] flex-1' : 'text-[#858585] flex-1'}>
              {frame.name}()
            </span>
            <span className="text-[#6b6b6b] shrink-0">:{frame.line}</span>
            {frame.depth > 0 && (
              <span className="shrink-0 border rounded px-1 text-[10px]" style={{ color, borderColor: `${color}50` }}>
                d{frame.depth}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
